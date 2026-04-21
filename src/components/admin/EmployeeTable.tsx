import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Employee {
  id: string;
  matricula: string;
  nome: string;
  status: string;
  cargo: string;
  setor: string;
  subsetor: string | null;
  gestor_imediato: string | null;
  turno: string;
  horario_entrada: string;
  horario_saida: string;
  trabalha_sabado: boolean;
  data_admissao: string;
  tipo_contrato: string;
  email_corporativo: string | null;
  telefone: string | null;
  local_trabalho: string | null;
  proximas_ferias_previstas: string | null;
  status_aso: string | null;
}

interface EmployeeTableProps {
  employees: Employee[];
  isCompanyView?: boolean;
}

const statusColors = {
  ativo: 'bg-green-500/10 text-green-500 border-green-500/20',
  em_ferias: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  afastado: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  desligado: 'bg-red-500/10 text-red-500 border-red-500/20',
  aguardando_cadastro: 'bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse',
};

const statusLabels = {
  ativo: 'Ativo',
  em_ferias: 'Em Férias',
  afastado: 'Afastado',
  desligado: 'Desligado',
  aguardando_cadastro: 'Aguardando Completar Cadastro',
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

export function EmployeeTable({ employees, isCompanyView = false }: EmployeeTableProps) {
  const navigate = useNavigate();

  const calculateYearsOfService = (admissionDate: string) => {
    const years = new Date().getFullYear() - new Date(admissionDate).getFullYear();
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  };

  const calculateCompleteness = (employee: Employee) => {
    const requiredFields = [
      employee.nome,
      employee.email_corporativo,
      employee.telefone,
      employee.cargo,
      employee.setor !== 'A definir' ? employee.setor : null,
      !employee.matricula.startsWith('MAT-') ? employee.matricula : null,
      employee.gestor_imediato,
      employee.subsetor,
      employee.local_trabalho,
      employee.status_aso,
    ];
    
    const filledFields = requiredFields.filter(field => field && field !== 'A definir').length;
    const totalFields = requiredFields.length;
    
    return Math.round((filledFields / totalFields) * 100);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matrícula</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Completude</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Turno</TableHead>
              <TableHead>Admissão</TableHead>
              <TableHead>Tempo</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Nenhum colaborador encontrado
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => {
                const completeness = calculateCompleteness(employee);
                return (
                  <TableRow key={employee.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{employee.matricula}</TableCell>
                    <TableCell>{employee.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[employee.status as keyof typeof statusColors]}>
                        {statusLabels[employee.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {employee.status === 'aguardando_cadastro' && (
                        <Badge 
                          variant="outline" 
                          className={`${completeness < 50 ? 'bg-red-500/10 text-red-500 border-red-500/20' : completeness < 80 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}
                        >
                          {completeness}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{employee.cargo}</TableCell>
                    <TableCell>{employee.setor}</TableCell>
                    <TableCell>{turnoLabels[employee.turno as keyof typeof turnoLabels]}</TableCell>
                    <TableCell>
                      {format(new Date(employee.data_admissao), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{calculateYearsOfService(employee.data_admissao)}</TableCell>
                    <TableCell>{contratoLabels[employee.tipo_contrato as keyof typeof contratoLabels]}</TableCell>
                    <TableCell>
                      {isCompanyView ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => navigate(`/company/employees/${employee.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar Cadastro
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/company/employees/${employee.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar Detalhes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/company/employees/${employee.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
