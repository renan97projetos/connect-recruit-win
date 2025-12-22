import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  invitationId: string;
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
    const { invitationId }: InvitationEmailRequest = await req.json();

    console.log('Processing invitation:', invitationId);

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('company_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      console.error('Invitation not found:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Convite não encontrado' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get company name from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, name')
      .eq('id', invitation.company_id)
      .single();

    const companyName = profile?.company_name || profile?.name || 'Sinapse RH';
    
    // Build the registration URL with token
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://sinapserh.com.br';
    const registerUrl = `${origin}/register-invitation?token=${invitation.token}`;

    // Format permissions list
    const permissionsList = (invitation.permissions || [])
      .map((p: string) => `<li style="margin: 8px 0; padding-left: 10px;">✓ ${PERMISSION_LABELS[p] || p}</li>`)
      .join('');

    // Calculate expiration date
    const expiresAt = new Date(invitation.expires_at);
    const expiresFormatted = expiresAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    console.log('Sending invitation email to:', invitation.email);

    // Send invitation email via Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Sinapse RH <onboarding@resend.dev>",
        to: [invitation.email],
        subject: `Você foi convidado para ${companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🎉 Você foi convidado!</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Para fazer parte da equipe ${companyName}</p>
                </div>
                <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none;">
                  <p style="font-size: 18px; color: #1e3a5f; font-weight: 600;">Olá ${invitation.name},</p>
                  
                  <p style="font-size: 16px;">Você recebeu um convite para acessar o sistema de gestão de RH da <strong>${companyName}</strong>.</p>
                  
                  <div style="background: #e8f4fd; border-left: 4px solid #0284c7; padding: 18px; margin: 25px 0; border-radius: 6px;">
                    <p style="margin: 0;"><strong>📧 Email de acesso:</strong> ${invitation.email}</p>
                  </div>
                  
                  ${permissionsList ? `
                  <div style="background: #f8fafc; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #1e3a5f;">
                    <h3 style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 16px;">🔐 Permissões que você terá:</h3>
                    <ul style="margin: 0; padding-left: 0; list-style: none;">
                      ${permissionsList}
                    </ul>
                  </div>
                  ` : ''}
                  
                  <p style="text-align: center;">
                    <a href="${registerUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 25px 0;">Criar minha conta</a>
                  </p>
                  
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 18px; margin: 25px 0; border-radius: 6px;">
                    <p style="margin: 0; font-size: 14px;">
                      <strong>⏰ Atenção:</strong> Este convite expira em <strong>${expiresFormatted}</strong>. 
                      Após essa data, será necessário solicitar um novo convite.
                    </p>
                  </div>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    Se você não esperava receber este convite, pode ignorar este email com segurança.
                  </p>
                  
                  <p style="margin-top: 30px;">
                    Atenciosamente,<br>
                    <strong>Equipe Sinapse RH</strong>
                  </p>
                </div>
                <div style="text-align: center; padding: 25px; color: #666; font-size: 13px; background: #f9f9f9; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0; border-top: none;">
                  <p style="margin: 0;">Este é um email automático, por favor não responda.</p>
                  <p style="margin: 10px 0 0 0;">© ${new Date().getFullYear()} Sinapse RH. Todos os direitos reservados.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Resend API error:', errorData);
      throw new Error(errorData.message || 'Erro ao enviar email');
    }

    const emailResult = await emailResponse.json();
    console.log("Invitation email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: 'Email de convite enviado com sucesso' }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao enviar email de convite' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
