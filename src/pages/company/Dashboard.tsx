import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Users, TrendingUp, Clock, BarChart3, Plus, Loader2, KanbanSquare } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CandidatePipeline } from '@/components/company/CandidatePipeline';

export default function CompanyDashboard() {
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();
  const { companyId, loading: roleLoading } = useCompanyRole();

  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'pipeline' | 'metrics'>('pipeline');

  useEffect(() => {
    if (!user || !companyId || roleLoading) return;
    loadData();
  }, [user, companyId, roleLoading]);

  const loadData = async () => {
    setLoading(true);

    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*, applications(id, status, current_stage, applied_at)')
      .eq('company_id', companyId)
      .eq('is_archived', false)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (jobsData) {
      setJobs(jobsData);
      const allApps = jobsData.flatMap((j: any) => j.applications || []);
      setApplications(allApps);

      if (!selectedJobId) {
        // default: vaga mais recente com candidatos
        const jobWithApps = jobsData.find((j: any) => (j.applications?.length || 0) > 0);
        setSelectedJobId(jobWithApps?.id || jobsData[0]?.id || '');
      }
    }
    setLoading(false);
  };

  const activeJobs = jobs;
  const pendingApplications = applications.filter(
    (a) => a.status === 'pending' || a.status === 'in-review'
  );
  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  // === Métricas ===
  const stagesData = [
    { name: 'Triagem', value: applications.filter(a => a.current_stage === 'triagem' || a.current_stage === 'screening').length },
    { name: 'Entrevista', value: applications.filter(a => a.current_stage === 'entrevista' || a.current_stage === 'interview').length },
    { name: 'Avaliações', value: applications.filter(a => a.current_stage === 'avaliacoes' || a.current_stage === 'assessment').length },
    { name: 'Admissões', value: applications.filter(a => a.current_stage === 'admissoes' || a.current_stage === 'hiring').length },
  ].filter(i => i.value > 0);

  const statusData = [
    { name: 'Pendente', value: applications.filter(a => a.status === 'pending').length, color: 'hsl(var(--warning))' },
    { name: 'Em Análise', value: applications.filter(a => a.status === 'in-review').length, color: 'hsl(var(--primary))' },
    { name: 'Aprovado', value: applications.filter(a => a.status === 'approved').length, color: 'hsl(var(--success))' },
    { name: 'Rejeitado', value: applications.filter(a => a.status === 'rejected').length, color: 'hsl(var(--destructive))' },
  ].filter(i => i.value > 0);

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 29 - i));
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      date: format(date, 'dd/MM', { locale: ptBR }),
      candidaturas: applications.filter(a => a.applied_at && format(new Date(a.applied_at), 'yyyy-MM-dd') === dateStr).length,
    };
  });

  const topJobs = jobs
    .map(j => ({
      title: j.title.length > 30 ? j.title.substring(0, 30) + '...' : j.title,
      candidaturas: j.applications?.length || 0,
    }))
    .sort((a, b) => b.candidaturas - a.candidaturas)
    .slice(0, 5);

  const headerActions = (
    <>
      <Button
        variant={view === 'metrics' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setView(view === 'metrics' ? 'pipeline' : 'metrics')}
        className="gap-2"
      >
        <BarChart3 className="h-4 w-4" />
        <span className="hidden sm:inline">
          {view === 'metrics' ? 'Ver Pipeline' : 'Ver Métricas'}
        </span>
      </Button>
      <Button
        onClick={() => navigate('/company/jobs/new')}
        size="sm"
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Nova Vaga</span>
      </Button>
    </>
  );

  if (loading || roleLoading) {
    return (
      <CompanyLayout title="Dashboard" description="Pipeline de recrutamento" headerActions={headerActions}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout title="Dashboard" description="Pipeline de recrutamento" headerActions={headerActions}>
      {/* Quick stats */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant="outline" className="gap-1.5">
          <Briefcase className="h-3 w-3" /> {activeJobs.length} ativas
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <Users className="h-3 w-3" /> {applications.length} candidatos
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-warning border-warning/40">
          <Clock className="h-3 w-3" /> {pendingApplications.length} pendentes
        </Badge>
      </div>

      {view === 'pipeline' ? (
        jobs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <KanbanSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma vaga ativa</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Crie sua primeira vaga para começar a receber candidatos.
              </p>
              <Button onClick={() => navigate('/company/jobs/new')} className="gap-2">
                <Plus className="h-4 w-4" /> Nova Vaga
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Bloco A — Seletor de vaga */}
            <Card>
              <CardContent className="p-3 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Vaga ativa:</span>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger className="w-full sm:w-[360px]">
                    <SelectValue placeholder="Selecione uma vaga" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.title} {j.applications?.length ? `(${j.applications.length})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedJob && (
                  <Badge variant="secondary" className="ml-auto">
                    {selectedJob.applications?.length || 0} candidatos
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Blocos B + C */}
            {selectedJobId && (
              <CandidatePipeline
                jobId={selectedJobId}
                jobTitle={selectedJob?.title || ''}
                onChanged={loadData}
              />
            )}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vagas Ativas</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{activeJobs.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Candidatos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{applications.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aguardando Análise</CardTitle>
                <Clock className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-warning">{pendingApplications.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversão</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {applications.length > 0
                    ? Math.round((applications.filter(a => a.status === 'approved').length / applications.length) * 100)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {applications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma candidatura recebida ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Candidaturas (últimos 30 dias)</CardTitle>
                  <CardDescription>Volume recebido</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{ candidaturas: { label: 'Candidaturas', color: 'hsl(var(--primary))' } }} className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={last30Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="candidaturas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Vagas</CardTitle>
                  <CardDescription>Por candidaturas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{ candidaturas: { label: 'Candidaturas', color: 'hsl(var(--primary))' } }} className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topJobs} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="title" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={150} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="candidaturas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
              {stagesData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Candidatos por Estágio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{ value: { label: 'Candidatos' } }} className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stagesData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
              {statusData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Status das Candidaturas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{ value: { label: 'Candidatos' } }} className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%" cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            dataKey="value"
                          >
                            {statusData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </CompanyLayout>
  );
}
