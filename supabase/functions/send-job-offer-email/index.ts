import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

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
  offeredSalary?: number | null;
  benefits?: string | null;
  notes?: string | null;
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
        <div style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999;">
            Este é um e-mail automático da plataforma SinapseRH. Por favor, não responda.
          </p>
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
    const {
      candidateName,
      candidateEmail,
      jobTitle,
      companyName,
      offeredSalary,
      benefits,
    }: Body = await req.json();

    if (!candidateEmail || !jobTitle) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: GMAIL_USER!, password: GMAIL_APP_PASSWORD! },
      },
    });

    const salaryNum = offeredSalary != null ? Number(offeredSalary) : null;

    const content = `
      <h2 style="margin:0 0 16px;font-size:20px;color:#111;">Você recebeu uma proposta! 🎉</h2>
      <p style="font-size:15px;color:#444;margin:0 0 14px;">
        Olá <strong>${candidateName || "candidato"}</strong>, a empresa <strong>${companyName || "Empresa"}</strong> registrou uma proposta para você na vaga de <strong>${jobTitle}</strong>.
      </p>
      ${salaryNum != null && !isNaN(salaryNum) ? `
      <div style="background:#f5f3ff;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Salário ofertado</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#4c1d95;">R$ ${salaryNum.toLocaleString('pt-BR')}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">por mês</p>
      </div>` : ''}
      ${benefits ? `
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 20px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;">Benefícios:</p>
        <p style="margin:0;font-size:14px;color:#4b5563;">${benefits}</p>
      </div>` : ''}
      <p style="font-size:15px;color:#444;margin:0 0 24px;">
        Entre em contato com a empresa para confirmar sua decisão.
      </p>
      <p style="margin:0;text-align:center;">
        <a href="https://www.sinapserh.com.br/candidate" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          Ver minha candidatura →
        </a>
      </p>
    `;

    await client.send({
      from: GMAIL_USER!,
      to: candidateEmail,
      subject: `🎉 Você recebeu uma proposta — ${jobTitle}`,
      content: "auto",
      html: buildHtml(content),
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-job-offer-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
