import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

const employeeSchema = z.object({
  matricula: z.string().min(1, 'Matrícula é obrigatória'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  status: z.enum(['ativo', 'em_ferias', 'afastado', 'desligado']),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  setor: z.string().min(1, 'Setor é obrigatório'),
  subsetor: z.string().optional(),
  gestor_imediato: z.string().optional(),
  turno: z.enum(['primeiro', 'segundo', 'terceiro', 'administrativo']),
  horario_entrada: z.string().min(1, 'Horário de entrada é obrigatório'),
  horario_saida: z.string().min(1, 'Horário de saída é obrigatório'),
  trabalha_sabado: z.boolean().default(false),
  horario_almoco_inicio: z.string().optional(),
  horario_almoco_fim: z.string().optional(),
  horario_cafe_inicio: z.string().optional(),
  horario_cafe_fim: z.string().optional(),
  data_admissao: z.string().min(1, 'Data de admissão é obrigatória'),
  tipo_contrato: z.enum(['clt', 'pj', 'estagio', 'temporario']),
  email_corporativo: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  local_trabalho: z.string().optional(),
  proximas_ferias_previstas: z.string().optional(),
  status_aso: z.string().optional(),
  salario: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      status: 'ativo',
      turno: 'primeiro',
      tipo_contrato: 'clt',
      trabalha_sabado: false,
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
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isEditing,
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
        matricula: data.matricula,
        nome: data.nome,
        status: data.status,
        cargo: data.cargo,
        setor: data.setor,
        subsetor: data.subsetor || null,
        gestor_imediato: data.gestor_imediato || null,
        turno: data.turno,
        horario_entrada: data.horario_entrada,
        horario_saida: data.horario_saida,
        trabalha_sabado: data.trabalha_sabado,
        horario_almoco_inicio: data.horario_almoco_inicio || null,
        horario_almoco_fim: data.horario_almoco_fim || null,
        horario_cafe_inicio: data.horario_cafe_inicio || null,
        horario_cafe_fim: data.horario_cafe_fim || null,
        data_admissao: data.data_admissao,
        tipo_contrato: data.tipo_contrato,
        email_corporativo: data.email_corporativo || null,
        telefone: data.telefone || null,
        local_trabalho: data.local_trabalho || null,
        proximas_ferias_previstas: data.proximas_ferias_previstas || null,
        status_aso: data.status_aso || null,
        salario: data.salario ? parseFloat(data.salario) : null,
      };

      if (isEditing) {
        const { error } = await (supabase as any)
          .from('employees')
          .update(employeeData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('employees')
          .insert([employeeData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: isEditing ? 'Colaborador atualizado' : 'Colaborador criado',
        description: 'Os dados foram salvos com sucesso.',
      });
      navigate('/admin/employees');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
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

  return (
    <DashboardLayout
      title={isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}
      description={isEditing ? 'Edite os dados do colaborador' : 'Cadastre um novo colaborador'}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="matricula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matrícula *</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="em_ferias">Em Férias</SelectItem>
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
              name="cargo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="setor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Setor *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subsetor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subsetor</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gestor_imediato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gestor Imediato</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="turno"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Turno *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="primeiro">1º Turno</SelectItem>
                      <SelectItem value="segundo">2º Turno</SelectItem>
                      <SelectItem value="terceiro">3º Turno</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="horario_entrada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário de Entrada *</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="horario_saida"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário de Saída *</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_admissao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Admissão *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo_contrato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Contrato *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="clt">CLT</SelectItem>
                      <SelectItem value="pj">PJ</SelectItem>
                      <SelectItem value="estagio">Estágio</SelectItem>
                      <SelectItem value="temporario">Temporário</SelectItem>
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
                  <FormLabel>E-mail Corporativo</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="local_trabalho"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local de Trabalho</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="salario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salário</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trabalha_sabado"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Trabalha aos sábados</FormLabel>
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Atualizar' : 'Cadastrar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/employees')}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </DashboardLayout>
  );
}
