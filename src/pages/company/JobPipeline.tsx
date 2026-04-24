import { useParams, useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Mail, Calendar, User, Info, MessageSquare, Trash2, Trophy, CheckCircle2, XCircle, ArrowRight, ChevronDown, Video, MapPin, Phone, Loader2, CalendarPlus, MessageCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Note {
  id: string;
  text: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

interface Application {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  score: number | null;
  adherence_score: number | null;
  profile_completeness: number | null;
  score_breakdown: any;
  applied_at: string;
  notes: Note[] | null;
  candidate_phone?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  skills: 'Habilidades',
  experience: 'Experiência',
  education: 'Formação',
  location: 'Localização',
};

const getScoreClassification = (score: number) => {
  if (score >= 80) return { label: 'Alto', color: 'text-success', bg: 'bg-success', badge: 'bg-success/10 text-success border-success/20' };
  if (score >= 50) return { label: 'Médio', color: 'text-warning', bg: 'bg-warning', badge: 'bg-warning/10 text-warning border-warning/20' };
  return { label: 'Baixo', color: 'text-destructive', bg: 'bg-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/20' };
};

const getRankBadge = (rank: number) => {
  if (rank === 1) return { color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30', icon: true };
  if (rank === 2) return { color: 'bg-zinc-400/10 text-zinc-600 border-zinc-400/30', icon: true };
  if (rank === 3) return { color: 'bg-orange-500/10 text-orange-700 border-orange-500/30', icon: true };
  return { color: 'bg-muted text-muted-foreground border-border', icon: false };
};

const sanitizePhone = (phone?: string | null) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // Adiciona 55 (Brasil) se não tiver código do país
  if (digits.length <= 11) return `55${digits}`;
  return digits;
};

export default function JobPipeline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesModalApp, setNotesModalApp] = useState<Application | null>(null);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoving, setBulkMoving] = useState(false);

  // Estados de agendamento de entrevista
  const [interviewSheetOpen, setInterviewSheetOpen] = useState(false);
  const [interviewApp, setInterviewApp] = useState<Application | null>(null);
  const [interviewData, setInterviewData] = useState({
    scheduled_at: '',
    format: 'video',
    meeting_link: '',
    location: '',
    interviewer_name: '',
  });
  const [existingInterview, setExistingInterview] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackScore, setFeedbackScore] = useState(0);
  const [savingInterview, setSavingInterview] = useState(false);
  const [interviewTab, setInterviewTab] = useState<'agendar' | 'feedback'>('agendar');

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();
        setCurrentUser({ id: user.id, name: profile?.name || 'Recrutador' });
      }

      const [jobRes, appsRes] = await Promise.all([
        supabase.from('jobs').select('title, company_name').eq('id', id).maybeSingle(),
        supabase
          .from('applications')
          .select('id, candidate_id, candidate_name, candidate_email, status, score, adherence_score, profile_completeness, score_breakdown, applied_at, notes')
          .eq('job_id', id)
          .order('adherence_score', { ascending: false })
          .order('applied_at', { ascending: false }),
      ]);

      if (jobRes.data) {
        setJobTitle(jobRes.data.title);
        setCompanyName((jobRes.data as any).company_name || 'SinapseRH');
      }

      const apps = (appsRes.data ?? []) as any[];
      // Buscar telefones dos candidatos
      const candidateIds = apps.map((a) => a.candidate_id);
      let phonesMap: Record<string, string> = {};
      if (candidateIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, phone')
          .in('id', candidateIds);
        phonesMap = (profiles || []).reduce((acc, p) => {
          if (p.phone) acc[p.id] = p.phone;
          return acc;
        }, {} as Record<string, string>);
      }

      const merged: Application[] = apps.map((a) => ({
        ...a,
        notes: Array.isArray(a.notes) ? a.notes : [],
        candidate_phone: phonesMap[a.candidate_id] ?? null,
      }));

      setApplications(merged);
      setLoading(false);
    };

    load();
  }, [id]);

  const initials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const handleAddNote = async () => {
    if (!notesModalApp || !newNote.trim() || !currentUser) return;
    setSavingNote(true);
    const note: Note = {
      id: crypto.randomUUID(),
      text: newNote.trim(),
      author_id: currentUser.id,
      author_name: currentUser.name,
      created_at: new Date().toISOString(),
    };
    const updatedNotes = [...(notesModalApp.notes || []), note];

    const { error } = await supabase
      .from('applications')
      .update({ notes: updatedNotes as any })
      .eq('id', notesModalApp.id);

    if (error) {
      toast.error('Erro ao salvar nota');
    } else {
      setApplications((prev) =>
        prev.map((a) => (a.id === notesModalApp.id ? { ...a, notes: updatedNotes } : a))
      );
      setNotesModalApp({ ...notesModalApp, notes: updatedNotes });
      setNewNote('');
      toast.success('Nota adicionada');
    }
    setSavingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!notesModalApp) return;
    const updatedNotes = (notesModalApp.notes || []).filter((n) => n.id !== noteId);
    const { error } = await supabase
      .from('applications')
      .update({ notes: updatedNotes as any })
      .eq('id', notesModalApp.id);

    if (error) {
      toast.error('Erro ao excluir nota');
    } else {
      setApplications((prev) =>
        prev.map((a) => (a.id === notesModalApp.id ? { ...a, notes: updatedNotes } : a))
      );
      setNotesModalApp({ ...notesModalApp, notes: updatedNotes });
      toast.success('Nota removida');
    }
  };

  // Avança o pipeline_stage da vaga conforme o status mais avançado dos candidatos.
  // Ordem: triagem < entrevista < avaliacao < aprovado
  const STAGE_ORDER: Record<string, number> = {
    triagem: 1,
    entrevista: 2,
    avaliacao: 3,
    aprovado: 4,
  };
  const STATUS_TO_STAGE: Record<string, string> = {
    interview: 'entrevista',
    technical: 'avaliacao',
    approved: 'aprovado',
  };

  const syncJobPipelineStage = async (apps: Application[]) => {
    if (!id) return;
    let highest = 'triagem';
    for (const a of apps) {
      const mapped = STATUS_TO_STAGE[a.status];
      if (mapped && (STAGE_ORDER[mapped] ?? 0) > (STAGE_ORDER[highest] ?? 0)) {
        highest = mapped;
      }
    }
    const { data: jobRow } = await supabase
      .from('jobs')
      .select('pipeline_stage')
      .eq('id', id)
      .maybeSingle();
    const current = jobRow?.pipeline_stage || 'triagem';
    if ((STAGE_ORDER[highest] ?? 0) > (STAGE_ORDER[current] ?? 0)) {
      await supabase.from('jobs').update({ pipeline_stage: highest }).eq('id', id);
    }
  };

  const handleUpdateStatus = async (
    appId: string,
    newStatus: 'approved' | 'rejected' | 'interview',
  ) => {
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', appId);

    if (error) {
      toast.error('Erro ao atualizar status');
      return;
    }

    const app = applications.find((a) => a.id === appId);

    const updated = applications.map((a) =>
      a.id === appId ? { ...a, status: newStatus } : a,
    );
    setApplications(updated);

    const messages: Record<string, string> = {
      approved: 'Candidato aprovado',
      rejected: 'Candidato reprovado',
      interview: 'Candidato movido para entrevista',
    };
    toast.success(messages[newStatus]);

    // Avança a etapa da vaga no pipeline geral, se aplicável
    void syncJobPipelineStage(updated);

    // Envia email automático ao reprovar
    if (newStatus === 'rejected' && app?.candidate_email) {
      supabase.functions
        .invoke('send-candidate-status-email', {
          body: {
            candidateName: app.candidate_name,
            candidateEmail: app.candidate_email,
            jobTitle,
            companyName,
            newStatus: 'rejected',
          },
        })
        .catch((err) => {
          console.error('Erro ao enviar email de reprovação:', err);
        });
    }
  };

  const pendingApps = applications.filter((a) => a.status === 'pending');
  const interviewApps = applications.filter((a) => a.status === 'interview');
  const approvedApps = applications.filter((a) => a.status === 'approved');
  const rejectedApps = applications.filter((a) => a.status === 'rejected');
  const allPendingSelected =
    pendingApps.length > 0 && pendingApps.every((a) => selectedIds.has(a.id));

  const toggleSelect = (appId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingApps.map((a) => a.id)));
    }
  };

  const handleBulkMoveToInterview = async () => {
    const ids = Array.from(selectedIds).filter((idSel) =>
      applications.find((a) => a.id === idSel && a.status === 'pending'),
    );
    if (ids.length === 0) return;
    setBulkMoving(true);
    const { error } = await supabase
      .from('applications')
      .update({ status: 'interview' })
      .in('id', ids);

    if (error) {
      toast.error('Erro ao mover candidatos');
      setBulkMoving(false);
      return;
    }

    const updated = applications.map((a) =>
      ids.includes(a.id) ? { ...a, status: 'interview' } : a,
    );
    setApplications(updated);
    setSelectedIds(new Set());
    toast.success(
      `${ids.length} ${ids.length === 1 ? 'candidato movido' : 'candidatos movidos'} para entrevista`,
    );

    // Avança a etapa da vaga no pipeline geral
    void syncJobPipelineStage(updated);

    setBulkMoving(false);
  };

  const openInterviewSheet = async (app: Application) => {
    setInterviewApp(app);
    setInterviewTab('agendar');
    setFeedbackText('');
    setFeedbackScore(0);
    setInterviewData({
      scheduled_at: '',
      format: 'video',
      meeting_link: '',
      location: '',
      interviewer_name: '',
    });
    setExistingInterview(null);
    setInterviewSheetOpen(true);

    const { data } = await supabase
      .from('interviews')
      .select('*')
      .eq('application_id', app.id)
      .maybeSingle();

    if (data) {
      setExistingInterview(data);
      setInterviewData({
        scheduled_at: data.scheduled_at
          ? new Date(data.scheduled_at).toISOString().slice(0, 16)
          : '',
        format: data.format || 'video',
        meeting_link: data.meeting_link || '',
        location: data.location || '',
        interviewer_name: data.interviewer_name || '',
      });
      setFeedbackText(data.feedback || '');
      setFeedbackScore(data.feedback_score || 0);
      if (data.status === 'done') setInterviewTab('feedback');
    }
  };

  const buildWhatsAppMessage = () => {
    if (!interviewApp || !interviewData.scheduled_at) return '';
    const dateFormatted = new Date(interviewData.scheduled_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const formatLabels: Record<string, string> = {
      video: 'Videochamada',
      presencial: 'Presencial',
      telefone: 'Ligação telefônica',
    };
    const jobUrl = `${window.location.origin}/jobs/${id}`;
    let msg = `Olá ${interviewApp.candidate_name}!\n\n`;
    msg += `Você avançou para a etapa de entrevista no processo seletivo da vaga *${jobTitle}* na ${companyName}.\n\n`;
    msg += `Detalhes da vaga: ${jobUrl}\n\n`;
    msg += `*Detalhes do agendamento:*\n`;
    msg += `- Data e horário: ${dateFormatted}\n`;
    msg += `- Formato: ${formatLabels[interviewData.format] || interviewData.format}\n`;
    if (interviewData.format === 'video' && interviewData.meeting_link) {
      msg += `- Link: ${interviewData.meeting_link}\n`;
    }
    if (interviewData.format === 'presencial' && interviewData.location) {
      msg += `- Local: ${interviewData.location}\n`;
    }
    if (interviewData.interviewer_name) {
      msg += `- Entrevistador: ${interviewData.interviewer_name}\n`;
    }
    msg += `\nPor favor, confirme sua presença. Em caso de imprevistos, avise com antecedência.\n\nObrigado!`;
    return msg;
  };

  const notifyByWhatsApp = () => {
    if (!interviewApp || !interviewData.scheduled_at) {
      toast.error('Preencha a data e horário antes de enviar.');
      return;
    }
    const phoneDigits = sanitizePhone(interviewApp.candidate_phone);
    if (!phoneDigits) {
      toast.error('Candidato sem telefone cadastrado.');
      return;
    }
    const message = buildWhatsAppMessage();
    const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const saveInterview = async () => {
    if (!interviewApp || !interviewData.scheduled_at || !currentUser || !id) return;
    setSavingInterview(true);

    const payload = {
      application_id: interviewApp.id,
      job_id: id,
      company_id: currentUser.id,
      scheduled_at: new Date(interviewData.scheduled_at).toISOString(),
      format: interviewData.format,
      meeting_link: interviewData.meeting_link || null,
      location: interviewData.location || null,
      interviewer_name: interviewData.interviewer_name || null,
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    };

    if (existingInterview) {
      await supabase.from('interviews').update(payload).eq('id', existingInterview.id);
    } else {
      await supabase.from('interviews').insert(payload);
    }

    const dateFormatted = new Date(interviewData.scheduled_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const formatLabels: Record<string, string> = {
      video: 'Videochamada',
      presencial: 'Presencial',
      telefone: 'Ligação telefônica',
    };

    const emailBody = `Olá ${interviewApp.candidate_name},

Seu perfil foi selecionado e temos uma ótima notícia: você avançou para a etapa de entrevista no processo seletivo para a vaga de ${jobTitle}.

Segue o agendamento:

📅 Data e horário: ${dateFormatted}
📋 Formato: ${formatLabels[interviewData.format] || interviewData.format}${
      interviewData.format === 'video' && interviewData.meeting_link
        ? `\n🔗 Link: ${interviewData.meeting_link}`
        : ''
    }${
      interviewData.format === 'presencial' && interviewData.location
        ? `\n📍 Local: ${interviewData.location}`
        : ''
    }${
      interviewData.interviewer_name
        ? `\n👤 Entrevistador: ${interviewData.interviewer_name}`
        : ''
    }

Por favor, confirme sua presença respondendo este e-mail ou pelo WhatsApp.

Em caso de imprevistos, entre em contato com antecedência.

Att,
Equipe de Recrutamento
${companyName}`;

    supabase.functions.invoke('send-candidate-status-email', {
      body: {
        candidateName: interviewApp.candidate_name,
        candidateEmail: interviewApp.candidate_email,
        jobTitle,
        companyName,
        newStatus: 'interview',
        customSubject: `Entrevista agendada — ${jobTitle}`,
        customBody: emailBody,
      },
    }).catch(console.error);

    setSavingInterview(false);
    toast.success(`Entrevista agendada! E-mail enviado para ${interviewApp.candidate_name}.`);
    setInterviewSheetOpen(false);
  };

  const saveFeedback = async () => {
    if (!interviewApp || !existingInterview) return;
    setSavingInterview(true);

    await supabase
      .from('interviews')
      .update({
        feedback: feedbackText,
        feedback_score: feedbackScore || null,
        status: 'done',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingInterview.id);

    setSavingInterview(false);
    toast.success('Feedback registrado!');
    setInterviewSheetOpen(false);
  };

  const statusLabels: Record<string, { label: string; className: string }> = {
    pending: { label: 'pendente', className: '' },
    approved: { label: 'aprovado', className: 'bg-success/10 text-success border-success/20' },
    rejected: { label: 'reprovado', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    interview: { label: 'entrevista', className: 'bg-primary/10 text-primary border-primary/20' },
  };

  return (
    <CompanyLayout>
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/company/dashboard')}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Triagem
          </span>
        </div>
        <h1 className="text-3xl font-bold">{jobTitle || 'Vaga'}</h1>
        <p className="text-muted-foreground">
          {applications.length} {applications.length === 1 ? 'candidato no total' : 'candidatos no total'} • Ordenados por aderência
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando candidatos...</p>
      ) : applications.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum candidato se aplicou a esta vaga ainda.</p>
        </Card>
      ) : (
        <TooltipProvider delayDuration={150}>
          {pendingApps.length > 0 && (
            <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={allPendingSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Selecionar todos os pendentes"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selecionado${selectedIds.size === 1 ? '' : 's'}`
                    : `Selecionar todos (${pendingApps.length} pendente${pendingApps.length === 1 ? '' : 's'})`}
                </span>
              </div>
              <Button
                size="sm"
                onClick={handleBulkMoveToInterview}
                disabled={selectedIds.size === 0 || bulkMoving}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Mover para entrevista
              </Button>
            </div>
          )}
          <div className="grid gap-3">
            {applications.map((app, index) => {
              const rank = index + 1;
              const rankBadge = getRankBadge(rank);
              const score = app.adherence_score ?? app.score ?? 0;
              const completeness = app.profile_completeness ?? 0;
              const classification = getScoreClassification(score);
              const breakdown = app.score_breakdown || {};
              const noteCount = app.notes?.length || 0;
              const phoneDigits = sanitizePhone(app.candidate_phone);
              const isSelectable = app.status === 'pending';
              const isSelected = selectedIds.has(app.id);
              const isPending = app.status === 'pending';

              // Esconde candidatos já movidos da lista principal — eles aparecem nas seções abaixo
              if (!isPending) return null;

              return (
                <Card
                  key={app.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/company/candidates/${app.candidate_id}?jobId=${id}`)}
                >
                  <div className="flex items-center gap-4">
                    {/* Checkbox seleção */}
                    <div
                      className="flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(app.id)}
                        disabled={!isSelectable}
                        aria-label={`Selecionar ${app.candidate_name}`}
                      />
                    </div>
                    {/* Ranking */}
                    <div
                      className={`flex items-center justify-center min-w-[44px] h-11 rounded-lg border font-bold text-sm ${rankBadge.color}`}
                    >
                      {rankBadge.icon ? (
                        <Trophy className="h-4 w-4 mr-0.5" />
                      ) : null}
                      {rank}
                    </div>

                    <Avatar className="h-11 w-11">
                      <AvatarFallback>{initials(app.candidate_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{app.candidate_name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          {app.candidate_email}
                        </span>
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(app.applied_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Perfil {completeness}% completo</span>
                        <div className="flex-1 max-w-[120px]">
                          <Progress value={completeness} className="h-1" />
                        </div>
                      </div>
                    </div>

                    {/* Ações de triagem: Reprovar / Mover para entrevista */}
                    {isPending && (
                      <div
                        className="flex items-center gap-1 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
                              onClick={() => handleUpdateStatus(app.id, 'rejected')}
                              aria-label="Reprovar candidato"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reprovar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary"
                              onClick={() => handleUpdateStatus(app.id, 'interview')}
                              aria-label="Mover para entrevista"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mover para entrevista</TooltipContent>
                        </Tooltip>
                      </div>
                    )}

                    {/* Ações: WhatsApp e Notas */}
                    <div
                      className="flex items-center gap-1 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {phoneDigits ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 border-[#25D366]/30 hover:bg-[#25D366]/10 hover:border-[#25D366]"
                              asChild
                            >
                              <a
                                href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Olá ${app.candidate_name.split(' ')[0]}, sobre a vaga ${jobTitle}...`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Contato via WhatsApp"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366]">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>WhatsApp: {app.candidate_phone}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 opacity-40 cursor-not-allowed"
                              disabled
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-muted-foreground">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                              </svg>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Candidato sem telefone cadastrado</TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={noteCount > 0 ? 'default' : 'outline'}
                            size="icon"
                            className={`h-9 w-9 relative ${noteCount > 0 ? 'bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary/30' : ''}`}
                            onClick={() => setNotesModalApp(app)}
                          >
                            <MessageSquare className={`h-4 w-4 ${noteCount > 0 ? 'fill-primary-foreground' : ''}`} />
                            {noteCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 bg-warning text-warning-foreground text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center border border-background shadow-sm">
                                {noteCount}
                              </span>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {noteCount === 0
                            ? 'Adicionar nota interna'
                            : `${noteCount} ${noteCount === 1 ? 'nota' : 'notas'} interna${noteCount === 1 ? '' : 's'}`}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Score de Aderência destacado */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="flex flex-col items-end gap-1 min-w-[140px] cursor-help"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`text-lg font-bold tabular-nums ${classification.color}`}>
                              {score}
                            </span>
                            <span className="text-xs text-muted-foreground">/100</span>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div className="w-full">
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full ${classification.bg} transition-all`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${classification.badge}`}>
                            {classification.label}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" align="start" className="max-w-xs p-3">
                        <p className="font-semibold text-xs mb-2">Detalhamento do score</p>
                        {Object.keys(breakdown).length > 0 ? (
                          <>
                            <ul className="space-y-1.5 text-xs">
                              {(['skills', 'experience', 'education', 'location'] as const).map((key) => {
                                const item = breakdown[key];
                                if (!item) return null;
                                const earned = item.earned ?? 0;
                                const max = item.max ?? 0;
                                const extra =
                                  key === 'skills' && item.matched != null && item.required != null
                                    ? ` (${item.matched}/${item.required} skills)`
                                    : key === 'experience' && item.years != null
                                      ? ` (${item.years} anos)`
                                      : '';
                                return (
                                  <li key={key} className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">
                                      {CATEGORY_LABELS[key]}
                                      <span className="text-[10px]">{extra}</span>
                                    </span>
                                    <span className={earned > 0 ? 'font-medium' : 'text-muted-foreground'}>
                                      {earned}/{max}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                            <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs font-semibold">
                              <span>Total</span>
                              <span>{score}/100</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Score ainda não calculado. Configure os requisitos da vaga e o sistema recalculará automaticamente.
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>

                    <Badge variant="outline" className={`capitalize ${statusLabels[app.status]?.className || ''}`}>
                      {statusLabels[app.status]?.label || app.status}
                    </Badge>
                  </div>
                </Card>
              );
            })}

            {pendingApps.length === 0 && (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Nenhum candidato pendente nesta etapa. Todos já foram avaliados.
              </Card>
            )}
          </div>

          {/* Seções de candidatos já movidos */}
          {(interviewApps.length > 0 || rejectedApps.length > 0 || approvedApps.length > 0) && (
            <div className="mt-8 space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Candidatos já avaliados
              </h2>

              {interviewApps.length > 0 && (
                <Collapsible defaultOpen>
                  <Card>
                    <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-lg group">
                      <div className="flex items-center gap-3">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <span className="font-medium">Em entrevista</span>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {interviewApps.length}
                        </Badge>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-2">
                        {interviewApps.map((app) => (
                          <div
                            key={app.id}
                            className="flex items-center gap-3 p-3 rounded-md border bg-background hover:bg-muted/30 cursor-pointer"
                            onClick={() => navigate(`/company/candidates/${app.candidate_id}?jobId=${id}`)}
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>{initials(app.candidate_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{app.candidate_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{app.candidate_email}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 text-xs"
                              onClick={(e) => { e.stopPropagation(); openInterviewSheet(app); }}
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                              Agendar
                            </Button>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                              Entrevista
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

              {approvedApps.length > 0 && (
                <Collapsible>
                  <Card>
                    <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-lg group">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="font-medium">Aprovados</span>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          {approvedApps.length}
                        </Badge>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-2">
                        {approvedApps.map((app) => (
                          <div
                            key={app.id}
                            className="flex items-center gap-3 p-3 rounded-md border bg-background hover:bg-muted/30 cursor-pointer"
                            onClick={() => navigate(`/company/candidates/${app.candidate_id}?jobId=${id}`)}
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>{initials(app.candidate_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{app.candidate_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{app.candidate_email}</p>
                            </div>
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                              Aprovado
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

              {rejectedApps.length > 0 && (
                <Collapsible>
                  <Card>
                    <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-lg group">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="font-medium">Reprovados</span>
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          {rejectedApps.length}
                        </Badge>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-2">
                        {rejectedApps.map((app) => (
                          <div
                            key={app.id}
                            className="flex items-center gap-3 p-3 rounded-md border bg-background hover:bg-muted/30 cursor-pointer opacity-75"
                            onClick={() => navigate(`/company/candidates/${app.candidate_id}?jobId=${id}`)}
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>{initials(app.candidate_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{app.candidate_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{app.candidate_email}</p>
                            </div>
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                              Reprovado
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}
            </div>
          )}
        </TooltipProvider>
      )}

      {/* Modal de notas internas */}
      <Dialog open={!!notesModalApp} onOpenChange={(open) => !open && setNotesModalApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Notas internas — {notesModalApp?.candidate_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {notesModalApp?.notes && notesModalApp.notes.length > 0 ? (
              notesModalApp.notes
                .slice()
                .reverse()
                .map((note) => (
                  <div key={note.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{note.author_name}</span>
                        {' • '}
                        {new Date(note.created_at).toLocaleString('pt-BR')}
                      </div>
                      {note.author_id === currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap">{note.text}</p>
                  </div>
                ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma nota registrada ainda. As notas internas são visíveis apenas para a equipe da empresa.
              </p>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Textarea
              placeholder="Escreva uma nota interna sobre o candidato..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotesModalApp(null)}>
                Fechar
              </Button>
              <Button onClick={handleAddNote} disabled={!newNote.trim() || savingNote}>
                {savingNote ? 'Salvando...' : 'Adicionar nota'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet de agendamento e feedback de entrevista */}
      <Sheet open={interviewSheetOpen} onOpenChange={setInterviewSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>Entrevista</SheetTitle>
            <p className="text-sm text-muted-foreground">{interviewApp?.candidate_name}</p>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 mt-2">
              {(['agendar', 'feedback'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setInterviewTab(tab)}
                  className={cn(
                    'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors capitalize',
                    interviewTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab === 'agendar' ? 'Agendar' : 'Feedback'}
                </button>
              ))}
            </div>
          </SheetHeader>

          <div className="py-4 space-y-4">
            {interviewTab === 'agendar' && (
              <div className="space-y-4">
                {existingInterview?.status === 'scheduled' && (
                  <div className="text-xs bg-success/10 text-success border border-success/20 rounded-md p-2.5">
                    ✓ Entrevista já agendada — edite abaixo se precisar alterar
                  </div>
                )}

                <div>
                  <Label className="text-xs">Data e horário *</Label>
                  <Input
                    type="datetime-local"
                    value={interviewData.scheduled_at}
                    onChange={(e) => setInterviewData((p) => ({ ...p, scheduled_at: e.target.value }))}
                    className="mt-1 h-9 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs">Formato *</Label>
                  <Select
                    value={interviewData.format}
                    onValueChange={(v) => setInterviewData((p) => ({ ...p, format: v }))}
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2"><Video className="h-3.5 w-3.5" /> Videochamada</div>
                      </SelectItem>
                      <SelectItem value="presencial">
                        <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Presencial</div>
                      </SelectItem>
                      <SelectItem value="telefone">
                        <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Telefone</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {interviewData.format === 'video' && (
                  <div>
                    <Label className="text-xs">Link da reunião</Label>
                    <Input
                      value={interviewData.meeting_link}
                      onChange={(e) => setInterviewData((p) => ({ ...p, meeting_link: e.target.value }))}
                      placeholder="https://meet.google.com/..."
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                )}

                {interviewData.format === 'presencial' && (
                  <div>
                    <Label className="text-xs">Endereço / Local</Label>
                    <Input
                      value={interviewData.location}
                      onChange={(e) => setInterviewData((p) => ({ ...p, location: e.target.value }))}
                      placeholder="Rua das Flores, 123 — Sala 201"
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs">Entrevistador</Label>
                  <Input
                    value={interviewData.interviewer_name}
                    onChange={(e) => setInterviewData((p) => ({ ...p, interviewer_name: e.target.value }))}
                    placeholder="Nome de quem vai conduzir"
                    className="mt-1 h-9 text-sm"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    onClick={saveInterview}
                    disabled={!interviewData.scheduled_at || savingInterview}
                    className="w-full"
                  >
                    {savingInterview ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                    ) : existingInterview ? 'Atualizar agendamento' : 'Agendar e notificar por e-mail'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={notifyByWhatsApp}
                    disabled={!interviewData.scheduled_at || !interviewApp?.candidate_phone}
                    className="w-full gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]"
                    title={!interviewApp?.candidate_phone ? 'Candidato sem telefone cadastrado' : 'Abrir WhatsApp com mensagem pronta'}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Notificar pelo WhatsApp
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    O e-mail é enviado automaticamente. O WhatsApp abre uma janela com a mensagem pronta para você revisar e enviar.
                  </p>
                  {!interviewApp?.candidate_phone && (
                    <p className="text-[11px] text-warning text-center">
                      ⚠ Candidato não tem telefone cadastrado — botão WhatsApp indisponível.
                    </p>
                  )}
                </div>
              </div>
            )}

            {interviewTab === 'feedback' && (
              <div className="space-y-4">
                {!existingInterview && (
                  <div className="text-xs bg-warning/10 text-warning-foreground border border-warning/20 rounded-md p-2.5">
                    Agende a entrevista primeiro antes de registrar o feedback.
                  </div>
                )}

                <div>
                  <Label className="text-xs">Avaliação geral</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFeedbackScore(n)}
                        className={cn(
                          'w-9 h-9 rounded-lg border text-sm font-bold transition-colors',
                          feedbackScore >= n
                            ? 'bg-amber-400 border-amber-400 text-white'
                            : 'bg-muted border-border text-muted-foreground hover:border-amber-300',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                    {feedbackScore > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {['', 'Fraco', 'Regular', 'Bom', 'Muito bom', 'Excelente'][feedbackScore]}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Observações da entrevista</Label>
                  <Textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Pontos fortes, pontos de atenção, impressões gerais, próximos passos..."
                    rows={6}
                    className="mt-1 text-sm resize-none"
                    disabled={!existingInterview}
                  />
                </div>

                <Button
                  onClick={saveFeedback}
                  disabled={!existingInterview || !feedbackText.trim() || savingInterview}
                  className="w-full"
                >
                  {savingInterview ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                  ) : 'Registrar feedback'}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </CompanyLayout>
  );
}
