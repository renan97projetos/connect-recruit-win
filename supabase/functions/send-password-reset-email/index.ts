import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { sendLovableEmail } from "../_shared/send-lovable-email.ts";

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: authUser } = await supabase.auth.admin.listUsers();
    const user = authUser?.users.find(u => u.email === email);

    if (!user) {
      // Resposta neutra (segurança)
      return new Response(
        JSON.stringify({ success: true, message: 'Se o email existir, enviaremos as instruções' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles').select('name').eq('id', user.id).single();
    const userName = profile?.name || 'Usuário';

    const redirectTo = `https://www.sinapserh.com.br/reset-password`;
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery', email, options: { redirectTo },
    });

    if (resetError || !resetData) {
      console.error('Error generating reset link:', resetError);
      throw new Error('Não foi possível gerar o link de recuperação');
    }

    const resetLink = resetData.properties.action_link;

    const html = `
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8" /></head>
        <body style="font-family:-apple-system,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
          <div style="max-width:600px;margin:0 auto;background:white;">
            <div style="background:linear-gradient(135deg,#1e1b4b,#4c1d95);color:white;padding:30px;text-align:center;">
              <h1 style="margin:0;font-size:22px;">🔐 Recuperação de Senha</h1>
            </div>
            <div style="padding:32px;">
              <p>Olá <strong>${userName}</strong>,</p>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta no SinapseRH.</p>
              <p style="text-align:center;margin:28px 0;">
                <a href="${resetLink}" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Redefinir senha</a>
              </p>
              <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:14px;border-radius:4px;margin:20px 0;">
                <strong>⚠️ Importante:</strong>
                <ul style="margin:8px 0 0 18px;padding:0;">
                  <li>Este link expira em 1 hora</li>
                  <li>Só pode ser usado uma vez</li>
                  <li>Se não foi você, ignore este email</li>
                </ul>
              </div>
              <p style="font-size:13px;color:#666;">Se o botão não funcionar, copie e cole o link abaixo:</p>
              <p style="font-size:12px;color:#0066cc;word-break:break-all;background:#f5f5f5;padding:10px;border-radius:4px;">${resetLink}</p>
              <p style="margin-top:30px;">Atenciosamente,<br/><strong>Equipe SinapseRH</strong></p>
            </div>
          </div>
        </body>
      </html>`;

    const result = await sendLovableEmail({
      to: email,
      subject: `Recuperação de Senha - SinapseRH`,
      html,
      idempotencyKey: `password-reset-${user.id}-${Date.now()}`,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email de recuperação enviado' }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao enviar email' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
