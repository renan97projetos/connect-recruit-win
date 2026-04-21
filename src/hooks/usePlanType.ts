import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'starter' | 'pro';

// DEV_MODE: todos os usuários têm acesso Pro durante desenvolvimento.
// Quando o billing estiver ativo, mude DEV_MODE para false.
const DEV_MODE = false;

export function usePlanType() {
  const { user } = useSupabaseAuth();
  const [planType, setPlanType] = useState<PlanType>('pro');
  const [loading, setLoading] = useState(!DEV_MODE);

  useEffect(() => {
    if (DEV_MODE) return;
    if (!user) return;

    const fetchPlan = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('tenants')
          .select('plan_id, platform_plans(name)')
          .eq('company_id', user.id)
          .maybeSingle();

        const planName = (data as any)?.platform_plans?.name ?? 'starter';
        setPlanType(planName?.toLowerCase() === 'pro' ? 'pro' : 'starter');
      } catch {
        setPlanType('starter');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [user]);

  return {
    planType,
    isPro: planType === 'pro',
    isStarter: planType === 'starter',
    loading,
  };
}
