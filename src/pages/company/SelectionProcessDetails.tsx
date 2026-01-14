import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Mail, TrendingUp, MessageSquare, CheckCircle, XCircle, Star, Filter, Phone, Archive, Eye, FileText, Link as LinkIcon, Settings, ChevronRight, GripVertical, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ApplicationStatus, WorkflowStageData } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CandidateProfileView } from '@/components/CandidateProfileView';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

// Fallback stages quando não há workflow configurado
const DEFAULT_STAGES = [
  { id: 'triagem', name: 'Triagem', stage_type: 'screening', order_position: 1, description: 'Análise de currículos e primeira avaliação.' },
  { id: 'entrevista', name: 'Entrevista', stage_type: 'hr_interview', order_position: 2, description: 'Agendamento e realização de entrevistas.' },
  { id: 'avaliacao', name: 'Avaliações', stage_type: 'practical_test', order_position: 3, description: 'Análise de testes e avaliações.' },
  { id: 'admissao', name: 'Contratação', stage_type: 'final_approval', order_position: 4, description: 'Proposta e formalização da contratação.' },
];

export default function SelectionProcessDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [workflowStages, setWorkflowStages] = useState<any[]>([]);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [noteContent, setNoteContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<any>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [selectedForTest, setSelectedForTest] = useState<any>(null);
  const [testName, setTestName] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testLink, setTestLink] = useState('');

  useEffect(() => {
    if (id) {
      loadJobAndApplications();
    }
  }, [id]);

  const loadJobAndApplications = async () => {
    if (!id) return;
    
    setLoading(true);
    
    // Carregar vaga
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (jobError) {
      console.error('Error loading job:', jobError);
      setLoading(false);
      return;
    }
    
    if (jobData) {
      setJob(jobData);
    }

    // Carregar workflow e etapas dinâmicas
    const { data: workflowData, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('job_id', id)
      .eq('status', 'active')
      .maybeSingle();

    if (workflowError) {
      console.error('Error loading workflow:', workflowError);
    }

    if (workflowData) {
      setWorkflowId(workflowData.id);
      
      // Carregar etapas do workflow
      const { data: stagesData, error: stagesError } = await supabase
        .from('workflow_stages')
        .select('*')
        .eq('workflow_id', workflowData.id)
        .eq('is_active', true)
        .order('order_position');

      if (stagesError) {
        console.error('Error loading stages:', stagesError);
        setWorkflowStages(DEFAULT_STAGES);
      } else if (stagesData && stagesData.length > 0) {
        setWorkflowStages(stagesData);
      } else {
        setWorkflowStages(DEFAULT_STAGES);
      }
    } else {
      // Sem workflow configurado, usa etapas padrão
      setWorkflowStages(DEFAULT_STAGES);
    }
    
    // Carregar candidaturas
    const { data: appsData, error: appsError } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', id);
    
    if (appsError) {
      console.error('Error loading applications:', appsError);
      setApplications([]);
      setLoading(false);
      return;
    }
    
    // Buscar telefones dos candidatos
    if (appsData && appsData.length > 0) {
      const candidateIds = appsData.map(app => app.candidate_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, phone')
        .in('id', candidateIds);
      
      const enrichedApps = appsData.map(app => ({
        ...app,
        candidate_phone: profilesData?.find(p => p.id === app.candidate_id)?.phone || null
      }));
      
      setApplications(enrichedApps);
    } else {
      setApplications(appsData || []);
    }
    
    setLoading(false);
  };

  const getApplicationsByStage = (stageId: string) => {
    const stageApps = applications.filter(app => {
      const currentStage = app.current_stage || workflowStages[0]?.id || 'triagem';
      return currentStage === stageId;
    });
    if (showFavoritesOnly) {
      return stageApps.filter(app => app.is_favorite);
    }
    return stageApps;
  };

  const hasApprovedCandidates = () => {
    return applications.some(app => app.status === 'approved');
  };

  const handleArchiveJob = async () => {
    if (!id) return;

    const { error } = await supabase
      .from('jobs')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível arquivar a vaga.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Vaga arquivada',
        description: 'A vaga foi movida para o histórico de processos.',
      });
      navigate('/company/job-requests');
    }

    setShowArchiveDialog(false);
  };

  const handleAddNote = async () => {
    if (!selectedApplication || !noteContent.trim()) return;

    const currentNotes = selectedApplication.notes || [];
    const updatedNotes = [
      ...currentNotes,
      {
        id: uuidv4(),
        authorId: 'company-user',
        authorName: 'Empresa',
        content: noteContent,
        createdAt: new Date().toISOString(),
      }
    ];

    const { error } = await supabase
      .from('applications')
      .update({
        notes: updatedNotes as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedApplication.id);

    if (error) {
      console.error('Error updating application:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a nota.',
        variant: 'destructive',
      });
      return;
    }

    setNoteContent('');
    loadJobAndApplications();
    
    toast({
      title: 'Nota adicionada',
      description: 'A nota foi adicionada ao candidato com sucesso.',
    });
  };

  const handleMoveToStage = async (application: any, newStageId: string) => {
    const currentStage = application.current_stage || workflowStages[0]?.id;
    const stage = workflowStages.find(s => s.id === newStageId);
    
    // Atualizar histórico de etapas
    const currentHistory = application.stage_history || [];
    const updatedHistory = [
      ...currentHistory,
      {
        stage_id: newStageId,
        stage_name: stage?.name,
        entered_at: new Date().toISOString(),
        from_stage: currentStage,
      }
    ];

    const { error } = await supabase
      .from('applications')
      .update({
        current_stage: newStageId,
        stage_history: updatedHistory as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', application.id);

    if (error) {
      console.error('Error updating application:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível mover o candidato.',
        variant: 'destructive',
      });
      return;
    }

    // Se tiver workflow configurado, criar registro em candidate_stages
    if (workflowId) {
      await supabase
        .from('candidate_stages')
        .insert({
          workflow_id: workflowId,
          job_id: id,
          candidate_id: application.candidate_id,
          stage_id: newStageId,
          status: 'pending',
          entered_at: new Date().toISOString(),
        });
    }

    loadJobAndApplications();
    
    toast({
      title: 'Candidato movido',
      description: `Candidato movido para ${stage?.name}.`,
    });
  };

  const isLastStage = (stageId: string) => {
    const lastStage = workflowStages[workflowStages.length - 1];
    return lastStage?.id === stageId;
  };

  const handleUpdateStatus = async (application: any, newStatus: ApplicationStatus) => {
    const currentStage = application.current_stage || workflowStages[0]?.id;
    
    // Apenas permite aprovação na última etapa
    if (newStatus === 'approved' && !isLastStage(currentStage)) {
      const lastStage = workflowStages[workflowStages.length - 1];
      toast({
        title: 'Ação não permitida',
        description: `Candidatos só podem ser aprovados na etapa de ${lastStage?.name || 'Contratação'}.`,
        variant: 'destructive',
      });
      return;
    }

    // Se está aprovando na última etapa, criar registro de colaborador
    if (newStatus === 'approved' && isLastStage(currentStage)) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', application.candidate_id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          toast({
            title: 'Erro',
            description: 'Não foi possível buscar os dados do candidato.',
            variant: 'destructive',
          });
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: 'Erro',
            description: 'Usuário não autenticado.',
            variant: 'destructive',
          });
          return;
        }

        const { error: employeeError } = await supabase
          .from('employees')
          .insert({
            company_id: user.id,
            nome: profileData?.name || application.candidate_name,
            email_corporativo: application.candidate_email,
            telefone: profileData?.phone || null,
            cargo: job?.title || 'A definir',
            setor: 'A definir',
            matricula: `MAT-${Date.now()}`,
            data_admissao: new Date().toISOString().split('T')[0],
            tipo_contrato: 'clt',
            turno: 'primeiro',
            horario_entrada: '08:00',
            horario_saida: '17:00',
            status: 'aguardando_cadastro',
          });

        if (employeeError) {
          console.error('Error creating employee:', employeeError);
          toast({
            title: 'Erro',
            description: `Não foi possível criar o registro de colaborador: ${employeeError.message}`,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Colaborador contratado',
          description: 'Candidato aprovado e movido para Gestão de Colaboradores.',
        });
      } catch (error) {
        console.error('Error in approval process:', error);
        toast({
          title: 'Erro',
          description: `Erro ao processar a aprovação: ${error}`,
          variant: 'destructive',
        });
        return;
      }
    }

    const { error } = await supabase
      .from('applications')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', application.id);

    if (error) {
      console.error('Error updating application:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
      return;
    }

    loadJobAndApplications();
    
    if (newStatus !== 'approved') {
      toast({
        title: 'Status atualizado',
        description: `Candidato reprovado.`,
      });
    }
  };

  const handleToggleFavorite = async (application: any) => {
    const { error } = await supabase
      .from('applications')
      .update({
        is_favorite: !application.is_favorite,
        updated_at: new Date().toISOString(),
      })
      .eq('id', application.id);

    if (error) {
      console.error('Error updating favorite:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar favorito.',
        variant: 'destructive',
      });
      return;
    }

    if (application.is_favorite && showFavoritesOnly) {
      setShowFavoritesOnly(false);
    }

    loadJobAndApplications();
    
    toast({
      title: application.is_favorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos',
      description: application.is_favorite 
        ? 'Candidato removido dos favoritos.' 
        : 'Candidato adicionado aos favoritos.',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      'pending': { variant: 'secondary', label: 'Pendente' },
      'in-review': { variant: 'default', label: 'Em Análise' },
      'interview': { variant: 'default', label: 'Entrevista' },
      'approved': { variant: 'default', label: 'Aprovado' },
      'rejected': { variant: 'destructive', label: 'Reprovado' },
    };
    
    const config = variants[status] || variants['pending'];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatWhatsAppNumber = (phone: string | null) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length >= 12 ? cleanPhone : `55${cleanPhone}`;
    return finalPhone;
  };

  const handleViewProfile = async (candidateId: string, candidateEmail: string) => {
    setLoadingProfile(true);
    
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', candidateId)
      .maybeSingle();
    
    if (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o perfil do candidato.',
        variant: 'destructive',
      });
      setLoadingProfile(false);
      return;
    }
    
    if (profileData) {
      setCandidateProfile({
        name: profileData.name,
        summary: profileData.summary,
        phone: profileData.phone,
        city: profileData.city,
        state: profileData.state,
        linkedin_url: profileData.linkedin_url,
        portfolio_url: profileData.portfolio_url,
        experiences: profileData.experiences || [],
        educations: profileData.educations || [],
        skills: profileData.skills || [],
        cv_url: profileData.cv_url,
      });
      setShowProfileDialog(true);
    } else {
      toast({
        title: 'Perfil não encontrado',
        description: 'O candidato ainda não completou seu perfil.',
        variant: 'destructive',
      });
    }
    
    setLoadingProfile(false);
  };

  const handleSendTest = async () => {
    if (!selectedForTest || !testName.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha pelo menos o nome do teste.',
        variant: 'destructive',
      });
      return;
    }

    const currentNotes = selectedForTest.notes || [];
    const testNote = {
      id: uuidv4(),
      authorId: 'company-user',
      authorName: 'Sistema',
      content: `📋 Teste/Avaliação Aplicado\n\nNome: ${testName}\n${testDescription ? `Descrição: ${testDescription}\n` : ''}${testLink ? `Link: ${testLink}` : ''}`,
      createdAt: new Date().toISOString(),
    };

    const updatedNotes = [...currentNotes, testNote];

    const { error } = await supabase
      .from('applications')
      .update({
        notes: updatedNotes as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedForTest.id);

    if (error) {
      console.error('Error adding test:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aplicar o teste.',
        variant: 'destructive',
      });
      return;
    }

    setTestName('');
    setTestDescription('');
    setTestLink('');
    setShowTestDialog(false);
    setSelectedForTest(null);
    loadJobAndApplications();
    
    toast({
      title: 'Teste aplicado',
      description: 'O teste foi registrado com sucesso.',
    });
  };

  const getNextStage = (currentStageId: string) => {
    const currentIndex = workflowStages.findIndex(s => s.id === currentStageId);
    if (currentIndex < workflowStages.length - 1) {
      return workflowStages[currentIndex + 1];
    }
    return null;
  };

  const getPreviousStage = (currentStageId: string) => {
    const currentIndex = workflowStages.findIndex(s => s.id === currentStageId);
    if (currentIndex > 0) {
      return workflowStages[currentIndex - 1];
    }
    return null;
  };

  const CandidateCard = ({ application, stageId }: { application: any; stageId: string }) => {
    const whatsappNumber = formatWhatsAppNumber(application.candidate_phone);
    const nextStage = getNextStage(stageId);
    const previousStage = getPreviousStage(stageId);
    const isLast = isLastStage(stageId);

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{application.candidate_name}</p>
                <p className="text-sm text-muted-foreground truncate">{application.candidate_email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    <span className="text-sm font-semibold">{application.score || 0}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Score de compatibilidade</p>
                </TooltipContent>
              </Tooltip>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleToggleFavorite(application)}
              >
                <Star className={`h-4 w-4 ${application.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            {getStatusBadge(application.status)}
            <span className="text-xs text-muted-foreground">
              {new Date(application.applied_at).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setSelectedApplication(application)}>
                  <Eye className="h-3 w-3 mr-1" />
                  Detalhes
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{application.candidate_name}</DialogTitle>
                  <DialogDescription>{application.candidate_email}</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{application.candidate_email}</span>
                    </div>
                    {application.candidate_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{application.candidate_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Score: {application.score || 0}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewProfile(application.candidate_id, application.candidate_email)}
                      disabled={loadingProfile}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Ver Perfil Completo
                    </Button>
                    {whatsappNumber && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                          <Phone className="h-4 w-4 mr-1" />
                          WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Histórico de Etapas */}
                  {application.stage_history && application.stage_history.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Histórico de Etapas</h4>
                      <div className="space-y-2">
                        {application.stage_history.map((entry: any, idx: number) => (
                          <div key={idx} className="text-sm border-l-2 border-primary/20 pl-3 py-1">
                            <p className="font-medium">{entry.stage_name}</p>
                            <p className="text-muted-foreground">
                              {new Date(entry.entered_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  {application.notes && application.notes.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Notas</h4>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {application.notes.map((note: any) => (
                            <div key={note.id} className="text-sm bg-muted/50 p-3 rounded">
                              <p className="font-medium">{note.authorName}</p>
                              <p className="text-xs text-muted-foreground mb-1">
                                {new Date(note.createdAt).toLocaleString('pt-BR')}
                              </p>
                              <p className="whitespace-pre-wrap">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Adicionar Nota */}
                  <div className="space-y-2">
                    <Label>Adicionar Nota</Label>
                    <Textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Escreva observações sobre o candidato..."
                      rows={3}
                    />
                    <Button onClick={handleAddNote} size="sm">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Adicionar Nota
                    </Button>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    {previousStage && application.status !== 'rejected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveToStage(application, previousStage.id)}
                      >
                        ← Voltar para {previousStage.name}
                      </Button>
                    )}
                    
                    {nextStage && application.status !== 'rejected' && (
                      <Button
                        size="sm"
                        onClick={() => handleMoveToStage(application, nextStage.id)}
                      >
                        Avançar para {nextStage.name} →
                      </Button>
                    )}
                    
                    {isLast && application.status !== 'approved' && application.status !== 'rejected' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(application, 'approved')}
                        className="bg-success hover:bg-success/90"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Aprovar e Contratar
                      </Button>
                    )}
                    
                    {application.status !== 'rejected' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleUpdateStatus(application, 'rejected')}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reprovar
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {nextStage && application.status !== 'rejected' && (
              <Button
                size="sm"
                variant="ghost"
                className="text-primary"
                onClick={() => handleMoveToStage(application, nextStage.id)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <CompanyLayout title="Carregando...">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Carregando processo seletivo...</p>
        </div>
      </CompanyLayout>
    );
  }

  if (!job) {
    return (
      <CompanyLayout title="Vaga não encontrada">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Esta vaga não foi encontrada.</p>
          <Button onClick={() => navigate('/company/selection-process')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </CompanyLayout>
    );
  }

  return (
    <TooltipProvider>
      <CompanyLayout 
        title={job.title}
        description="Gerencie o processo seletivo desta vaga"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/company/job-requests')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Kanban
            </Button>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={showFavoritesOnly ? 'bg-yellow-50 border-yellow-200' : ''}
              >
                <Star className={`h-4 w-4 mr-1 ${showFavoritesOnly ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                {showFavoritesOnly ? 'Todos' : 'Favoritos'}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/company/workflow/${id}`)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Configurar Workflow
              </Button>

              {hasApprovedCandidates() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowArchiveDialog(true)}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Arquivar
                </Button>
              )}
            </div>
          </div>

          {/* Métricas */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{applications.length}</div>
                <p className="text-xs text-muted-foreground">candidatos</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Favoritos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {applications.filter(a => a.is_favorite).length}
                </div>
                <p className="text-xs text-muted-foreground">marcados</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {applications.filter(a => a.status === 'approved').length}
                </div>
                <p className="text-xs text-muted-foreground">contratados</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Reprovados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {applications.filter(a => a.status === 'rejected').length}
                </div>
                <p className="text-xs text-muted-foreground">descartados</p>
              </CardContent>
            </Card>
          </div>


          {/* Pipeline de Etapas */}
          <div className="grid gap-4" style={{ 
            gridTemplateColumns: `repeat(${workflowStages.length}, minmax(280px, 1fr))` 
          }}>
            {workflowStages.map((stage, index) => {
              const stageApps = getApplicationsByStage(stage.id);
              
              return (
                <div key={stage.id} className="flex flex-col">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {index + 1}
                      </div>
                      <h3 className="font-semibold">{stage.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {stageApps.length}
                      </Badge>
                    </div>
                  </div>
                  
                  <Card className="flex-1 bg-muted/30">
                    <CardContent className="p-3">
                      {stageApps.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhum candidato</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stageApps
                            .filter(a => a.status !== 'rejected')
                            .sort((a, b) => (b.score || 0) - (a.score || 0))
                            .map(app => (
                              <CandidateCard key={app.id} application={app} stageId={stage.id} />
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Candidatos Reprovados */}
          {applications.filter(a => a.status === 'rejected').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Candidatos Reprovados</CardTitle>
                <CardDescription>
                  {applications.filter(a => a.status === 'rejected').length} candidatos foram reprovados neste processo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {applications
                    .filter(a => a.status === 'rejected')
                    .map(app => (
                      <div key={app.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                          <XCircle className="h-4 w-4 text-destructive" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{app.candidate_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{app.candidate_email}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialog de Arquivar */}
        <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar vaga?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá mover a vaga para o histórico de processos. A vaga não
                receberá mais candidaturas, mas você poderá visualizar todos os dados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveJob}>
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Perfil */}
        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Perfil do Candidato</DialogTitle>
            </DialogHeader>
            {candidateProfile && (
              <CandidateProfileView 
                profile={candidateProfile} 
                email={selectedApplication?.candidate_email} 
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Teste */}
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aplicar Teste/Avaliação</DialogTitle>
              <DialogDescription>
                Registre um teste ou avaliação para o candidato
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Teste *</Label>
                <Input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Ex: Teste Técnico de React"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  placeholder="Descreva o teste..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Link do Teste</Label>
                <Input
                  value={testLink}
                  onChange={(e) => setTestLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSendTest}>
                  Aplicar Teste
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CompanyLayout>
    </TooltipProvider>
  );
}
