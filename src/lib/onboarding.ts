import { supabase } from '@/integrations/supabase/client';

export interface OnboardingStatus {
  hasCompanyProfile: boolean;
  hasLogo: boolean;
  hasFirstJob: boolean;
  hasWorkflow: boolean;
  isComplete: boolean;
}

export async function checkOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const [{ data: profile }, { count: jobCount }, { count: workflowCount }] = await Promise.all([
    supabase.from('profiles').select('company_name, avatar_url').eq('id', userId).maybeSingle(),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('company_id', userId),
    supabase.from('workflows').select('id', { count: 'exact', head: true }).eq('company_id', userId),
  ]);

  const status: OnboardingStatus = {
    hasCompanyProfile: !!profile?.company_name,
    hasLogo: !!profile?.avatar_url,
    hasFirstJob: (jobCount || 0) > 0,
    hasWorkflow: (workflowCount || 0) > 0,
    isComplete: false,
  };
  status.isComplete = status.hasCompanyProfile && status.hasFirstJob;
  return status;
}
