import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { Application, ApplicationStatus, CandidateProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Mail, Phone, FileText, TrendingUp, MessageSquare, Calendar, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

export default function JobCandidates() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [actionStatus, setActionStatus] = useState<ApplicationStatus>('pending');
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadJobAndApplications();
    }
  }, [id]);

  const loadJobAndApplications = async () => {
    if (!id) return;
    
    setLoading(true);
    
    // Buscar a vaga
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
    
    // Buscar as candidaturas
    const { data: appsData, error: appsError } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', id);
    
    if (appsError) {
      console.error('Error loading applications:', appsError);
    } else {
      // Mapear para o formato esperado
      const mappedApps: Application[] = (appsData || []).map(app => ({
        id: app.id,
        jobId: app.job_id,
        candidateId: app.candidate_id,
        candidateName: app.candidate_name,
        candidateEmail: app.candidate_email,
        status: app.status as ApplicationStatus,
        currentStage: app.current_stage || 'inscription',
        score: app.score || 0,
        appliedAt: app.applied_at,
        updatedAt: app.updated_at,
        notes: (app.notes as any) || [],
        stageHistory: (app.stage_history as any) || []
      }));
      setApplications(mappedApps);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <CompanyLayout>
        <p>Carregando dados...</p>
      </CompanyLayout>
    );
  }

  if (!job) {
    return (
      <CompanyLayout>
        <h1 className="text-2xl font-bold mb-4">Vaga não encontrada</h1>
        <Button variant="ghost" onClick={() => navigate('/company')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </CompanyLayout>
    );
  }

  const getApplicationsByStatus = (status: ApplicationStatus) => {
    return applications.filter(app => app.status === status);
  };

  const handleAddNote = async () => {
    if (!selectedApplication || !noteContent.trim()) return;

    const updatedNotes = [
      ...selectedApplication.notes,
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

  const handleMoveToStage = async (application: Application, newStatus: ApplicationStatus) => {
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

    // Notificar candidato por e-mail (background, não bloqueia UI)
    if (
      job &&
      ['in-review', 'interview', 'approved', 'rejected'].includes(newStatus)
    ) {
      supabase.functions
        .invoke('send-candidate-status-email', {
          body: {
            candidateName: application.candidateName,
            candidateEmail: application.candidateEmail,
            jobTitle: job.title,
            companyName: job.company_name,
            newStatus,
          },
        })
        .catch((err) => console.error('Erro ao enviar e-mail:', err));
    }

    loadJobAndApplications();

    toast({
      title: 'Status atualizado',
      description: `Status alterado para ${newStatus}.`,
    });
  };

  const handleApprove = (application: Application) => {
    handleMoveToStage(application, 'approved');
  };

  const handleReject = (application: Application) => {
    handleMoveToStage(application, 'rejected');
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    const variants: Record<ApplicationStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      'pending': { variant: 'secondary', label: 'Pendente' },
      'in-review': { variant: 'default', label: 'Em Análise' },
      'interview': { variant: 'default', label: 'Entrevista' },
      'approved': { variant: 'default', label: 'Aprovado' },
      'rejected': { variant: 'destructive', label: 'Reprovado' },
    };
    
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const CandidateRow = ({ application }: { application: Application }) => {
    return (
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{application.candidateName}</p>
              <p className="text-sm text-muted-foreground">{application.candidateEmail}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-semibold">{application.score}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Pontuação automática (0-100) baseada no match entre o perfil do candidato e os requisitos da vaga.
                Considera experiências, formações e habilidades.
              </p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex cursor-help">
                {getStatusBadge(application.status)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Status atual da candidatura no processo seletivo:
                <br />• Pendente: Aguardando primeira análise
                <br />• Em Análise: Sendo avaliado pela equipe
                <br />• Entrevista: Fase de entrevistas
                <br />• Aprovado: Candidato selecionado
                <br />• Reprovado: Candidatura não avançou
              </p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell>
          <p className="text-sm text-muted-foreground">
            {new Date(application.appliedAt).toLocaleDateString('pt-BR')}
          </p>
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedApplication(application)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Detalhes
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{application.candidateName}</DialogTitle>
                  <DialogDescription>{application.candidateEmail}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Informações</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{application.candidateEmail}</span>
                      </div>
                       <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>Score: {application.score}</span>
                      </div>
                    </div>
                  </div>

                  {application.stageHistory.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Histórico</h4>
                      <div className="space-y-2">
                        {application.stageHistory.map((stage: any, idx: number) => (
                          <div key={idx} className="text-sm border-l-2 border-primary/20 pl-3 py-1">
                            <p className="font-medium">{stage.stageName || 'Etapa'}</p>
                            <p className="text-muted-foreground">
                              {new Date(stage.enteredAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {application.notes.length > 0 && (
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
                    {application.status !== 'approved' && (
                      <Button onClick={() => handleApprove(application)} size="sm">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Aprovar
                      </Button>
                    )}
                    {application.status !== 'rejected' && (
                      <Button onClick={() => handleReject(application)} variant="destructive" size="sm">
                        <XCircle className="mr-2 h-4 w-4" />
                        Reprovar
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <TooltipProvider>
      <CompanyLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
          <p className="text-muted-foreground">Gerencie os candidatos desta vaga</p>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/company')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/company/jobs/${id}/edit`}>
                Editar Vaga
              </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{applications.length}</div>
              <p className="text-sm text-muted-foreground">candidatos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{getApplicationsByStatus('pending').length}</div>
              <p className="text-sm text-muted-foreground">candidatos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Aprovados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{getApplicationsByStatus('approved').length}</div>
              <p className="text-sm text-muted-foreground">candidatos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reprovados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{getApplicationsByStatus('rejected').length}</div>
              <p className="text-sm text-muted-foreground">candidatos</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Candidatos</CardTitle>
            <CardDescription>Visualize e gerencie os candidatos desta vaga</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  Todos ({applications.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pendentes ({getApplicationsByStatus('pending').length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Aprovados ({getApplicationsByStatus('approved').length})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Reprovados ({getApplicationsByStatus('rejected').length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                {applications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum candidato para esta vaga
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidato</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications
                        .sort((a, b) => b.score - a.score)
                        .map(app => (
                          <CandidateRow key={app.id} application={app} />
                        ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="pending">
                {getApplicationsByStatus('pending').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum candidato pendente
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidato</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getApplicationsByStatus('pending')
                        .sort((a, b) => b.score - a.score)
                        .map(app => (
                          <CandidateRow key={app.id} application={app} />
                        ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="approved">
                {getApplicationsByStatus('approved').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum candidato aprovado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidato</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getApplicationsByStatus('approved')
                        .sort((a, b) => b.score - a.score)
                        .map(app => (
                          <CandidateRow key={app.id} application={app} />
                        ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="rejected">
                {getApplicationsByStatus('rejected').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum candidato reprovado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidato</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getApplicationsByStatus('rejected')
                        .sort((a, b) => b.score - a.score)
                        .map(app => (
                          <CandidateRow key={app.id} application={app} />
                        ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      </CompanyLayout>
    </TooltipProvider>
  );
}
