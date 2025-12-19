import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';

const PERMISSIONS = [
  { key: 'view_vagas', label: 'Ver vagas abertas' },
  { key: 'create_vagas', label: 'Criar novas vagas' },
  { key: 'edit_vagas', label: 'Editar vagas existentes' },
  { key: 'publish_vagas', label: 'Publicar ou desativar vagas' },
  { key: 'manage_candidatos', label: 'Visualizar e editar candidatos' },
  { key: 'avaliar_candidatos', label: 'Inserir feedbacks ou notas' },
  { key: 'view_dashboard', label: 'Acessar relatórios e indicadores' },
  { key: 'manage_configuracoes', label: 'Alterar configurações da conta' },
  // NOTA: manage_usuarios não está disponível para colaboradores
  // Apenas o Owner (gestor da empresa) pode gerenciar usuários
];

const formSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  status: z.enum(['ativo', 'inativo']),
  permissions: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddUserModal({ open, onOpenChange, onSuccess }: AddUserModalProps) {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      status: 'ativo',
      permissions: [],
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);

      // Gerar senha temporária de 12 caracteres
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

      // Criar usuário no Supabase Auth via edge function
      const { data: authResponse, error: authError } = await supabase.functions.invoke('create-company-user', {
        body: {
          email: values.email,
          name: values.name,
          tempPassword: tempPassword,
        },
      });

      if (authError || !authResponse?.userId) throw authError || new Error('Erro ao criar usuário');

      // Criar usuário na tabela company_users
      const { data: userData, error: userError } = await supabase
        .from('company_users')
        .insert({
          company_id: user?.id,
          user_id: authResponse.userId,
          name: values.name,
          email: values.email,
          status: values.status,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Criar permissões
      if (values.permissions.length > 0) {
        const permissionsData = values.permissions.map(permission => ({
          company_user_id: userData.id,
          permission_key: permission as any,
          allowed: true,
        }));

        const { error: permError } = await supabase
          .from('user_permissions')
          .insert(permissionsData);

        if (permError) throw permError;
      }

      // Registrar log de auditoria
      await supabase.from('audit_logs').insert({
        company_id: user?.id,
        company_user_id: userData.id,
        action: `Usuário ${values.name} foi adicionado com permissões: ${values.permissions.join(', ')}`,
        changed_by: user?.id,
      });

      // Enviar email de boas-vindas com credenciais em background
      supabase.functions.invoke('send-user-welcome-email', {
        body: {
          userName: values.name,
          userEmail: values.email,
          companyId: user?.id,
          permissions: values.permissions,
          tempPassword: tempPassword,
        },
      }).then(() => {
        console.log('Email de boas-vindas enviado em background');
      }).catch((emailError: any) => {
        console.error('Erro ao enviar email de boas-vindas:', emailError);
      });

      toast({
        title: 'Usuário criado com sucesso',
        description: 'O usuário receberá um email com as credenciais de acesso em breve.',
      });

      form.reset();
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar usuário',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Usuário</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo usuário e defina suas permissões
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="joao@empresa.com" {...field} />
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
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Permissões</FormLabel>
                  </div>
                  <div className="space-y-2">
                    {PERMISSIONS.map((permission) => (
                      <FormField
                        key={permission.key}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={permission.key}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(permission.key)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, permission.key])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== permission.key
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {permission.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Adicionar Usuário'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
