import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';

export default function JobForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const isEditing = !!id;
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    const loadJob = async () => {
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
    
    loadJob();
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setLoading(true);

    try {
      const filteredRequirements = requirements.filter(r => r.trim() !== '');
      const filteredResponsibilities = responsibilities.filter(r => r.trim() !== '');
      const filteredBenefits = benefits.filter(b => b.trim() !== '');

      // Get company profile for company_name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, company_name')
        .eq('id', user.id)
        .single();

      const jobData = {
        company_id: user.id,
        company_name: profile?.company_name || profile?.name || user.email || 'Empresa',
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
        is_active: formData.isActive,
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

      navigate('/company');
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

  return (
    <DashboardLayout
      title={isEditing ? 'Editar Vaga' : 'Nova Vaga'}
      description={isEditing ? 'Atualize as informações da vaga' : 'Preencha os detalhes da nova vaga'}
    >
      <PermissionGuard 
        permission={isEditing ? 'edit_vagas' : 'create_vagas'}
        showAlert={true}
      >
        <Button
          variant="ghost"
          onClick={() => navigate('/company')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
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
            <Button type="button" variant="outline" onClick={() => navigate('/company')} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Vaga' : 'Criar Vaga'}
            </Button>
          </div>
        </div>
      </form>
      </PermissionGuard>
    </DashboardLayout>
  );
}
