import { useQuery } from '@tanstack/react-query';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Users, TrendingUp, TrendingDown, Calendar, AlertTriangle, GraduationCap, Clock, UserCheck, Mail } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EmployeeDashboard() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const [sendingReport, setSendingReport] = useState(false);

  const handleSendReport = async () => {
    try {
      setSendingReport(true);
      
      const { error } = await supabase.functions.invoke('send-dashboard-report', {
        body: {
          companyId: user?.id,
        }
      });

      if (error) throw error;

      toast({
        title: 'Relatório enviado!',
        description: 'O relatório foi enviado para o email do administrador.',
      });
    } catch (error: any) {
      console.error('Error sending report:', error);
      toast({
        title: 'Erro ao enviar relatório',
        description: error.message || 'Ocorreu um erro ao enviar o relatório por email.',
        variant: 'destructive',
      });
    } finally {
      setSendingReport(false);
    }
  };

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['employee-metrics', user?.id],
    queryFn: async () => {
      // Busca todos os colaboradores da empresa
      const { data: employees } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('company_id', user?.id);

      // Busca solicitações pendentes
      const { data: requests } = await (supabase as any)
        .from('employee_requests')
        .select('*, employee:employees!inner(*)')
        .eq('employee.company_id', user?.id)
        .eq('status', 'pendente');

      // Busca treinamentos pendentes
      const { data: trainings } = await (supabase as any)
        .from('employee_trainings')
        .select('*, employee:employees!inner(*)')
        .eq('employee.company_id', user?.id)
        .eq('status', 'pendente');

      // Busca ocorrências recentes
      const { data: occurrences } = await (supabase as any)
        .from('employee_occurrences')
        .select('*, employee:employees!inner(*)')
        .eq('employee.company_id', user?.id)
        .gte('data_ocorrencia', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('data_ocorrencia', { ascending: false });

      const total = employees?.length || 0;
      const ativos = employees?.filter((e: any) => e.status === 'ativo').length || 0;
      const ferias = employees?.filter((e: any) => e.status === 'ferias').length || 0;
      const afastados = employees?.filter((e: any) => e.status === 'afastado').length || 0;
      
      // Calcular ASO vencidos/próximos do vencimento
      const asoAlerta = employees?.filter((e: any) => {
        if (!e.status_aso || e.status_aso === 'Pendente') return true;
        return false;
      }).length || 0;

      // Férias próximas (próximos 60 dias)
      const feriasProximas = employees?.filter((e: any) => {
        if (!e.proximas_ferias_previstas) return false;
        const dataFerias = new Date(e.proximas_ferias_previstas);
        const hoje = new Date();
        const diff = dataFerias.getTime() - hoje.getTime();
        const dias = diff / (1000 * 60 * 60 * 24);
        return dias > 0 && dias <= 60;
      }).length || 0;

      return {
        total,
        ativos,
        ferias,
        afastados,
        solicitacoesPendentes: requests?.length || 0,
        treinamentosPendentes: trainings?.length || 0,
        ocorrenciasRecentes: occurrences?.length || 0,
        asoAlerta,
        feriasProximas,
        taxaAtivacao: total > 0 ? Math.round((ativos / total) * 100) : 0,
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading || roleLoading) {
    return (
      <CompanyLayout area="hr" title="Dashboard RH">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CompanyLayout>
    );
  }

  if (!isOwner) {
    return (
      <CompanyLayout area="hr"
        title="Dashboard RH"
        description="Acesso restrito"
      >
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar este recurso. Apenas o gestor da empresa pode visualizar o dashboard de RH.
          </AlertDescription>
        </Alert>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout area="hr"
      title="Dashboard RH"
      description="Indicadores e métricas de gestão de pessoas"
    >
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSendReport} 
            disabled={sendingReport}
            variant="outline"
          >
            {sendingReport ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Enviar Relatório por Email
              </>
            )}
          </Button>
        </div>

        {/* Métricas Principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Colaboradores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.ativos || 0} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Ativação</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{metrics?.taxaAtivacao || 0}%</div>
              <Progress value={metrics?.taxaAtivacao || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Férias</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.ferias || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.feriasProximas || 0} previstas (60 dias)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Afastados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{metrics?.afastados || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Requer atenção
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alertas e Pendências */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.solicitacoesPendentes || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardando aprovação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Treinamentos Pendentes</CardTitle>
              <GraduationCap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.treinamentosPendentes || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                A iniciar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ASO com Alerta</CardTitle>
              <UserCheck className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{metrics?.asoAlerta || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Vencidos ou pendentes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ocorrências Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente (últimos 30 dias)</CardTitle>
            <CardDescription>
              {metrics?.ocorrenciasRecentes || 0} ocorrências registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {metrics?.ocorrenciasRecentes || 0} {metrics?.ocorrenciasRecentes === 1 ? 'registro' : 'registros'} de ocorrências
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximas Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Prioritárias</CardTitle>
            <CardDescription>Itens que requerem atenção imediata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics?.solicitacoesPendentes ? (
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium">Aprovar solicitações</p>
                    <p className="text-sm text-muted-foreground">{metrics.solicitacoesPendentes} pendentes</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-warning border-warning">Urgente</Badge>
              </div>
            ) : null}

            {metrics?.asoAlerta ? (
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium">Regularizar ASO</p>
                    <p className="text-sm text-muted-foreground">{metrics.asoAlerta} colaboradores</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-destructive border-destructive">Alta</Badge>
              </div>
            ) : null}

            {metrics?.feriasProximas ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Programar férias</p>
                    <p className="text-sm text-muted-foreground">{metrics.feriasProximas} nos próximos 60 dias</p>
                  </div>
                </div>
                <Badge variant="outline">Média</Badge>
              </div>
            ) : null}

            {!metrics?.solicitacoesPendentes && !metrics?.asoAlerta && !metrics?.feriasProximas && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Nenhuma ação prioritária no momento</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CompanyLayout>
  );
}