import { useParams, useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, User, Briefcase, Clock, Calendar, DollarSign, MapPin, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CompanyEmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { isOwner, loading: roleLoading } = useCompanyRole();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('id', id)
        .eq('company_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  if (isLoading || roleLoading) {
    return (
      <CompanyLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CompanyLayout>
    );
  }

  if (!isOwner) {
    return (
      <CompanyLayout>
        <h1 className="text-3xl font-bold mb-6">Acesso Negado</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar este recurso. Apenas o gestor da empresa pode visualizar detalhes de colaboradores.
          </AlertDescription>
        </Alert>
      </CompanyLayout>
    );
  }

  if (!employee) {
    return (
      <CompanyLayout>
        <h1 className="text-3xl font-bold mb-4">Colaborador não encontrado</h1>
        <p>Colaborador não encontrado.</p>
      </CompanyLayout>
    );
  }

  const calculateYearsOfService = (admissionDate: string) => {
    const years = new Date().getFullYear() - new Date(admissionDate).getFullYear();
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      ativo: 'default',
      ferias: 'secondary',
      afastado: 'secondary',
      desligado: 'destructive',
    };
    return variants[status] || 'default';
  };

  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{(employee as any)?.nome || 'Colaborador'}</h1>
        <p className="text-muted-foreground">
          {`${(employee as any)?.cargo || ''} - ${(employee as any)?.setor || ''}`}
        </p>
      </div>
      <div className="space-y-6">
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/company/employees')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={() => navigate(`/company/employees/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Matrícula</p>
                <p className="font-medium">{(employee as any).matricula}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={getStatusBadge((employee as any).status)}>
                  {(employee as any).status}
                </Badge>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Email Corporativo</p>
                <p className="font-medium">{(employee as any).email_corporativo || 'Não informado'}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{(employee as any).telefone || 'Não informado'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Informações Profissionais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Informações Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-medium">{(employee as any).cargo}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Setor</p>
                <p className="font-medium">{(employee as any).setor}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Subsetor</p>
                <p className="font-medium">{(employee as any).subsetor || 'Não informado'}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Gestor Imediato</p>
                <p className="font-medium">{(employee as any).gestor_imediato || 'Não informado'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Horário de Trabalho */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horário de Trabalho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Turno</p>
                <Badge variant="outline">{(employee as any).turno}</Badge>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Horário</p>
                <p className="font-medium">{(employee as any).horario_entrada} - {(employee as any).horario_saida}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Trabalha sábado</p>
                <p className="font-medium">{(employee as any).trabalha_sabado ? 'Sim' : 'Não'}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Local de Trabalho</p>
                <p className="font-medium">{(employee as any).local_trabalho || 'Não informado'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Informações Contratuais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informações Contratuais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Data de Admissão</p>
                <p className="font-medium">
                  {new Date((employee as any).data_admissao).toLocaleDateString('pt-BR')}
                  <span className="text-sm text-muted-foreground ml-2">
                    ({calculateYearsOfService((employee as any).data_admissao)} de casa)
                  </span>
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Contrato</p>
                <Badge variant="outline">{(employee as any).tipo_contrato}</Badge>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Próximas Férias Previstas</p>
                <p className="font-medium">
                  {(employee as any).proximas_ferias_previstas
                    ? new Date((employee as any).proximas_ferias_previstas).toLocaleDateString('pt-BR')
                    : 'Não programado'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyLayout>
  );
}