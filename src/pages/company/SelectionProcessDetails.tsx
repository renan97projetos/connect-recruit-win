import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Mail, TrendingUp, MessageSquare, CheckCircle, XCircle, HelpCircle, Star, Filter, Phone, Archive, Eye, FileText, Link as LinkIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ApplicationStatus } from '@/types';
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

const WORKFLOW_STAGES = [
  { id: 'triagem', name: 'Triagem', description: 'Candidatos em triagem inicial. Análise de currículos e primeira avaliação.' },
  { id: 'entrevista', name: 'Entrevista', description: 'Candidatos aprovados para entrevista. Agendamento e realização de entrevistas.' },
  { id: 'avaliacao', name: 'Avaliações', description: 'Análise de testes e avaliações técnicas/comportamentais.' },
  { id: 'admissao', name: 'Contratação', description: 'Fase final: elaboração de proposta e formalização da contratação.' },
];

export default function SelectionProcessDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
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
      
      // Adicionar telefone aos dados das applications
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
    const stageApps = applications.filter(app => (app.current_stage || 'triagem') === stageId);
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
      navigate('/company/selection-process');
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
    const { error } = await supabase
      .from('applications')
      .update({
        current_stage: newStageId,
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

    loadJobAndApplications();
    
    const stage = WORKFLOW_STAGES.find(s => s.id === newStageId);
    toast({
      title: 'Candidato movido',
      description: `Candidato movido para ${stage?.name}.`,
    });
  };

  const handleUpdateStatus = async (application: any, newStatus: ApplicationStatus) => {
    const currentStage = application.current_stage || 'triagem';
    
    // Apenas permite aprovação na etapa de Contratação
    if (newStatus === 'approved' && currentStage !== 'admissao') {
      toast({
        title: 'Ação não permitida',
        description: 'Candidatos só podem ser aprovados na etapa de Contratação.',
        variant: 'destructive',
      });
      return;
    }

    // Se está aprovando na etapa de Contratação, criar registro de colaborador
    if (newStatus === 'approved' && currentStage === 'admissao') {
      try {
        console.log('Iniciando processo de contratação para:', application.candidate_id);
        
        // Buscar dados do perfil do candidato
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

        // Buscar dados da empresa
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('User not authenticated');
          toast({
            title: 'Erro',
            description: 'Usuário não autenticado.',
            variant: 'destructive',
          });
          return;
        }

        console.log('User ID:', user.id);
        console.log('Creating employee with data:', {
          company_id: user.id,
          nome: profileData?.name || application.candidate_name,
          email_corporativo: application.candidate_email,
        });

        // Criar registro do colaborador
        const { data: employeeData, error: employeeError } = await supabase
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
          })
          .select();

        if (employeeError) {
          console.error('Error creating employee:', employeeError);
          toast({
            title: 'Erro',
            description: `Não foi possível criar o registro de colaborador: ${employeeError.message}`,
            variant: 'destructive',
          });
          return;
        }

        console.log('Employee created successfully:', employeeData);

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

    // Se estava removendo dos favoritos e o filtro estava ativo, desativa o filtro
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

  const CandidateRow = ({ application, currentStage }: { application: any; currentStage: string }) => {
    const candidatePhone = application.candidate_phone;
    
    // Verifica se os documentos já foram solicitados
    const documentsRequested = application.notes?.some((note: any) => 
      note.content?.includes('📄 Documentos Solicitados')
    );
    
    return (
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleFavorite(application)}
              className="h-8 w-8 p-0"
            >
              <Star 
                className={`h-4 w-4 ${application.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
              />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{application.candidate_name}</p>
                  {currentStage === 'admissao' && documentsRequested && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <FileText className="h-3 w-3" />
                      Docs solicitados
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{application.candidate_email}</p>
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-semibold">{application.score || 0}</span>
          </div>
        </TableCell>
        <TableCell>
          {getStatusBadge(application.status)}
        </TableCell>
        <TableCell>
          <p className="text-sm text-muted-foreground">
            {new Date(application.applied_at).toLocaleDateString('pt-BR')}
          </p>
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            {currentStage === 'admissao' && (
              <Button
                variant={documentsRequested ? "secondary" : "outline"}
                size="sm"
                className="gap-2"
                disabled={documentsRequested}
                onClick={async () => {
                  try {
                    const origin = window.location.origin;
                    const { data, error } = await supabase.functions.invoke('send-hiring-documents-email', {
                      body: {
                        applicationId: application.id,
                        candidateEmail: application.candidate_email,
                        candidateName: application.candidate_name,
                        jobTitle: job?.title || 'Vaga',
                      },
                    });

                    if (error) throw error;

                    // Adiciona uma nota registrando o envio dos documentos
                    const currentNotes = application.notes || [];
                    const documentNote = {
                      id: uuidv4(),
                      authorId: 'company-user',
                      authorName: 'Sistema',
                      content: `📄 Documentos Solicitados\n\nEmail de solicitação de documentos enviado para ${application.candidate_email} em ${new Date().toLocaleString('pt-BR')}`,
                      createdAt: new Date().toISOString(),
                    };

                    await supabase
                      .from('applications')
                      .update({
                        notes: [...currentNotes, documentNote] as any,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', application.id);

                    loadJobAndApplications();

                    toast({
                      title: 'Email enviado!',
                      description: 'O candidato receberá um email com instruções para envio dos documentos.',
                    });
                  } catch (error: any) {
                    console.error('Error sending email:', error);
                    toast({
                      title: 'Erro ao enviar email',
                      description: error.message || 'Tente novamente mais tarde.',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <FileText className="h-4 w-4" />
                {documentsRequested ? 'Documentos Solicitados' : 'Solicitar Documentos'}
              </Button>
            )}
            {currentStage === 'entrevista' && candidatePhone && (
              <a
                href={`https://api.whatsapp.com/send?phone=${formatWhatsAppNumber(candidatePhone)}&text=${encodeURIComponent('Olá! Gostaria de agendar uma entrevista.')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  type="button"
                >
                  <Phone className="h-4 w-4" />
                  WhatsApp
                </Button>
              </a>
            )}
            {currentStage === 'avaliacao' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  setSelectedForTest(application);
                  setShowTestDialog(true);
                }}
              >
                <FileText className="h-4 w-4" />
                Aplicar Teste
              </Button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedApplication(application)}
                >
                  Detalhes
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{application.candidate_name}</DialogTitle>
                  <DialogDescription>{application.candidate_email}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Informações</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{application.candidate_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>Score: {application.score || 0}</span>
                      </div>
                    </div>
                  </div>

                  {application.notes && Array.isArray(application.notes) && application.notes.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Notas</h4>
                      <div className="space-y-2">
                        {application.notes.map((note: any) => (
                          <div key={note.id} className="text-sm bg-muted/50 p-3 rounded">
                            <p className="font-medium">{note.authorName}</p>
                            <p className="text-muted-foreground mb-1">{new Date(note.createdAt).toLocaleString('pt-BR')}</p>
                            <p>{note.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Adicionar Nota</Label>
                    <Textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Escreva observações sobre o candidato..."
                    />
                    <Button onClick={handleAddNote} size="sm">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Adicionar Nota
                    </Button>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      onClick={() => handleViewProfile(application.candidate_id, application.candidate_email)} 
                      variant="outline" 
                      size="sm"
                      disabled={loadingProfile}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {loadingProfile ? 'Carregando...' : 'Ver Perfil'}
                    </Button>
                    {(application.current_stage || 'triagem') === 'admissao' && application.status !== 'approved' && (
                      <Button onClick={() => handleUpdateStatus(application, 'approved')} size="sm">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Aprovar e Contratar
                      </Button>
                    )}
                    {application.status !== 'rejected' && (
                      <Button onClick={() => handleUpdateStatus(application, 'rejected')} variant="destructive" size="sm">
                        <XCircle className="mr-2 h-4 w-4" />
                        Reprovar
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Select
              value={application.current_stage || 'triagem'}
              onValueChange={(stageId) => handleMoveToStage(application, stageId)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Mover para..." />
              </SelectTrigger>
              <SelectContent>
                {WORKFLOW_STAGES.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return (
      <CompanyLayout>
        <div className="space-y-6">
          <p>Carregando dados...</p>
        </div>
      </CompanyLayout>
    );
  }

  if (!job) {
    return (
      <CompanyLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate('/company/selection-process')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <p>Vaga não encontrada</p>
        </div>
      </CompanyLayout>
    );
  }

  return (
    <TooltipProvider>
      <CompanyLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" onClick={() => navigate('/company/selection-process')} className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <h1 className="text-3xl font-bold">{job.title}</h1>
              <p className="text-muted-foreground">Processo Seletivo</p>
            </div>
            {hasApprovedCandidates() && !job.is_archived && (
              <Button
                variant="outline"
                onClick={() => setShowArchiveDialog(true)}
                className="gap-2"
              >
                <Archive className="h-4 w-4" />
                Arquivar Vaga
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {WORKFLOW_STAGES.map(stage => {
              const stageApps = getApplicationsByStage(stage.id);
              
              return (
                <Card key={stage.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{stage.name}</CardTitle>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{stage.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stageApps.length}</div>
                    <p className="text-sm text-muted-foreground">candidatos</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Candidatos por Etapa</CardTitle>
                  <CardDescription>Visualize e gerencie candidatos em cada fase do processo</CardDescription>
                </div>
                <Button
                  variant={showFavoritesOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className="gap-2"
                >
                  <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                  {showFavoritesOnly ? 'Todos' : 'Favoritos'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="triagem">
                <TabsList className="grid w-full grid-cols-4">
                  {WORKFLOW_STAGES.map(stage => (
                    <TabsTrigger key={stage.id} value={stage.id}>
                      {stage.name} ({getApplicationsByStage(stage.id).length})
                    </TabsTrigger>
                  ))}
                </TabsList>

                {WORKFLOW_STAGES.map(stage => (
                  <TabsContent key={stage.id} value={stage.id}>
                    {getApplicationsByStage(stage.id).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum candidato nesta etapa
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Candidato</TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                Score
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">
                                      Pontuação do candidato baseada em qualificações, experiência e adequação à vaga. 
                                      Quanto maior o score, melhor o fit do candidato.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                Status
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="max-w-xs space-y-1">
                                      <p className="font-semibold">Status da Candidatura:</p>
                                      <p className="text-xs"><strong>Pendente:</strong> Aguardando análise inicial</p>
                                      <p className="text-xs"><strong>Em Análise:</strong> Candidatura sendo avaliada</p>
                                      <p className="text-xs"><strong>Aprovado:</strong> Candidato aprovado para próxima etapa</p>
                                      <p className="text-xs"><strong>Reprovado:</strong> Candidatura não aprovada</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                Data
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">
                                      Data em que o candidato aplicou para a vaga
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                Ações
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">
                                      WhatsApp (apenas na etapa Entrevista), visualizar detalhes e mover candidato entre etapas
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getApplicationsByStage(stage.id)
                            .sort((a, b) => (b.score || 0) - (a.score || 0))
                            .map(app => (
                              <CandidateRow key={app.id} application={app} currentStage={stage.id} />
                            ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar vaga?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá mover a vaga para o histórico de processos. A vaga não
                receberá mais candidaturas, mas você poderá visualizar todos os dados do
                processo seletivo no histórico.
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

        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Perfil do Candidato</DialogTitle>
              <DialogDescription>
                {candidateProfile?.name}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
              {candidateProfile && (
                <CandidateProfileView 
                  profile={candidateProfile}
                  email={selectedApplication?.candidate_email}
                />
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Aplicar Teste ou Avaliação</DialogTitle>
              <DialogDescription>
                {selectedForTest?.candidate_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-name">Nome do Teste *</Label>
                <Input
                  id="test-name"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Ex: Teste Técnico de React"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-description">Descrição (opcional)</Label>
                <Textarea
                  id="test-description"
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  placeholder="Instruções ou detalhes sobre o teste..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-link">Link (opcional)</Label>
                <div className="flex gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground mt-2.5" />
                  <Input
                    id="test-link"
                    value={testLink}
                    onChange={(e) => setTestLink(e.target.value)}
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSendTest} disabled={!testName.trim()}>
                  <FileText className="mr-2 h-4 w-4" />
                  Aplicar Teste
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowTestDialog(false);
                  setTestName('');
                  setTestDescription('');
                  setTestLink('');
                  setSelectedForTest(null);
                }}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CompanyLayout>
    </TooltipProvider>
  );
}
