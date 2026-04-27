import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendLovableEmail } from "../_shared/send-lovable-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  jobId: string;
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobId, reason }: Payload = await req.json();
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
           <p style="margin:0;font-size:14px;color:#333;"><strong>Motivo informado pela empresa:</strong> ${reason}</p>
         </div>`
      : "";

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
                  da empresa <strong>${job.company_name}</strong> foi <strong>cancelado</strong>.
                </p>
                <p style="font-size:15px;color:#444;">
                  Sua candidatura foi automaticamente encerrada. Agradecemos seu interesse e o tempo dedicado ao processo.
                </p>
                ${reasonHtml}
                <p style="font-size:14px;color:#555;">
                  Continue acompanhando novas oportunidades em nossa plataforma — seu currículo permanece disponível para futuras vagas compatíveis com seu perfil.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      const result = await sendLovableEmail({
        to: r.candidate_email,
        subject: `Vaga cancelada — ${job.title}`,
        html,
        idempotencyKey: `job-cancelled-${jobId}-${r.id}`,
      });
      if (result.ok) sent++;
      else errors.push(`${r.candidate_email}: ${result.error}`);
    }

    // Marca as candidaturas como rejeitadas (vaga não existe mais)
    await supabase
      .from("applications")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("job_id", jobId);

    return new Response(
      JSON.stringify({ success: true, sent, total: recipients.length, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-candidates-job-cancelled:", error);
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
