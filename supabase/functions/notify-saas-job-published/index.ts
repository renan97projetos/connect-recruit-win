import { createClient } from "npm:@supabase/supabase-js@2";
import { sendLovableEmail } from "../_shared/send-lovable-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SAAS_NOTIFICATION_EMAIL = "suporte@sinapserh.com.br";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function escapeHtml(s: any): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtList(arr: any): string {
  if (!Array.isArray(arr) || arr.length === 0) return "<em>—</em>";
  return `<ul style="margin:4px 0 0 0;padding-left:18px">${
    arr
      .filter((x) => x && String(x).trim() !== "")
      .map((x) => `<li>${escapeHtml(x)}</li>`)
      .join("")
  }</ul>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    if (!jobId || typeof jobId !== "string") {
      return new Response(JSON.stringify({ error: "jobId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error || !job) {
      return new Response(JSON.stringify({ error: "Vaga não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar nome da empresa via profiles (fallback para company_name)
    let companyDisplay: string = job.company_name || "—";
    let companyEmail = "—";
    if (job.company_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", job.company_id)
        .maybeSingle();
      if (profile?.name) companyDisplay = profile.name;
      if ((profile as any)?.email) companyEmail = (profile as any).email;
    }

    const jobUrl = `https://www.sinapserh.com.br/jobs/${job.id}`;
    const locationLabel = job.is_remote
      ? "Remoto"
      : [job.city, job.state].filter(Boolean).join(", ") || "—";

    const subject = `Nova vaga publicada: ${job.title} — ${companyDisplay}`;

    const html = `
<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:Arial,sans-serif;color:#0D0D0D">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb">
      <h1 style="margin:0;font-size:20px;color:#0D0D0D">📢 Nova vaga publicada — divulgação manual</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#6b7280">
        Uma nova vaga foi publicada na plataforma SinapseRH e está pronta para ser divulgada nos canais externos.
      </p>
    </div>

    <div style="padding:20px 24px">
      <h2 style="margin:0 0 4px;font-size:18px">${escapeHtml(job.title)}</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:14px">${escapeHtml(companyDisplay)}</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#6b7280;width:170px">Empresa cliente</td><td>${escapeHtml(companyDisplay)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">E-mail da empresa</td><td>${escapeHtml(companyEmail)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Tipo de contrato</td><td>${escapeHtml(job.job_type || "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Modalidade</td><td>${escapeHtml(job.location || "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Localização</td><td>${escapeHtml(locationLabel)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Nível de experiência</td><td>${escapeHtml(job.experience_level || "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Anos mín. de experiência</td><td>${escapeHtml(job.min_experience_years ?? "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Área da vaga</td><td>${escapeHtml(job.job_area || "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Formação exigida</td><td>${escapeHtml([job.required_education_level, job.required_education_area].filter(Boolean).join(" — ") || "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Salário</td><td>${escapeHtml(fmtMoney(job.salary_min))}${job.salary_max ? ` — ${escapeHtml(fmtMoney(job.salary_max))}` : ""}</td></tr>
      </table>

      <h3 style="margin:20px 0 6px;font-size:15px">Descrição</h3>
      <div style="font-size:14px;line-height:1.5;color:#111;white-space:pre-wrap">${escapeHtml(job.description || "—")}</div>

      <h3 style="margin:20px 0 6px;font-size:15px">Requisitos</h3>
      ${fmtList(job.requirements)}

      <h3 style="margin:20px 0 6px;font-size:15px">Responsabilidades</h3>
      ${fmtList(job.responsibilities)}

      <h3 style="margin:20px 0 6px;font-size:15px">Benefícios</h3>
      ${fmtList(job.benefits)}

      <h3 style="margin:20px 0 6px;font-size:15px">Skills exigidas</h3>
      ${fmtList(job.required_skills)}

      <div style="margin-top:24px;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px">
        <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Link público da vaga:</p>
        <a href="${jobUrl}" style="font-size:14px;color:#2563eb;word-break:break-all">${jobUrl}</a>
      </div>
    </div>

    <div style="padding:14px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
      ID da vaga: ${escapeHtml(job.id)} · Publicada em ${new Date(job.created_at).toLocaleString("pt-BR")}
    </div>
  </div>
</body>
</html>`.trim();

    // Registra/atualiza a solicitação de publicação manual no backoffice
    await supabase
      .from("manual_publication_requests")
      .upsert(
        { job_id: job.id, status: "pending" },
        { onConflict: "job_id", ignoreDuplicates: true },
      );

    const result = await sendLovableEmail({
      to: SAAS_NOTIFICATION_EMAIL,
      subject,
      html,
      idempotencyKey: `saas-job-published-${job.id}`,
      templateLabel: "saas-job-published",
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-saas-job-published error", e);
    return new Response(JSON.stringify({ error: e?.message || "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
