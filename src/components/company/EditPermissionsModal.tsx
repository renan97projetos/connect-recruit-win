import { useState, useEffect } from 'react';
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

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface EditPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: CompanyUser;
  onSuccess: () => void;
}

export function EditPermissionsModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditPermissionsModalProps) {
  const { user: currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      status: user.status as 'ativo' | 'inativo',
      permissions: [],
    },
  });

  useEffect(() => {
    if (open && user) {
      loadUserPermissions();
      form.reset({
        name: user.name,
        email: user.email,
        status: user.status as 'ativo' | 'inativo',
        permissions: [],
      });
    }
  }, [open, user]);

  const loadUserPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_key')
        .eq('company_user_id', user.id)
        .eq('allowed', true);

      if (error) throw error;

      const permissions = data.map((p: any) => p.permission_key);
      form.setValue('permissions', permissions);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar permissões',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingPermissions(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);

      // Atualizar dados do usuário
      const { error: userError } = await supabase
        .from('company_users')
        .update({
          name: values.name,
          email: values.email,
          status: values.status,
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Deletar todas as permissões existentes
      const { error: deleteError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('company_user_id', user.id);

      if (deleteError) throw deleteError;

      // Criar novas permissões
      if (values.permissions.length > 0) {
        const permissionsData = values.permissions.map(permission => ({
          company_user_id: user.id,
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
        company_id: currentUser?.id,
        company_user_id: user.id,
        action: `Permissões atualizadas para ${values.name}: ${values.permissions.join(', ')}`,
        changed_by: currentUser?.id,
      });

      toast({
        title: 'Permissões atualizadas',
        description: 'As permissões foram atualizadas com sucesso.',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar permissões',
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
          <DialogTitle>Editar Permissões</DialogTitle>
          <DialogDescription>
            Atualize os dados e permissões do usuário
          </DialogDescription>
        </DialogHeader>

        {loadingPermissions ? (
          <div className="py-8 text-center">Carregando permissões...</div>
        ) : (
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
                  {loading ? 'Salvando...' : 'Salvar Permissões'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
