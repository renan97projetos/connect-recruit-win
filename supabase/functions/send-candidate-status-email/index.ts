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
  customSubject?: string | null;
  customBody?: string | null;
}

const STATUS_MESSAGES: Record<StatusKey, { subject: string; body: string }> = {
  "in-review": {
    subject: "Sua candidatura está sendo analisada",
    body: "Olá {{candidato_nome}},\n\nRecebemos o seu perfil para a vaga de {{vaga_titulo}} em {{empresa_nome}} e nossa equipe já está fazendo a análise.\n\nVocê receberá um e-mail assim que houver uma atualização no seu processo seletivo.",
  },
  interview: {
    subject: "Parabéns! Você avançou no processo seletivo",
    body: "Olá {{candidato_nome}},\n\nÓtimas notícias! Você avançou no processo seletivo para a vaga de {{vaga_titulo}} em {{empresa_nome}}.\n\nNossa equipe entrará em contato para combinar os próximos passos. Fique atento ao seu e-mail e WhatsApp.",
  },
  approved: {
    subject: "Você foi aprovado(a)! 🎉",
    body: "Olá {{candidato_nome}},\n\nTemos ótimas notícias para você! Após todo o processo seletivo, você foi aprovado(a) para a vaga de {{vaga_titulo}} em {{empresa_nome}}.\n\nNossa equipe entrará em contato em breve com os próximos passos para formalizar a sua contratação.\n\nParabéns e seja bem-vindo(a)!",
  },
  rejected: {
    subject: "Obrigado pela sua participação",
    body: "Olá {{candidato_nome}},\n\nAgradecemos muito o seu interesse em fazer parte de {{empresa_nome}} e o tempo que dedicou ao processo seletivo para a vaga de {{vaga_titulo}}.\n\nApós uma análise cuidadosa de todos os perfis, optamos por seguir com candidatos cujas experiências estão mais alinhadas ao que buscamos neste momento.\n\nEssa decisão não reflete seu valor profissional. Guardamos o seu cadastro e, caso surja uma oportunidade compatível com o seu perfil, entraremos em contato.\n\nDesejamos muito sucesso na sua carreira.\n\nEquipe de Recrutamento\n{{empresa_nome}}",
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
      customSubject,
      customBody,
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

    const rawSubject = (customSubject && customSubject.trim()) ? customSubject : message.subject;
    const rawBody = (customBody && customBody.trim()) ? customBody : message.body;

    const replaceVars = (str: string) =>
      str
        .replace(/\{\{candidato_nome\}\}/g, candidateName)
        .replace(/\{\{vaga_titulo\}\}/g, jobTitle)
        .replace(/\{\{empresa_nome\}\}/g, companyName);

    const subject = replaceVars(rawSubject);
    const body = replaceVars(rawBody);
    const bodyHtml = body
      .split(/\n\n+/)
      .map((p) => `<p style="font-size:15px;color:#444;margin:0 0 14px;">${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");

    const feedbackHtml = feedback
      ? `<div style="background:#fff7e6;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:4px;">
           <p style="margin:0;font-size:14px;color:#333;"><strong>Feedback:</strong> ${feedback}</p>
         </div>`
      : "";

    const content = `
      ${bodyHtml}
      ${feedbackHtml}
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:4px 0;font-size:14px;color:#374151;"><strong>Vaga:</strong> ${jobTitle}</p>
        <p style="margin:4px 0;font-size:14px;color:#374151;"><strong>Empresa:</strong> ${companyName}</p>
      </div>
    `;

    const html = `
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
