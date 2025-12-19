import { useState } from 'react';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, Check, X, Calendar, Clock, UserCog, FileText, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EmployeeRequests() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const [selectedStatus, setSelectedStatus] = useState<'pendente' | 'aprovado' | 'rejeitado'>('pendente');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['employee-requests', user?.id, selectedStatus],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employee_requests')
        .select(`
          *,
          employee:employees!inner(
            id,
            nome,
            matricula,
            cargo,
            setor,
            company_id
          )
        `)
        .eq('employee.company_id', user?.id)
        .eq('status', selectedStatus)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'aprovado' | 'rejeitado' }) => {
      const { error } = await (supabase as any)
        .from('employee_requests')
        .update({
          status,
          aprovador_id: user?.id,
          data_aprovacao: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-requests'] });
      toast({
        title: 'Solicitação atualizada',
        description: 'A solicitação foi processada com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a solicitação.',
        variant: 'destructive',
      });
    },
  });

  const getTipoIcon = (tipo: string) => {
    const icons: Record<string, any> = {
      ferias: Calendar,
      licenca: Clock,
      mudanca_setor: UserCog,
      alteracao_cadastral: FileText,
      troca_turno: Clock,
    };
    const Icon = icons[tipo] || FileText;
    return <Icon className="h-5 w-5" />;
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      ferias: 'Férias',
      licenca: 'Licença',
      mudanca_setor: 'Mudança de Setor',
      alteracao_cadastral: 'Alteração Cadastral',
      troca_turno: 'Troca de Turno',
    };
    return labels[tipo] || tipo;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pendente: { variant: 'outline', label: 'Pendente' },
      aprovado: { variant: 'default', label: 'Aprovado' },
      rejeitado: { variant: 'destructive', label: 'Rejeitado' },
    };
    return variants[status] || variants.pendente;
  };

  if (isLoading || roleLoading) {
    return (
      <CompanyLayout title="Solicitações">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CompanyLayout>
    );
  }

  if (!isOwner) {
    return (
      <CompanyLayout
        title="Solicitações"
        description="Acesso restrito"
      >
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar este recurso. Apenas o gestor da empresa pode gerenciar solicitações de colaboradores.
          </AlertDescription>
        </Alert>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout
      title="Solicitações"
      description="Gerencie solicitações de férias, licenças e alterações"
    >
      <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
        <TabsList className="mb-6">
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovado">Aprovadas</TabsTrigger>
          <TabsTrigger value="rejeitado">Rejeitadas</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="space-y-4">
          {requests && requests.length > 0 ? (
            requests.map((request: any) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getTipoIcon(request.tipo)}</div>
                      <div>
                        <CardTitle className="text-lg">
                          {getTipoLabel(request.tipo)}
                        </CardTitle>
                        <CardDescription>
                          {request.employee?.nome} • {request.employee?.matricula} • {request.employee?.cargo}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge {...getStatusBadge(request.status)}>
                      {getStatusBadge(request.status).label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {request.data_inicio && request.data_fim && (
                      <div>
                        <p className="text-sm text-muted-foreground">Período</p>
                        <p className="font-medium">
                          {new Date(request.data_inicio).toLocaleDateString('pt-BR')} até{' '}
                          {new Date(request.data_fim).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}

                    {request.descricao && (
                      <div>
                        <p className="text-sm text-muted-foreground">Descrição</p>
                        <p className="text-sm">{request.descricao}</p>
                      </div>
                    )}

                    {request.observacoes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Observações</p>
                        <p className="text-sm">{request.observacoes}</p>
                      </div>
                    )}

                    {request.status === 'pendente' && (
                      <div className="flex gap-2 pt-4">
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'aprovado' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'rejeitado' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Rejeitar
                        </Button>
                      </div>
                    )}

                    {request.data_aprovacao && (
                      <div className="text-sm text-muted-foreground pt-2">
                        Processado em {new Date(request.data_aprovacao).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma solicitação {selectedStatus === 'pendente' ? 'pendente' : selectedStatus === 'aprovado' ? 'aprovada' : 'rejeitada'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </CompanyLayout>
  );
}