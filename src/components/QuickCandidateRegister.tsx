import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Rocket, Upload, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

const schema = z.object({
  name: z.string().trim().min(3, 'Nome muito curto').max(100, 'Nome muito longo'),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100, 'Senha muito longa'),
  city: z.string().trim().min(2, 'Cidade obrigatória').max(100, 'Cidade muito longa'),
  state: z.string().trim().length(2, 'Selecione o estado'),
  desiredRole: z.string().trim().min(2, 'Informe o cargo ou área').max(150, 'Texto muito longo'),
});

export function QuickCandidateRegister() {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { signUp } = useSupabaseAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
        const role = check.role;
        if (role && role !== 'candidate') {
          const label = role === 'company' ? 'empresa' : role === 'super_admin' ? 'super admin' : role;
          toast({
            title: 'Email já cadastrado',
            description: `Este email já está em uso em uma conta de ${label}. Use outro email para criar sua conta de candidato.`,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        toast({
          title: 'Email já cadastrado',
          description: 'Já existe uma conta de candidato com este email. Faça login para continuar.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Falha ao verificar email:', err);
    }

    const { error } = await signUp(email, password, name, 'candidate');

    if (error) {
      let msg = 'Tente novamente';
      if (error.message?.includes('already registered')) msg = 'Este email já está cadastrado';
      else if (error.message?.includes('Invalid email')) msg = 'Email inválido';
      else if (error.message?.includes('weak password')) msg = 'Senha muito fraca';
      toast({ title: 'Erro ao cadastrar', description: msg, variant: 'destructive' });
      setLoading(false);
      return;
    }

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

        await supabase
          .from('profiles')
          .update({
            city,
            state,
            summary: `Cargo/área de interesse: ${desiredRole}`,
            ...(cvUrl ? { cv_url: cvUrl } : {}),
          })
          .eq('id', userId);
      }
    } catch (err) {
      console.error('Erro ao salvar dados extras:', err);
    }

    toast({
      title: 'Cadastro realizado!',
      description: 'Bem-vindo ao Sinapse RH',
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="quick-city">Cidade</Label>
            <Input
              id="quick-city"
              type="text"
              placeholder="Sua cidade"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setErrors((p) => ({ ...p, city: undefined }));
              }}
              autoComplete="address-level2"
              required
              className={errors.city ? 'border-destructive' : ''}
            />
            {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-state">Estado</Label>
            <Select value={state} onValueChange={(v) => { setState(v); setErrors((p) => ({ ...p, state: undefined })); }}>
              <SelectTrigger id="quick-state" className={errors.state ? 'border-destructive' : ''}>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {BR_STATES.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
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
