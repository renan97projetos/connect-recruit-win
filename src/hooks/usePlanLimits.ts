import { useEffect, useState, useCallback } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';

// DEV_MODE: durante o desenvolvimento, todos têm acesso Pro,
// mas os LIMITES por plano continuam sendo aplicados normalmente.
// Quando o billing entrar em produção, mude para false.
const DEV_MODE = true;

export type PlanLimits = {
  planName: string; // 'Starter' | 'Pro'
  maxJobs: number;
  maxUsers: number;
  maxEmployees: number;
};

export type PlanUsage = {
  jobs: number;
  users: number; // colaboradores internos (company_users + convites pendentes)
  employees: number;
};

const isUnlimited = (n: number) => n < 0 || n >= 999999;

export function usePlanLimits() {
  const { user } = useSupabaseAuth();
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [usage, setUsage] = useState<PlanUsage>({ jobs: 0, users: 0, employees: 0 });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Plano da empresa (via tenants -> platform_plans)
      const { data: tenant } = await supabase
        .from('tenants')
        .select('plan_id, platform_plans(name, max_jobs, max_users, max_employees)')
        .eq('company_id', user.id)
        .maybeSingle();

      const plan = (tenant as any)?.platform_plans;

      // Fallback: busca plano Starter padrão se a empresa ainda não tem tenant/plano
      let resolvedPlan = plan;
      if (!resolvedPlan) {
        const { data: starter } = await supabase
          .from('platform_plans')
          .select('name, max_jobs, max_users, max_employees')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true })
          .limit(1)
          .maybeSingle();
        resolvedPlan = starter;
      }

      setLimits({
        planName: resolvedPlan?.name ?? 'Starter',
        maxJobs: resolvedPlan?.max_jobs ?? 5,
        maxUsers: resolvedPlan?.max_users ?? 3,
        maxEmployees: resolvedPlan?.max_employees ?? 30,
      });

      // Contagens reais
      const [jobsRes, usersRes, invitesRes, employeesRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', user.id)
          .eq('is_archived', false),
        supabase
          .from('company_users')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', user.id)
          .eq('status', 'ativo'),
        supabase
          .from('company_invitations')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', user.id),
      ]);

      // OWNER conta como 1 usuário
      const usersCount = 1 + (usersRes.count ?? 0) + (invitesRes.count ?? 0);

      setUsage({
        jobs: jobsRes.count ?? 0,
        users: usersCount,
        employees: employeesRes.count ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const canCreate = (resource: 'jobs' | 'users' | 'employees') => {
    if (!limits) return true;
    const max =
      resource === 'jobs' ? limits.maxJobs :
      resource === 'users' ? limits.maxUsers :
      limits.maxEmployees;
    if (isUnlimited(max)) return true;
    return usage[resource] < max;
  };

  return {
    limits,
    usage,
    loading,
    canCreate,
    isUnlimited,
    refresh: fetchAll,
    devMode: DEV_MODE,
  };
}
