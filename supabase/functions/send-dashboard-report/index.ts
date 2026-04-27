import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { sendLovableEmail } from "../_shared/send-lovable-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  companyId: string;
  periodStart?: string;
  periodEnd?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { companyId }: ReportRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('contact_email')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: 'Erro ao buscar configurações' }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminEmail = settings.contact_email;

    const { data: profile } = await supabase
      .from('profiles').select('name, company_name').eq('id', companyId).single();
    const companyName = profile?.company_name || profile?.name || 'Empresa';

    const { data: employees } = await supabase
      .from('employees').select('*').eq('company_id', companyId);

    const { data: requests } = await supabase
      .from('employee_requests')
      .select('*, employee:employees!inner(*)')
      .eq('employee.company_id', companyId).eq('status', 'pendente');

    const { data: trainings } = await supabase
      .from('employee_trainings')
      .select('*, employee:employees!inner(*)')
      .eq('employee.company_id', companyId).eq('status', 'pendente');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: occurrences } = await supabase
      .from('employee_occurrences')
      .select('*, employee:employees!inner(*)')
      .eq('employee.company_id', companyId)
      .gte('data_ocorrencia', thirtyDaysAgo)
      .order('data_ocorrencia', { ascending: false });

    const total = employees?.length || 0;
    const ativos = employees?.filter((e: any) => e.status === 'ativo').length || 0;
    const emFerias = employees?.filter((e: any) => e.status === 'em_ferias').length || 0;
    const afastados = employees?.filter((e: any) => e.status === 'afastado').length || 0;
    const desligados = employees?.filter((e: any) => e.status === 'desligado').length || 0;

    const asoAlerta = employees?.filter((e: any) => !e.status_aso || e.status_aso === 'Pendente').length || 0;

    const feriasProximas = employees?.filter((e: any) => {
      if (!e.proximas_ferias_previstas) return false;
      const dias = (new Date(e.proximas_ferias_previstas).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return dias > 0 && dias <= 60;
    }).length || 0;

    const taxaAtivacao = total > 0 ? Math.round((ativos / total) * 100) : 0;
    const reportDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    const html = `
      <div style="font-family:Segoe UI,Tahoma,sans-serif;max-width:800px;margin:0 auto;background:#f8f9fa;">
        <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:26px;">📊 Relatório de Gestão de RH</h1>
          <p style="color:#e0e7ff;margin:8px 0 0;font-size:15px;">${companyName}</p>
          <p style="color:#e0e7ff;margin:4px 0 0;font-size:13px;">${reportDate}</p>
        </div>
        <div style="background:#fff;padding:25px;">
          <h2 style="color:#667eea;border-bottom:2px solid #667eea;padding-bottom:8px;">📈 Visão Geral</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:14px;">
            <tr><td style="padding:10px;border:1px solid #e5e7eb;">Total de Colaboradores</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;">${total}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;">Taxa de Ativação</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:#10b981;">${taxaAtivacao}%</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;">Ativos</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;color:#10b981;">${ativos}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;">Em Férias</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;color:#f59e0b;">${emFerias}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;">Afastados</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;color:#ef4444;">${afastados}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;">Desligados</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;color:#6b7280;">${desligados}</td></tr>
          </table>
        </div>
        <div style="background:#fff;margin-top:14px;padding:25px;">
          <h2 style="color:#667eea;border-bottom:2px solid #667eea;padding-bottom:8px;">⚠️ Alertas e Pendências</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:14px;">
            <tr><td style="padding:10px;border:1px solid #e5e7eb;">📝 Solicitações Pendentes</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;">${requests?.length || 0}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;">🏥 ASO Pendentes/Vencidos</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:${asoAlerta > 0 ? '#b91c1c' : '#15803d'};">${asoAlerta}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;">🗓️ Férias próximas (60 dias)</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;">${feriasProximas}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;">🎓 Treinamentos Pendentes</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;">${trainings?.length || 0}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;">📋 Ocorrências (30 dias)</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;">${occurrences?.length || 0}</td></tr>
          </table>
        </div>
        <div style="background:#f8f9fa;padding:18px;text-align:center;border-radius:0 0 10px 10px;font-size:13px;color:#6b7280;">
          📧 Relatório automático SinapseRH
        </div>
      </div>`;

    const result = await sendLovableEmail({
      to: adminEmail,
      subject: `📊 Relatório RH - ${companyName} - ${reportDate}`,
      html,
      idempotencyKey: `dashboard-report-${companyId}-${new Date().toISOString().split('T')[0]}`,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-dashboard-report:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao enviar relatório' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
