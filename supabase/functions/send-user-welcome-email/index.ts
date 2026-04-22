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
  userName: string;
  userEmail: string;
  companyId: string;
  permissions: string[];
  tempPassword: string;
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, userEmail, companyId, permissions, tempPassword }: WelcomeEmailRequest = await req.json();

    console.log('Sending welcome email to:', userEmail);

    // Get company name from profiles
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, name')
      .eq('id', companyId)
      .single();

    const companyName = profile?.company_name || profile?.name || 'SinapseRH';
    const loginUrl = `https://www.sinapserh.com.br/login`;

    // Format permissions list
    const permissionsList = permissions
      .map(p => `<li>${PERMISSION_LABELS[p] || p}</li>`)
      .join('');

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

    // Send welcome email
    await client.send({
      from: GMAIL_USER!,
      to: userEmail,
      subject: `Bem-vindo ao Sistema ${companyName}!`,
      content: "auto",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, hsl(222.2 47.4% 11.2%) 0%, hsl(222.2 47.4% 20%) 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
              .button { display: inline-block; background: hsl(222.2 47.4% 11.2%); color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
              .permissions-box { background: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0; }
              .permissions-box h3 { margin-top: 0; color: #333; }
              .permissions-box ul { margin: 10px 0; padding-left: 20px; }
              .permissions-box li { margin: 8px 0; }
              .info-box { background: #e8f4ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🎉 Bem-vindo!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Você foi adicionado ao sistema de gestão</p>
              </div>
              <div class="content">
                <p>Olá <strong>${userName}</strong>,</p>
                
                <p>É com prazer que informamos que você foi adicionado ao sistema de gestão da <strong>${companyName}</strong>!</p>
                
                <div class="info-box">
                  <p style="margin: 5px 0;"><strong>📧 Seu email de acesso:</strong> ${userEmail}</p>
                  <p style="margin: 5px 0;"><strong>🔑 Sua senha temporária:</strong> ${tempPassword}</p>
                </div>
                
                <p><strong>Importante:</strong> Após o primeiro login, recomendamos que você altere sua senha nas configurações da conta.</p>
                
                <p>Suas permissões no sistema:</p>
                
                <div class="permissions-box">
                  <h3>🔐 Permissões Concedidas:</h3>
                  <ul>
                    ${permissionsList}
                  </ul>
                </div>
                
                <p style="text-align: center;">
                  <a href="${loginUrl}" class="button">🚀 Acessar Sistema</a>
                </p>
                
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                  <strong>Atenção:</strong> Esta senha é temporária. Por motivos de segurança, recomendamos que você a altere após o primeiro acesso.
                </p>
                
                <p>Caso tenha alguma dúvida, entre em contato com o gestor da sua empresa.</p>
                
                <p style="margin-top: 30px;">
                  Atenciosamente,<br>
                  <strong>Equipe ${companyName}</strong>
                </p>
              </div>
              <div class="footer">
                <p>Este é um email automático, por favor não responda.</p>
                <p>© ${new Date().getFullYear()} SinapseRH. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    await client.close();

    console.log("Welcome email sent successfully via Gmail SMTP");

    return new Response(
      JSON.stringify({ success: true, message: 'Email de boas-vindas enviado com sucesso' }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-user-welcome-email function:", error);
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
