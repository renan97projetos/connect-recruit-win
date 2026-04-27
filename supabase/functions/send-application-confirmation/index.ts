import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendLovableEmail } from "../_shared/send-lovable-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  applicationId?: string;
}

const buildHtml = (content: string) => `
  <!DOCTYPE html>
  <html>
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <div style="max-width:600px;margin:0 auto;background:white;">
        <div style="background:linear-gradient(135deg,#1e1b4b 0%,#4c1d95 100%);color:white;padding:30px;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:700;">SinapseRH</h1>
          <p style="margin:6px 0 0;font-size:13px;opacity:0.8;">Recrutamento inteligente para PMEs</p>
        </div>
        <div style="padding:32px;">
          ${content}
        </div>
      </div>
    </body>
  </html>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateName, candidateEmail, jobTitle, companyName, applicationId }: Body = await req.json();

    if (!candidateEmail || !jobTitle) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = `
      <h2 style="margin:0 0 16px;font-size:20px;color:#111;">Olá, ${candidateName || "candidato"}! 👋</h2>
      <p style="font-size:15px;color:#444;margin:0 0 14px;">
        Recebemos a sua candidatura para a vaga de <strong>${jobTitle}</strong>${companyName ? ` na empresa <strong>${companyName}</strong>` : ""}.
      </p>
      <p style="font-size:15px;color:#444;margin:0 0 14px;">
        Nossa equipe analisará o seu perfil e você receberá um e-mail a cada atualização no processo seletivo.
      </p>
      <div style="background:#f5f3ff;border-left:4px solid #7c3aed;padding:14px 16px;border-radius:4px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#4c1d95;">
          💡 Dica: complete seu perfil para aumentar suas chances de aprovação. Candidatos com perfil 100% têm 3x mais chances de avançar.
        </p>
      </div>
      <p style="margin:24px 0 0;text-align:center;">
        <a href="https://www.sinapserh.com.br/candidate" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          Acompanhar minha candidatura →
        </a>
      </p>
    `;

    const result = await sendLovableEmail({
      to: candidateEmail,
      subject: `Candidatura recebida — ${jobTitle}`,
      html: buildHtml(content),
      idempotencyKey: `app-confirm-${applicationId || `${candidateEmail}-${jobTitle}`}`,
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
    console.error("send-application-confirmation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
