import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/BackofficeLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react';

export default function BackofficeJobForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;
  const [loading, setLoading] = useState(false);
  const [loadingJob, setLoadingJob] = useState(isEditing);

  const [formData, setFormData] = useState({
    companyName: '',
    title: '',
    description: '',
    type: 'full-time',
    location: 'hybrid',
    city: '',
    state: '',
    salaryMin: '',
    salaryMax: '',
    isActive: true,
    externalCompanyName: '',
    externalJobUrl: '',
  });

  const [requirements, setRequirements] = useState<string[]>(['']);
  const [responsibilities, setResponsibilities] = useState<string[]>(['']);
  const [benefits, setBenefits] = useState<string[]>(['']);

  useEffect(() => {
    const loadJob = async () => {
      if (isEditing && id) {
        try {
          const { data: job, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', id)
            .single();
            
          if (error) throw error;
          
          if (job) {
            setFormData({
              companyName: job.company_name,
              title: job.title,
              description: job.description,
              type: job.job_type,
              location: job.location,
              city: job.city || '',
              state: job.state || '',
              salaryMin: job.salary_min?.toString() || '',
              salaryMax: job.salary_max?.toString() || '',
              isActive: job.is_active ?? true,
              externalCompanyName: job.external_company_name || '',
              externalJobUrl: job.external_job_url || '',
            });
            setRequirements(job.requirements?.length > 0 ? job.requirements : ['']);
            setResponsibilities(job.responsibilities?.length > 0 ? job.responsibilities : ['']);
            setBenefits(job.benefits?.length > 0 ? job.benefits : ['']);
          }
        } catch (error) {
          console.error('Error loading job:', error);
          toast({
            title: 'Erro ao carregar vaga',
            description: 'Não foi possível carregar os dados da vaga.',
            variant: 'destructive',
          });
          navigate('/backoffice/jobs');
        } finally {
          setLoadingJob(false);
        }
      }
    };
    
    loadJob();
  }, [id, isEditing, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName.trim()) {
      toast({
        title: 'Nome da empresa obrigatório',
        description: 'Por favor, informe o nome da empresa.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const filteredRequirements = requirements.filter(r => r.trim() !== '');
      const filteredResponsibilities = responsibilities.filter(r => r.trim() !== '');
      const filteredBenefits = benefits.filter(b => b.trim() !== '');

      const jobData = {
        company_id: null, // Vagas criadas pelo backoffice não têm company_id
        company_name: formData.companyName.trim(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        requirements: filteredRequirements,
        responsibilities: filteredResponsibilities,
        job_type: formData.type,
        location: formData.location,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        salary_min: formData.salaryMin ? parseFloat(formData.salaryMin) : null,
        salary_max: formData.salaryMax ? parseFloat(formData.salaryMax) : null,
        salary_currency: 'BRL',
        benefits: filteredBenefits,
        is_active: formData.isActive,
        external_company_name: formData.externalCompanyName.trim() || null,
        external_job_url: formData.externalJobUrl.trim() || null,
      };

      let error;
      
      if (isEditing && id) {
        ({ error } = await supabase
          .from('jobs')
          .update(jobData)
          .eq('id', id));
      } else {
        ({ error } = await supabase
          .from('jobs')
          .insert(jobData));
      }

      if (error) throw error;
      
      toast({
        title: isEditing ? 'Vaga atualizada!' : 'Vaga criada!',
        description: isEditing ? 'A vaga foi atualizada com sucesso.' : 'A vaga foi criada com sucesso.',
      });

      navigate('/backoffice/jobs');
    } catch (error) {
      console.error('Error saving job:', error);
      toast({
        title: 'Erro ao salvar vaga',
        description: 'Não foi possível salvar a vaga. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const removeListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const updateListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => prev.map((item, i) => i === index ? value : item));
  };

  if (loadingJob) {
    return (
      <BackofficeLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/backoffice/jobs')}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div>
          <h1 className="text-3xl font-bold">{isEditing ? 'Editar Vaga' : 'Nova Vaga'}</h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Atualize as informações da vaga' : 'Crie uma nova vaga diretamente pelo backoffice'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Empresa</CardTitle>
                <CardDescription>Dados da empresa responsável pela vaga</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa *</Label>
                  <Input
                    id="companyName"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Ex: Empresa XYZ Ltda"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="externalCompanyName">Nome Externo (opcional)</Label>
                    <Input
                      id="externalCompanyName"
                      value={formData.externalCompanyName}
                      onChange={(e) => setFormData({ ...formData, externalCompanyName: e.target.value })}
                      placeholder="Nome para exibição se diferente"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="externalJobUrl">URL Externa (opcional)</Label>
                    <Input
                      id="externalJobUrl"
                      type="url"
                      value={formData.externalJobUrl}
                      onChange={(e) => setFormData({ ...formData, externalJobUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informações da Vaga</CardTitle>
                <CardDescription>Dados principais da vaga</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título da Vaga *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Desenvolvedor Full Stack"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    required
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva a vaga, o que a empresa faz, cultura, etc."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Contrato *</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Tempo Integral</SelectItem>
                        <SelectItem value="part-time">Meio Período</SelectItem>
                        <SelectItem value="contract">Contrato</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="internship">Estágio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Modelo de Trabalho *</Label>
                    <Select value={formData.location} onValueChange={(value) => setFormData({ ...formData, location: value })}>
                      <SelectTrigger id="location">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remoto</SelectItem>
                        <SelectItem value="onsite">Presencial</SelectItem>
                        <SelectItem value="hybrid">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="São Paulo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="salaryMin">Salário Mínimo (R$)</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      value={formData.salaryMin}
                      onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                      placeholder="5000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">Salário Máximo (R$)</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      value={formData.salaryMax}
                      onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                      placeholder="8000"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Vaga ativa</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requisitos</CardTitle>
                <CardDescription>Liste os requisitos necessários para a vaga</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {requirements.map((req, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={req}
                      onChange={(e) => updateListItem(setRequirements, index, e.target.value)}
                      placeholder="Ex: Experiência com React"
                    />
                    {requirements.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeListItem(setRequirements, index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addListItem(setRequirements)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Requisito
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Responsabilidades</CardTitle>
                <CardDescription>Descreva as principais responsabilidades do cargo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {responsibilities.map((resp, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={resp}
                      onChange={(e) => updateListItem(setResponsibilities, index, e.target.value)}
                      placeholder="Ex: Desenvolver novos recursos"
                    />
                    {responsibilities.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeListItem(setResponsibilities, index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addListItem(setResponsibilities)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Responsabilidade
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Benefícios</CardTitle>
                <CardDescription>Liste os benefícios oferecidos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={benefit}
                      onChange={(e) => updateListItem(setBenefits, index, e.target.value)}
                      placeholder="Ex: Vale alimentação"
                    />
                    {benefits.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeListItem(setBenefits, index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addListItem(setBenefits)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Benefício
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/backoffice/jobs')} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : isEditing ? 'Atualizar Vaga' : 'Criar Vaga'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </BackofficeLayout>
  );
}
