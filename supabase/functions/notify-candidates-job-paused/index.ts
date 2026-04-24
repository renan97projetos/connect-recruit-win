import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  jobId: string;
  reason?: string;
  /** quando true, envia email avisando que a vaga foi reaberta/descongelada */
  resumed?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobId, reason, resumed }: Payload = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "Missing jobId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, title, company_name")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: applications, error: appsError } = await supabase
      .from("applications")
      .select("id, candidate_email, candidate_name")
      .eq("job_id", jobId);

    if (appsError) {
      return new Response(JSON.stringify({ error: appsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = (applications || []).filter(
      (a) => a.candidate_email && a.candidate_email.includes("@")
    );

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No candidates to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    let sent = 0;
    const errors: string[] = [];

    const reasonHtml = reason
      ? `<div style="background:#fff7e6;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:4px;">
           <p style="margin:0;font-size:14px;color:#333;"><strong>Mensagem da empresa:</strong> ${reason}</p>
         </div>`
      : "";

    const subject = resumed
      ? `Vaga reaberta — ${job.title}`
      : `Vaga congelada — ${job.title}`;

    const headline = resumed
      ? "foi <strong>reaberta</strong>"
      : "foi <strong>congelada (pausada) temporariamente</strong>";

    const body = resumed
      ? `Boas notícias! O processo seletivo foi retomado. Sua candidatura segue ativa e você poderá receber novas comunicações conforme o processo avança.`
      : `Sua candidatura permanece registrada, porém o processo seletivo está temporariamente <strong>pausado</strong>. Avisaremos assim que houver novidades ou caso a vaga seja reativada.`;

    for (const r of recipients) {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><meta charset="UTF-8" /></head>
          <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
            <div style="max-width:600px;margin:0 auto;background:white;">
              <div style="background:linear-gradient(135deg,hsl(222.2 47.4% 11.2%) 0%,hsl(222.2 47.4% 20%) 100%);color:white;padding:30px;text-align:center;">
                <h1 style="margin:0;font-size:24px;">SinapseRH</h1>
              </div>
              <div style="padding:30px;">
                <h2 style="margin:0 0 16px;font-size:20px;color:#111;">Olá, ${r.candidate_name || "candidato(a)"}</h2>
                <p style="font-size:15px;color:#444;">
                  Informamos que o processo seletivo para a vaga <strong>${job.title}</strong>
                  da empresa <strong>${job.company_name}</strong> ${headline}.
                </p>
                <p style="font-size:15px;color:#444;">${body}</p>
                ${reasonHtml}
                <p style="font-size:13px;color:#888;margin-top:30px;text-align:center;">
                  Este é um e-mail automático da plataforma SinapseRH.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        await client.send({
          from: GMAIL_USER!,
          to: r.candidate_email,
          subject,
          content: "auto",
          html,
        });
        sent++;
      } catch (err: any) {
        errors.push(`${r.candidate_email}: ${err?.message || String(err)}`);
      }
    }

    await client.close();

    return new Response(
      JSON.stringify({ success: true, sent, total: recipients.length, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-candidates-job-paused:", error);
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
