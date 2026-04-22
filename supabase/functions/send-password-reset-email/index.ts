import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    console.log('Sending password reset email to:', email);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user profile to personalize email
    const { data: authUser } = await supabase.auth.admin.listUsers();
    const user = authUser?.users.find(u => u.email === email);

    if (!user) {
      console.log('User not found:', email);
      // Return success even if user not found (security best practice)
      return new Response(
        JSON.stringify({ success: true, message: 'Se o email existir, enviaremos as instruções' }), 
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    const userName = profile?.name || 'Usuário';
    
    // Generate password reset link using Supabase Auth
    const redirectTo = `https://www.sinapserh.com.br/reset-password`;

    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo,
      }
    });

    if (resetError || !resetData) {
      console.error('Error generating reset link:', resetError);
      throw new Error('Não foi possível gerar o link de recuperação');
    }

    const resetLink = resetData.properties.action_link;

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

    // Send password reset email
    await client.send({
      from: GMAIL_USER!,
      to: email,
      subject: `Recuperação de Senha - SinapseRH`,
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
              .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🔐 Recuperação de Senha</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Solicitação de redefinição de senha</p>
              </div>
              <div class="content">
                <p>Olá <strong>${userName}</strong>,</p>
                
                <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema SinapseRH.</p>
                
                <p style="text-align: center;">
                  <a href="${resetLink}" class="button">🔑 Redefinir Senha</a>
                </p>
                
                <div class="warning-box">
                  <p style="margin: 5px 0;"><strong>⚠️ Importante:</strong></p>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Este link expira em 1 hora</li>
                    <li>Só pode ser usado uma vez</li>
                    <li>Se você não solicitou esta recuperação, ignore este email</li>
                  </ul>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                  Se o botão acima não funcionar, copie e cole o seguinte link no seu navegador:
                </p>
                <p style="font-size: 12px; color: #0066cc; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
                  ${resetLink}
                </p>
                
                <p style="margin-top: 30px;">
                  Atenciosamente,<br>
                  <strong>Equipe SinapseRH</strong>
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

    console.log("Password reset email sent successfully via Gmail SMTP");

    return new Response(
      JSON.stringify({ success: true, message: 'Email de recuperação enviado com sucesso' }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset-email function:", error);
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