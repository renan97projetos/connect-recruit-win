import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Mail, Building2, Shield } from 'lucide-react';
import srhLogo from '@/assets/srh-logo-official.png';

const formSchema = z.object({
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

interface InvitationData {
  id: string;
  name: string;
  email: string;
  company_id: string;
  permissions: string[];
  expires_at: string;
  status: string;
  company_name?: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  'view_vagas': 'Ver vagas abertas',
  'create_vagas': 'Criar novas vagas',
  'edit_vagas': 'Editar vagas existentes',
  'publish_vagas': 'Publicar ou desativar vagas',
  'manage_candidatos': 'Visualizar e editar candidatos',
  'avaliar_candidatos': 'Inserir feedbacks ou notas',
  'view_dashboard': 'Acessar relatórios e indicadores',
  'manage_configuracoes': 'Alterar configurações da conta',
};

export default function RegisterInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!token) {
      setError('Token de convite não encontrado. Verifique o link enviado por email.');
      setLoading(false);
      return;
    }

    const fetchInvitation = async () => {
      try {
        // Fetch invitation by token via SECURITY DEFINER function (público sem login)
        const { data: rows, error: invitationError } = await (supabase as any)
          .rpc('get_invitation_by_token', { _token: token });

        if (invitationError) throw invitationError;

        const invitationData = Array.isArray(rows) ? rows[0] : rows;

        if (!invitationData) {
          setError('Convite não encontrado, expirado ou já utilizado. Verifique o link ou solicite um novo.');
          setLoading(false);
          return;
        }

        // Fetch company name
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_name, name')
          .eq('id', invitationData.company_id)
          .single();

        setInvitation({
          ...invitationData,
          company_name: profile?.company_name || profile?.name || 'Empresa',
        });
      } catch (err: any) {
        console.error('Error fetching invitation:', err);
        setError('Erro ao carregar convite. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const onSubmit = async (values: FormValues) => {
    if (!token) return;

    try {
      setSubmitting(true);

      const { data, error: acceptError } = await supabase.functions.invoke('accept-invitation', {
        body: {
          token,
          password: values.password,
        },
      });

      if (acceptError) throw acceptError;

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess(true);
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Você será redirecionado para a página de login.',
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast({
        title: 'Erro ao criar conta',
        description: err.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={srhLogo} alt="Sinapse RH" className="h-12" />
            </div>
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Convite Inválido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex justify-center">
              <Button asChild>
                <Link to="/login">Ir para Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={srhLogo} alt="Sinapse RH" className="h-12" />
            </div>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Conta Criada!</CardTitle>
            <CardDescription>
              Sua conta foi criada com sucesso. Você será redirecionado para a página de login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Button asChild>
                <Link to="/login">Ir para Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={srhLogo} alt="Sinapse RH" className="h-12" />
          </div>
          <div>
            <CardTitle className="text-2xl">Criar sua conta</CardTitle>
            <CardDescription className="mt-2">
              Você foi convidado para fazer parte da equipe
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Empresa</p>
                <p className="font-medium">{invitation?.company_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{invitation?.email}</p>
              </div>
            </div>

            {invitation?.permissions && invitation.permissions.length > 0 && (
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Permissões</p>
                  <ul className="space-y-1">
                    {invitation.permissions.map((perm) => (
                      <li key={perm} className="text-sm flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        {PERMISSION_LABELS[perm] || perm}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Password Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Mínimo 8 caracteres"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Repita a senha"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  'Criar minha conta'
                )}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Faça login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
