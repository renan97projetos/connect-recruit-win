import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { usePermissions } from '@/hooks/usePermissions';
import { Briefcase, Loader2, Settings } from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';
import { JobsKanbanBoard } from '@/components/jobs/JobsKanbanBoard';
import { cn } from '@/lib/utils';

export default function SelectionProcess() {
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();
  const { companyId, isOwner, loading: roleLoading } = useCompanyRole();
  const { hasPermission } = usePermissions();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  useEffect(() => {
    if (user && companyId && !roleLoading) loadJobs();
  }, [user, companyId, roleLoading]);

  const loadJobs = async () => {
    setLoading(true);

    const { data: jobsData } = await supabase
      .from('jobs')
      .select(`*, applications (id, status, current_stage)`)
      .eq('company_id', companyId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    setJobs(jobsData || []);
    if (jobsData?.length && !selectedJobId) {
      setSelectedJobId(jobsData[0].id);
    }
    setLoading(false);
  };

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId),
    [jobs, selectedJobId]
  );

  if (loading || roleLoading) {
    return (
      <CompanyLayout title="Processo Seletivo" description="Gestão por kanban completo">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CompanyLayout>
    );
  }

  const headerActions = selectedJob ? (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate(`/company/workflow/${selectedJob.id}`)}
      className="gap-2"
    >
      <Settings className="h-4 w-4" />
      <span className="hidden sm:inline">Configurar Workflow</span>
    </Button>
  ) : null;

  return (
    <CompanyLayout
      title="Processo Seletivo"
      description="Acompanhe o pipeline completo de cada vaga"
      headerActions={headerActions}
    >
      <PermissionGuard
        permission={['manage_candidatos', 'avaliar_candidatos']}
        requireAll={false}
        showAlert={true}
      >
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma vaga publicada</h3>
              <p className="text-muted-foreground mt-2">
                Publique uma vaga para começar o processo seletivo.
              </p>
              <Button className="mt-4" onClick={() => navigate('/company/jobs/new')}>
                Publicar Vaga
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Tabs horizontais de vagas */}
            <div className="border-b border-border">
              <div className="flex items-center gap-1 overflow-x-auto pb-px">
                {jobs.map((job) => {
                  const active = job.id === selectedJobId;
                  return (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={cn(
                        'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2',
                        active
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                      )}
                    >
                      {job.title}
                      <Badge
                        variant={active ? 'default' : 'secondary'}
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {job.applications?.length || 0}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kanban completo da vaga selecionada */}
            {selectedJob && (
              <JobsKanbanBoard
                jobRequests={[]}
                publishedJobs={[selectedJob]}
                isOwner={isOwner}
                onRefresh={loadJobs}
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
          </div>
        )}
      </PermissionGuard>
    </CompanyLayout>
  );
}
