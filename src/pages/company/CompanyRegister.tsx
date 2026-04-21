import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Check, Eye, EyeOff, Loader2, Sparkles, ShieldCheck, ArrowRight, ArrowLeft, User, Lock, Briefcase } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  max_users: number | null;
  max_jobs: number | null;
  max_employees: number | null;
  features: any;
}

const schema = z.object({
  company_name: z.string().trim().min(2, 'Informe o nome da empresa').max(150),
  cnpj: z.string().trim().min(14, 'CNPJ inválido').max(20),
  company_email: z.string().trim().email('E-mail inválido').max(255),
  company_phone: z.string().trim().min(10, 'Telefone inválido').max(20),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(100),
  confirmPassword: z.string(),
  responsible_name: z.string().trim().min(2, 'Informe o nome do responsável').max(100),
  responsible_role: z.string().trim().max(100).optional(),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(50).optional(),
  plan_id: z.string().uuid('Selecione um plano'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

function maskCNPJ(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}
function maskCEP(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

const inputCls = (err = false) =>
  `w-full h-12 rounded-lg bg-background border-3 border-foreground px-4 text-foreground placeholder:text-muted-foreground outline-none transition-all focus:shadow-brutal focus:translate-x-[-2px] focus:translate-y-[-2px] font-medium ${err ? 'border-destructive' : ''}`;

const labelCls = 'text-sm font-bold text-foreground tracking-wide block mb-2';

export default function CompanyRegister() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cnpjValidated, setCnpjValidated] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    company_name: '', cnpj: '', company_email: '', company_phone: '',
    password: '', confirmPassword: '', responsible_name: '', responsible_role: '',
    cep: '', address: '', city: '', state: '', plan_id: '',
  });

  const validateCNPJDigits = (cnpj: string): boolean => {
    const c = cnpj.replace(/\D/g, '');
    if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
    const calc = (base: string, weights: number[]) => {
      const sum = base.split('').reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0);
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const d1 = calc(c.slice(0, 12), w1);
    const d2 = calc(c.slice(0, 12) + d1, w2);
    return d1 === parseInt(c[12]) && d2 === parseInt(c[13]);
  };

  const handleCnpjBlur = async (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    setCnpjValidated(false);
    if (digits.length !== 14) return;
    if (!validateCNPJDigits(digits)) {
      toast({ title: 'CNPJ inválido', description: 'Os dígitos verificadores não conferem.', variant: 'destructive' });
      return;
    }
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (res.status === 404) { toast({ title: 'CNPJ não encontrado', variant: 'destructive' }); return; }
      if (!res.ok) { toast({ title: 'Erro ao validar CNPJ', variant: 'destructive' }); return; }
      const data = await res.json();
      const situacao = (data?.descricao_situacao_cadastral || '').toUpperCase();
      if (situacao && situacao !== 'ATIVA') {
        toast({ title: 'CNPJ não está ativo', description: `Situação: ${data.descricao_situacao_cadastral}`, variant: 'destructive' });
        return;
      }
      setForm((f) => ({
        ...f,
        company_name: data.razao_social || data.nome_fantasia || f.company_name,
        cep: f.cep || (data.cep ? maskCEP(String(data.cep)) : ''),
        address: f.address || [data.logradouro, data.numero].filter(Boolean).join(', '),
        city: f.city || data.municipio || '',
        state: f.state || (data.uf || '').toUpperCase(),
        company_phone: f.company_phone || (data.ddd_telefone_1 ? maskPhone(String(data.ddd_telefone_1)) : ''),
        company_email: f.company_email || data.email || '',
      }));
      setCnpjValidated(true);
      toast({ title: 'CNPJ validado!', description: data.razao_social || 'Dados preenchidos automaticamente.' });
    } catch {
      toast({ title: 'Erro ao validar CNPJ', variant: 'destructive' });
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleCepBlur = async (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data?.erro) { toast({ title: 'CEP não encontrado', variant: 'destructive' }); return; }
      setForm((f) => ({
        ...f,
        city: data.localidade || f.city,
        state: (data.uf || f.state).toUpperCase(),
        address: f.address || data.logradouro || '',
      }));
    } catch {
      toast({ title: 'Erro ao buscar CEP', variant: 'destructive' });
    } finally {
      setCepLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Cadastro de Empresa | Sinapse RH';
    (async () => {
      const { data, error } = await supabase
        .from('platform_plans').select('*').eq('is_active', true)
        .order('price_monthly', { ascending: true });
      if (error) toast({ title: 'Erro ao carregar planos', description: error.message, variant: 'destructive' });
      else {
        setPlans((data || []) as Plan[]);
        if (data && data.length && !form.plan_id) setForm((f) => ({ ...f, plan_id: data[0].id }));
      }
      setLoadingPlans(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: 'Verifique o formulário', description: parsed.error.errors[0].message, variant: 'destructive' });
      return;
    }
    if (!cnpjValidated) {
      toast({ title: 'CNPJ não validado', description: 'Aguarde a validação junto à Receita Federal.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-tenant-user', {
        body: {
          company_name: form.company_name, company_email: form.company_email,
          password: form.password, company_phone: form.company_phone,
          cnpj: form.cnpj, plan_id: form.plan_id,
          notes: [
            form.responsible_name && `Responsável: ${form.responsible_name}`,
            form.responsible_role && `Cargo: ${form.responsible_role}`,
            form.address && `Endereço: ${form.address}`,
            form.city && `Cidade: ${form.city}`,
            form.state && `UF: ${form.state}`,
          ].filter(Boolean).join(' | '),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      try {
        const tenantId = (data as any)?.tenant?.id || (data as any)?.user_id;
        const loginUrl = `${window.location.origin}/empresa/acesso`;
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'company-welcome',
            recipientEmail: form.company_email,
            idempotencyKey: `company-welcome-${tenantId || form.company_email}`,
            templateData: {
              name: form.responsible_name || form.company_name,
              companyName: form.company_name,
              cnpj: form.cnpj,
              email: form.company_email,
              loginUrl,
            },
          },
        });
      } catch (emailErr) {
        console.warn('Welcome email failed:', emailErr);
      }

      toast({ title: 'Cadastro realizado!', description: 'Enviamos um e-mail de boas-vindas com os dados de acesso.' });
      setTimeout(() => navigate('/empresa/acesso'), 1400);
    } catch (err: any) {
      toast({ title: 'Falha no cadastro', description: err?.message || 'Tente novamente em instantes.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (v: number | null) =>
    typeof v === 'number' ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

  const steps = [
    { n: 1, label: 'Empresa', icon: Building2, bg: 'bg-yellow' },
    { n: 2, label: 'Responsável', icon: User, bg: 'bg-cyan' },
    { n: 3, label: 'Acesso', icon: Lock, bg: 'bg-lime' },
    { n: 4, label: 'Plano', icon: Briefcase, bg: 'bg-pink' },
  ];

  const goNext = () => {
    if (step === 1 && (!form.company_name || !form.cnpj || !form.company_phone)) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' }); return;
    }
    if (step === 1 && !cnpjValidated) {
      toast({ title: 'CNPJ não validado', description: 'Aguarde a validação para continuar.', variant: 'destructive' }); return;
    }
    if (step === 2 && !form.responsible_name) {
      toast({ title: 'Informe o responsável', variant: 'destructive' }); return;
    }
    if (step === 3) {
      if (!form.company_email || !form.password || form.password.length < 8) {
        toast({ title: 'Verifique e-mail e senha', description: 'Senha deve ter no mínimo 8 caracteres.', variant: 'destructive' }); return;
      }
      if (form.password !== form.confirmPassword) {
        toast({ title: 'As senhas não coincidem', variant: 'destructive' }); return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const currentStepBg = steps.find((s) => s.n === step)?.bg || 'bg-yellow';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-3 border-foreground bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-primary border-3 border-foreground shadow-brutal flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-black text-xl tracking-tight text-foreground">
              SinapseRH <span className="text-muted-foreground font-bold">Empresas</span>
            </span>
          </Link>
          <Link
            to="/empresa/acesso"
            className="text-sm font-bold text-foreground hover:underline underline-offset-4"
          >
            Já tenho conta →
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Title */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border-3 border-foreground bg-yellow px-4 py-1.5 text-sm font-bold text-foreground shadow-brutal mb-6">
            <Sparkles className="h-4 w-4" />
            Comece em minutos
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight mb-4">
            Crie sua conta empresarial
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Configure seu acesso, escolha o plano ideal e transforme seu processo de recrutamento.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 lg:gap-3 mb-10 flex-wrap">
          {steps.map((s, i) => {
            const active = step === s.n;
            const done = step > s.n;
            const Icon = s.icon;
            return (
              <div key={s.n} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-3 border-foreground font-bold text-sm transition-all ${
                    active
                      ? `${s.bg} text-foreground shadow-brutal`
                      : done
                      ? 'bg-lime text-foreground shadow-brutal'
                      : 'bg-background text-muted-foreground'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.n}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-3 lg:w-6 h-1 mx-1 ${done ? 'bg-foreground' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit}>
          <div
            className={`${currentStepBg} rounded-2xl border-3 border-foreground shadow-brutal-lg p-6 lg:p-10 transition-colors`}
          >
            {/* Step 1: Empresa */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-foreground">Dados da empresa</h2>
                  <p className="text-sm text-foreground/70 mt-1 font-medium">
                    Comece pelo CNPJ — preencheremos o restante automaticamente.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className={labelCls}>CNPJ *</label>
                    <div className="relative">
                      <input
                        value={form.cnpj}
                        onChange={(e) => { handleChange('cnpj', maskCNPJ(e.target.value)); setCnpjValidated(false); }}
                        onBlur={(e) => handleCnpjBlur(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className={inputCls()}
                        required
                      />
                      {cnpjLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-foreground" />
                      ) : cnpjValidated ? (
                        <Check className="h-5 w-5 absolute right-3 top-1/2 -translate-y-1/2 text-foreground" />
                      ) : null}
                    </div>
                    <p className="text-xs text-foreground/60 mt-1.5 font-medium">
                      Validação automática junto à Receita Federal.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>Razão social / Nome da empresa *</label>
                    <input
                      value={form.company_name}
                      onChange={(e) => handleChange('company_name', e.target.value)}
                      className={inputCls()}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Telefone *</label>
                    <input
                      value={form.company_phone}
                      onChange={(e) => handleChange('company_phone', maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className={inputCls()}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelCls}>CEP</label>
                    <div className="relative">
                      <input
                        value={form.cep}
                        onChange={(e) => handleChange('cep', maskCEP(e.target.value))}
                        onBlur={(e) => handleCepBlur(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                        className={inputCls()}
                      />
                      {cepLoading && <Loader2 className="h-5 w-5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-foreground" />}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>Endereço</label>
                    <input
                      value={form.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className={inputCls()}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 md:col-span-2">
                    <div className="col-span-2">
                      <label className={labelCls}>Cidade</label>
                      <input
                        value={form.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>UF</label>
                      <input
                        value={form.state}
                        onChange={(e) => handleChange('state', e.target.value.toUpperCase().slice(0, 2))}
                        maxLength={2}
                        className={inputCls()}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Responsável */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-foreground">Responsável pela conta</h2>
                  <p className="text-sm text-foreground/70 mt-1 font-medium">
                    Quem será o administrador principal do painel.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Nome completo *</label>
                    <input
                      value={form.responsible_name}
                      onChange={(e) => handleChange('responsible_name', e.target.value)}
                      className={inputCls()}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Cargo</label>
                    <input
                      value={form.responsible_role}
                      onChange={(e) => handleChange('responsible_role', e.target.value)}
                      placeholder="Ex.: Gerente de RH"
                      className={inputCls()}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Acesso */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-foreground">Dados de acesso</h2>
                  <p className="text-sm text-foreground/70 mt-1 font-medium">
                    Você usará estes dados para entrar no painel.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className={labelCls}>E-mail corporativo *</label>
                    <input
                      type="email"
                      value={form.company_email}
                      onChange={(e) => handleChange('company_email', e.target.value)}
                      className={inputCls()}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Senha *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className={`${inputCls()} pr-10`}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-foreground/60 mt-1.5 font-medium">Mínimo 8 caracteres.</p>
                  </div>
                  <div>
                    <label className={labelCls}>Confirmar senha *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        className={`${inputCls()} pr-10`}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Plano */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-foreground">Escolha seu plano</h2>
                  <p className="text-sm text-foreground/70 mt-1 font-medium">
                    Você poderá alterar a qualquer momento.
                  </p>
                </div>
                {loadingPlans ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-foreground" />
                  </div>
                ) : plans.length === 0 ? (
                  <p className="text-foreground/70 font-medium">Nenhum plano disponível no momento.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.map((plan, idx) => {
                      const selected = form.plan_id === plan.id;
                      const features = Array.isArray(plan.features) ? plan.features : [];
                      const planBgs = ['bg-cyan', 'bg-lime', 'bg-yellow'];
                      const planBg = planBgs[idx % planBgs.length];
                      return (
                        <button
                          type="button"
                          key={plan.id}
                          onClick={() => handleChange('plan_id', plan.id)}
                          className={`text-left p-5 rounded-xl border-3 border-foreground transition-all relative ${
                            selected
                              ? `${planBg} shadow-brutal-lg translate-x-[-2px] translate-y-[-2px]`
                              : 'bg-background shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-hover'
                          }`}
                        >
                          {selected && (
                            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-foreground border-3 border-foreground flex items-center justify-center">
                              <Check className="h-4 w-4 text-background" />
                            </div>
                          )}
                          <h3 className="font-black text-foreground text-xl">{plan.name}</h3>
                          <div className="mt-2 mb-3">
                            <span className="text-3xl font-black text-foreground tracking-tight">
                              {formatPrice(plan.price_monthly)}
                            </span>
                            <span className="text-sm text-foreground/60 font-bold">/mês</span>
                          </div>
                          {plan.description && (
                            <p className="text-sm text-foreground/80 mb-4 font-medium">{plan.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {plan.max_users && (
                              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md bg-foreground text-background font-bold">
                                {plan.max_users} usuários
                              </span>
                            )}
                            {plan.max_jobs && (
                              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md bg-foreground text-background font-bold">
                                {plan.max_jobs} vagas
                              </span>
                            )}
                            {plan.max_employees && (
                              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md bg-foreground text-background font-bold">
                                {plan.max_employees} colaboradores
                              </span>
                            )}
                          </div>
                          {features.length > 0 && (
                            <ul className="space-y-1.5 text-sm text-foreground/80 font-medium">
                              {features.slice(0, 4).map((f: any, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-foreground" />
                                  <span>{typeof f === 'string' ? f : f?.name || ''}</span>
                                </li>
                              ))}
                              <li className="text-xs italic text-foreground/60 pl-6">E muito mais...</li>
                            </ul>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={() => step === 1 ? navigate('/') : setStep((s) => s - 1)}
              className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-background border-3 border-foreground font-bold text-foreground shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-hover transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-primary border-3 border-foreground text-primary-foreground font-black shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-hover transition-all"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-primary border-3 border-foreground text-primary-foreground font-black shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-hover transition-all disabled:opacity-60"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Cadastrando...</>
                ) : (
                  <>Finalizar cadastro <Check className="h-4 w-4" /></>
                )}
              </button>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-muted-foreground font-medium">
            <ShieldCheck className="h-4 w-4 text-foreground" />
            <span>
              Ao se cadastrar, você concorda com nossos{' '}
              <Link to="/terms-of-use" className="text-foreground font-bold underline underline-offset-2">Termos</Link>{' '}e{' '}
              <Link to="/privacy-policy" className="text-foreground font-bold underline underline-offset-2">Privacidade</Link>.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
