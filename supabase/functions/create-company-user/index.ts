import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  name: string;
  tempPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, tempPassword }: CreateUserRequest = await req.json();

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string;
    let isExistingUser = false;

    // Try to create user in auth
    console.log('Attempting to create user:', email);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'company',
      },
    });

    if (authError) {
      console.log('Auth error received:', authError);
      console.log('Auth error status:', (authError as any).status);
      console.log('Auth error code:', (authError as any).code);
      
      // Check if error is due to email already being registered
      const errorStatus = (authError as any).status;
      const errorCode = (authError as any).code;
      
      if (errorStatus == 422 || errorCode === 'email_exists') {
        console.log('User already exists, searching for user:', email);
        
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
          console.error('Error listing users:', listError);
          throw new Error('Erro ao buscar usuário existente');
        }
        
        const existingUser = existingUsers?.users.find(u => u.email === email);
        
        if (!existingUser) {
          console.error('User not found after duplicate email error');
          throw new Error('Usuário não encontrado após erro de email duplicado');
        }
        
        userId = existingUser.id;
        isExistingUser = true;
        console.log('Found existing user:', userId);
        
        // Update password for existing user
        console.log('Updating password for existing user');
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          userId,
          { password: tempPassword }
        );
        
        if (updateError) {
          console.error('Error updating password:', updateError);
          throw new Error('Erro ao atualizar senha do usuário');
        }
        console.log('Password updated successfully');
      } else {
        console.error('Error creating auth user:', authError);
        throw authError;
      }
    } else {
      console.log('User created successfully:', authData.user.id);
      userId = authData.user.id;
    }

    // Check current role and update if needed
    console.log('Checking existing role for user:', userId);
    const { data: existingRole, error: selectError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError) {
      console.error('Error checking existing role:', selectError);
      throw selectError;
    }

    if (existingRole) {
      console.log('User has existing role:', existingRole.role);
      
      // Don't change admin roles - admins are super users
      if (existingRole.role === 'admin') {
        console.log('User is admin - skipping role change');
      } else if (existingRole.role === 'company') {
        console.log('User already has company role - no change needed');
      } else {
        // Update from candidate or other role to company
        console.log('Updating role from', existingRole.role, 'to company');
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ role: 'company' })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating role:', updateError);
          throw updateError;
        }
        console.log('Successfully updated role to company');
      }
    } else {
      // User has no role, insert new one
      console.log('Inserting new company role');
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'company',
        });

      if (insertError) {
        console.error('Error inserting role:', insertError);
        throw insertError;
      }
      console.log('Successfully inserted company role');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        message: isExistingUser ? 'Usuário vinculado com sucesso' : 'Usuário criado com sucesso' 
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
    console.error("Error in create-company-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao criar usuário' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
