import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, X, Save, Send, DollarSign, Gift, ListChecks, Target, Sparkles, Loader2 } from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';
import { JobPreview } from '@/components/jobs/JobPreview';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { PlanLimitBanner } from '@/components/PlanLimitBanner';
import { ProFeatureGate } from '@/components/ProFeatureGate';
import { BRAZIL_STATES, fetchCitiesByState } from '@/lib/brazilLocations';
import { REQUIREMENT_CATEGORIES } from '@/lib/jobRequirements';

interface FormErrors {
  title?: string;
  description?: string;
  type?: string;
  location?: string;
  city?: string;
  state?: string;
}

export default function JobForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const isEditing = !!id;
  const [loading, setLoading] = useState<'draft' | 'publish' | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [companyName, setCompanyName] = useState<string>('');
  const { canCreate: canCreateByPlan, refresh: refreshPlanUsage } = usePlanLimits();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'full-time',
    location: 'hybrid',
    city: '',
    state: '',
    salaryMin: '',
    salaryMax: '',
    isActive: true,
  });

  const [requirements, setRequirements] = useState<string[]>(['']);
  const [responsibilities, setResponsibilities] = useState<string[]>(['']);
  const [benefits, setBenefits] = useState<string[]>(['']);
  const [benefitInput, setBenefitInput] = useState('');
  const [selectedReqCategory, setSelectedReqCategory] = useState<string>('');

  type ScreeningQuestion = {
    question: string;
    question_type: 'text' | 'yes_no';
    required: boolean;
  };
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([]);

  const requirementRefs = useRef<(HTMLInputElement | null)[]>([]);
  const responsibilityRefs = useRef<(HTMLInputElement | null)[]>([]);
  const questionRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusTarget, setFocusTarget] = useState<{ list: 'req' | 'resp' | 'q'; index: number } | null>(null);

  useEffect(() => {
    if (!focusTarget) return;
    const map = {
      req: requirementRefs,
      resp: responsibilityRefs,
      q: questionRefs,
    };
    const el = map[focusTarget.list].current[focusTarget.index];
    if (el) {
      el.focus();
      setFocusTarget(null);
    }
  }, [focusTarget, requirements, responsibilities, questions]);

  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const uf = formData.state;
    if (!uf) {
      setCities([]);
      return;
    }
    setCitiesLoading(true);
    fetchCitiesByState(uf)
      .then(list => { if (!cancelled) setCities(list); })
      .finally(() => { if (!cancelled) setCitiesLoading(false); });
    return () => { cancelled = true; };
  }, [formData.state]);

  const handleGenerateDescription = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-job-description', {
        body: { input: aiInput },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const text: string = (data as any)?.text || '';
      if (!text) throw new Error('Resposta vazia.');
      setFormData(prev => ({ ...prev, description: text }));
      if (errors.description) setErrors({ ...errors, description: undefined });
      setAiSheetOpen(false);
      setAiInput('');
      toast({ title: 'Descrição gerada!', description: 'Revise e ajuste conforme necessário.' });
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, company_name')
          .eq('id', user.id)
          .single();
        setCompanyName(profile?.company_name || profile?.name || 'Sua empresa');
      }
      if (isEditing && id) {
        const { data: job, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && job) {
          setFormData({
            title: job.title,
            description: job.description,
            type: job.job_type,
            location: job.location,
            city: job.city || '',
            state: job.state || '',
            salaryMin: job.salary_min?.toString() || '',
            salaryMax: job.salary_max?.toString() || '',
            isActive: job.is_active,
          });
          setRequirements(job.requirements?.length > 0 ? job.requirements : ['']);
          setResponsibilities(job.responsibilities?.length > 0 ? job.responsibilities : ['']);
          setBenefits(job.benefits?.length > 0 ? job.benefits : ['']);
        }
        const { data: qs } = await supabase
          .from('screening_questions')
          .select('question, question_type, required, order_position')
          .eq('job_id', id)
          .order('order_position');
        if (qs && qs.length > 0) {
          setQuestions(
            qs.map((q: any) => ({
              question: q.question,
              question_type: (q.question_type === 'yes_no' ? 'yes_no' : 'text') as 'text' | 'yes_no',
              required: !!q.required,
            })),
          );
        }
      }
    };
    load();
  }, [id, isEditing, user]);

  const previewData = useMemo(() => ({
    ...formData,
    requirements,
    responsibilities,
    benefits,
    companyName,
  }), [formData, requirements, responsibilities, benefits, companyName]);

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!formData.title.trim()) next.title = 'Título é obrigatório';
    if (!formData.description.trim()) next.description = 'Descrição é obrigatória';
    if (!formData.type) next.type = 'Selecione o tipo';
    if (!formData.location) next.location = 'Selecione a modalidade';
    if (formData.location !== 'remote' && !formData.city.trim()) next.city = 'Cidade obrigatória para vagas presenciais/híbridas';
    if (formData.location !== 'remote' && !formData.state.trim()) next.state = 'Estado obrigatório';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (mode: 'draft' | 'publish') => {
    if (!user) return;
    if (!validate()) {
      toast({
        title: 'Verifique os campos',
        description: 'Há campos obrigatórios não preenchidos.',
        variant: 'destructive',
      });
      return;
    }

    // Enforcement de limite por plano (apenas em criação)
    if (!isEditing && !canCreateByPlan('jobs')) {
      toast({
        title: 'Limite do plano atingido',
        description: 'Você atingiu o limite de vagas do seu plano. Faça upgrade para criar mais.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(mode);
    try {
      const filteredRequirements = requirements.filter(r => r.trim() !== '');
      const filteredResponsibilities = responsibilities.filter(r => r.trim() !== '');
      const filteredBenefits = benefits.filter(b => b.trim() !== '');

      const jobData = {
        company_id: user.id,
        company_name: companyName || user.email || 'Empresa',
        title: formData.title,
        description: formData.description,
        requirements: filteredRequirements,
        responsibilities: filteredResponsibilities,
        job_type: formData.type,
        location: formData.location,
        city: formData.city || null,
        state: formData.state || null,
        salary_min: formData.salaryMin ? parseFloat(formData.salaryMin) : null,
        salary_max: formData.salaryMax ? parseFloat(formData.salaryMax) : null,
        salary_currency: 'BRL',
        benefits: filteredBenefits,
        is_active: mode === 'publish',
      };

      let error;
      let jobId: string | null = id ?? null;
      if (isEditing && id) {
        ({ error } = await supabase.from('jobs').update(jobData).eq('id', id));
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('jobs')
          .insert(jobData)
          .select('id')
          .single();
        error = insertError;
        jobId = inserted?.id ?? null;
      }
      if (error) throw error;

      const validQuestions = questions.filter(q => q.question.trim());
      if (jobId) {
        await supabase.from('screening_questions').delete().eq('job_id', jobId);
        if (validQuestions.length > 0) {
          await supabase.from('screening_questions').insert(
            validQuestions.map((q, i) => ({
              job_id: jobId!,
              company_id: user.id,
              question: q.question.trim(),
              question_type: q.question_type,
              required: q.required,
              order_position: i,
            })),
          );
        }
      }

      toast({
        title: mode === 'publish' ? 'Vaga publicada!' : 'Rascunho salvo',
        description: mode === 'publish'
          ? 'A vaga está visível para candidatos.'
          : 'Você pode publicá-la depois quando quiser.',
      });
      refreshPlanUsage();
      navigate('/company/dashboard');
    } catch (e) {
      console.error('Error saving job:', e);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a vaga. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const updateList = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) =>
    setter(prev => prev.map((item, i) => (i === index ? value : item)));
  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter(prev => [...prev, '']);
  const removeItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) =>
    setter(prev => prev.filter((_, i) => i !== index));

  const addBenefitTag = () => {
    const v = benefitInput.trim();
    if (!v) return;
    setBenefits(prev => {
      const filtered = prev.filter(b => b.trim());
      if (filtered.includes(v)) return prev;
      return [...filtered, v];
    });
    setBenefitInput('');
  };

  const removeBenefitTag = (value: string) => {
    setBenefits(prev => prev.filter(b => b !== value));
  };

  const benefitTags = benefits.filter(b => b.trim());

  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{isEditing ? 'Editar Vaga' : 'Nova Vaga'}</h1>
        <p className="text-muted-foreground">
          {isEditing ? 'Atualize as informações da vaga' : 'Preencha os detalhes — o preview ao lado mostra como o candidato verá'}
        </p>
      </div>
      <PermissionGuard permission={isEditing ? 'edit_vagas' : 'create_vagas'} showAlert={true}>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {!isEditing && <PlanLimitBanner resource="jobs" className="mb-4" />}

        <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
          {/* COLUNA ESQUERDA — FORMULÁRIO */}
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações principais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Título da vaga *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      if (errors.title) setErrors({ ...errors, title: undefined });
                    }}
                    placeholder="Ex: Desenvolvedor Full Stack Sênior"
                    aria-invalid={!!errors.title}
                    className={errors.title ? 'border-destructive' : ''}
                  />
                  {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Descrição *</Label>
                    <ProFeatureGate compact featureName="IA">
                      <button
                        type="button"
                        onClick={() => setAiSheetOpen(true)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Gerar com IA
                      </button>
                    </ProFeatureGate>
                  </div>
                  <Textarea
                    id="description"
                    rows={6}
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      if (errors.description) setErrors({ ...errors, description: undefined });
                    }}
                    placeholder="Descreva a vaga, a cultura da empresa e o que torna a oportunidade atrativa."
                    aria-invalid={!!errors.description}
                    className={errors.description ? 'border-destructive' : ''}
                  />
                  {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="type">Tipo de contrato *</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Tempo Integral</SelectItem>
                        <SelectItem value="part-time">Meio Período</SelectItem>
                        <SelectItem value="contract">Contrato</SelectItem>
                        <SelectItem value="internship">Estágio</SelectItem>
                        <SelectItem value="temporary">Temporário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="location">Modalidade *</Label>
                    <Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })}>
                      <SelectTrigger id="location"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remoto</SelectItem>
                        <SelectItem value="onsite">Presencial</SelectItem>
                        <SelectItem value="hybrid">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                  <div className="space-y-1.5">
                    <Label htmlFor="state">
                      Estado {formData.location !== 'remote' && '*'}
                    </Label>
                    <Select
                      value={formData.state}
                      onValueChange={(v) => {
                        setFormData({ ...formData, state: v, city: '' });
                        if (errors.state) setErrors({ ...errors, state: undefined });
                        if (errors.city) setErrors({ ...errors, city: undefined });
                      }}
                    >
                      <SelectTrigger
                        id="state"
                        aria-invalid={!!errors.state}
                        className={errors.state ? 'border-destructive' : ''}
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {BRAZIL_STATES.map((s) => (
                          <SelectItem key={s.uf} value={s.uf}>
                            {s.uf} — {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">
                      Cidade {formData.location !== 'remote' && '*'}
                    </Label>
                    <Select
                      value={formData.city}
                      onValueChange={(v) => {
                        setFormData({ ...formData, city: v });
                        if (errors.city) setErrors({ ...errors, city: undefined });
                      }}
                      disabled={!formData.state || citiesLoading}
                    >
                      <SelectTrigger
                        id="city"
                        aria-invalid={!!errors.city}
                        className={errors.city ? 'border-destructive' : ''}
                      >
                        <SelectValue
                          placeholder={
                            !formData.state
                              ? 'Selecione um estado primeiro'
                              : citiesLoading
                                ? 'Carregando cidades...'
                                : 'Selecione a cidade'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {cities.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Detalhes opcionais</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="salary">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        Faixa salarial
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 pt-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="salaryMin" className="text-xs">Mínimo (R$)</Label>
                          <Input
                            id="salaryMin"
                            type="number"
                            value={formData.salaryMin}
                            onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                            placeholder="5000"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="salaryMax" className="text-xs">Máximo (R$)</Label>
                          <Input
                            id="salaryMax"
                            type="number"
                            value={formData.salaryMax}
                            onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                            placeholder="8000"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="benefits">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-muted-foreground" />
                        Benefícios
                        {benefitTags.length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                            {benefitTags.length}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <div>
                          <p className="mb-2 text-xs text-muted-foreground">
                            Sugestões — clique para adicionar:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              'Plano de saúde',
                              'Plano odontológico',
                              'Seguro de vida',
                              'Vale-refeição',
                              'Vale-alimentação',
                              'Auxílio combustível',
                              'Vale-transporte',
                              'Gympass',
                              'Home office',
                              'Day off no aniversário',
                              'PLR',
                              'Auxílio creche',
                            ].filter(s => !benefitTags.includes(s)).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  setBenefits(prev => {
                                    const filtered = prev.filter(b => b.trim());
                                    if (filtered.includes(s)) return prev;
                                    return [...filtered, s];
                                  });
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                              >
                                + {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={benefitInput}
                            onChange={(e) => setBenefitInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addBenefitTag();
                              }
                            }}
                            placeholder="Adicionar benefício personalizado..."
                          />
                          <Button type="button" variant="secondary" onClick={addBenefitTag}>
                            Adicionar
                          </Button>
                        </div>
                        {benefitTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {benefitTags.map((b) => (
                              <Badge key={b} variant="secondary" className="gap-1 pr-1">
                                {b}
                                <button
                                  type="button"
                                  onClick={() => removeBenefitTag(b)}
                                  className="ml-0.5 rounded-full p-0.5 hover:bg-gray-100"
                                  aria-label={`Remover ${b}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="requirements">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                        Requisitos
                        {requirements.filter(r => r.trim()).length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                            {requirements.filter(r => r.trim()).length}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <div className="rounded-md border bg-primary/5 p-3">
                          <p className="text-xs font-medium text-foreground mb-2">
                            ⚡ Requisitos rápidos:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              'Excel Básico',
                              'Excel Intermediário',
                              'Excel Avançado',
                              'Pacote Office Completo',
                              'Power BI',
                              'ERP',
                              'Ensino Médio Completo',
                              'Superior Completo',
                              'Cursando Superior',
                              'CNH B (Carro)',
                              'Inglês Intermediário',
                              'Inglês Avançado',
                              'Comunicação Clara',
                              'Trabalho em Equipe',
                              'Proatividade',
                              'Disponibilidade Imediata',
                            ]
                              .filter((item) => !requirements.map((r) => r.trim()).includes(item))
                              .map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() =>
                                    setRequirements((prev) => [...prev.filter((r) => r.trim()), item])
                                  }
                                  className="text-xs px-2 py-1 rounded-full border border-primary/30 bg-background hover:bg-primary hover:text-primary-foreground transition-colors"
                                >
                                  + {item}
                                </button>
                              ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Buscar mais requisitos por categoria</Label>
                          <Select value={selectedReqCategory} onValueChange={setSelectedReqCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Escolha uma categoria para ver as sugestões" />
                            </SelectTrigger>
                            <SelectContent>
                              {REQUIREMENT_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedReqCategory && (
                          <div className="rounded-md border bg-muted/30 p-3">
                            <p className="text-xs text-muted-foreground mb-2">
                              Clique para adicionar:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {REQUIREMENT_CATEGORIES.find((c) => c.id === selectedReqCategory)?.items
                                .filter((item) => !requirements.map((r) => r.trim()).includes(item))
                                .map((item) => (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() =>
                                      setRequirements((prev) => [...prev.filter((r) => r.trim()), item])
                                    }
                                    className="text-xs px-2 py-1 rounded-full border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                                  >
                                    + {item}
                                  </button>
                                ))}
                              {REQUIREMENT_CATEGORIES.find((c) => c.id === selectedReqCategory)?.items
                                .filter((item) => !requirements.map((r) => r.trim()).includes(item)).length === 0 && (
                                <p className="text-xs text-muted-foreground italic">
                                  Todos os requisitos desta categoria já foram adicionados.
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Requisitos adicionados</Label>
                          {requirements.map((req, i) => (
                            <div key={i} className="flex gap-2">
                              <Input
                                ref={(el) => { requirementRefs.current[i] = el; }}
                                value={req}
                                onChange={(e) => updateList(setRequirements, i, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (req.trim()) {
                                      addItem(setRequirements);
                                      setFocusTarget({ list: 'req', index: i + 1 });
                                    }
                                  }
                                }}
                                placeholder="Ex: 3+ anos de experiência com React"
                              />
                              {requirements.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(setRequirements, i)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => addItem(setRequirements)}>
                            <Plus className="mr-2 h-4 w-4" /> Adicionar requisito personalizado
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="responsibilities">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        Responsabilidades
                        {responsibilities.filter(r => r.trim()).length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                            {responsibilities.filter(r => r.trim()).length}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {responsibilities.map((resp, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              value={resp}
                              onChange={(e) => updateList(setResponsibilities, i, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (resp.trim()) addItem(setResponsibilities);
                                }
                              }}
                              placeholder="Ex: Desenvolver novas features no produto"
                            />
                            {responsibilities.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(setResponsibilities, i)}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => addItem(setResponsibilities)}>
                          <Plus className="mr-2 h-4 w-4" /> Adicionar responsabilidade
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <ProFeatureGate featureName="Perguntas de Triagem">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Perguntas de triagem</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      O candidato responde ao se candidatar
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setQuestions(prev => [
                        ...prev,
                        { question: '', question_type: 'text', required: true },
                      ])
                    }
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma pergunta. Clique em "Adicionar" para criar.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {questions.map((q, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <Input
                          placeholder={`Pergunta ${i + 1}`}
                          value={q.question}
                          onChange={(e) =>
                            setQuestions(prev =>
                              prev.map((item, idx) =>
                                idx === i ? { ...item, question: e.target.value } : item,
                              ),
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (q.question.trim()) {
                                setQuestions(prev => [
                                  ...prev,
                                  { question: '', question_type: 'text', required: true },
                                ]);
                              }
                            }
                          }}
                          className="flex-1 text-sm"
                        />
                        <Select
                          value={q.question_type}
                          onValueChange={(val) =>
                            setQuestions(prev =>
                              prev.map((item, idx) =>
                                idx === i
                                  ? { ...item, question_type: val as 'text' | 'yes_no' }
                                  : item,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Texto livre</SelectItem>
                            <SelectItem value="yes_no">Sim / Não</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setQuestions(prev => prev.filter((_, idx) => idx !== i))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </ProFeatureGate>

            {/* Rodapé sticky com 2 CTAs */}
            <div className="sticky bottom-0 -mx-2 flex flex-col-reverse gap-2 border-t border-gray-200 bg-white/95 p-3 backdrop-blur sm:flex-row sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit('draft')}
                disabled={loading !== null}
              >
                <Save className="mr-2 h-4 w-4" />
                {loading === 'draft' ? 'Salvando...' : 'Salvar rascunho'}
              </Button>
              <Button
                type="button"
                onClick={() => handleSubmit('publish')}
                disabled={loading !== null}
              >
                <Send className="mr-2 h-4 w-4" />
                {loading === 'publish' ? 'Publicando...' : isEditing ? 'Atualizar e publicar' : 'Publicar vaga'}
              </Button>
            </div>
          </div>

          {/* COLUNA DIREITA — PREVIEW */}
          <aside className="hidden lg:block">
            <JobPreview data={previewData} />
          </aside>
        </div>
      </PermissionGuard>

      <Sheet open={aiSheetOpen} onOpenChange={setAiSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Gerar descrição com IA
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label htmlFor="ai-input">Descreva o cargo em poucas palavras</Label>
              <p className="text-xs text-muted-foreground">
                Ex: "Analista de RH para empresa de logística de médio porte"
              </p>
              <Textarea
                id="ai-input"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Cargo, setor, contexto da empresa..."
                rows={3}
                className="resize-none"
              />
            </div>
            <Button
              onClick={handleGenerateDescription}
              disabled={!aiInput.trim() || aiLoading}
              className="w-full"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                'Gerar descrição'
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              A descrição gerada será inserida no campo acima para você revisar.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </CompanyLayout>
  );
}
