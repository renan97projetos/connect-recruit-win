import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Briefcase, Users, MapPin, Calendar, MoreVertical, Archive, Settings } from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function SelectionProcess() {
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobToArchive, setJobToArchive] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadJobs();
    }
  }, [user]);

  const loadJobs = async () => {
    if (!user) return;

    setLoading(true);

    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        *,
        applications (
          id,
          status
        )
      `)
      .eq('company_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('Error loading jobs:', jobsError);
    } else {
      setJobs(jobsData || []);
    }

    setLoading(false);
  };

  const getJobTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'full-time': 'Tempo Integral',
      'part-time': 'Meio Período',
      'contract': 'Contrato',
      'internship': 'Estágio',
      'temporary': 'Temporário',
    };
    return types[type] || type;
  };

  const getApplicationCount = (job: any) => {
    return job.applications?.length || 0;
  };

  const handleArchiveJob = async () => {
    if (!jobToArchive) return;

    const { error } = await supabase
      .from('jobs')
      .update({ is_archived: true })
      .eq('id', jobToArchive);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível arquivar a vaga.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Vaga arquivada',
        description: 'A vaga foi movida para o histórico de processos.',
      });
      loadJobs();
    }

    setJobToArchive(null);
  };

  const hasApprovedCandidates = (job: any) => {
    return job.applications?.some((app: any) => app.status === 'approved');
  };

  if (loading) {
    return (
      <CompanyLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Processo Seletivo</h1>
            <p className="text-muted-foreground">Carregando vagas...</p>
          </div>
        </div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      <PermissionGuard 
        permission={['manage_candidatos', 'avaliar_candidatos']}
        requireAll={false}
        showAlert={true}
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Processo Seletivo</h1>
            <p className="text-muted-foreground">
              Gerencie o processo seletivo de cada vaga através das etapas de triagem, entrevista, avaliações e admissões
            </p>
          </div>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma vaga publicada</h3>
                <p className="text-muted-foreground mt-2">
                  Você ainda não publicou nenhuma vaga. Publique uma vaga para começar o processo seletivo.
                </p>
                <Button className="mt-4" onClick={() => navigate('/company/jobs/new')}>
                  Publicar Vaga
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {job.company_name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={job.is_active ? 'default' : 'secondary'}>
                        {job.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                      {hasApprovedCandidates(job) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setJobToArchive(job.id)}
                              className="text-muted-foreground"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Arquivar Vaga
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span>{getJobTypeLabel(job.job_type)}</span>
                    </div>
                    {job.city && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{job.city}, {job.state}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Publicada em {new Date(job.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{getApplicationCount(job)}</span>
                        <span className="text-sm text-muted-foreground">candidatos</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button 
                        className="w-full" 
                        onClick={() => navigate(`/company/selection-process/${job.id}`)}
                      >
                        Ver Processo Seletivo
                      </Button>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => navigate(`/company/workflow/${job.id}`)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configurar Workflow
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!jobToArchive} onOpenChange={() => setJobToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar vaga?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá mover a vaga para o histórico de processos. A vaga não
              receberá mais candidaturas, mas você poderá visualizar todos os dados do
              processo seletivo no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveJob}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </PermissionGuard>
    </CompanyLayout>
  );
}
