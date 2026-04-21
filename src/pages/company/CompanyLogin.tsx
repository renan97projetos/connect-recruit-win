import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, ArrowRight, Building2, ShieldCheck, Sparkles, Lock } from 'lucide-react';
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
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a14]">
      {/* Ambient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsl(262_83%_30%_/_0.4),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsl(200_90%_30%_/_0.3),_transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />
        <div className="absolute top-20 left-1/3 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute bottom-10 right-20 w-[28rem] h-[28rem] rounded-full bg-indigo-500/15 blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col lg:flex-row">
        {/* Left brand */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 text-white">
          <Link to="/" className="inline-flex items-center gap-3 group w-fit">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-semibold text-xl tracking-tight">SinapseRH <span className="text-violet-300/80 font-normal">Empresas</span></span>
          </Link>

          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-violet-200 backdrop-blur-sm mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Portal corporativo
            </div>
            <h1 className="text-5xl xl:text-6xl font-semibold leading-[1.05] tracking-tight mb-6">
              Recrutamento <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-indigo-300">inteligente</span>, decisões mais rápidas.
            </h1>
            <p className="text-lg text-white/60 leading-relaxed">
              Acesse seu painel para acompanhar vagas, candidatos e métricas em tempo real.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-lg">
            {[
              { k: 'IA integrada', d: 'Triagem assistida' },
              { k: 'Multiusuário', d: 'Permissões granulares' },
              { k: 'LGPD', d: 'Conformidade total' },
            ].map((f) => (
              <div key={f.k} className="border-l border-white/10 pl-4">
                <p className="text-sm font-medium text-white">{f.k}</p>
                <p className="text-xs text-white/50 mt-0.5">{f.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8 flex justify-center">
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold text-xl text-white tracking-tight">SinapseRH</span>
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 lg:p-10 shadow-2xl shadow-black/40">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 text-xs font-medium text-violet-300 mb-3">
                  <Lock className="h-3.5 w-3.5" />
                  ACESSO EMPRESARIAL
                </div>
                <h2 className="text-3xl font-semibold text-white tracking-tight">Entrar na sua conta</h2>
                <p className="text-sm text-white/50 mt-2">
                  Use o e-mail corporativo cadastrado para acessar seu painel.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-medium text-white/70 tracking-wide">
                    E-MAIL CORPORATIVO
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="nome@suaempresa.com.br"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                    required
                    autoComplete="email"
                    className={`w-full h-12 rounded-lg bg-white/5 border px-4 text-white placeholder:text-white/30 outline-none transition-all focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-500/40 ${errors.email ? 'border-red-400/60' : 'border-white/10 hover:border-white/20'}`}
                  />
                  {errors.email && <p className="text-xs text-red-300">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-xs font-medium text-white/70 tracking-wide">
                    SENHA
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                      required
                      autoComplete="current-password"
                      className={`w-full h-12 rounded-lg bg-white/5 border px-4 pr-12 text-white placeholder:text-white/30 outline-none transition-all focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-500/40 ${errors.password ? 'border-red-400/60' : 'border-white/10 hover:border-white/20'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-300">{errors.password}</p>}
                </div>

                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs font-medium text-violet-300 hover:text-violet-200 transition-colors">
                    Esqueci minha senha
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-medium shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:from-violet-400 hover:to-indigo-500 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {loading ? 'Autenticando...' : (<>Acessar painel <ArrowRight className="h-4 w-4" /></>)}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-3 text-xs text-white/50">
                  <ShieldCheck className="h-4 w-4 text-emerald-400/80 shrink-0" />
                  <span>Conexão criptografada de ponta a ponta. Seus dados estão protegidos.</span>
                </div>
              </div>
            </div>

            <div className="text-center mt-6 space-y-2">
              <p className="text-sm text-white/50">
                Ainda não tem uma conta empresarial?{' '}
                <Link to="/cadastro-empresa" className="text-violet-300 hover:text-violet-200 font-medium">
                  Cadastrar empresa
                </Link>
              </p>
              <Link to="/" className="text-xs text-white/40 hover:text-white/70 inline-block">
                ← Voltar ao site
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
