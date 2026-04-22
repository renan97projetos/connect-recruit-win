import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import srhLogo from '@/assets/srh-logo-official.png';

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo'),
});

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      emailSchema.parse({ email });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as 'email'] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-password-reset-email', {
        body: { email }
      });
      
      if (!error) {
        setEmailSent(true);
        toast({
          title: 'Email enviado!',
          description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        });
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      toast({
        title: 'Erro ao enviar email',
        description: 'Não foi possível enviar o email de recuperação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <img src={srhLogo} alt="SinapseRH" className="h-16 mx-auto" />
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recuperar Senha</CardTitle>
            <CardDescription>
              {emailSent 
                ? 'Email enviado! Verifique sua caixa de entrada.'
                : 'Digite seu email para receber instruções de recuperação'}
            </CardDescription>
          </CardHeader>
          {!emailSent ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors({});
                    }}
                    required
                    autoComplete="email"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar Email de Recuperação'}
                </Button>
                <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o login
                </Link>
              </CardFooter>
            </form>
          ) : (
            <CardFooter className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Enviamos um link de recuperação para <strong>{email}</strong>. 
                Clique no link para redefinir sua senha.
              </p>
              <Link to="/login" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
