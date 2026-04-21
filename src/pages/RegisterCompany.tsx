import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Check, Loader2, Zap } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  notes: z.string().trim().max(1000).optional(),
  plan_id: z.string().uuid('Selecione um plano'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

function maskCNPJ(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 14)
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

export default function RegisterCompany() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    cnpj: '',
    company_email: '',
    company_phone: '',
    password: '',
    confirmPassword: '',
    responsible_name: '',
    responsible_role: '',
    cep: '',
    address: '',
    city: '',
    state: '',
    notes: '',
    plan_id: '',
  });

  const handleCepBlur = async (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data?.erro) {
        toast({ title: 'CEP não encontrado', variant: 'destructive' });
        return;
      }
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
        .from('platform_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });
      if (error) {
        toast({ title: 'Erro ao carregar planos', description: error.message, variant: 'destructive' });
      } else {
        setPlans((data || []) as Plan[]);
        if (data && data.length && !form.plan_id) {
          setForm((f) => ({ ...f, plan_id: data[0].id }));
        }
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
      const first = parsed.error.errors[0];
      toast({ title: 'Verifique o formulário', description: first.message, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-tenant-user', {
        body: {
          company_name: form.company_name,
          company_email: form.company_email,
          password: form.password,
          company_phone: form.company_phone,
          cnpj: form.cnpj,
          plan_id: form.plan_id,
          notes: [
            form.responsible_name && `Responsável: ${form.responsible_name}`,
            form.responsible_role && `Cargo: ${form.responsible_role}`,
            form.address && `Endereço: ${form.address}`,
            form.city && `Cidade: ${form.city}`,
            form.state && `UF: ${form.state}`,
            form.notes && `Obs: ${form.notes}`,
          ].filter(Boolean).join(' | '),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({
        title: 'Cadastro realizado!',
        description: 'Sua empresa foi criada com sucesso. Faça login para começar.',
      });
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      toast({
        title: 'Falha no cadastro',
        description: err?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (v: number | null) =>
    typeof v === 'number'
      ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—';

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group mb-6">
            <div className="w-12 h-12 bg-primary rounded-xl border-3 border-foreground shadow-brutal flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-black text-2xl">SinapseRH</span>
          </Link>
          <h1 className="text-4xl font-black mb-2 flex items-center justify-center gap-3">
            <Building2 className="h-9 w-9 text-primary" />
            Cadastro de Empresa
          </h1>
          <p className="text-muted-foreground">
            Preencha os dados da sua empresa e escolha o plano ideal para começar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Dados da empresa */}
          <Card className="p-6 border-3 border-foreground shadow-brutal">
            <h2 className="text-xl font-black mb-4">Dados da Empresa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Razão Social / Nome da Empresa *</Label>
                <Input
                  value={form.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>CNPJ *</Label>
                <Input
                  value={form.cnpj}
                  onChange={(e) => handleChange('cnpj', maskCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={form.company_phone}
                  onChange={(e) => handleChange('company_phone', maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>
              <div>
                <Label>CEP</Label>
                <div className="relative">
                  <Input
                    value={form.cep}
                    onChange={(e) => handleChange('cep', maskCEP(e.target.value))}
                    onBlur={(e) => handleCepBlur(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {cepLoading && (
                    <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div>
                <Label>Endereço</Label>
                <Input
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 md:col-span-2">
                <div className="col-span-2">
                  <Label>Cidade</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    readOnly={cepLoading}
                  />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input
                    value={form.state}
                    onChange={(e) => handleChange('state', e.target.value.toUpperCase().slice(0, 2))}
                    maxLength={2}
                    readOnly={cepLoading}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Responsável */}
          <Card className="p-6 border-3 border-foreground shadow-brutal">
            <h2 className="text-xl font-black mb-4">Responsável pela Conta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  value={form.responsible_name}
                  onChange={(e) => handleChange('responsible_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input
                  value={form.responsible_role}
                  onChange={(e) => handleChange('responsible_role', e.target.value)}
                  placeholder="Ex.: Gerente de RH"
                />
              </div>
            </div>
          </Card>

          {/* Acesso */}
          <Card className="p-6 border-3 border-foreground shadow-brutal">
            <h2 className="text-xl font-black mb-4">Dados de Acesso</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>E-mail Corporativo *</Label>
                <Input
                  type="email"
                  value={form.company_email}
                  onChange={(e) => handleChange('company_email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Senha *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label>Confirmar Senha *</Label>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>
          </Card>

          {/* Plano */}
          <Card className="p-6 border-3 border-foreground shadow-brutal">
            <h2 className="text-xl font-black mb-4">Escolha seu Plano</h2>
            {loadingPlans ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : plans.length === 0 ? (
              <p className="text-muted-foreground">Nenhum plano disponível no momento.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const selected = form.plan_id === plan.id;
                  const features = Array.isArray(plan.features) ? plan.features : [];
                  return (
                    <button
                      type="button"
                      key={plan.id}
                      onClick={() => handleChange('plan_id', plan.id)}
                      className={`text-left p-5 rounded-xl border-3 border-foreground transition-all ${
                        selected
                          ? 'bg-primary text-primary-foreground shadow-brutal-lg -translate-y-1'
                          : 'bg-card hover:shadow-brutal hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-black text-lg">{plan.name}</h3>
                        {selected && <Check className="h-5 w-5" />}
                      </div>
                      <div className="mb-3">
                        <span className="text-2xl font-black">{formatPrice(plan.price_monthly)}</span>
                        <span className="text-sm opacity-80">/mês</span>
                      </div>
                      {plan.description && (
                        <p className="text-sm opacity-90 mb-3">{plan.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {plan.max_users && (
                          <Badge variant={selected ? 'secondary' : 'outline'}>
                            {plan.max_users} usuários
                          </Badge>
                        )}
                        {plan.max_jobs && (
                          <Badge variant={selected ? 'secondary' : 'outline'}>
                            {plan.max_jobs} vagas
                          </Badge>
                        )}
                        {plan.max_employees && (
                          <Badge variant={selected ? 'secondary' : 'outline'}>
                            {plan.max_employees} colaboradores
                          </Badge>
                        )}
                      </div>
                      {features.length > 0 && (
                        <ul className="space-y-1 text-sm">
                          {features.slice(0, 4).map((f: any, i: number) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>{typeof f === 'string' ? f : f?.name || ''}</span>
                            </li>
                          ))}
                          <li className="flex items-start gap-1.5 font-bold italic opacity-90">
                            <span className="ml-5">E muito mais...</span>
                          </li>
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Observações */}
          <Card className="p-6 border-3 border-foreground shadow-brutal">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Informações adicionais sobre a empresa, necessidades específicas, etc."
            />
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-[200px]">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cadastrando...
                </>
              ) : (
                'Finalizar Cadastro'
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Ao se cadastrar, você concorda com nossos{' '}
            <Link to="/terms-of-use" className="underline">Termos de Uso</Link> e{' '}
            <Link to="/privacy-policy" className="underline">Política de Privacidade</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}
