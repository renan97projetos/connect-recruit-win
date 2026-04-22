import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  companyId: string;
  periodStart?: string;
  periodEnd?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, periodStart, periodEnd }: ReportRequest = await req.json();

    console.log('Processing dashboard report request for company:', companyId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get admin email from system_settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('contact_email')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (settingsError || !settings) {
      console.error('Error fetching system settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar configurações do sistema' }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const adminEmail = settings.contact_email;

    // Get company profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, company_name')
      .eq('id', companyId)
      .single();

    const companyName = profile?.company_name || profile?.name || 'Empresa';

    console.log('Fetching metrics for company:', companyName);

    // Fetch all employees
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId);

    // Fetch pending requests
    const { data: requests } = await supabase
      .from('employee_requests')
      .select('*, employee:employees!inner(*)')
      .eq('employee.company_id', companyId)
      .eq('status', 'pendente');

    // Fetch pending trainings
    const { data: trainings } = await supabase
      .from('employee_trainings')
      .select('*, employee:employees!inner(*)')
      .eq('employee.company_id', companyId)
      .eq('status', 'pendente');

    // Fetch recent occurrences (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: occurrences } = await supabase
      .from('employee_occurrences')
      .select('*, employee:employees!inner(*)')
      .eq('employee.company_id', companyId)
      .gte('data_ocorrencia', thirtyDaysAgo)
      .order('data_ocorrencia', { ascending: false });

    // Calculate metrics
    const total = employees?.length || 0;
    const ativos = employees?.filter((e: any) => e.status === 'ativo').length || 0;
    const emFerias = employees?.filter((e: any) => e.status === 'em_ferias').length || 0;
    const afastados = employees?.filter((e: any) => e.status === 'afastado').length || 0;
    const desligados = employees?.filter((e: any) => e.status === 'desligado').length || 0;
    
    // ASO alerts
    const asoAlerta = employees?.filter((e: any) => {
      if (!e.status_aso || e.status_aso === 'Pendente') return true;
      return false;
    }).length || 0;

    // Upcoming vacations (next 60 days)
    const feriasProximas = employees?.filter((e: any) => {
      if (!e.proximas_ferias_previstas) return false;
      const dataFerias = new Date(e.proximas_ferias_previstas);
      const hoje = new Date();
      const diff = dataFerias.getTime() - hoje.getTime();
      const dias = diff / (1000 * 60 * 60 * 24);
      return dias > 0 && dias <= 60;
    }).length || 0;

    const taxaAtivacao = total > 0 ? Math.round((ativos / total) * 100) : 0;

    console.log('Sending report email to admin:', adminEmail);

    // Configure SMTP client for Gmail
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

    const reportDate = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const emailSubject = `📊 Relatório RH - ${companyName} - ${reportDate}`;

    const emailBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; background-color: #f8f9fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
            📊 Relatório de Gestão de RH
          </h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">${companyName}</p>
          <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 14px;">${reportDate}</p>
        </div>

        <!-- Summary Cards -->
        <div style="background-color: white; padding: 25px;">
          <h2 style="color: #667eea; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px; font-size: 20px;">
            📈 Visão Geral
          </h2>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
            <!-- Total Collaborators -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; color: white;">
              <div style="font-size: 14px; opacity: 0.9;">Total de Colaboradores</div>
              <div style="font-size: 32px; font-weight: bold; margin-top: 5px;">${total}</div>
            </div>

            <!-- Active Rate -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 10px; color: white;">
              <div style="font-size: 14px; opacity: 0.9;">Taxa de Ativação</div>
              <div style="font-size: 32px; font-weight: bold; margin-top: 5px;">${taxaAtivacao}%</div>
            </div>

            <!-- Active -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px; border-radius: 10px; color: white;">
              <div style="font-size: 14px; opacity: 0.9;">Colaboradores Ativos</div>
              <div style="font-size: 32px; font-weight: bold; margin-top: 5px;">${ativos}</div>
            </div>

            <!-- On Vacation -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 10px; color: white;">
              <div style="font-size: 14px; opacity: 0.9;">Em Férias</div>
              <div style="font-size: 32px; font-weight: bold; margin-top: 5px;">${emFerias}</div>
            </div>
          </div>
        </div>

        <!-- Detailed Metrics -->
        <div style="background-color: white; margin: 20px 0; padding: 25px; border-radius: 10px;">
          <h2 style="color: #667eea; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px; font-size: 20px;">
            📋 Métricas Detalhadas
          </h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Status</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">Quantidade</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">👤 Ativos</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: #10b981; font-weight: bold;">${ativos}</td>
            </tr>
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 12px; border: 1px solid #e5e7eb;">🏖️ Em Férias</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: #f59e0b; font-weight: bold;">${emFerias}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">🏥 Afastados</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: #ef4444; font-weight: bold;">${afastados}</td>
            </tr>
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 12px; border: 1px solid #e5e7eb;">📤 Desligados</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: #6b7280; font-weight: bold;">${desligados}</td>
            </tr>
          </table>
        </div>

        <!-- Alerts & Notifications -->
        <div style="background-color: white; margin: 20px 0; padding: 25px; border-radius: 10px;">
          <h2 style="color: #667eea; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px; font-size: 20px;">
            ⚠️ Alertas e Pendências
          </h2>

          <div style="margin-top: 20px;">
            <!-- Pending Requests -->
            <div style="padding: 15px; background: ${requests && requests.length > 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'}; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid ${requests && requests.length > 0 ? '#f59e0b' : '#0ea5e9'};">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h3 style="margin: 0; font-size: 16px; color: ${requests && requests.length > 0 ? '#b45309' : '#0369a1'};">📝 Solicitações Pendentes</h3>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Requerem atenção</p>
                </div>
                <div style="font-size: 28px; font-weight: bold; color: ${requests && requests.length > 0 ? '#b45309' : '#0369a1'};">${requests?.length || 0}</div>
              </div>
            </div>

            <!-- ASO Alerts -->
            <div style="padding: 15px; background: ${asoAlerta > 0 ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'}; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid ${asoAlerta > 0 ? '#ef4444' : '#22c55e'};">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h3 style="margin: 0; font-size: 16px; color: ${asoAlerta > 0 ? '#b91c1c' : '#15803d'};">🏥 ASO Pendentes/Vencidos</h3>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Atualização necessária</p>
                </div>
                <div style="font-size: 28px; font-weight: bold; color: ${asoAlerta > 0 ? '#b91c1c' : '#15803d'};">${asoAlerta}</div>
              </div>
            </div>

            <!-- Upcoming Vacations -->
            <div style="padding: 15px; background: ${feriasProximas > 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'}; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid ${feriasProximas > 0 ? '#f59e0b' : '#0ea5e9'};">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h3 style="margin: 0; font-size: 16px; color: ${feriasProximas > 0 ? '#b45309' : '#0369a1'};">🗓️ Férias Próximas (60 dias)</h3>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Planejamento necessário</p>
                </div>
                <div style="font-size: 28px; font-weight: bold; color: ${feriasProximas > 0 ? '#b45309' : '#0369a1'};">${feriasProximas}</div>
              </div>
            </div>

            <!-- Pending Trainings -->
            <div style="padding: 15px; background: ${trainings && trainings.length > 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'}; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid ${trainings && trainings.length > 0 ? '#f59e0b' : '#0ea5e9'};">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h3 style="margin: 0; font-size: 16px; color: ${trainings && trainings.length > 0 ? '#b45309' : '#0369a1'};">🎓 Treinamentos Pendentes</h3>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Capacitação da equipe</p>
                </div>
                <div style="font-size: 28px; font-weight: bold; color: ${trainings && trainings.length > 0 ? '#b45309' : '#0369a1'};">${trainings?.length || 0}</div>
              </div>
            </div>

            <!-- Recent Occurrences -->
            <div style="padding: 15px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; border-left: 4px solid #0ea5e9;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h3 style="margin: 0; font-size: 16px; color: #0369a1;">📋 Ocorrências Recentes (30 dias)</h3>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Registro de eventos</p>
                </div>
                <div style="font-size: 28px; font-weight: bold; color: #0369a1;">${occurrences?.length || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            📧 Este relatório foi gerado automaticamente pelo sistema SinapseRH<br>
            Para acessar informações detalhadas, faça login no sistema
          </p>
        </div>
      </div>
    `;

    // Send email using Gmail SMTP
    await client.send({
      from: GMAIL_USER!,
      to: adminEmail,
      subject: emailSubject,
      content: "auto",
      html: emailBody,
    });

    await client.close();

    console.log("Report email sent successfully via Gmail SMTP");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-dashboard-report function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao enviar relatório' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);