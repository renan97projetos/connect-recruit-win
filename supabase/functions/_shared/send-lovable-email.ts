// Helper compartilhado para enviar emails via Lovable Email (send-transactional-email).
// Substitui chamadas diretas a Resend/Gmail.
//
// Uso:
//   import { sendLovableEmail } from "../_shared/send-lovable-email.ts";
//   await sendLovableEmail({ to: "user@example.com", subject: "Olá", html: "<p>...</p>" });

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  /** Chave única para deduplicação. Se não informada, gera UUID. */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  ok: boolean;
  status: number;
  data?: any;
  error?: string;
}

export async function sendLovableEmail({
  to,
  subject,
  html,
  idempotencyKey,
}: SendEmailParams): Promise<SendEmailResult> {
  if (!to || !subject || !html) {
    return { ok: false, status: 400, error: "to, subject e html são obrigatórios" };
  }

  const key = idempotencyKey || crypto.randomUUID();

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/functions/v1/send-transactional-email`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateName: "raw-html",
          recipientEmail: to,
          idempotencyKey: key,
          templateData: { subject, html },
        }),
      },
    );

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("sendLovableEmail failed", resp.status, data);
      return { ok: false, status: resp.status, error: data?.error || "send failed", data };
    }
    return { ok: true, status: resp.status, data };
  } catch (err: any) {
    console.error("sendLovableEmail exception", err);
    return { ok: false, status: 500, error: err?.message || "network error" };
  }
}
