import { useEffect, useState, useRef } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { supabase } from '@/integrations/supabase/client';

export interface JarvisContext {
  // Vagas
  activeJobs: number;
  archivedJobs: number;
  jobsOpenedToday: number;
  jobsOpenedThisWeek: number;
  // Candidatos
  totalApplications: number;
  applicationsToday: number;
  applicationsThisWeek: number;
  pendingReview: number;
  approvedThisWeek: number;
  rejectedThisWeek: number;
  // Pipeline
  byStage: Record<string, number>;
  staleCandidates: number;
  // Requisições
  pendingJobRequests: number;
  pendingApprovals: number;
  // Propostas
  pendingOffers: number;
  // Top vagas
  topJobs: Array<{ title: string; count: number }>;
  // Meta
  companyName: string;
  fetchedAt: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const cache = new Map<string, { context: JarvisContext; ts: number }>();

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfWeek = () => {
  const d = startOfToday();
  d.setDate(d.getDate() - 7);
  return d;
};

export function useJarvisContext() {
  const { user } = useSupabaseAuth();
  const { companyId } = useCompanyRole();
  const [context, setContext] = useState<JarvisContext | null>(null);
  const [loading, setLoading] = useState(false);
  const fetching = useRef(false);

  useEffect(() => {
    const cid = companyId || user?.id;
    if (!cid) return;

    // cache hit
    const cached = cache.get(cid);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setContext(cached.context);
      return;
    }

    if (fetching.current) return;
    fetching.current = true;
    setLoading(true);

    const today = startOfToday().toISOString();
    const weekAgo = startOfWeek().toISOString();

    (async () => {
      try {
        const [
          jobsRes,
          appsRes,
          jobReqRes,
          offersRes,
          profileRes,
          stagesRes,
        ] = await Promise.all([
          supabase.from('jobs').select('id,title,is_active,is_archived,created_at,pipeline_stage').eq('company_id', cid),
          supabase
            .from('applications')
            .select('id,job_id,status,current_stage,applied_at,updated_at,jobs!inner(company_id,title)')
            .eq('jobs.company_id', cid),
          supabase.from('job_requests').select('id,status').eq('company_id', cid),
          supabase.from('job_offers').select('id,status').eq('company_id', cid),
          supabase.from('profiles').select('company_name,name').eq('id', cid).maybeSingle(),
          supabase
            .from('candidate_stages')
            .select('id,entered_at,updated_at,job_id,jobs!inner(company_id)')
            .eq('jobs.company_id', cid)
            .is('exited_at', null),
        ]);

        const jobs = jobsRes.data ?? [];
        const apps = (appsRes.data ?? []) as any[];
        const jobReqs = jobReqRes.data ?? [];
        const offers = offersRes.data ?? [];
        const stages = (stagesRes.data ?? []) as any[];

        const activeJobs = jobs.filter((j: any) => j.is_active && !j.is_archived).length;
        const archivedJobs = jobs.filter((j: any) => j.is_archived).length;
        const jobsOpenedToday = jobs.filter((j: any) => j.created_at >= today).length;
        const jobsOpenedThisWeek = jobs.filter((j: any) => j.created_at >= weekAgo).length;

        const applicationsToday = apps.filter((a) => a.applied_at >= today).length;
        const applicationsThisWeek = apps.filter((a) => a.applied_at >= weekAgo).length;
        const pendingReview = apps.filter((a) =>
          ['pending', 'in-review', 'triagem', 'aberta'].includes((a.status || '').toLowerCase()) ||
          ['triagem', 'aberta'].includes((a.current_stage || '').toLowerCase())
        ).length;
        const approvedThisWeek = apps.filter(
          (a) => a.updated_at >= weekAgo && ['contratado', 'approved', 'hired'].includes((a.status || '').toLowerCase())
        ).length;
        const rejectedThisWeek = apps.filter(
          (a) => a.updated_at >= weekAgo && ['reprovado', 'rejected'].includes((a.status || '').toLowerCase())
        ).length;

        const byStage: Record<string, number> = {};
        apps.forEach((a) => {
          const k = (a.current_stage || a.status || 'desconhecido').toLowerCase();
          byStage[k] = (byStage[k] || 0) + 1;
        });

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const staleCandidates = stages.filter((s: any) => {
          const last = new Date(s.updated_at || s.entered_at).getTime();
          return last < sevenDaysAgo;
        }).length;

        const pendingJobRequests = jobReqs.filter((r: any) =>
          ['pending_approval', 'pending_review', 'draft', 'in_creation'].includes(r.status)
        ).length;
        const pendingApprovals = jobReqs.filter((r: any) => r.status === 'pending_approval').length;
        const pendingOffers = offers.filter((o: any) => o.status === 'pending').length;

        // top 3 vagas por número de candidaturas
        const countByJob = new Map<string, { title: string; count: number }>();
        apps.forEach((a) => {
          const title = a.jobs?.title || 'Vaga';
          const cur = countByJob.get(a.job_id) || { title, count: 0 };
          cur.count += 1;
          countByJob.set(a.job_id, cur);
        });
        const topJobs = Array.from(countByJob.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        const ctx: JarvisContext = {
          activeJobs,
          archivedJobs,
          jobsOpenedToday,
          jobsOpenedThisWeek,
          totalApplications: apps.length,
          applicationsToday,
          applicationsThisWeek,
          pendingReview,
          approvedThisWeek,
          rejectedThisWeek,
          byStage,
          staleCandidates,
          pendingJobRequests,
          pendingApprovals,
          pendingOffers,
          topJobs,
          companyName: (profileRes.data as any)?.company_name || (profileRes.data as any)?.name || 'sua empresa',
          fetchedAt: new Date().toISOString(),
        };

        cache.set(cid, { context: ctx, ts: Date.now() });
        setContext(ctx);
      } catch (err) {
        console.error('useJarvisContext error', err);
      } finally {
        setLoading(false);
        fetching.current = false;
      }
    })();
  }, [user?.id, companyId]);

  return { context, loading };
}
