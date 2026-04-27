import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendLovableEmail } from "../_shared/send-lovable-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  offeredSalary?: number | null;
  benefits?: string | null;
  notes?: string | null;
  applicationId?: string;
}

const buildHtml = (content: string) => `
  <!DOCTYPE html>
  <html><head><meta charset="UTF-8" /></head>
    <body style="font-family:-apple-system,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <div style="max-width:600px;margin:0 auto;background:white;">
        <div style="background:linear-gradient(135deg,#1e1b4b,#4c1d95);color:white;padding:30px;text-align:center;">
          <h1 style="margin:0;font-size:22px;">SinapseRH</h1>
        </div>
        <div style="padding:32px;">${content}</div>
      </div>
    </body>
  </html>
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { candidateName, candidateEmail, jobTitle, companyName, offeredSalary, benefits, applicationId }: Body = await req.json();
    if (!candidateEmail || !jobTitle) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const salaryNum = offeredSalary != null ? Number(offeredSalary) : null;
    const content = `
      <h2 style="margin:0 0 16px;font-size:20px;color:#111;">Você recebeu uma proposta! 🎉</h2>
      <p style="font-size:15px;color:#444;">Olá <strong>${candidateName || "candidato"}</strong>, a empresa <strong>${companyName || "Empresa"}</strong> registrou uma proposta para você na vaga de <strong>${jobTitle}</strong>.</p>
      ${salaryNum != null && !isNaN(salaryNum) ? `
      <div style="background:#f5f3ff;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <p style="margin:0;font-size:13px;color:#6b7280;">Salário ofertado</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#4c1d95;">R$ ${salaryNum.toLocaleString('pt-BR')}</p>
      </div>` : ''}
      ${benefits ? `<div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 20px;"><p style="margin:0 0 6px;font-weight:600;">Benefícios:</p><p style="margin:0;font-size:14px;">${benefits}</p></div>` : ''}
      <p style="text-align:center;"><a href="https://www.sinapserh.com.br/candidate" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Ver minha candidatura →</a></p>
    `;
    const result = await sendLovableEmail({
      to: candidateEmail,
      subject: `🎉 Você recebeu uma proposta — ${jobTitle}`,
      html: buildHtml(content),
      idempotencyKey: `job-offer-${applicationId || `${candidateEmail}-${jobTitle}`}`,
    });
    if (!result.ok) return new Response(JSON.stringify({ error: result.error }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("send-job-offer-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
