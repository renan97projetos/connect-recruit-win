// Helper compartilhado para enviar emails via Lovable Email.
//
// IMPORTANTE: Não passamos pelo gateway HTTP do send-transactional-email
// porque o novo sistema de keys da Supabase usa formato `sb_secret_*` /
// `sb_publishable_*` que não é JWT — o gateway rejeita com
// UNAUTHORIZED_INVALID_JWT_FORMAT.
//
// Em vez disso, replicamos a lógica essencial localmente:
//   1. Checa suppression list
//   2. Cria/recupera unsubscribe token
//   3. Faz enqueue direto no pgmq via RPC `enqueue_email`
//   4. O dispatcher (process-email-queue) processa e envia
//
// Uso:
//   import { sendLovableEmail } from "../_shared/send-lovable-email.ts";
//   await sendLovableEmail({ to: "user@example.com", subject: "Olá", html: "<p>...</p>" });

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Configuração de envio (igual ao send-transactional-email)
const SITE_NAME = "SinapseRH";
const SENDER_DOMAIN = "notify.sinapserh.com.br";
const FROM_DOMAIN = "sinapserh.com.br";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  /** Chave única para deduplicação. Se não informada, gera UUID. */
  idempotencyKey?: string;
  /** Texto plano opcional. Se não informado, deriva do HTML. */
  text?: string;
  /** Nome interno do template para logging. Default: "raw-html" */
  templateLabel?: string;
}

export interface SendEmailResult {
  ok: boolean;
  status: number;
  data?: any;
  error?: string;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function sendLovableEmail({
  to,
  subject,
  html,
  idempotencyKey,
  text,
  templateLabel = "raw-html",
}: SendEmailParams): Promise<SendEmailResult> {
  if (!to || !subject || !html) {
    return { ok: false, status: 400, error: "to, subject e html são obrigatórios" };
  }

  const messageId = crypto.randomUUID();
  const idemKey = idempotencyKey || messageId;
  const recipient = to.trim();
  const normalizedEmail = recipient.toLowerCase();
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // 1. Suppression check
    const { data: suppressed, error: suppressionError } = await supabase
      .from("suppressed_emails")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (suppressionError) {
      console.error("Suppression check failed", suppressionError);
      return { ok: false, status: 500, error: "Failed to verify suppression" };
    }

    if (suppressed) {
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: templateLabel,
        recipient_email: recipient,
        status: "suppressed",
      });
      return { ok: true, status: 200, data: { suppressed: true } };
    }

    // 2. Get/create unsubscribe token
    let unsubscribeToken: string;
    const { data: existingToken } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token, used_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingToken && !existingToken.used_at) {
      unsubscribeToken = existingToken.token;
    } else if (!existingToken) {
      unsubscribeToken = generateToken();
      await supabase
        .from("email_unsubscribe_tokens")
        .upsert(
          { token: unsubscribeToken, email: normalizedEmail },
          { onConflict: "email", ignoreDuplicates: true },
        );
      const { data: storedToken } = await supabase
        .from("email_unsubscribe_tokens")
        .select("token")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (storedToken?.token) unsubscribeToken = storedToken.token;
    } else {
      // Token usado mas não veio na suppression — registra como suppressed
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: templateLabel,
        recipient_email: recipient,
        status: "suppressed",
      });
      return { ok: true, status: 200, data: { suppressed: true } };
    }

    // 3. Log pending
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateLabel,
      recipient_email: recipient,
      status: "pending",
    });

    // 4. Enqueue
    const plainText = text || htmlToPlainText(html);
    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: recipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text: plainText,
        purpose: "transactional",
        label: templateLabel,
        idempotency_key: idemKey,
        unsubscribe_token: unsubscribeToken!,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("enqueue_email failed", enqueueError);
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: templateLabel,
        recipient_email: recipient,
        status: "failed",
        error_message: enqueueError.message || "enqueue failed",
      });
      return { ok: false, status: 500, error: enqueueError.message || "enqueue failed" };
    }

    console.log("Email enqueued", { templateLabel, recipient, messageId });
    return { ok: true, status: 200, data: { queued: true, messageId } };
  } catch (err: any) {
    console.error("sendLovableEmail exception", err);
    return { ok: false, status: 500, error: err?.message || "unexpected error" };
  }
}
