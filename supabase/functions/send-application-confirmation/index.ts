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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateName, candidateEmail, jobTitle, companyName }: Body = await req.json();

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

    await client.send({
      from: GMAIL_USER!,
      to: candidateEmail,
      subject: `Candidatura recebida: ${jobTitle}`,
      content: "auto",
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; background:#FFFEF7; padding:24px; color:#0D0D0D;">
            <div style="max-width:560px; margin:0 auto; background:#ffffff; border:2px solid #0D0D0D; border-radius:12px; box-shadow:6px 6px 0 #0D0D0D; padding:32px;">
              <h1 style="margin:0 0 16px;">🎉 Candidatura recebida!</h1>
              <p>Olá <strong>${candidateName || "candidato"}</strong>,</p>
              <p>Confirmamos o recebimento da sua candidatura para a vaga <strong>${jobTitle}</strong>${companyName ? ` na empresa <strong>${companyName}</strong>` : ""}.</p>
              <p>Nossa equipe analisará seu perfil e você receberá atualizações por email a cada movimentação no processo.</p>
              <p style="margin-top:24px;">
                <a href="https://www.sinapserh.com.br/candidate" style="background:#7C3AED; color:#fff; padding:12px 22px; border:2px solid #0D0D0D; border-radius:8px; box-shadow:4px 4px 0 #0D0D0D; text-decoration:none; font-weight:bold;">Acompanhar minhas candidaturas</a>
              </p>
              <p style="font-size:12px; color:#737373; margin-top:32px;">Este é um email automático do SinapseRH.</p>
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
    console.error("send-application-confirmation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
