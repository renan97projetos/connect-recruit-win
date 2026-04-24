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
  companyEmail: string;
  jobTitle: string;
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  score?: number | null;
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
    const { companyEmail, jobTitle, candidateName, candidateEmail, score }: Body = await req.json();

    if (!companyEmail || !jobTitle) {
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

    const content = `
      <h2 style="margin:0 0 16px;font-size:20px;color:#111;">Novo candidato! 👤</h2>
      <p style="font-size:15px;color:#444;margin:0 0 14px;">
        Um novo candidato se inscreveu para a vaga de <strong>${jobTitle}</strong>.
      </p>
      <div style="background:#f5f3ff;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:4px 0;font-size:14px;color:#374151;"><strong>Nome:</strong> ${candidateName}</p>
        <p style="margin:4px 0;font-size:14px;color:#374151;"><strong>E-mail:</strong> ${candidateEmail}</p>
        ${score != null ? `<p style="margin:4px 0;font-size:14px;color:#374151;"><strong>Score:</strong> ${score}/100</p>` : ""}
      </div>
      <p style="margin:0;text-align:center;">
        <a href="https://www.sinapserh.com.br/company/dashboard" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          Ver no painel →
        </a>
      </p>
    `;

    await client.send({
      from: GMAIL_USER!,
      to: companyEmail,
      subject: `Novo candidato para ${jobTitle}`,
      content: "auto",
      html: buildHtml(content),
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-new-application-notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
