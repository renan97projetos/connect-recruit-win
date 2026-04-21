import { useState, useEffect, useMemo } from 'react';
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
import { ArrowLeft, Plus, X, Save, Send, DollarSign, Gift, ListChecks, Target } from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';
import { JobPreview } from '@/components/jobs/JobPreview';

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
      if (isEditing && id) {
        ({ error } = await supabase.from('jobs').update(jobData).eq('id', id));
      } else {
        ({ error } = await supabase.from('jobs').insert(jobData));
      }
      if (error) throw error;

      toast({
        title: mode === 'publish' ? 'Vaga publicada!' : 'Rascunho salvo',
        description: mode === 'publish'
          ? 'A vaga está visível para candidatos.'
          : 'Você pode publicá-la depois quando quiser.',
      });
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
                  <Label htmlFor="description">Descrição *</Label>
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

                <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                  <div className="space-y-1.5">
                    <Label htmlFor="city">
                      Cidade {formData.location !== 'remote' && '*'}
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => {
                        setFormData({ ...formData, city: e.target.value });
                        if (errors.city) setErrors({ ...errors, city: undefined });
                      }}
                      placeholder="São Paulo"
                      aria-invalid={!!errors.city}
                      className={errors.city ? 'border-destructive' : ''}
                    />
                    {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">
                      Estado {formData.location !== 'remote' && '*'}
                    </Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => {
                        setFormData({ ...formData, state: e.target.value.toUpperCase() });
                        if (errors.state) setErrors({ ...errors, state: undefined });
                      }}
                      placeholder="SP"
                      maxLength={2}
                      aria-invalid={!!errors.state}
                      className={errors.state ? 'border-destructive' : ''}
                    />
                    {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
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
                            placeholder="Ex: Vale-refeição, Plano de saúde..."
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
                                  className="ml-0.5 rounded-full p-0.5 hover:bg-background"
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
                      <div className="space-y-2 pt-2">
                        {requirements.map((req, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              value={req}
                              onChange={(e) => updateList(setRequirements, i, e.target.value)}
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
                          <Plus className="mr-2 h-4 w-4" /> Adicionar requisito
                        </Button>
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

            {/* Rodapé sticky com 2 CTAs */}
            <div className="sticky bottom-0 -mx-2 flex flex-col-reverse gap-2 border-t bg-background/95 p-3 backdrop-blur sm:flex-row sm:justify-end sm:gap-3">
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
    </CompanyLayout>
  );
}
