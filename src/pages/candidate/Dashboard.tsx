import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CandidateLayout } from '@/components/CandidateLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Clock, CheckCircle2, ArrowRight, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CandidateDashboard() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = async () => {
    if (!user) return;
    
    setLoading(true);
    
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          jobs!inner (
            id,
            title,
            company_name,
            location,
            city,
            state
          )
        `)
        .eq('candidate_id', user.id)
        .order('applied_at', { ascending: false });

    if (!error && data) {
      setApplications(data.filter((app) => app.jobs));
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadApplications();
  }, [user]);

  const handleWithdrawApplication = async (applicationId: string, jobTitle: string) => {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', applicationId);
    
    if (error) {
      toast({
        title: 'Erro ao retirar candidatura',
        description: 'Não foi possível retirar sua candidatura.',
        variant: 'destructive',
      });
      return;
    }
    
    // Atualização otimista: remove imediatamente do estado local
    // para que todos os indicadores e abas sincronizem na hora.
    setApplications((prev) => prev.filter((a) => a.id !== applicationId));
    
    // Recarrega do servidor para garantir consistência
    loadApplications();
    
    toast({
      title: 'Candidatura retirada',
      description: `Sua candidatura para ${jobTitle} foi removida com sucesso.`,
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pendente',
      'in-review': 'Em Análise',
      'interview': 'Entrevista',
      'approved': 'Aprovado',
      'rejected': 'Rejeitado',
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      'pending': 'secondary',
      'in-review': 'default',
      'interview': 'default',
      'approved': 'outline',
      'rejected': 'destructive',
    };
    return variants[status] || 'default';
  };

  const pendingApplications = applications.filter(app => app.status === 'pending' || app.status === 'in-review');
  const interviewApplications = applications.filter(app => app.status === 'interview');
  const completedApplications = applications.filter(app => app.status === 'approved' || app.status === 'rejected');

  if (loading) {
    return (
      <CandidateLayout
        title="Minhas Candidaturas"
        description="Acompanhe o status das suas aplicações"
      >
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando candidaturas...</p>
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout
      title="Minhas Candidaturas"
      description="Acompanhe o status das suas aplicações"
    >

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Candidaturas</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Processo</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApplications.length + interviewApplications.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {applications.filter(app => app.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas ({applications.length})</TabsTrigger>
          <TabsTrigger value="pending">Em Análise ({pendingApplications.length})</TabsTrigger>
          <TabsTrigger value="interview">Entrevistas ({interviewApplications.length})</TabsTrigger>
          <TabsTrigger value="completed">Finalizadas ({completedApplications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {applications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Você ainda não se candidatou a nenhuma vaga</p>
                <Button asChild>
                  <Link to="/">Ver vagas disponíveis</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            applications.map(app => {
              const job = app.jobs;
              if (!job) return null;
              
              return (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>{job.company_name}</CardDescription>
                       </div>
                       <Badge variant={getStatusVariant(app.status)}>
                         {getStatusLabel(app.status)}
                       </Badge>
                     </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                       <div className="space-y-1 text-sm text-muted-foreground">
                         <p>Candidatura enviada em {new Date(app.applied_at).toLocaleDateString('pt-BR')}</p>
                         <p>Pontuação: {app.score}/100</p>
                       </div>
                       <div className="flex gap-2">
                         <Button variant="outline" asChild>
                           <Link to={`/jobs/${job.id}`}>
                             Ver vaga
                             <ArrowRight className="ml-2 h-4 w-4" />
                           </Link>
                         </Button>
                         {app.status !== 'approved' && app.status !== 'rejected' && (
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button variant="ghost" size="icon">
                                 <Trash2 className="h-4 w-4 text-destructive" />
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Retirar candidatura?</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Tem certeza que deseja retirar sua candidatura para a vaga "{job.title}"? 
                                   Esta ação não pode ser desfeita.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                 <AlertDialogAction 
                                   onClick={() => handleWithdrawApplication(app.id, job.title)}
                                   className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                 >
                                   Retirar candidatura
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         )}
                       </div>
                     </div>
                   </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingApplications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma candidatura em análise</p>
              </CardContent>
            </Card>
          ) : (
            pendingApplications.map(app => {
              const job = app.jobs;
              if (!job) return null;
              
              return (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>{job.company_name}</CardDescription>
                      </div>
                      <Badge variant={getStatusVariant(app.status)}>
                        {getStatusLabel(app.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Candidatura enviada em {new Date(app.applied_at).toLocaleDateString('pt-BR')}</p>
                        <p>Pontuação: {app.score}/100</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" asChild>
                          <Link to={`/jobs/${job.id}`}>
                            Ver vaga
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        {app.status !== 'approved' && app.status !== 'rejected' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Retirar candidatura?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja retirar sua candidatura para a vaga "{job.title}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleWithdrawApplication(app.id, job.title)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Retirar candidatura
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="interview" className="space-y-4">
          {interviewApplications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma entrevista agendada</p>
              </CardContent>
            </Card>
          ) : (
            interviewApplications.map(app => {
              const job = app.jobs;
              if (!job) return null;
              
              return (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>{job.company_name}</CardDescription>
                      </div>
                      <Badge variant={getStatusVariant(app.status)}>
                        {getStatusLabel(app.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Candidatura enviada em {new Date(app.applied_at).toLocaleDateString('pt-BR')}</p>
                        <p>Pontuação: {app.score}/100</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" asChild>
                          <Link to={`/jobs/${job.id}`}>
                            Ver vaga
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        {app.status !== 'approved' && app.status !== 'rejected' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Retirar candidatura?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja retirar sua candidatura para a vaga "{job.title}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleWithdrawApplication(app.id, job.title)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Retirar candidatura
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedApplications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma candidatura finalizada</p>
              </CardContent>
            </Card>
          ) : (
            completedApplications.map(app => {
              const job = app.jobs;
              if (!job) return null;
              
              return (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>{job.company_name}</CardDescription>
                      </div>
                      <Badge variant={getStatusVariant(app.status)}>
                        {app.status === 'approved' ? (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        ) : null}
                        {getStatusLabel(app.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Candidatura enviada em {new Date(app.applied_at).toLocaleDateString('pt-BR')}</p>
                        <p>Finalizada em {new Date(app.updated_at).toLocaleDateString('pt-BR')}</p>
                        <p>Pontuação final: {app.score}/100</p>
                      </div>
                      <Button variant="outline" asChild>
                        <Link to={`/jobs/${job.id}`}>
                          Ver vaga
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </CandidateLayout>
  );
}
