import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { sendLovableEmail } from "../_shared/send-lovable-email.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  jobId: string;
  type: 'request' | 'approved' | 'rejected';
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { jobId, type, reason }: Payload = await req.json();
    if (!jobId || !type) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, company_id, company_name, approver_id, approval_deadline_at')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let recipientEmail: string | null = null;
    let recipientName = '';
    const appUrl = req.headers.get('origin') || 'https://www.sinapserh.com.br';
    const jobLink = `${appUrl}/company/dashboard`;

    if (type === 'request') {
      if (!job.approver_id) {
        return new Response(JSON.stringify({ error: 'No approver set' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: approverProfile } = await supabase
        .from('profiles').select('name').eq('id', job.approver_id).maybeSingle();
      const { data: authUser } = await supabase.auth.admin.getUserById(job.approver_id);
      recipientEmail = authUser?.user?.email ?? null;
      recipientName = approverProfile?.name || 'Aprovador';
    } else {
      const { data: ownerProfile } = await supabase
        .from('profiles').select('name').eq('id', job.company_id).maybeSingle();
      const { data: authUser } = await supabase.auth.admin.getUserById(job.company_id);
      recipientEmail = authUser?.user?.email ?? null;
      recipientName = ownerProfile?.name || 'Recrutador';
    }

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'Recipient email not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let subject = '';
    let html = '';
    if (type === 'request') {
      const deadline = job.approval_deadline_at
        ? new Date(job.approval_deadline_at).toLocaleDateString('pt-BR') : '—';
      subject = `[Aprovação] Nova vaga: ${job.title}`;
      html = `
        <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
          <h2 style="margin:0 0 16px;color:#111">Nova vaga aguardando sua aprovação</h2>
          <p>Olá ${recipientName},</p>
          <p>Uma nova vaga foi submetida para aprovação:</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0;font-weight:600;font-size:16px">${job.title}</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:13px">${job.company_name}</p>
            <p style="margin:8px 0 0;color:#6b7280;font-size:13px">Prazo: <strong>${deadline}</strong></p>
          </div>
          <a href="${jobLink}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:500">Ver e decidir</a>
        </div>`;
    } else if (type === 'approved') {
      subject = `[Aprovada] Vaga "${job.title}" foi aprovada`;
      html = `
        <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
          <h2 style="margin:0 0 16px;color:#16a34a">✓ Vaga aprovada</h2>
          <p>Olá ${recipientName},</p>
          <p>A vaga <strong>${job.title}</strong> foi aprovada e já está publicada.</p>
          <a href="${jobLink}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:500;margin-top:12px">Abrir painel</a>
        </div>`;
    } else {
      subject = `[Reprovada] Vaga "${job.title}" foi devolvida`;
      html = `
        <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
          <h2 style="margin:0 0 16px;color:#dc2626">Vaga reprovada</h2>
          <p>Olá ${recipientName},</p>
          <p>A vaga <strong>${job.title}</strong> foi reprovada e voltou para rascunho.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0;font-size:12px;color:#991b1b;text-transform:uppercase;font-weight:600">Motivo</p>
            <p style="margin:6px 0 0;color:#111">${reason || '—'}</p>
          </div>
          <a href="${jobLink}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:500">Ajustar e reenviar</a>
        </div>`;
    }

    const result = await sendLovableEmail({
      to: recipientEmail,
      subject,
      html,
      idempotencyKey: `job-approval-${jobId}-${type}`,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
