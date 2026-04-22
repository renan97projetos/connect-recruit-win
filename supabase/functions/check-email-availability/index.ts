import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RequestBody {
  email?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const rawEmail = (body.email || '').trim().toLowerCase();

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Search for the email across all auth users (paginated). Stop on first match.
    let foundUserId: string | null = null;
    let page = 1;
    const perPage = 1000;
    while (page <= 20) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error('listUsers error', error);
        break;
      }
      const match = data.users.find((u) => (u.email || '').toLowerCase() === rawEmail);
      if (match) {
        foundUserId = match.id;
        break;
      }
      if (data.users.length < perPage) break;
      page++;
    }

    if (!foundUserId) {
      return new Response(
        JSON.stringify({ exists: false, role: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', foundUserId);

    const rolesList = (roles || []).map((r: { role: string }) => r.role);

    return new Response(
      JSON.stringify({ exists: true, role: rolesList[0] || null, roles: rolesList }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('check-email-availability error', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
