import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { CompanyLayout } from '@/components/CompanyLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Plus, LayoutGrid, Loader2, Briefcase, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { JobsKanbanBoard } from '@/components/jobs/JobsKanbanBoard';
import { Card, CardContent } from '@/components/ui/card';

interface JobRequest {
  id: string;
  position_title: string;
  department: string;
  opening_reason: string;
  status: string;
  current_stage: number;
  created_at: string;
  job_type: string;
  location: string;
  city: string;
  state: string;
  company_id: string;
  published_job_id: string | null;
}

interface PublishedJob {
  id: string;
  title: string;
  job_type: string;
  location: string;
  city: string;
  state: string;
  created_at: string;
  is_active: boolean;
  is_archived: boolean;
  applications: { id: string; status: string }[];
  job_request_id: string | null;
}

export default function JobRequests() {
  const navigate = useNavigate();
  const { user, userRole } = useSupabaseAuth();
  const { companyId, isOwner, loading: roleLoading } = useCompanyRole();
  const { hasPermission } = usePermissions();
  const [jobRequests, setJobRequests] = useState<JobRequest[]>([]);
  const [publishedJobs, setPublishedJobs] = useState<PublishedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && (userRole === 'company' || userRole === 'admin') && companyId && !roleLoading) {
      fetchData();
    }
  }, [user, userRole, companyId, roleLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('job_requests')
        .select('*')
        .eq('company_id', companyId)
        .neq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setJobRequests(requestsData || []);

      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`*, applications(id, status)`)
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;
      setPublishedJobs(jobsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const headerActions = (
    <PermissionGuard permission="create_vagas" showAlert={false}>
      <Button data-tour="new-request-btn" onClick={() => navigate('/company/job-requests/new')} size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Nova Requisição</span>
      </Button>
    </PermissionGuard>
  );

  if (roleLoading || loading) {
    return (
      <CompanyLayout title="Gestão de Vagas" description="Vagas ativas e requisições" headerActions={headerActions}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CompanyLayout>
    );
  }

  const activeJobs = publishedJobs.filter(j => j.is_active);
  const draftJobs = publishedJobs.filter(j => !j.is_active && !j.is_archived);
  const openJobs = [...activeJobs, ...draftJobs];
  const pendingRequests = jobRequests.filter(r => r.status !== 'published');

  return (
    <CompanyLayout title="Gestão de Vagas" description="Vagas ativas e requisições" headerActions={headerActions}>
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Ativas ({activeJobs.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Requisições ({pendingRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma vaga ativa</h3>
                <p className="text-sm text-muted-foreground">
                  Publique uma requisição aprovada para ativar uma vaga.
                </p>
              </CardContent>
            </Card>
          ) : (
            <JobsKanbanBoard
              jobRequests={[]}
              publishedJobs={activeJobs}
              isOwner={isOwner}
              onRefresh={fetchData}
              permissions={{
                canCreate: hasPermission('create_vagas'),
                canEdit: hasPermission('edit_vagas'),
                canPublish: hasPermission('publish_vagas'),
                canApprove: hasPermission('approve_vagas'),
                canReject: hasPermission('reject_vagas'),
                canDelete: hasPermission('delete_vagas'),
                canManageCandidates: hasPermission('manage_candidatos'),
                canEvaluate: hasPermission('avaliar_candidatos'),
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="requests">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma requisição em andamento</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Crie uma nova requisição para iniciar um processo seletivo.
                </p>
                <PermissionGuard permission="create_vagas" showAlert={false}>
                  <Button onClick={() => navigate('/company/job-requests/new')} className="gap-2">
                    <Plus className="h-4 w-4" /> Criar Requisição
                  </Button>
                </PermissionGuard>
              </CardContent>
            </Card>
          ) : (
            <JobsKanbanBoard
              jobRequests={pendingRequests}
              publishedJobs={[]}
              isOwner={isOwner}
              onRefresh={fetchData}
              permissions={{
                canCreate: hasPermission('create_vagas'),
                canEdit: hasPermission('edit_vagas'),
                canPublish: hasPermission('publish_vagas'),
                canApprove: hasPermission('approve_vagas'),
                canReject: hasPermission('reject_vagas'),
                canDelete: hasPermission('delete_vagas'),
                canManageCandidates: hasPermission('manage_candidatos'),
                canEvaluate: hasPermission('avaliar_candidatos'),
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </CompanyLayout>
  );
}
