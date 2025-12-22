import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInvitationRequest {
  token: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password }: AcceptInvitationRequest = await req.json();

    console.log('Accepting invitation with token');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch invitation by token
    const { data: invitation, error: invitationError } = await supabase
      .from('company_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      console.error('Invitation not found or already used:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Convite não encontrado ou já utilizado' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Update invitation status to expired
      await supabase
        .from('company_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ error: 'Este convite expirou. Solicite um novo convite ao administrador.' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: invitation.name,
        role: 'company'
      }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      
      // Check if user already exists
      if (authError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'Este email já está cadastrado no sistema. Faça login com sua conta existente.' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: authError.message || 'Erro ao criar usuário' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = authData.user.id;
    console.log('User created:', userId);

    // Ensure user has 'company' role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!existingRole) {
      await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'company' });
    }

    // Create company_user record
    const { data: companyUser, error: companyUserError } = await supabase
      .from('company_users')
      .insert({
        company_id: invitation.company_id,
        user_id: userId,
        email: invitation.email,
        name: invitation.name,
        status: 'ativo'
      })
      .select()
      .single();

    if (companyUserError) {
      console.error('Error creating company user:', companyUserError);
      return new Response(
        JSON.stringify({ error: 'Erro ao vincular usuário à empresa' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create user permissions
    const permissions = invitation.permissions || [];
    if (permissions.length > 0) {
      const permissionInserts = permissions.map((permission: string) => ({
        company_user_id: companyUser.id,
        permission_key: permission,
        allowed: true
      }));

      const { error: permError } = await supabase
        .from('user_permissions')
        .insert(permissionInserts);

      if (permError) {
        console.error('Error creating permissions:', permError);
      }
    }

    // Update invitation status
    await supabase
      .from('company_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        company_id: invitation.company_id,
        company_user_id: companyUser.id,
        action: `Usuário ${invitation.name} aceitou o convite e criou sua conta`,
        changed_by: invitation.invited_by
      });

    console.log('Invitation accepted successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conta criada com sucesso! Você já pode fazer login.',
        userId: userId
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in accept-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao aceitar convite' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
