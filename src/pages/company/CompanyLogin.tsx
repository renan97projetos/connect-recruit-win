import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Zap, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email é obrigatório').email('Email inválido').max(255),
  password: z.string().min(1, 'Senha é obrigatória').min(6, 'Mínimo 6 caracteres').max(100),
});

export default function CompanyLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { signIn } = useSupabaseAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      loginSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as 'email' | 'password'] = err.message;
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);
    const { error, role } = await signIn(email, password);

    if (!error) {
      if (role && role !== 'company' && role !== 'admin') {
        await supabase.auth.signOut();
        toast({
          title: 'Acesso restrito',
          description: 'Esta área é exclusiva para empresas. Use o portal correto para sua conta.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      toast({ title: 'Bem-vindo de volta!', description: 'Redirecionando ao seu painel...' });
      navigate(role === 'admin' ? '/admin/dashboard' : '/company');
    } else {
      let msg = 'Verifique suas credenciais';
      if (error.message.includes('Invalid login credentials')) msg = 'Email ou senha incorretos';
      else if (error.message.includes('Email not confirmed')) msg = 'Confirme seu email antes de entrar';
      toast({ title: 'Erro ao entrar', description: msg, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary border-r-3 border-foreground items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-12 left-12 w-24 h-24 bg-yellow rounded-xl border-3 border-foreground shadow-brutal-lg tilt-left" />
        <div className="absolute bottom-24 right-12 w-32 h-32 bg-cyan rounded-xl border-3 border-foreground shadow-brutal-lg tilt-right" />
        <div className="absolute top-1/3 right-24 w-16 h-16 bg-pink rounded-full border-3 border-foreground" />

        <div className="text-center text-primary-foreground z-10 max-w-md">
          <div className="w-20 h-20 bg-background rounded-xl border-3 border-foreground shadow-brutal-lg flex items-center justify-center mx-auto mb-8">
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-5xl font-black mb-4 leading-tight">
            Bom te ver de novo!
          </h1>
          <p className="text-xl opacity-90">
            Entre na sua conta e continue construindo o seu futuro.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 bg-primary rounded-xl border-3 border-foreground shadow-brutal flex items-center justify-center group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] transition-all">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-black text-2xl">SinapseRH</span>
            </Link>
          </div>

          <div>
            <h2 className="text-4xl font-black mb-2">Entrar</h2>
            <p className="text-muted-foreground">
              Área da Empresa — entre apenas com uma conta de empresa.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold uppercase tracking-wide text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                required
                autoComplete="email"
                className={`h-12 border-3 ${errors.email ? 'border-destructive' : 'border-foreground'} shadow-brutal focus:shadow-brutal-hover focus:translate-x-[-2px] focus:translate-y-[-2px] transition-all`}
              />
              {errors.email && (
                <p className="text-sm text-destructive font-semibold">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold uppercase tracking-wide text-sm">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  required
                  autoComplete="current-password"
                  className={`h-12 border-3 pr-12 ${errors.password ? 'border-destructive' : 'border-foreground'} shadow-brutal focus:shadow-brutal-hover focus:translate-x-[-2px] focus:translate-y-[-2px] transition-all`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-10 w-10 hover:bg-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive font-semibold">{errors.password}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-primary hover:underline underline-offset-4"
              >
                Esqueci minha senha
              </Link>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Ainda não tem uma conta empresarial?{' '}
              <Link to="/cadastro-empresa" className="font-semibold text-primary hover:underline underline-offset-4">
                Cadastrar empresa
              </Link>
            </p>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground font-semibold inline-block">
              ← Voltar para o início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
