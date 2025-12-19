import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabels = {
  ativo: 'Ativo',
  em_ferias: 'Em Férias',
  afastado: 'Afastado',
  desligado: 'Desligado',
};

const statusColors = {
  ativo: 'bg-green-500/10 text-green-500 border-green-500/20',
  em_ferias: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  afastado: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  desligado: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const turnoLabels = {
  primeiro: '1º Turno',
  segundo: '2º Turno',
  terceiro: '3º Turno',
  administrativo: 'Administrativo',
};

const contratoLabels = {
  clt: 'CLT',
  pj: 'PJ',
  estagio: 'Estágio',
  temporario: 'Temporário',
};

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Carregando...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout title="Colaborador não encontrado">
        <p>Colaborador não encontrado.</p>
      </DashboardLayout>
    );
  }

  const calculateYearsOfService = (admissionDate: string) => {
    const years = new Date().getFullYear() - new Date(admissionDate).getFullYear();
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  };

  return (
    <DashboardLayout
      title={(employee as any)?.nome || "Colaborador"}
      description={`${(employee as any)?.cargo || ""} - ${(employee as any)?.setor || ""}`}
    >
      <div className="space-y-6">
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/employees')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={() => navigate(`/admin/employees/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Matrícula</p>
                <p className="font-medium">{employee.matricula}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="outline" className={statusColors[employee.status as keyof typeof statusColors]}>
                  {statusLabels[employee.status as keyof typeof statusLabels]}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">E-mail Corporativo</p>
                <p className="font-medium">{employee.email_corporativo || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{employee.telefone || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cargo e Hierarquia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-medium">{employee.cargo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Setor</p>
                <p className="font-medium">{employee.setor}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subsetor</p>
                <p className="font-medium">{employee.subsetor || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gestor Imediato</p>
                <p className="font-medium">{employee.gestor_imediato || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Jornada de Trabalho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Turno</p>
                <p className="font-medium">{turnoLabels[employee.turno as keyof typeof turnoLabels]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horário</p>
                <p className="font-medium">{employee.horario_entrada} - {employee.horario_saida}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trabalha aos Sábados</p>
                <p className="font-medium">{employee.trabalha_sabado ? 'Sim' : 'Não'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Local de Trabalho</p>
                <p className="font-medium">{employee.local_trabalho || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Contratuais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Data de Admissão</p>
                <p className="font-medium">
                  {format(new Date(employee.data_admissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tempo de Empresa</p>
                <p className="font-medium">{calculateYearsOfService(employee.data_admissao)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Contrato</p>
                <p className="font-medium">{contratoLabels[employee.tipo_contrato as keyof typeof contratoLabels]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Próximas Férias Previstas</p>
                <p className="font-medium">
                  {employee.proximas_ferias_previstas
                    ? format(new Date(employee.proximas_ferias_previstas), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
