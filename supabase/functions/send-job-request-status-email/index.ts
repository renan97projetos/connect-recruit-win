import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendLovableEmail } from "../_shared/send-lovable-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action = "approved" | "rejected" | "published";

interface Body {
  recipientEmail: string;
  recipientName?: string | null;
  positionTitle: string;
  action: Action;
  reason?: string | null;
  requestId: string;
}

const TITLES: Record<Action, string> = {
  approved: "✅ Requisição aprovada",
  rejected: "❌ Requisição rejeitada",
  published: "🚀 Vaga publicada",
};

const MESSAGES: Record<Action, string> = {
  approved: "Sua requisição foi aprovada e seguirá para a próxima etapa do processo.",
  rejected: "Sua requisição foi rejeitada. Veja o motivo abaixo e ajuste se necessário.",
  published: "A vaga foi aprovada e publicada. Os candidatos já podem se inscrever.",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, recipientName, positionTitle, action, reason, requestId }: Body = await req.json();

    if (!recipientEmail || !positionTitle || !action) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://www.sinapserh.com.br/company/job-requests/${requestId}`;
    const html = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; background:#FFFEF7; padding:24px; color:#0D0D0D;">
            <div style="max-width:560px; margin:0 auto; background:#ffffff; border:2px solid #0D0D0D; border-radius:12px; box-shadow:6px 6px 0 #0D0D0D; padding:32px;">
              <h1 style="margin:0 0 16px;">${TITLES[action]}</h1>
              <p>Olá${recipientName ? ` <strong>${recipientName}</strong>` : ""},</p>
              <p>${MESSAGES[action]}</p>
              <div style="background:#F5F5F5; border:2px solid #0D0D0D; border-radius:8px; padding:16px; margin:20px 0;">
                <p style="margin:4px 0;"><strong>Vaga:</strong> ${positionTitle}</p>
                ${reason ? `<p style="margin:4px 0;"><strong>Motivo:</strong> ${reason}</p>` : ""}
              </div>
              <p style="margin-top:24px;">
                <a href="${url}" style="background:#7C3AED; color:#fff; padding:12px 22px; border:2px solid #0D0D0D; border-radius:8px; box-shadow:4px 4px 0 #0D0D0D; text-decoration:none; font-weight:bold;">Ver requisição</a>
              </p>
            </div>
          </body>
        </html>
      `;

    const result = await sendLovableEmail({
      to: recipientEmail,
      subject: `${TITLES[action]} — ${positionTitle}`,
      html,
      idempotencyKey: `job-req-${requestId}-${action}`,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-job-request-status-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
