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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, Info } from 'lucide-react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { PlanLimitBanner } from '@/components/PlanLimitBanner';

const PERMISSIONS = [
  { key: 'view_vagas', label: 'Ver vagas abertas' },
  { key: 'create_vagas', label: 'Criar novas vagas' },
  { key: 'edit_vagas', label: 'Editar vagas existentes' },
  { key: 'publish_vagas', label: 'Publicar ou desativar vagas' },
  { key: 'manage_candidatos', label: 'Visualizar e editar candidatos' },
  { key: 'avaliar_candidatos', label: 'Inserir feedbacks ou notas' },
  { key: 'view_dashboard', label: 'Acessar relatórios e indicadores' },
  { key: 'manage_configuracoes', label: 'Alterar configurações da conta' },
];

const formSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
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
  const { canCreate: canCreateByPlan, refresh: refreshPlanUsage } = usePlanLimits();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      permissions: [],
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);

      // Enforcement de limite por plano
      if (!canCreateByPlan('users')) {
        toast({
          title: 'Limite do plano atingido',
          description: 'Você atingiu o limite de usuários internos do seu plano. Faça upgrade para convidar mais.',
          variant: 'destructive',
        });
        return;
      }

      // Verificar se já existe um convite pendente para este email
      const { data: existingInvitation } = await supabase
        .from('company_invitations')
        .select('id, status')
        .eq('email', values.email)
        .eq('company_id', user?.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvitation) {
        toast({
          title: 'Convite já enviado',
          description: 'Já existe um convite pendente para este email. Cancele o anterior para enviar um novo.',
          variant: 'destructive',
        });
        return;
      }

      // Verificar se o usuário já está cadastrado na empresa
      const { data: existingUser } = await supabase
        .from('company_users')
        .select('id')
        .eq('email', values.email)
        .eq('company_id', user?.id)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: 'Usuário já cadastrado',
          description: 'Este email já está cadastrado como colaborador desta empresa.',
          variant: 'destructive',
        });
        return;
      }

      // Criar convite
      const { data: invitation, error: inviteError } = await supabase
        .from('company_invitations')
        .insert({
          company_id: user?.id,
          email: values.email,
          name: values.name,
          permissions: values.permissions,
          invited_by: user?.id,
          status: 'pending',
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Enviar email de convite
      const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          invitationId: invitation.id,
        },
      });

      if (emailError) {
        console.error('Erro ao enviar email:', emailError);
        // Não falha a operação, apenas avisa
        toast({
          title: 'Convite criado',
          description: 'O convite foi criado, mas houve um problema ao enviar o email. O usuário pode acessar o link diretamente.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Convite enviado!',
          description: `Um email de convite foi enviado para ${values.email}`,
        });
      }

      // Registrar log de auditoria
      await supabase.from('audit_logs').insert({
        company_id: user?.id,
        action: `Convite enviado para ${values.name} (${values.email}) com permissões: ${values.permissions.join(', ') || 'nenhuma'}`,
        changed_by: user?.id,
      });

      form.reset();
      refreshPlanUsage();
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao criar convite:', error);
      toast({
        title: 'Erro ao enviar convite',
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
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Convidar Colaborador
          </DialogTitle>
          <DialogDescription>
            Envie um convite por email para o novo colaborador criar sua conta
          </DialogDescription>
        </DialogHeader>

        <PlanLimitBanner resource="users" />

        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            O colaborador receberá um email com um link para criar sua própria senha e ativar o acesso.
            O convite expira em 7 dias.
          </AlertDescription>
        </Alert>

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
              name="permissions"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Permissões</FormLabel>
                    <p className="text-sm text-muted-foreground mt-1">
                      Selecione as permissões que o colaborador terá após aceitar o convite
                    </p>
                  </div>
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
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
                              <FormLabel className="font-normal cursor-pointer">
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Convite
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
