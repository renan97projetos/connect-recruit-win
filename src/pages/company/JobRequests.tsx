import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { CompanyLayout } from '@/components/CompanyLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Plus, LayoutGrid, List, Loader2 } from 'lucide-react';
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
      // Buscar requisições de vagas (não publicadas ainda)
      const { data: requestsData, error: requestsError } = await supabase
        .from('job_requests')
        .select('*')
        .eq('company_id', companyId)
        .neq('status', 'rejected') // Excluir rejeitadas do kanban (vão pro histórico)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setJobRequests(requestsData || []);

      // Buscar vagas publicadas (ativas, não arquivadas)
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          applications (
            id,
            status
          )
        `)
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

  if (roleLoading || loading) {
    return (
      <CompanyLayout
        title="Gestão de Vagas"
        description="Acompanhe todo o ciclo de vida das suas vagas em um único lugar"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CompanyLayout>
    );
  }

  const totalRequests = jobRequests.filter(r => r.status !== 'published').length;
  const totalJobs = publishedJobs.length;
  const totalApplications = publishedJobs.reduce((acc, job) => acc + (job.applications?.length || 0), 0);

  return (
    <CompanyLayout
      title="Gestão de Vagas"
      description="Acompanhe todo o ciclo de vida das suas vagas em um único lugar"
    >
      <div className="space-y-6">
        {/* Header com stats e ações */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap gap-4">
            <Card className="border-2 border-foreground bg-yellow px-4 py-2">
              <div className="text-center">
                <p className="text-2xl font-black">{totalRequests}</p>
                <p className="text-xs font-medium">Em Criação</p>
              </div>
            </Card>
            <Card className="border-2 border-foreground bg-violet text-background px-4 py-2">
              <div className="text-center">
                <p className="text-2xl font-black">{totalJobs}</p>
                <p className="text-xs font-medium">Publicadas</p>
              </div>
            </Card>
            <Card className="border-2 border-foreground bg-cyan px-4 py-2">
              <div className="text-center">
                <p className="text-2xl font-black">{totalApplications}</p>
                <p className="text-xs font-medium">Candidatos</p>
              </div>
            </Card>
          </div>
          
          <PermissionGuard permission="create_vagas" showAlert={false}>
            <Button 
              onClick={() => navigate('/company/job-requests/new')}
              className="border-3 border-foreground shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Requisição
            </Button>
          </PermissionGuard>
        </div>

        {/* Kanban Board */}
        {jobRequests.length === 0 && publishedJobs.length === 0 ? (
          <Card className="border-3 border-foreground">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <LayoutGrid className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Nenhuma vaga encontrada</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Comece criando uma nova requisição de vaga. O processo será guiado por etapas até a publicação.
              </p>
              <PermissionGuard permission="create_vagas" showAlert={false}>
                <Button 
                  onClick={() => navigate('/company/job-requests/new')}
                  className="border-3 border-foreground shadow-brutal"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Requisição
                </Button>
              </PermissionGuard>
            </CardContent>
          </Card>
        ) : (
          <JobsKanbanBoard
            jobRequests={jobRequests}
            publishedJobs={publishedJobs}
            isOwner={isOwner}
            onRefresh={fetchData}
          />
        )}

        {/* Legenda do fluxo */}
        <div className="bg-muted/50 rounded-xl p-4 border-2 border-dashed border-foreground/20">
          <h4 className="font-bold text-sm mb-2">Fluxo de Vagas</h4>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-1 rounded font-medium">Rascunho</span>
            <span>→</span>
            <span className="bg-yellow px-2 py-1 rounded font-medium text-foreground">Aguardando Aprovação</span>
            <span>→</span>
            <span className="bg-lime px-2 py-1 rounded font-medium text-foreground">Aprovada</span>
            <span>→</span>
            <span className="bg-cyan px-2 py-1 rounded font-medium text-foreground">Em Criação</span>
            <span>→</span>
            <span className="bg-pink px-2 py-1 rounded font-medium text-foreground">Revisão</span>
            <span>→</span>
            <span className="bg-violet px-2 py-1 rounded font-medium text-background">Publicada</span>
            <span>→</span>
            <span className="bg-primary px-2 py-1 rounded font-medium text-primary-foreground">Seleção</span>
            <span>→</span>
            <span className="bg-success px-2 py-1 rounded font-medium text-success-foreground">Contratação</span>
          </div>
        </div>
      </div>
    </CompanyLayout>
  );
}
