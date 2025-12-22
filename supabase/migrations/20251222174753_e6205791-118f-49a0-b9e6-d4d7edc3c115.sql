-- Tabela de planos da plataforma
CREATE TABLE public.platform_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  max_users INTEGER DEFAULT 10,
  max_jobs INTEGER DEFAULT 50,
  max_employees INTEGER DEFAULT 100,
  price_monthly NUMERIC DEFAULT 0,
  price_yearly NUMERIC DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de tenants (empresas)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE,
  plan_id UUID REFERENCES public.platform_plans(id),
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  company_phone TEXT,
  cnpj TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked', 'trial', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,
  subscription_starts_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  billing_email TEXT,
  current_users_count INTEGER DEFAULT 0,
  current_jobs_count INTEGER DEFAULT 0,
  current_employees_count INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Logs de auditoria do backoffice
CREATE TABLE public.backoffice_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Métricas da plataforma (agregadas diariamente)
CREATE TABLE public.platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_tenants INTEGER DEFAULT 0,
  active_tenants INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  total_applications INTEGER DEFAULT 0,
  total_employees INTEGER DEFAULT 0,
  new_tenants INTEGER DEFAULT 0,
  churned_tenants INTEGER DEFAULT 0,
  revenue_monthly NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backoffice_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

-- Função para verificar se é super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'::app_role
  )
$$;

-- Políticas para platform_plans
CREATE POLICY "Super admins podem gerenciar planos"
ON public.platform_plans FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Qualquer um pode ver planos ativos"
ON public.platform_plans FOR SELECT
USING (is_active = true);

-- Políticas para tenants
CREATE POLICY "Super admins podem gerenciar tenants"
ON public.tenants FOR ALL
USING (is_super_admin(auth.uid()));

-- Políticas para backoffice_audit_logs
CREATE POLICY "Super admins podem ver logs"
ON public.backoffice_audit_logs FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem criar logs"
ON public.backoffice_audit_logs FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Políticas para platform_metrics
CREATE POLICY "Super admins podem ver métricas"
ON public.platform_metrics FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem gerenciar métricas"
ON public.platform_metrics FOR ALL
USING (is_super_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_platform_plans_updated_at
BEFORE UPDATE ON public.platform_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir planos padrão
INSERT INTO public.platform_plans (name, description, max_users, max_jobs, max_employees, price_monthly, price_yearly, features) VALUES
('Free', 'Plano gratuito para teste', 3, 5, 20, 0, 0, '["Acesso básico", "Suporte por email"]'),
('Starter', 'Ideal para pequenas empresas', 10, 25, 100, 199, 1990, '["Acesso completo", "Suporte prioritário", "Relatórios básicos"]'),
('Professional', 'Para empresas em crescimento', 50, 100, 500, 499, 4990, '["Acesso completo", "Suporte 24/7", "Relatórios avançados", "API Access"]'),
('Enterprise', 'Solução personalizada', -1, -1, -1, 999, 9990, '["Acesso ilimitado", "Suporte dedicado", "SLA garantido", "Customizações"]');