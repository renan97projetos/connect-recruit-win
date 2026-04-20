import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const schema = z.object({
  name: z.string().trim().min(3, 'Nome muito curto').max(100, 'Nome muito longo'),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100, 'Senha muito longa'),
});

export function QuickCandidateRegister() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const { signUp } = useSupabaseAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as keyof typeof errors] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, name, 'candidate');

    if (!error) {
      toast({
        title: 'Cadastro realizado!',
        description: 'Bem-vindo ao Sinapse RH',
      });
      setTimeout(() => navigate('/candidate'), 500);
    } else {
      let msg = 'Tente novamente';
      if (error.message?.includes('already registered')) msg = 'Este email já está cadastrado';
      else if (error.message?.includes('Invalid email')) msg = 'Email inválido';
      else if (error.message?.includes('weak password')) msg = 'Senha muito fraca';
      toast({ title: 'Erro ao cadastrar', description: msg, variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <div id="cadastro" className="bg-background border-3 border-foreground rounded-2xl shadow-brutal-lg p-6 md:p-8">
      <div className="mb-5">
        <h2 className="text-2xl md:text-3xl font-black leading-tight">
          Crie seu perfil de candidato
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Em menos de 1 minuto. Grátis.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="quick-name">Nome completo</Label>
          <Input
            id="quick-name"
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((p) => ({ ...p, name: undefined }));
            }}
            autoComplete="name"
            required
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quick-email">Email</Label>
          <Input
            id="quick-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((p) => ({ ...p, email: undefined }));
            }}
            autoComplete="email"
            required
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quick-password">Senha</Label>
          <div className="relative">
            <Input
              id="quick-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((p) => ({ ...p, password: undefined }));
              }}
              autoComplete="new-password"
              minLength={6}
              required
              className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Cadastrando...' : (
            <>
              Criar minha conta
              <Rocket className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Já tem conta?{' '}
          <a href="/login" className="text-primary hover:underline font-semibold">
            Entrar
          </a>
        </p>
      </form>
    </div>
  );
}
