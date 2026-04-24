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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { PlanLimitBanner } from '@/components/PlanLimitBanner';
import { ProFeatureGate } from '@/components/ProFeatureGate';
import { BRAZIL_STATES, fetchCitiesByState } from '@/lib/brazilLocations';
import { REQUIREMENT_CATEGORIES } from '@/lib/jobRequirements';
import { JobScoreConfig, ScoreConfig, CustomScoredQuestion } from '@/components/jobs/JobScoreConfig';

const MAX_CUSTOM_SCORED_QUESTIONS = 5;
import { usePlanType } from '@/hooks/usePlanType';

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
  const { isPro } = usePlanType();
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
    experienceLevel: '',
    isActive: true,
    requiresApproval: false,
  });
  const [hasDefaultApprover, setHasDefaultApprover] = useState(false);
  const [jobApprovalStatus, setJobApprovalStatus] = useState<string>('');
  const [activeApplicationsCount, setActiveApplicationsCount] = useState(0);
  const [editUnlocked, setEditUnlocked] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);

  // Vaga é considerada "publicada" quando o status não é rascunho nem aguardando aprovação
  const isPublishedJob = isEditing && !!jobApprovalStatus && !['draft', 'pending_approval'].includes(jobApprovalStatus);
  // Bloqueia campos quando vaga publicada e ainda não foi destravada manualmente
  const fieldsLocked = isPublishedJob && !editUnlocked;

  const [requirements, setRequirements] = useState<string[]>(['']);
  const [responsibilities, setResponsibilities] = useState<string[]>(['']);
  const [benefits, setBenefits] = useState<string[]>(['']);
  const [benefitInput, setBenefitInput] = useState('');
  const [selectedReqCategory, setSelectedReqCategory] = useState<string>('');

  type ScreeningQuestionType =
    | 'text'
    | 'text_long'
    | 'yes_no'
    | 'single_choice'
    | 'multiple_choice'
    | 'scale_1_5'
    | 'scale_1_10'
    | 'numeric'
    | 'date'
    | 'email'
    | 'url';
  type ScreeningQuestion = {
    question: string;
    question_type: ScreeningQuestionType;
    required: boolean;
    options?: string[];
    score_weight?: number;
  };
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([]);
  const QUESTION_TYPES_WITH_OPTIONS: ScreeningQuestionType[] = ['multiple_choice', 'single_choice'];

  const [scoreConfig, setScoreConfig] = useState<ScoreConfig>({
    required_skills: [],
    job_area: '',
    required_education_level: '',
    required_education_area: '',
    min_experience_years: 0,
    is_remote: false,
    score_weights: { skills: 40, experience: 30, education: 20, location: 10 },
  });

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
        const [{ data: profile }, { data: tenant }] = await Promise.all([
          supabase.from('profiles').select('name, company_name').eq('id', user.id).single(),
          supabase.from('tenants').select('default_approver_id').eq('company_id', user.id).maybeSingle(),
        ]);
        setCompanyName(profile?.company_name || profile?.name || 'Sua empresa');
        setHasDefaultApprover(!!(tenant as any)?.default_approver_id);
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
            experienceLevel: (job as any).experience_level || '',
            isActive: job.is_active,
            requiresApproval: !!(job as any).requires_approval,
          });
          setJobApprovalStatus((job as any).approval_status || '');
          setRequirements(job.requirements?.length > 0 ? job.requirements : ['']);
          setResponsibilities(job.responsibilities?.length > 0 ? job.responsibilities : ['']);
          setBenefits(job.benefits?.length > 0 ? job.benefits : ['']);

          // Conta candidaturas ativas (não rejeitadas/retiradas)
          const { count } = await supabase
            .from('applications')
            .select('id', { count: 'exact', head: true })
            .eq('job_id', id)
            .not('status', 'in', '(rejected,withdrawn)');
          setActiveApplicationsCount(count || 0);
          const j = job as any;
          setScoreConfig({
            required_skills: j.required_skills || [],
            job_area: j.job_area || '',
            required_education_level: j.required_education_level || '',
            required_education_area: j.required_education_area || '',
            min_experience_years: j.min_experience_years || 0,
            is_remote: j.location === 'remote' || !!j.is_remote,
            score_weights: j.score_weights || { skills: 40, experience: 30, education: 20, location: 10 },
          });
        }
        const { data: qs } = await supabase
          .from('screening_questions')
          .select('question, question_type, required, order_position, options, score_weight')
          .eq('job_id', id)
          .order('order_position');
        if (qs && qs.length > 0) {
          const VALID_TYPES: ScreeningQuestionType[] = [
            'text', 'text_long', 'yes_no', 'single_choice', 'multiple_choice',
            'scale_1_5', 'scale_1_10', 'numeric', 'date', 'email', 'url',
          ];
          setQuestions(
            qs.map((q: any) => ({
              question: q.question,
              question_type: (VALID_TYPES.includes(q.question_type)
                ? q.question_type
                : 'text') as ScreeningQuestion['question_type'],
              required: !!q.required,
              options: Array.isArray(q.options) ? q.options : undefined,
              score_weight: typeof q.score_weight === 'number' ? q.score_weight : 0,
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

      // Se exige aprovação e está publicando, NÃO ativa direto - vai para draft pendente
      const willPublish = mode === 'publish';
      const requiresApproval = formData.requiresApproval;

      const jobData: any = {
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
        experience_level: formData.experienceLevel || null,
        is_active: willPublish && !requiresApproval,
        requires_approval: requiresApproval,
        approval_status: requiresApproval
          ? (willPublish ? 'pending_approval' : 'draft')
          : 'not_required',
        // Score de aderência
        required_skills: scoreConfig.required_skills,
        job_area: scoreConfig.job_area || null,
        required_education_level: scoreConfig.required_education_level || null,
        required_education_area: scoreConfig.required_education_area || null,
        min_experience_years: scoreConfig.min_experience_years || 0,
        is_remote: scoreConfig.is_remote || formData.location === 'remote',
        score_weights: scoreConfig.score_weights,
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

      const validQuestions = questions.filter(q => q.question.trim()).slice(0, 10);
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
              options: QUESTION_TYPES_WITH_OPTIONS.includes(q.question_type) && q.options ? q.options.filter(o => o.trim()) : null,
              score_weight: typeof q.score_weight === 'number' && q.score_weight > 0 ? q.score_weight : 0,
            })),
          );
        }
      }

      // Se publicou e exige aprovação, calcular deadline e notificar aprovador
      if (willPublish && requiresApproval && jobId) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('default_approver_id, default_approval_deadline_days')
          .eq('company_id', user.id)
          .maybeSingle();
        const approverId = (tenant as any)?.default_approver_id;
        const days = (tenant as any)?.default_approval_deadline_days || 3;
        if (approverId) {
          const deadlineAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('jobs').update({
            approver_id: approverId,
            approval_deadline_days: days,
            approval_deadline_at: deadlineAt,
            approval_submitted_at: new Date().toISOString(),
          } as any).eq('id', jobId);
          supabase.functions.invoke('send-job-approval-email', {
            body: { jobId, type: 'request' },
          }).catch(() => {});
        }
      }

      toast({
        title: willPublish && requiresApproval
          ? 'Enviada para aprovação'
          : mode === 'publish' ? 'Vaga publicada!' : 'Rascunho salvo',
        description: willPublish && requiresApproval
          ? 'O aprovador foi notificado por e-mail.'
          : mode === 'publish'
            ? 'A vaga está visível para candidatos.'
            : 'Você pode publicá-la depois quando quiser.',
      });
      refreshPlanUsage();
      // Após atualizar uma vaga já publicada, relock automático
      setEditUnlocked(false);
      if (mode === 'draft') {
        // Permanece na vaga após salvar rascunho
        if (!isEditing && jobId) {
          navigate(`/company/jobs/${jobId}/edit`, { replace: true });
        }
      } else {
        navigate('/company/dashboard');
      }
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

        {fieldsLocked && (
          <Card className="mb-4 border-amber-300 bg-amber-50">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Vaga publicada — apenas o título pode ser editado
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {activeApplicationsCount > 0
                      ? `Esta vaga tem ${activeApplicationsCount} candidatura${activeApplicationsCount > 1 ? 's' : ''} ativa${activeApplicationsCount > 1 ? 's' : ''} — as alterações não retroagem para quem já aplicou.`
                      : 'Para alterar os demais campos, destrave a edição.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
                onClick={() => setUnlockDialogOpen(true)}
              >
                <Unlock className="mr-1.5 h-3.5 w-3.5" />
                Destravar edição
              </Button>
            </CardContent>
          </Card>
        )}

        {isPublishedJob && editUnlocked && (
          <Card className="mb-4 border-blue-300 bg-blue-50">
            <CardContent className="flex items-center gap-3 p-3">
              <Unlock className="h-4 w-4 shrink-0 text-blue-700" />
              <p className="text-xs text-blue-900 flex-1">
                Edição completa habilitada. As alterações <strong>não retroagem</strong> para quem já aplicou. A vaga será bloqueada novamente após atualizar.
              </p>
            </CardContent>
          </Card>
        )}

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
                    disabled={fieldsLocked}
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
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })} disabled={fieldsLocked}>
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
                    <Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })} disabled={fieldsLocked}>
                      <SelectTrigger id="location"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remoto</SelectItem>
                        <SelectItem value="onsite">Presencial</SelectItem>
                        <SelectItem value="hybrid">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="experienceLevel">Nível de Experiência</Label>
                  <Select
                    value={formData.experienceLevel || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, experienceLevel: v === 'none' ? '' : v })}
                    disabled={fieldsLocked}
                  >
                    <SelectTrigger id="experienceLevel">
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não especificado</SelectItem>
                      <SelectItem value="junior">Júnior</SelectItem>
                      <SelectItem value="pleno">Pleno</SelectItem>
                      <SelectItem value="senior">Sênior</SelectItem>
                      <SelectItem value="especialista">Especialista</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Define como a vaga aparece no filtro "Nível de Experiência" da página inicial.
                  </p>
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
                      disabled={fieldsLocked}
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
                      disabled={fieldsLocked || !formData.state || citiesLoading}
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

            <div
              className={fieldsLocked ? 'pointer-events-none opacity-60 select-none space-y-5' : 'space-y-5 contents'}
              aria-disabled={fieldsLocked}
            >
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
                              ref={(el) => { responsibilityRefs.current[i] = el; }}
                              value={resp}
                              onChange={(e) => updateList(setResponsibilities, i, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (resp.trim()) {
                                    addItem(setResponsibilities);
                                    setFocusTarget({ list: 'resp', index: i + 1 });
                                  }
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

            <JobScoreConfig
              value={scoreConfig}
              onChange={setScoreConfig}
              maxCustomScored={MAX_CUSTOM_SCORED_QUESTIONS}
              customScoredQuestions={questions
                .map((q, idx) => ({ index: idx, question: q.question, weight: q.score_weight ?? 0 }))
                .filter((q) => q.weight > 0)}
              onCustomWeightChange={(idx, weight) =>
                setQuestions((prev) =>
                  prev.map((item, i) => (i === idx ? { ...item, score_weight: Math.max(0, Math.min(100, weight)) } : item)),
                )
              }
            />

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Perguntas customizadas (triagem)</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Crie perguntas próprias além das geradas pelo Score de Aderência. Tipos disponíveis: texto curto/longo, sim/não, escolha única, múltipla escolha, escala 1–5, escala 1–10, número, data, e-mail, link.
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
                  <div className="space-y-3">
                    {questions.map((q, i) => (
                      <div key={i} className="rounded-md border p-3 space-y-2 bg-muted/20">
                        <div className="flex gap-2 items-start">
                          <Input
                            ref={(el) => { questionRefs.current[i] = el; }}
                            placeholder={`Pergunta ${i + 1}`}
                            value={q.question}
                            onChange={(e) =>
                              setQuestions(prev =>
                                prev.map((item, idx) =>
                                  idx === i ? { ...item, question: e.target.value } : item,
                                ),
                              )
                            }
                            className="flex-1 text-sm"
                          />
                          <Select
                            value={q.question_type}
                            onValueChange={(val) =>
                              setQuestions(prev =>
                                prev.map((item, idx) =>
                                  idx === i
                                    ? {
                                        ...item,
                                        question_type: val as ScreeningQuestion['question_type'],
                                        options: QUESTION_TYPES_WITH_OPTIONS.includes(val as ScreeningQuestionType)
                                          ? (item.options || ['', ''])
                                          : undefined,
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="w-44 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto curto</SelectItem>
                              <SelectItem value="text_long">Texto longo</SelectItem>
                              <SelectItem value="yes_no">Sim / Não</SelectItem>
                              <SelectItem value="single_choice">Escolha única (lista)</SelectItem>
                              <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
                              <SelectItem value="scale_1_5">Escala 1 a 5</SelectItem>
                              <SelectItem value="scale_1_10">Escala 1 a 10</SelectItem>
                              <SelectItem value="numeric">Número</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="url">Link / URL</SelectItem>
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

                        {QUESTION_TYPES_WITH_OPTIONS.includes(q.question_type) && (
                          <div className="space-y-1.5 pl-1">
                            <Label className="text-xs text-muted-foreground">Opções</Label>
                            {(q.options || ['', '']).map((opt, optIdx) => (
                              <div key={optIdx} className="flex gap-2">
                                <Input
                                  value={opt}
                                  placeholder={`Opção ${optIdx + 1}`}
                                  onChange={(e) =>
                                    setQuestions(prev =>
                                      prev.map((item, idx) => {
                                        if (idx !== i) return item;
                                        const next = [...(item.options || [])];
                                        next[optIdx] = e.target.value;
                                        return { ...item, options: next };
                                      }),
                                    )
                                  }
                                  className="text-sm h-8"
                                />
                                {(q.options?.length || 0) > 2 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                      setQuestions(prev =>
                                        prev.map((item, idx) => {
                                          if (idx !== i) return item;
                                          return {
                                            ...item,
                                            options: (item.options || []).filter((_, oi) => oi !== optIdx),
                                          };
                                        }),
                                      )
                                    }
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                setQuestions(prev =>
                                  prev.map((item, idx) =>
                                    idx === i
                                      ? { ...item, options: [...(item.options || []), ''] }
                                      : item,
                                  ),
                                )
                              }
                            >
                              <Plus className="h-3 w-3 mr-1" /> Adicionar opção
                            </Button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-1">
                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) =>
                                setQuestions(prev =>
                                  prev.map((item, idx) =>
                                    idx === i ? { ...item, required: e.target.checked } : item,
                                  ),
                                )
                              }
                              className="h-3.5 w-3.5 rounded border-input"
                            />
                            Resposta obrigatória
                          </label>

                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(q.score_weight ?? 0) > 0}
                              onChange={(e) =>
                                setQuestions(prev =>
                                  prev.map((item, idx) =>
                                    idx === i
                                      ? { ...item, score_weight: e.target.checked ? (item.score_weight && item.score_weight > 0 ? item.score_weight : 5) : 0 }
                                      : item,
                                  ),
                                )
                              }
                              className="h-3.5 w-3.5 rounded border-input"
                            />
                            Contar no Score de Aderência
                          </label>

                          {(q.score_weight ?? 0) > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs text-muted-foreground">Pontos:</Label>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                step={1}
                                value={q.score_weight ?? 0}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                  setQuestions(prev =>
                                    prev.map((item, idx) =>
                                      idx === i ? { ...item, score_weight: val } : item,
                                    ),
                                  );
                                }}
                                className="h-7 w-20 text-xs"
                              />
                              <span className="text-xs text-muted-foreground">/ 100</span>
                            </div>
                          )}
                        </div>

                        {(q.score_weight ?? 0) > 0 && (
                          <p className="text-[11px] text-muted-foreground pl-1 italic">
                            Esta pergunta entra na soma dos 100 pontos do score, junto com as categorias padrão (Habilidades, Experiência, Formação, Localização). Ajuste os pesos das categorias se necessário.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Aprovação - apenas Pro */}
            {isPro && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Aprovação antes da publicação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requiresApproval}
                      onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Esta vaga exige aprovação</p>
                      <p className="text-xs text-muted-foreground">
                        Ao publicar, a vaga ficará "Aguardando aprovação" e o aprovador padrão receberá um e-mail.
                      </p>
                    </div>
                  </label>
                  {formData.requiresApproval && !hasDefaultApprover && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      Configure um aprovador padrão em <strong>Perfil da Empresa → Aprovação de Vagas</strong>.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            </div>

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
                {loading === 'publish'
                  ? (isPublishedJob ? 'Atualizando...' : 'Publicando...')
                  : isPublishedJob
                    ? 'Atualizar'
                    : isEditing ? 'Atualizar e publicar' : 'Publicar vaga'}
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

      <AlertDialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Destravar edição da vaga?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <span className="block">
                {activeApplicationsCount > 0 ? (
                  <>
                    Esta vaga tem <strong>{activeApplicationsCount} candidatura{activeApplicationsCount > 1 ? 's' : ''} ativa{activeApplicationsCount > 1 ? 's' : ''}</strong> — as alterações <strong>não retroagem</strong> para quem já aplicou. Deseja prosseguir para a alteração?
                  </>
                ) : (
                  <>Deseja prosseguir para alterar todos os campos desta vaga publicada?</>
                )}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEditUnlocked(true);
                setUnlockDialogOpen(false);
              }}
            >
              Sim, prosseguir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CompanyLayout>
  );
}
