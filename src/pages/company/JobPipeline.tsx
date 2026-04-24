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
import { ArrowLeft, Mail, Calendar, User, Info, MessageSquare, Trash2, Trophy, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)),
    );

    const messages: Record<string, string> = {
      approved: 'Candidato aprovado',
      rejected: 'Candidato reprovado',
      interview: 'Candidato movido para entrevista',
    };
    toast.success(messages[newStatus]);

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
    const ids = Array.from(selectedIds).filter((id) =>
      applications.find((a) => a.id === id && a.status === 'pending'),
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

    setApplications((prev) =>
      prev.map((a) => (ids.includes(a.id) ? { ...a, status: 'interview' } : a)),
    );
    setSelectedIds(new Set());
    toast.success(
      `${ids.length} ${ids.length === 1 ? 'candidato movido' : 'candidatos movidos'} para entrevista`,
    );
    setBulkMoving(false);
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
          {applications.length} {applications.length === 1 ? 'candidato' : 'candidatos'} • Ordenados por aderência
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

              return (
                <Card
                  key={app.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/company/candidates/${app.candidate_id}`)}
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

                    {/* Ações de triagem: Aprovar / Reprovar / Mover para entrevista */}
                    {app.status === 'pending' && (
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
          </div>
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
    </CompanyLayout>
  );
}
