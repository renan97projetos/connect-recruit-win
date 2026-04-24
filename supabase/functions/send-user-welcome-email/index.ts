import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  // Novo padrão (candidato)
  userId?: string;
  userName: string;
  userEmail: string;
  companyName?: string;
  // Padrão legado (usuário interno da empresa)
  companyId?: string;
  permissions?: string[];
  tempPassword?: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  'view_vagas': 'Ver vagas abertas',
  'create_vagas': 'Criar novas vagas',
  'edit_vagas': 'Editar vagas existentes',
  'publish_vagas': 'Publicar ou desativar vagas',
  'manage_candidatos': 'Visualizar e editar candidatos',
  'avaliar_candidatos': 'Inserir feedbacks ou notas',
  'view_dashboard': 'Acessar relatórios e indicadores',
  'manage_configuracoes': 'Alterar configurações da conta',
  'manage_usuarios': 'Criar ou remover usuários (somente Master)',
};

const buildHtml = (content: string) => `
  <!DOCTYPE html>
  <html>
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <div style="max-width:600px;margin:0 auto;background:white;">
        <div style="background:linear-gradient(135deg,#1e1b4b 0%,#4c1d95 100%);color:white;padding:30px;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:700;">SinapseRH</h1>
          <p style="margin:6px 0 0;font-size:13px;opacity:0.8;">Recrutamento inteligente para PMEs</p>
        </div>
        <div style="padding:32px;">
          ${content}
        </div>
        <div style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999;">
            Este é um e-mail automático da plataforma SinapseRH. Por favor, não responda.
          </p>
        </div>
      </div>
    </body>
  </html>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: WelcomeEmailRequest = await req.json();
    const { userName, userEmail, companyId, permissions, tempPassword } = body;
    let { companyName } = body;

    console.log('Sending welcome email to:', userEmail);

    // Detecta fluxo: usuário interno da empresa (legacy) vs candidato
    const isCompanyUserFlow = !!companyId && !!tempPassword && Array.isArray(permissions);

    if (isCompanyUserFlow) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, name')
        .eq('id', companyId!)
        .single();

      companyName = profile?.company_name || profile?.name || 'SinapseRH';
    }

    const safeCompanyName = companyName || 'SinapseRH';
    const loginUrl = `https://www.sinapserh.com.br/login`;
    const candidateUrl = `https://www.sinapserh.com.br/candidate`;

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: GMAIL_USER!, password: GMAIL_APP_PASSWORD! },
      },
    });

    let subject: string;
    let content: string;

    if (isCompanyUserFlow) {
      const permissionsList = (permissions || [])
        .map((p) => `<li style="margin:6px 0;color:#374151;">${PERMISSION_LABELS[p] || p}</li>`)
        .join('');

      subject = `Bem-vindo ao Sistema ${safeCompanyName}!`;
      content = `
        <h2 style="margin:0 0 16px;font-size:20px;color:#111;">Bem-vindo, ${userName}! 🎉</h2>
        <p style="font-size:15px;color:#444;margin:0 0 14px;">
          Você foi adicionado ao sistema de gestão da <strong>${safeCompanyName}</strong>.
        </p>
        <div style="background:#f5f3ff;border-left:4px solid #7c3aed;padding:14px 16px;border-radius:4px;margin:20px 0;">
          <p style="margin:4px 0;font-size:14px;color:#4c1d95;"><strong>📧 E-mail de acesso:</strong> ${userEmail}</p>
          <p style="margin:4px 0;font-size:14px;color:#4c1d95;"><strong>🔑 Senha temporária:</strong> ${tempPassword}</p>
        </div>
        <p style="font-size:14px;color:#444;margin:0 0 14px;">
          <strong>Importante:</strong> recomendamos alterar sua senha após o primeiro acesso.
        </p>
        <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">🔐 Permissões concedidas:</p>
          <ul style="margin:0;padding:0 0 0 20px;font-size:14px;">${permissionsList}</ul>
        </div>
        <p style="margin:24px 0 0;text-align:center;">
          <a href="${loginUrl}" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
            Acessar sistema →
          </a>
        </p>
      `;
    } else {
      subject = `Bem-vindo ao SinapseRH, ${userName}!`;
      content = `
        <h2 style="margin:0 0 16px;font-size:20px;color:#111;">Bem-vindo, ${userName}! 🎉</h2>
        <p style="font-size:15px;color:#444;margin:0 0 14px;">
          Sua conta no SinapseRH foi criada com sucesso. Agora você pode se candidatar a vagas, acompanhar seus processos seletivos e receber atualizações em tempo real.
        </p>
        <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 16px;border-radius:4px;margin:20px 0;">
          <p style="margin:0 0 6px;font-size:14px;color:#166534;font-weight:600;">Próximos passos:</p>
          <p style="margin:0;font-size:14px;color:#166534;">
            ✅ Complete seu perfil com experiências e habilidades<br/>
            ✅ Adicione seu currículo<br/>
            ✅ Explore as vagas disponíveis
          </p>
        </div>
        <p style="margin:24px 0 0;text-align:center;">
          <a href="${candidateUrl}" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
            Acessar meu painel →
          </a>
        </p>
      `;
    }

    await client.send({
      from: GMAIL_USER!,
      to: userEmail,
      subject,
      content: "auto",
      html: buildHtml(content),
    });

    await client.close();

    console.log("Welcome email sent successfully via Gmail SMTP");

    return new Response(
      JSON.stringify({ success: true, message: 'Email de boas-vindas enviado com sucesso' }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-user-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao enviar email' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
