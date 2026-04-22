import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Rocket, Upload, FileText, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { BRAZIL_STATES, fetchCitiesByState } from '@/lib/brazilLocations';

const schema = z.object({
  name: z.string().trim().min(3, 'Nome muito curto').max(100, 'Nome muito longo'),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100, 'Senha muito longa'),
  city: z.string().trim().min(2, 'Cidade obrigatória').max(100, 'Cidade muito longa'),
  state: z.string().trim().length(2, 'Selecione o estado'),
  desiredRole: z.string().trim().min(2, 'Informe o cargo ou área').max(150, 'Texto muito longo'),
});

export function QuickCandidateRegister() {
  const preregistrationStorageKey = 'candidate_preregistration';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [desiredRole, setDesiredRole] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { signUp } = useSupabaseAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const persistPreregistrationData = (data: {
    email: string;
    city: string;
    state: string;
    desired_role: string;
    cv_url?: string;
  }) => {
    if (typeof window === 'undefined') return;

    const key = `${preregistrationStorageKey}:${data.email.toLowerCase().trim()}`;
    window.localStorage.setItem(key, JSON.stringify(data));
    window.localStorage.setItem(preregistrationStorageKey, JSON.stringify(data));
  };

  useEffect(() => {
    if (!state) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    fetchCitiesByState(state)
      .then((list) => { if (!cancelled) setCities(list); })
      .finally(() => { if (!cancelled) setLoadingCities(false); });
    return () => { cancelled = true; };
  }, [state]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'Formato inválido', description: 'Envie um PDF ou DOC/DOCX', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Tamanho máximo: 5MB', variant: 'destructive' });
      return;
    }
    setCvFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = schema.safeParse({ name, email, password, city, state, desiredRole });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    // Bloqueia se o email já estiver cadastrado em outra área (ex: empresa)
    try {
      const { data: check } = await supabase.functions.invoke('check-email-availability', {
        body: { email },
      });
      if (check?.exists) {
        toast({
          title: 'Email já cadastrado',
          description: 'Este email já está em uso. Use outro email ou faça login com sua conta existente.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Falha ao verificar email:', err);
    }

    const { error } = await signUp(email, password, name, 'candidate', {
      city,
      state,
      desired_role: desiredRole,
    });

    if (error) {
      let msg = 'Tente novamente';
      const m = (error.message || '').toLowerCase();
      if (m.includes('already registered') || m.includes('user already')) {
        msg = 'Este email já está cadastrado';
      } else if (m.includes('invalid email')) {
        msg = 'Email inválido';
      } else if (m.includes('weak password')) {
        msg = 'Senha muito fraca';
      } else if (m.includes('rate limit') || m.includes('over_email_send_rate_limit') || m.includes('429')) {
        msg = 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
      } else if (error.message) {
        msg = error.message;
      }
      toast({ title: 'Erro ao cadastrar', description: msg, variant: 'destructive' });
      setLoading(false);
      return;
    }

    persistPreregistrationData({
      email,
      city,
      state,
      desired_role: desiredRole,
    });

    // Aguarda criação do perfil pelo trigger e atualiza com dados extras
    try {
      // Faz login imediato para obter o user.id e poder atualizar o profile + upload
      const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
      const userId = signInData.user?.id;

      if (userId) {
        let cvUrl: string | undefined;

        if (cvFile) {
          const ext = cvFile.name.split('.').pop();
          const filePath = `${userId}/cv-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('avatars')
            .upload(filePath, cvFile, { upsert: true });
          if (!upErr) {
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            cvUrl = publicUrl;
          }
        }

        const extraData: Record<string, any> = {
          city,
          state,
          desired_role: desiredRole,
          ...(cvUrl ? { cv_url: cvUrl } : {}),
        };

        persistPreregistrationData({
          email,
          city,
          state,
          desired_role: desiredRole,
          ...(cvUrl ? { cv_url: cvUrl } : {}),
        });

        // Aguarda o trigger handle_new_user criar o profile (até 4 tentativas)
        let saved = false;
        for (let attempt = 0; attempt < 4 && !saved; attempt++) {
          const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

          if (existing) {
            const { error: updErr } = await supabase
              .from('profiles')
              .update(extraData)
              .eq('id', userId);
            if (!updErr) saved = true;
          } else {
            await new Promise((r) => setTimeout(r, 500));
          }
        }

        // Fallback: upsert direto caso nenhuma tentativa tenha funcionado
        if (!saved) {
          await supabase
            .from('profiles')
            .upsert({ id: userId, name, ...extraData }, { onConflict: 'id' });
        }

        await supabase.auth.updateUser({
          data: {
            name,
            role: 'candidate',
            city,
            state,
            desired_role: desiredRole,
            ...(cvUrl ? { cv_url: cvUrl } : {}),
          },
        });
      }
    } catch (err) {
      console.error('Erro ao salvar dados extras:', err);
    }

    toast({
      title: 'Cadastro realizado!',
      description: 'Bem-vindo ao SinapseRH',
    });
    setTimeout(() => navigate('/candidate'), 500);
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="quick-state">Estado</Label>
            <Select
              value={state}
              onValueChange={(v) => {
                setState(v);
                setCity('');
                setErrors((p) => ({ ...p, state: undefined, city: undefined }));
              }}
            >
              <SelectTrigger id="quick-state" className={errors.state ? 'border-destructive' : ''}>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {BRAZIL_STATES.map((s) => (
                  <SelectItem key={s.uf} value={s.uf}>{s.uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="quick-city">Cidade</Label>
            <Select
              value={city}
              onValueChange={(v) => {
                setCity(v);
                setErrors((p) => ({ ...p, city: undefined }));
              }}
              disabled={!state || loadingCities}
            >
              <SelectTrigger id="quick-city" className={errors.city ? 'border-destructive' : ''}>
                <SelectValue placeholder={
                  !state ? 'Selecione o estado primeiro'
                  : loadingCities ? 'Carregando cidades...'
                  : 'Selecione a cidade'
                } />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {loadingCities ? (
                  <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando...
                  </div>
                ) : (
                  cities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quick-role">Cargo ou área de interesse</Label>
          <Input
            id="quick-role"
            type="text"
            placeholder="Ex: Desenvolvedor Front-end, Vendas, RH..."
            value={desiredRole}
            onChange={(e) => {
              setDesiredRole(e.target.value);
              setErrors((p) => ({ ...p, desiredRole: undefined }));
            }}
            required
            className={errors.desiredRole ? 'border-destructive' : ''}
          />
          {errors.desiredRole && <p className="text-xs text-destructive">{errors.desiredRole}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quick-cv">Currículo (opcional)</Label>
          <input
            ref={fileInputRef}
            id="quick-cv"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          {!cvFile ? (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start font-normal"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Anexar currículo (PDF ou DOC, até 5MB)
            </Button>
          ) : (
            <div className="flex items-center gap-2 p-2.5 border-2 border-foreground rounded-md bg-muted/30">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm truncate flex-1">{cvFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setCvFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Cadastrando...' : (
            <>
              Criar minha conta
              <Rocket className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>

      </form>
    </div>
  );
}
