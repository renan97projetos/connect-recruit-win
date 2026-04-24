import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentsEmailRequest {
  applicationId: string;
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
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
    const { applicationId, candidateEmail, candidateName, jobTitle }: DocumentsEmailRequest = await req.json();

    const uploadUrl = `https://www.sinapserh.com.br/upload-documents/${applicationId}`;

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: GMAIL_USER!, password: GMAIL_APP_PASSWORD! },
      },
    });

    const content = `
      <h2 style="margin:0 0 16px;font-size:20px;color:#111;">Parabéns pela aprovação! 🎉</h2>
      <p style="font-size:15px;color:#444;margin:0 0 14px;">
        Olá <strong>${candidateName}</strong>, você está na etapa final do processo seletivo para a vaga de <strong>${jobTitle}</strong>.
      </p>
      <p style="font-size:15px;color:#444;margin:0 0 20px;">
        Para prosseguir com a contratação, precisamos que você envie os seguintes documentos:
      </p>
      <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:0 0 20px;">
        <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:#374151;line-height:2;">
          <li>RG ou CNH (frente e verso)</li>
          <li>CPF</li>
          <li>Comprovante de residência (últimos 3 meses)</li>
          <li>Carteira de Trabalho (física ou digital)</li>
          <li>PIS/PASEP</li>
          <li>Comprovante de escolaridade</li>
          <li>Foto 3x4 recente</li>
          <li>Dados bancários (para depósito de salário)</li>
        </ul>
      </div>
      <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">
        Envie os documentos pelo link abaixo. Em caso de dúvidas, entre em contato com nossa equipe de RH.
      </p>
      <p style="margin:0;text-align:center;">
        <a href="${uploadUrl}" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          Enviar meus documentos →
        </a>
      </p>
    `;

    await client.send({
      from: GMAIL_USER!,
      to: candidateEmail,
      subject: `Documentos necessários para sua contratação — ${jobTitle}`,
      content: "auto",
      html: buildHtml(content),
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: 'Email enviado com sucesso' }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-hiring-documents-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao enviar email' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
