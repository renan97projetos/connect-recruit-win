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

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
      notes,
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

    await client.send({
      from: GMAIL_USER!,
      to: candidateEmail,
      subject: `🎉 Proposta de emprego — ${jobTitle}`,
      content: "auto",
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; background:#FFFEF7; padding:24px; color:#0D0D0D;">
            <div style="max-width:560px; margin:0 auto; background:#ffffff; border:2px solid #0D0D0D; border-radius:12px; box-shadow:6px 6px 0 #0D0D0D; padding:32px;">
              <h1 style="margin:0 0 16px;">🎉 Você recebeu uma proposta!</h1>
              <p>Olá <strong>${candidateName || "candidato"}</strong>,</p>
              <p>A empresa <strong>${companyName || "Empresa"}</strong> registrou uma proposta para você na vaga <strong>${jobTitle}</strong>.</p>

              <div style="background:#F5F5F5; border:2px solid #0D0D0D; border-radius:8px; padding:16px; margin:20px 0;">
                ${offeredSalary != null ? `<p style="margin:4px 0;"><strong>Salário proposto:</strong> ${formatBRL(Number(offeredSalary))}</p>` : ""}
                ${benefits ? `<p style="margin:4px 0;"><strong>Benefícios:</strong> ${benefits}</p>` : ""}
                ${notes ? `<p style="margin:4px 0;"><strong>Observações:</strong> ${notes}</p>` : ""}
              </div>

              <p>Acesse seu painel para visualizar todos os detalhes e responder à proposta.</p>
              <p style="margin-top:24px;">
                <a href="https://www.sinapserh.com.br/candidate" style="background:#7C3AED; color:#fff; padding:12px 22px; border:2px solid #0D0D0D; border-radius:8px; box-shadow:4px 4px 0 #0D0D0D; text-decoration:none; font-weight:bold;">Ver proposta</a>
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
    console.error("send-job-offer-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
