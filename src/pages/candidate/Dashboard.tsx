import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CandidateLayout } from '@/components/CandidateLayout';
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

    setApplications((prev) => prev.filter((a) => a.id !== applicationId));
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

  const renderApplicationCard = (app: any) => {
    const job = app.jobs;
    if (!job) return null;

    return (
      <div
        key={app.id}
        className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{job.company_name}</p>
          </div>
          <Badge variant={getStatusVariant(app.status)}>
            {app.status === 'approved' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}
            {getStatusLabel(app.status)}
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-0.5 text-sm text-gray-500">
            <p>Candidatura enviada em {new Date(app.applied_at).toLocaleDateString('pt-BR')}</p>
            {(app.status === 'approved' || app.status === 'rejected') && (
              <p>Finalizada em {new Date(app.updated_at).toLocaleDateString('pt-BR')}</p>
            )}
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
                      Tem certeza que deseja retirar sua candidatura para a vaga "{job.title}"? Esta ação não pode ser desfeita.
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
      </div>
    );
  };

  const renderEmpty = (text: string, withCta = false) => (
    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
      <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
      <p className="text-gray-500 mb-4">{text}</p>
      {withCta && (
        <Button asChild>
          <Link to="/candidate/jobs">Ver vagas disponíveis</Link>
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <CandidateLayout title="Minhas Candidaturas" description="Acompanhe o status das suas aplicações">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando candidaturas...</p>
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout title="Minhas Candidaturas" description="Acompanhe o status das suas aplicações">
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 font-medium">Total de Candidaturas</p>
            <Briefcase className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 font-medium">Em Processo</p>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {pendingApplications.length + interviewApplications.length}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 font-medium">Aprovadas</p>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {applications.filter(app => app.status === 'approved').length}
          </p>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas ({applications.length})</TabsTrigger>
          <TabsTrigger value="pending">Em Análise ({pendingApplications.length})</TabsTrigger>
          <TabsTrigger value="interview">Entrevistas ({interviewApplications.length})</TabsTrigger>
          <TabsTrigger value="completed">Finalizadas ({completedApplications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {applications.length === 0
            ? renderEmpty('Você ainda não se candidatou a nenhuma vaga', true)
            : applications.map(renderApplicationCard)}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingApplications.length === 0
            ? renderEmpty('Nenhuma candidatura em análise')
            : pendingApplications.map(renderApplicationCard)}
        </TabsContent>

        <TabsContent value="interview" className="space-y-4">
          {interviewApplications.length === 0
            ? renderEmpty('Nenhuma entrevista agendada')
            : interviewApplications.map(renderApplicationCard)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedApplications.length === 0
            ? renderEmpty('Nenhuma candidatura finalizada')
            : completedApplications.map(renderApplicationCard)}
        </TabsContent>
      </Tabs>
    </CandidateLayout>
  );
}
