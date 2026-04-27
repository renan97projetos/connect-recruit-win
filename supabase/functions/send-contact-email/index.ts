import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { sendLovableEmail } from "../_shared/send-lovable-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  phone: string;
  cnpj?: string;
  vacancyCount?: number;
  message: string;
  isFunnel?: boolean;
  funnelData?: {
    vacancyVolume: number;
    teamSize: string;
    mainChallenge: string;
    essentialFeatures: string[];
    organization?: string;
    jobTitle?: string;
    country?: string;
  };
}

const getChallengeLabel = (challenge: string) => {
  const labels: Record<string, string> = {
    'volume': 'Alto volume de candidatos',
    'quality': 'Baixa qualidade dos candidatos',
    'time': 'Tempo gasto na triagem',
    'automation': 'Falta de automação',
  };
  return labels[challenge] || challenge;
};

const getFeatureLabel = (feature: string) => {
  const labels: Record<string, string> = {
    'screening': 'Triagem automática',
    'talent-pool': 'Banco de talentos',
    'video-interviews': 'Entrevistas por vídeo',
    'ats-integration': 'Integrações com ATS',
    'communication': 'Automação de comunicação',
  };
  return labels[feature] || feature;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, email, phone, cnpj, vacancyCount, message, isFunnel, funnelData }: ContactRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('contact_email')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (settingsError || !settings) {
      console.error('Error fetching system settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar configurações do sistema' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminEmail = settings.contact_email;

    const emailSubject = isFunnel
      ? `🎯 NOVA LEAD QUALIFICADA - Funil - ${name}`
      : `Nova Solicitação de Contato - ${name}`;

    const emailBody = isFunnel && funnelData ? `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;border:1px solid #e5e5e5;">
        <div style="background:#2563eb;color:#fff;padding:20px 24px;">
          <h1 style="margin:0;font-size:22px;">Relatório do Funil de Prospecção</h1>
          <p style="margin:8px 0 0 0;font-size:13px;opacity:.9;">Resumo das respostas e recomendações para a lead</p>
        </div>
        <div style="padding:20px 24px;border-bottom:1px solid #e5e5e5;">
          <h2 style="margin:0 0 10px;font-size:16px;color:#111;">Dados de contato</h2>
          <p style="margin:4px 0;"><strong>Nome:</strong> ${name}</p>
          <p style="margin:4px 0;"><strong>E-mail:</strong> <a href="mailto:${email}" style="color:#2563eb;">${email}</a></p>
          <p style="margin:4px 0;"><strong>Empresa:</strong> ${funnelData.organization || '—'}</p>
          <p style="margin:4px 0;"><strong>Cargo:</strong> ${funnelData.jobTitle || '—'}</p>
          <p style="margin:4px 0;"><strong>Telefone:</strong> ${phone || '—'}</p>
          <p style="margin:4px 0;"><strong>País:</strong> ${funnelData.country || '—'}</p>
        </div>
        <div style="padding:16px 24px;border-bottom:1px solid #e5e5e5;font-size:13px;color:#374151;">
          <h2 style="margin:0 0 10px;font-size:16px;color:#111;">Respostas do funil</h2>
          <p><strong>1. Vagas/mês:</strong> ${funnelData.vacancyVolume}</p>
          <p><strong>2. Equipe RH:</strong> ${funnelData.teamSize} pessoas</p>
          <p><strong>3. Maior desafio:</strong> ${getChallengeLabel(funnelData.mainChallenge)}</p>
          <p><strong>4. Funcionalidades essenciais (${funnelData.essentialFeatures.length}):</strong></p>
          <ul>${funnelData.essentialFeatures.map(f => `<li>${getFeatureLabel(f)}</li>`).join('')}</ul>
        </div>
        <div style="padding:16px 24px;font-size:13px;color:#374151;">
          <h2 style="margin:0 0 10px;font-size:16px;color:#111;">Análise rápida</h2>
          <p><strong>Fit aproximado:</strong> ${Math.min(100, Math.round((funnelData.vacancyVolume / 50) * 100))}%</p>
          <p><strong>Economia estimada:</strong> ${Math.round(funnelData.vacancyVolume * 2.5)} h/mês — R$ ${(funnelData.vacancyVolume * 150).toLocaleString('pt-BR')}</p>
          <p style="margin-top:14px;font-size:12px;color:#6b7280;">Gerado em ${new Date().toLocaleString('pt-BR')}. Responder para <strong>${email}</strong>.</p>
        </div>
      </div>
    ` : `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h1 style="color:#333;border-bottom:2px solid #0066cc;padding-bottom:10px;">Nova Solicitação de Contato</h1>
        <div style="margin:20px 0;padding:15px;background:#f5f5f5;border-radius:5px;">
          <h2 style="color:#0066cc;margin-top:0;">Informações do Solicitante</h2>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Telefone:</strong> ${phone || '—'}</p>
          ${cnpj ? `<p><strong>CNPJ:</strong> ${cnpj}</p>` : ''}
          ${vacancyCount ? `<p><strong>Vagas:</strong> ${vacancyCount}</p>` : ''}
        </div>
        <div style="margin:20px 0;padding:15px;border:1px solid #ddd;border-radius:5px;">
          <h2 style="color:#0066cc;margin-top:0;">Mensagem</h2>
          <p style="white-space:pre-wrap;">${message}</p>
        </div>
        <p style="font-size:12px;color:#666;margin-top:20px;">Responder diretamente para: ${email}</p>
      </div>
    `;

    const result = await sendLovableEmail({
      to: adminEmail,
      subject: emailSubject,
      html: emailBody,
      idempotencyKey: `contact-${email}-${Date.now()}`,
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
    console.error("Error in send-contact-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao enviar email' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
