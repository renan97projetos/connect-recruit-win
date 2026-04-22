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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyEmail, jobTitle, jobId, candidateName, candidateEmail, score }: Body = await req.json();

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

    const pipelineUrl = `https://www.sinapserh.com.br/company/jobs/${jobId}/pipeline`;

    await client.send({
      from: GMAIL_USER!,
      to: companyEmail,
      subject: `Novo candidato para ${jobTitle}`,
      content: "auto",
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; background:#FFFEF7; padding:24px; color:#0D0D0D;">
            <div style="max-width:560px; margin:0 auto; background:#ffffff; border:2px solid #0D0D0D; border-radius:12px; box-shadow:6px 6px 0 #0D0D0D; padding:32px;">
              <h1 style="margin:0 0 16px;">👤 Novo candidato!</h1>
              <p>Você recebeu uma nova candidatura para a vaga <strong>${jobTitle}</strong>.</p>
              <div style="background:#F5F5F5; border:2px solid #0D0D0D; border-radius:8px; padding:16px; margin:20px 0;">
                <p style="margin:4px 0;"><strong>Nome:</strong> ${candidateName}</p>
                <p style="margin:4px 0;"><strong>Email:</strong> ${candidateEmail}</p>
                ${score != null ? `<p style="margin:4px 0;"><strong>Pontuação inicial:</strong> ${score}/100</p>` : ""}
              </div>
              <p style="margin-top:24px;">
                <a href="${pipelineUrl}" style="background:#7C3AED; color:#fff; padding:12px 22px; border:2px solid #0D0D0D; border-radius:8px; box-shadow:4px 4px 0 #0D0D0D; text-decoration:none; font-weight:bold;">Ver no pipeline</a>
              </p>
              <p style="font-size:12px; color:#737373; margin-top:32px;">SinapseRH — notificação automática.</p>
            </div>
          </body>
        </html>
      `,
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
