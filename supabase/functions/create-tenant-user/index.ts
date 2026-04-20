import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateTenantUserPayload {
  company_name: string;
  company_email: string;
  password: string;
  company_phone?: string | null;
  cnpj?: string | null;
  plan_id?: string | null;
  notes?: string | null;
  super_admin_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: CreateTenantUserPayload = await req.json();

    const {
      company_name,
      company_email,
      password,
      company_phone,
      cnpj,
      plan_id,
      notes,
      super_admin_id,
    } = payload;

    if (!company_name || !company_email || !password) {
      return new Response(
        JSON.stringify({
          error: "company_name, company_email e password são obrigatórios",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha precisa ter no mínimo 6 caracteres" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Create auth user (already confirmed)
    const { data: created, error: createErr } =
      await adminClient.auth.admin.createUser({
        email: company_email,
        password,
        email_confirm: true,
        user_metadata: {
          name: company_name,
          role: "company",
        },
      });

    if (createErr || !created.user) {
      console.error("createUser error:", createErr);
      return new Response(
        JSON.stringify({
          error: createErr?.message || "Falha ao criar usuário",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = created.user.id;

    // 2) Ensure profile exists with company info (handle_new_user already inserts a row)
    const { error: profileErr } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: userId,
          name: company_name,
          company_name,
          cnpj: cnpj || null,
          phone: company_phone || null,
        },
        { onConflict: "id" },
      );
    if (profileErr) console.error("profile upsert error:", profileErr);

    // 3) Ensure role = company (handle_new_user already inserts via metadata, but enforce)
    const { error: roleErr } = await adminClient
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "company" },
        { onConflict: "user_id,role" },
      );
    if (roleErr) console.error("role upsert error:", roleErr);

    // 4) Create tenant linked to this user (company_id = userId)
    const { data: tenant, error: tenantErr } = await adminClient
      .from("tenants")
      .insert({
        company_id: userId,
        company_name,
        company_email,
        company_phone: company_phone || null,
        cnpj: cnpj || null,
        plan_id: plan_id || null,
        notes: notes || null,
        status: "active",
      })
      .select()
      .single();

    if (tenantErr) {
      console.error("tenant insert error:", tenantErr);
      // Rollback user
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: tenantErr.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 5) Audit log
    if (super_admin_id) {
      await adminClient.from("backoffice_audit_logs").insert({
        super_admin_id,
        action: "CREATE",
        entity_type: "tenant",
        entity_id: tenant.id,
        new_data: { company_name, company_email, plan_id, user_id: userId },
      });
    }

    return new Response(
      JSON.stringify({ success: true, tenant, user_id: userId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("create-tenant-user fatal:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
