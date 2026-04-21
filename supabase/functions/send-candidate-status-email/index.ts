import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type StatusKey = "in-review" | "interview" | "approved" | "rejected";

interface StatusEmailRequest {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  newStatus: StatusKey;
  feedback?: string;
}

const STATUS_MESSAGES: Record<StatusKey, { subject: string; body: string }> = {
  "in-review": {
    subject: "Sua candidatura está sendo avaliada",
    body: "Recebemos sua candidatura e nossa equipe está analisando seu perfil. Entraremos em contato em breve.",
  },
  interview: {
    subject: "Você avançou para a próxima etapa!",
    body: "Parabéns! Seu perfil foi selecionado e você avançou no processo seletivo. Nossa equipe entrará em contato para combinar os próximos passos.",
  },
  approved: {
    subject: "Boa notícia sobre sua candidatura!",
    body: "Temos ótimas notícias! Você foi aprovado(a) no processo seletivo. Nossa equipe entrará em contato em breve com os próximos passos.",
  },
  rejected: {
    subject: "Atualização sobre sua candidatura",
    body: "Agradecemos seu interesse e o tempo dedicado ao processo seletivo. Após análise cuidadosa, não seguiremos com seu perfil neste momento. Guardamos seu currículo para oportunidades futuras.",
  },
};

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
      newStatus,
      feedback,
    }: StatusEmailRequest = await req.json();

    if (!candidateEmail || !candidateName || !jobTitle || !companyName || !newStatus) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const message = STATUS_MESSAGES[newStatus];
    if (!message) {
      return new Response(
        JSON.stringify({ error: `Invalid status: ${newStatus}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { subject, body } = message;

    const feedbackHtml = feedback
      ? `<div style="background:#fff7e6;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:4px;">
           <p style="margin:0;font-size:14px;color:#333;"><strong>Feedback:</strong> ${feedback}</p>
         </div>`
      : "";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
          <div style="max-width:600px;margin:0 auto;background:white;">
            <div style="background:linear-gradient(135deg,hsl(222.2 47.4% 11.2%) 0%,hsl(222.2 47.4% 20%) 100%);color:white;padding:30px;text-align:center;">
              <h1 style="margin:0;font-size:24px;">Sinapse RH</h1>
            </div>
            <div style="padding:30px;">
              <h2 style="margin:0 0 16px;font-size:20px;color:#111;">Olá, ${candidateName}</h2>
              <p style="font-size:15px;color:#444;">${body}</p>
              ${feedbackHtml}
              <div style="background:#f9f9f9;padding:16px;border-radius:6px;margin:20px 0;">
                <p style="margin:4px 0;font-size:14px;"><strong>Vaga:</strong> ${jobTitle}</p>
                <p style="margin:4px 0;font-size:14px;"><strong>Empresa:</strong> ${companyName}</p>
              </div>
              <p style="font-size:13px;color:#888;margin-top:30px;text-align:center;">
                Este é um e-mail automático da plataforma Sinapse RH.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER!,
          password: GMAIL_APP_PASSWORD!,
        },
      },
    });

    await client.send({
      from: GMAIL_USER!,
      to: candidateEmail,
      subject: `${subject} — ${jobTitle}`,
      content: "auto",
      html,
    });

    await client.close();

    console.log("Candidate status email sent to:", candidateEmail, "status:", newStatus);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-candidate-status-email:", error);
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
};

serve(handler);
