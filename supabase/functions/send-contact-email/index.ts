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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, cnpj, vacancyCount, message, isFunnel, funnelData }: ContactRequest = await req.json();

    console.log('Processing contact email request from:', email);
    console.log('Is funnel lead:', isFunnel);

    // Get admin email from system_settings
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
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const adminEmail = settings.contact_email;

    console.log('Sending email to admin:', adminEmail);

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

    // Prepare email content based on type
    const getChallengeLabel = (challenge: string) => {
      const labels: Record<string, string> = {
        'volume': 'Alto volume de candidatos',
        'quality': 'Baixa qualidade dos candidatos',
        'time': 'Tempo gasto na triagem',
        'automation': 'Falta de automação'
      };
      return labels[challenge] || challenge;
    };

    const getFeatureLabel = (feature: string) => {
      const labels: Record<string, string> = {
        'screening': 'Triagem automática',
        'talent-pool': 'Banco de talentos',
        'video-interviews': 'Entrevistas por vídeo',
        'ats-integration': 'Integrações com ATS',
        'communication': 'Automação de comunicação'
      };
      return labels[feature] || feature;
    };

    const emailSubject = isFunnel 
      ? `🎯 NOVA LEAD QUALIFICADA - Funil de Prospecção - ${name}`
      : `Nova Solicitação de Contato - ${name}`;

    const emailBody = isFunnel && funnelData ? `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Relatório do Funil de Prospecção</title>
        </head>
        <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:16px 0;">
            <tr>
              <td align="center">
                <table width="640" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-collapse:collapse;border:1px solid #e5e5e5;">
                  <!-- Cabeçalho -->
                  <tr>
                    <td style="background-color:#2563eb;color:#ffffff;padding:20px 24px;text-align:left;">
                      <h1 style="margin:0;font-size:22px;">Relatório do Funil de Prospecção</h1>
                      <p style="margin:8px 0 0 0;font-size:13px;opacity:0.9;">Resumo das respostas e recomendações para a lead</p>
                    </td>
                  </tr>

                  <!-- Dados de contato -->
                  <tr>
                    <td style="padding:20px 24px 8px 24px;border-bottom:1px solid #e5e5e5;">
                      <h2 style="margin:0 0 10px 0;font-size:16px;color:#111827;">Dados de contato</h2>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#374151;">
                        <tr>
                          <td style="padding:4px 0;font-weight:bold;width:40%;">Nome completo</td>
                          <td style="padding:4px 0;text-align:right;">${name}</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;font-weight:bold;">E-mail</td>
                          <td style="padding:4px 0;text-align:right;"><a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a></td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;font-weight:bold;">Empresa</td>
                          <td style="padding:4px 0;text-align:right;">${funnelData.organization || 'Não informado'}</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;font-weight:bold;">Cargo</td>
                          <td style="padding:4px 0;text-align:right;">${funnelData.jobTitle || 'Não informado'}</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;font-weight:bold;">Telefone</td>
                          <td style="padding:4px 0;text-align:right;">${phone || 'Não informado'}</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;font-weight:bold;">País</td>
                          <td style="padding:4px 0;text-align:right;">${funnelData.country || 'Não informado'}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Respostas do funil -->
                  <tr>
                    <td style="padding:16px 24px 8px 24px;border-bottom:1px solid #e5e5e5;">
                      <h2 style="margin:0 0 10px 0;font-size:16px;color:#111827;">Respostas do funil</h2>

                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#374151;">
                        <tr>
                          <td colspan="2" style="padding:8px 0 4px 0;font-weight:bold;color:#111827;">1. Quantas vagas você abre por mês?</td>
                        </tr>
                        <tr>
                          <td style="padding:0 0 8px 0;">Resposta</td>
                          <td style="padding:0 0 8px 0;text-align:right;">${funnelData.vacancyVolume} vaga(s)/mês</td>
                        </tr>

                        <tr>
                          <td colspan="2" style="padding:8px 0 4px 0;font-weight:bold;color:#111827;">2. Qual é o tamanho da sua equipe de RH?</td>
                        </tr>
                        <tr>
                          <td style="padding:0 0 8px 0;">Resposta</td>
                          <td style="padding:0 0 8px 0;text-align:right;">${funnelData.teamSize} pessoas</td>
                        </tr>

                        <tr>
                          <td colspan="2" style="padding:8px 0 4px 0;font-weight:bold;color:#111827;">3. Maior desafio atual no processo seletivo</td>
                        </tr>
                        <tr>
                          <td style="padding:0 0 8px 0;">Resposta</td>
                          <td style="padding:0 0 8px 0;text-align:right;">${getChallengeLabel(funnelData.mainChallenge)}</td>
                        </tr>

                        <tr>
                          <td colspan="2" style="padding:8px 0 4px 0;font-weight:bold;color:#111827;">4. Funcionalidades consideradas essenciais</td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding:0 0 4px 0;">${funnelData.essentialFeatures.length} funcionalidade(s) selecionada(s):</td>
                        </tr>
                        ${funnelData.essentialFeatures
                          .map(
                            (feature, index) => `
                              <tr>
                                <td style="padding:2px 0 2px 8px;vertical-align:top;width:5%;">${index + 1}.</td>
                                <td style="padding:2px 0;vertical-align:top;">${getFeatureLabel(feature)}</td>
                              </tr>
                            `,
                          )
                          .join('')}
                      </table>
                    </td>
                  </tr>

                  <!-- Análise rápida -->
                  <tr>
                    <td style="padding:16px 24px;border-bottom:1px solid #e5e5e5;">
                      <h2 style="margin:0 0 10px 0;font-size:16px;color:#111827;">Análise rápida</h2>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#374151;">
                        <tr>
                          <td style="padding:4px 0;font-weight:bold;width:40%;">Fit aproximado</td>
                          <td style="padding:4px 0;text-align:right;">${Math.min(100, Math.round((funnelData.vacancyVolume / 50) * 100))}%</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;font-weight:bold;">Economia estimada de horas/mês</td>
                          <td style="padding:4px 0;text-align:right;">${Math.round(funnelData.vacancyVolume * 2.5)} horas</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;font-weight:bold;">Economia financeira estimada</td>
                          <td style="padding:4px 0;text-align:right;">R$ ${(funnelData.vacancyVolume * 150).toLocaleString('pt-BR')}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Próximos passos sugeridos -->
                  <tr>
                    <td style="padding:16px 24px 20px 24px;">
                      <h2 style="margin:0 0 10px 0;font-size:16px;color:#111827;">Próximos passos recomendados</h2>
                      <ol style="margin:0 0 8px 18px;padding:0;font-size:13px;color:#374151;">
                        <li style="margin-bottom:4px;">Entrar em contato com a lead em até 24 horas.</li>
                        <li style="margin-bottom:4px;">Agendar uma demonstração focada em: ${getChallengeLabel(funnelData.mainChallenge)}.</li>
                        <li style="margin-bottom:4px;">Preparar proposta destacando as funcionalidades essenciais selecionadas.</li>
                        <li style="margin-bottom:4px;">Apresentar cases de sucesso com volume semelhante (${funnelData.vacancyVolume} vaga(s)/mês).</li>
                      </ol>
                      <p style="margin:8px 0 0 0;font-size:12px;color:#6b7280;">
                        Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')}.<br />
                        Para responder à lead, basta responder diretamente para <strong>${email}</strong>.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
          Nova Solicitação de Contato
        </h1>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
          <h2 style="color: #0066cc; margin-top: 0;">Informações do Solicitante</h2>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Telefone:</strong> ${phone || 'Não informado'}</p>
          ${cnpj ? `<p><strong>CNPJ:</strong> ${cnpj}</p>` : ''}
          ${vacancyCount ? `<p><strong>Quantidade de Vagas:</strong> ${vacancyCount}</p>` : ''}
        </div>

        <div style="margin: 20px 0; padding: 15px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #0066cc; margin-top: 0;">Mensagem</h2>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          <p>Esta é uma mensagem automática do sistema de contato Sinapse Vagas.</p>
          <p>Para responder, utilize o botão "Responder" ou envie um email para: ${email}</p>
        </div>
      </div>
    `;

    // Send email using Gmail SMTP
    await client.send({
      from: GMAIL_USER!,
      to: adminEmail,
      replyTo: email,
      subject: emailSubject,
      content: "auto",
      html: emailBody,
    });

    await client.close();

    console.log("Email sent successfully via Gmail SMTP");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao enviar email' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
