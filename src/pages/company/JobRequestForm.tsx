import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { CompanyLayout } from '@/components/CompanyLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const STAGES = [
  { number: 1, name: 'Solicitação de Abertura', description: 'Informações básicas da requisição' },
  { number: 2, name: 'Detalhes da Posição', description: 'Requisitos e responsabilidades' },
  { number: 3, name: 'Informações Complementares', description: 'Localização e benefícios' },
  { number: 4, name: 'Revisão e Envio', description: 'Confirme os dados antes de enviar' }
];

export default function JobRequestForm() {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [currentStage, setCurrentStage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!permissionsLoading && !hasPermission('create_vagas')) {
      toast.error('Você não tem permissão para criar requisições de vaga');
      navigate('/company/job-requests');
    }
  }, [permissionsLoading, hasPermission, navigate]);

  // Stage 1 fields
  const [openingReason, setOpeningReason] = useState('');
  const [openingReasonDetail, setOpeningReasonDetail] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [desiredProfile, setDesiredProfile] = useState('');

  // Stage 2 fields
  const [requirements, setRequirements] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [jobType, setJobType] = useState('');

  // Stage 3 fields
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');

  const progress = (currentStage / STAGES.length) * 100;

  const validateStage = () => {
    if (currentStage === 1) {
      if (!openingReason || !positionTitle || !desiredProfile) {
        toast.error('Preencha todos os campos obrigatórios');
        return false;
      }
    }
    if (currentStage === 2) {
      if (!requirements || !responsibilities || !jobType) {
        toast.error('Preencha todos os campos obrigatórios');
        return false;
      }
    }
    if (currentStage === 3) {
      if (!location) {
        toast.error('Preencha o tipo de localização');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStage()) {
      setCurrentStage(prev => Math.min(prev + 1, STAGES.length));
    }
  };

  const handlePrev = () => {
    setCurrentStage(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStage()) return;

    setLoading(true);
    try {
      // Buscar o company_id correto
      // Se for colaborador, busca na tabela company_users
      // Se for owner, usa o próprio user.id
      let companyId = user?.id;
      
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      // Se encontrou um registro em company_users, usar o company_id de lá
      if (companyUser) {
        companyId = companyUser.company_id;
      }

      const { error } = await supabase.from('job_requests').insert([{
        company_id: companyId,
        created_by: user?.id,
        opening_reason: openingReason,
        opening_reason_detail: openingReasonDetail,
        position_title: positionTitle,
        department,
        desired_profile: desiredProfile,
        requirements: requirements.split('\n').filter(r => r.trim()),
        responsibilities: responsibilities.split('\n').filter(r => r.trim()),
        job_type: jobType,
        location,
        city,
        state,
        salary_min: salaryMin ? parseFloat(salaryMin) : null,
        salary_max: salaryMax ? parseFloat(salaryMax) : null,
        status: 'pending_approval',
        current_stage: 1
      }] as any);

      if (error) throw error;

      toast.success('Requisição de vaga criada com sucesso!');
      navigate('/company/job-requests');
    } catch (error: any) {
      console.error('Error creating job request:', error);
      toast.error(error.message || 'Erro ao criar requisição');
    } finally {
      setLoading(false);
    }
  };

  if (permissionsLoading) {
    return (
      <CompanyLayout title="Carregando...">
        <div className="text-center py-12">Verificando permissões...</div>
      </CompanyLayout>
    );
  }

  if (!hasPermission('create_vagas')) {
    return (
      <CompanyLayout title="Acesso Negado">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para criar requisições de vaga. Entre em contato com o administrador.
          </AlertDescription>
        </Alert>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout 
      title="Nova Requisição de Vaga"
      description="Solicite a abertura de uma nova vaga em etapas"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle>Etapa {currentStage} de {STAGES.length}</CardTitle>
                <CardDescription>{STAGES[currentStage - 1].name}</CardDescription>
              </div>
              <div className="text-sm text-muted-foreground">
                {Math.round(progress)}% concluído
              </div>
            </div>
            <Progress value={progress} />
          </CardHeader>
        </Card>

        {/* Form Content */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Stage 1: Solicitação de Abertura */}
            {currentStage === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="openingReason">Motivo da Abertura *</Label>
                  <Select value={openingReason} onValueChange={setOpeningReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="replacement">Substituição</SelectItem>
                      <SelectItem value="expansion">Aumento de Quadro</SelectItem>
                      <SelectItem value="new_project">Novo Projeto</SelectItem>
                      <SelectItem value="seasonal">Sazonal</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openingReasonDetail">Detalhes do Motivo</Label>
                  <Textarea
                    id="openingReasonDetail"
                    value={openingReasonDetail}
                    onChange={(e) => setOpeningReasonDetail(e.target.value)}
                    placeholder="Descreva mais detalhes sobre a necessidade desta vaga"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="positionTitle">Título da Posição *</Label>
                  <Input
                    id="positionTitle"
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                    placeholder="Ex: Desenvolvedor Full Stack"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Departamento/Setor</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Ex: Tecnologia"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desiredProfile">Perfil Desejado *</Label>
                  <Textarea
                    id="desiredProfile"
                    value={desiredProfile}
                    onChange={(e) => setDesiredProfile(e.target.value)}
                    placeholder="Descreva o perfil ideal do candidato"
                    rows={4}
                  />
                </div>
              </>
            )}

            {/* Stage 2: Detalhes da Posição */}
            {currentStage === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="requirements">Requisitos * (um por linha)</Label>
                  <Textarea
                    id="requirements"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="Ex: Graduação em Ciência da Computação&#10;3+ anos de experiência com React&#10;Conhecimento em TypeScript"
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsibilities">Responsabilidades * (uma por linha)</Label>
                  <Textarea
                    id="responsibilities"
                    value={responsibilities}
                    onChange={(e) => setResponsibilities(e.target.value)}
                    placeholder="Ex: Desenvolver novas funcionalidades&#10;Realizar code reviews&#10;Participar de reuniões de planejamento"
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobType">Tipo de Contrato *</Label>
                  <Select value={jobType} onValueChange={setJobType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
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
              </>
            )}

            {/* Stage 3: Informações Complementares */}
            {currentStage === 3 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="location">Localização *</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a localização" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remoto</SelectItem>
                      <SelectItem value="onsite">Presencial</SelectItem>
                      <SelectItem value="hybrid">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {location !== 'remote' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Ex: São Paulo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="Ex: SP"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Faixa Salarial</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        type="number"
                        value={salaryMin}
                        onChange={(e) => setSalaryMin(e.target.value)}
                        placeholder="Mínimo"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        value={salaryMax}
                        onChange={(e) => setSalaryMax(e.target.value)}
                        placeholder="Máximo"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Stage 4: Review */}
            {currentStage === 4 && (
              <div className="space-y-6">
                <div className="rounded-lg border p-4 space-y-4">
                  <h3 className="font-semibold">Solicitação de Abertura</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Motivo:</span>
                      <p className="font-medium capitalize">{openingReason.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Posição:</span>
                      <p className="font-medium">{positionTitle}</p>
                    </div>
                    {department && (
                      <div>
                        <span className="text-muted-foreground">Departamento:</span>
                        <p className="font-medium">{department}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-4">
                  <h3 className="font-semibold">Detalhes da Posição</h3>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-muted-foreground">Tipo de Contrato:</span>
                      <p className="font-medium">{jobType}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Requisitos:</span>
                      <p className="font-medium">{requirements.split('\n').filter(r => r.trim()).length} itens</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-4">
                  <h3 className="font-semibold">Localização</h3>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium capitalize">{location}</p>
                    {city && <p>{city}, {state}</p>}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={currentStage === 1 ? () => navigate('/company/job-requests') : handlePrev}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStage === 1 ? 'Cancelar' : 'Anterior'}
          </Button>

          {currentStage < STAGES.length ? (
            <Button onClick={handleNext}>
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              <Check className="mr-2 h-4 w-4" />
              {loading ? 'Enviando...' : 'Enviar Requisição'}
            </Button>
          )}
        </div>
      </div>
    </CompanyLayout>
  );
}
