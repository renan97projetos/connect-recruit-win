import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { PlanLimitBanner } from '@/components/PlanLimitBanner';

const employeeSchema = z.object({
  matricula: z.string().min(1, 'Matrícula é obrigatória'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  status: z.enum(['ativo', 'ferias', 'afastado', 'desligado']),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  setor: z.string().min(1, 'Setor é obrigatório'),
  subsetor: z.string().optional(),
  gestor_imediato: z.string().optional(),
  turno: z.enum(['manha', 'tarde', 'noite', 'integral']),
  horario_entrada: z.string().min(1, 'Horário de entrada é obrigatório'),
  horario_saida: z.string().min(1, 'Horário de saída é obrigatório'),
  trabalha_sabado: z.boolean(),
  horario_almoco_inicio: z.string().optional(),
  horario_almoco_fim: z.string().optional(),
  horario_cafe_inicio: z.string().optional(),
  horario_cafe_fim: z.string().optional(),
  data_admissao: z.string().min(1, 'Data de admissão é obrigatória'),
  tipo_contrato: z.enum(['clt', 'pj', 'estagio', 'temporario']),
  email_corporativo: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  local_trabalho: z.string().optional(),
  proximas_ferias_previstas: z.string().optional(),
  status_aso: z.string().optional(),
  salario: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

export default function CompanyEmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useSupabaseAuth();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const { canCreate: canCreateByPlan, refresh: refreshPlanUsage } = usePlanLimits();
  const isEditing = !!id;

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      matricula: '',
      nome: '',
      status: 'ativo',
      cargo: '',
      setor: '',
      subsetor: '',
      gestor_imediato: '',
      turno: 'integral',
      horario_entrada: '08:00',
      horario_saida: '17:00',
      trabalha_sabado: false,
      horario_almoco_inicio: '12:00',
      horario_almoco_fim: '13:00',
      data_admissao: new Date().toISOString().split('T')[0],
      tipo_contrato: 'clt',
    },
  });

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('id', id)
        .eq('company_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isEditing && !!user?.id,
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        ...(employee as any),
        salario: (employee as any).salario?.toString() || '',
        email_corporativo: (employee as any).email_corporativo || '',
      });
    }
  }, [employee, form]);

  const mutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const employeeData: any = {
        ...data,
        salario: data.salario ? parseFloat(data.salario) : null,
        company_id: user?.id,
      };

      if (isEditing) {
        const { error } = await (supabase as any)
          .from('employees')
          .update(employeeData)
          .eq('id', id)
          .eq('company_id', user?.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('employees')
          .insert([employeeData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-employees'] });
      toast({
        title: isEditing ? 'Colaborador atualizado' : 'Colaborador criado',
        description: 'Os dados foram salvos com sucesso.',
      });
      navigate('/company/employees');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    if (!isEditing && !canCreateByPlan('employees')) {
      toast({
        title: 'Limite do plano atingido',
        description: 'Você atingiu o limite de colaboradores do seu plano. Faça upgrade para adicionar mais.',
        variant: 'destructive',
      });
      return;
    }
    mutation.mutate(data);
  };

  if (isLoading || roleLoading) {
    return <CompanyLayout><div>Carregando...</div></CompanyLayout>;
  }

  if (!isOwner) {
    return (
      <CompanyLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}</h1>
          <p className="text-muted-foreground">Acesso restrito</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar este recurso. Apenas o gestor da empresa pode gerenciar colaboradores.
          </AlertDescription>
        </Alert>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}</h1>
        <p className="text-muted-foreground">
          {isEditing ? 'Atualize as informações do colaborador' : 'Adicione um novo colaborador à empresa'}
        </p>
      </div>
      <Button variant="outline" onClick={() => navigate('/company/employees')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          
          {/* Mantenho a mesma estrutura do formulário do admin */}
          
          <Card>
            <CardHeader>
              <CardTitle>Dados Cadastrais</CardTitle>
              <CardDescription>Informações básicas do colaborador</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="matricula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matrícula</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="12345" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="João Silva" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="ferias">Férias</SelectItem>
                          <SelectItem value="afastado">Afastado</SelectItem>
                          <SelectItem value="desligado">Desligado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email_corporativo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Corporativo</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="colaborador@empresa.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/company/employees')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Form>
    </CompanyLayout>
  );
}
