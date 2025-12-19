import { useState, useEffect } from 'react';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Users, TrendingUp, HelpCircle, UserCheck, Clock, BarChart3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CompanyDashboard() {
  const { user } = useSupabaseAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setLoading(true);

      // Load jobs (somente não arquivadas)
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (!jobsError && jobsData) {
        setJobs(jobsData);

        // Load applications for all jobs
        const jobIds = jobsData.map(job => job.id);
        if (jobIds.length > 0) {
          const { data: appsData, error: appsError } = await supabase
            .from('applications')
            .select('*')
            .in('job_id', jobIds);

          if (!appsError && appsData) {
            setApplications(appsData);
          }
        }
      }

      setLoading(false);
    };
    
    loadData();
  }, [user]);

  const activeJobs = jobs.filter(job => job.is_active);
  const pendingApplications = applications.filter(app => 
    app.status === 'pending' || app.status === 'in-review'
  );

  // Candidatos por estágio
  const stagesData = [
    { name: 'Triagem', value: applications.filter(a => a.current_stage === 'triagem').length },
    { name: 'Entrevista', value: applications.filter(a => a.current_stage === 'entrevista').length },
    { name: 'Avaliações', value: applications.filter(a => a.current_stage === 'avaliacoes').length },
    { name: 'Admissões', value: applications.filter(a => a.current_stage === 'admissoes').length },
  ].filter(item => item.value > 0);

  // Status das candidaturas
  const statusData = [
    { name: 'Pendente', value: applications.filter(a => a.status === 'pending').length, color: 'hsl(var(--warning))' },
    { name: 'Em Análise', value: applications.filter(a => a.status === 'in-review').length, color: 'hsl(var(--primary))' },
    { name: 'Aprovado', value: applications.filter(a => a.status === 'approved').length, color: 'hsl(var(--success))' },
    { name: 'Rejeitado', value: applications.filter(a => a.status === 'rejected').length, color: 'hsl(var(--destructive))' },
  ].filter(item => item.value > 0);

  // Candidaturas nos últimos 30 dias
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 29 - i));
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = applications.filter(app => {
      const appDate = format(new Date(app.applied_at), 'yyyy-MM-dd');
      return appDate === dateStr;
    }).length;
    return {
      date: format(date, 'dd/MM', { locale: ptBR }),
      candidaturas: count
    };
  });

  // Top 5 vagas por candidaturas
  const topJobs = jobs
    .map(job => ({
      title: job.title.length > 30 ? job.title.substring(0, 30) + '...' : job.title,
      candidaturas: applications.filter(a => a.job_id === job.id).length
    }))
    .sort((a, b) => b.candidaturas - a.candidaturas)
    .slice(0, 5);

  if (loading) {
    return (
      <TooltipProvider>
        <CompanyLayout
          title="Painel da Empresa"
          description="Gerencie suas vagas e candidatos"
        >
          <div className="text-center py-8">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </CompanyLayout>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <CompanyLayout
        title="Painel da Empresa"
        description="Gerencie suas vagas e candidatos"
      >
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Vagas Ativas</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Número de vagas publicadas e abertas para receber candidaturas</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeJobs.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Total de Candidatos</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Número total de candidaturas recebidas em todas as vagas</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Aguardando Análise</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Candidatos nas etapas de Pendente ou Em Análise que precisam de atenção</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingApplications.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Percentual de candidatos aprovados em relação ao total de candidaturas</p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma candidatura recebida ainda</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Gráfico de candidaturas ao longo do tempo */}
              <Card>
                <CardHeader>
                  <CardTitle>Candidaturas (últimos 30 dias)</CardTitle>
                  <CardDescription>Volume de candidaturas recebidas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      candidaturas: {
                        label: 'Candidaturas',
                        color: 'hsl(var(--primary))',
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={last30Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="candidaturas" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Top 5 vagas por candidaturas */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Vagas</CardTitle>
                  <CardDescription>Vagas com mais candidaturas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      candidaturas: {
                        label: 'Candidaturas',
                        color: 'hsl(var(--primary))',
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topJobs} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis 
                          dataKey="title" 
                          type="category" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          width={150}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="candidaturas" 
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Candidatos por estágio */}
              <Card>
                <CardHeader>
                  <CardTitle>Candidatos por Estágio</CardTitle>
                  <CardDescription>Distribuição no processo seletivo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      value: {
                        label: 'Candidatos',
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stagesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="name" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="value" 
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Status das candidaturas */}
              <Card>
                <CardHeader>
                  <CardTitle>Status das Candidaturas</CardTitle>
                  <CardDescription>Distribuição por status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      value: {
                        label: 'Candidatos',
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </CompanyLayout>
    </TooltipProvider>
  );
}
