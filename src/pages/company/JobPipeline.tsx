import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Loader2,
  Mail,
  Calendar,
  Trophy,
  ArrowRight,
  ThumbsDown,
  MessageCircle,
  StickyNote,
  Video,
  MapPin,
  Phone,
  Star,
  CheckCircle2,
  ClipboardList,
  Send,
  MoveHorizontal,
  AlertTriangle,
  DollarSign,
  FileCheck,
  UserCheck,
  BriefcaseBusiness,
  Trash2,
  User as UserIcon,
  FileText,
  Download,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CandidateStageId =
  | 'triagem'
  | 'entrevista'
  | 'avaliacao'
  | 'proposta'
  | 'admissao'
  | 'reprovado';

const CANDIDATE_STAGES: { id: CandidateStageId; label: string; color: string }[] = [
  { id: 'triagem', label: 'Triagem', color: 'text-gray-600' },
  { id: 'entrevista', label: 'Entrevista', color: 'text-blue-600' },
  { id: 'avaliacao', label: 'Avaliação', color: 'text-amber-600' },
  { id: 'proposta', label: 'Proposta', color: 'text-orange-600' },
  { id: 'admissao', label: 'Admissão', color: 'text-teal-600' },
  { id: 'reprovado', label: 'Rejeitado', color: 'text-red-500' },
];

const STAGE_ALIASES: Record<string, CandidateStageId> = {
  pending: 'triagem',
  triagem: 'triagem',
  screening: 'triagem',
  interview: 'entrevista',
  entrevista: 'entrevista',
  phone_screening: 'entrevista',
  video_interview: 'entrevista',
  'in-review': 'entrevista',
  technical: 'avaliacao',
  avaliacao: 'avaliacao',
  assessment: 'avaliacao',
  practical_test: 'avaliacao',
  behavioral: 'avaliacao',
  final_interview: 'avaliacao',
  proposta: 'proposta',
  offer: 'proposta',
  admissao: 'admissao',
  hiring: 'admissao',
  contratacao: 'admissao',
  approved: 'admissao',
  aprovado: 'admissao',
  rejected: 'reprovado',
  reprovado: 'reprovado',
};

function getCandidateStage(app: any): CandidateStageId {
  const key = String(app.current_stage || app.status || '').toLowerCase();
  return STAGE_ALIASES[key] || 'triagem';
}

// Sequência linear de progressão (exclui terminal reprovado)
const PROGRESSION: CandidateStageId[] = [
  'triagem',
  'entrevista',
  'avaliacao',
  'proposta',
  'admissao',
];

function getNextStage(current: CandidateStageId): { id: CandidateStageId; label: string } | null {
  const idx = PROGRESSION.indexOf(current);
  if (idx === -1 || idx === PROGRESSION.length - 1) return null;
  const nextId = PROGRESSION[idx + 1];
  const label = CANDIDATE_STAGES.find((s) => s.id === nextId)?.label || nextId;
  return { id: nextId, label };
}

// Mapeia stage interno → status legado em applications.status
const STATUS_FOR_STAGE: Record<CandidateStageId, string> = {
  triagem: 'pending',
  entrevista: 'in-review',
  avaliacao: 'in-review',
  proposta: 'in-review',
  admissao: 'approved',
  reprovado: 'rejected',
};

// Status do e-mail de notificação (mantém compatibilidade com send-candidate-status-email)
const EMAIL_STATUS_FOR_STAGE: Record<CandidateStageId, string | null> = {
  triagem: null,
  entrevista: 'interview',
  avaliacao: 'interview',
  proposta: 'interview',
  admissao: 'approved',
  reprovado: 'rejected',
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

const daysAgo = (date: string) => {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
};

const SCORE_LABELS: Record<string, string> = {
  skills: 'Habilidades',
  location: 'Localização',
  education: 'Escolaridade',
  experience: 'Experiência',
  screening: 'Triagem (perguntas)',
};

const SCORE_DETAIL_LABELS: Record<string, string> = {
  matched: 'compatíveis',
  required: 'exigidas',
  years: 'anos',
  has_area: 'área compatível',
  skills_yes: 'respostas positivas',
  skills_total: 'perguntas',
  bonus: 'bônus',
};

function ScoreTooltip({
  score,
  breakdown,
  className,
  variant = 'badge',
}: {
  score: number;
  breakdown: any;
  className?: string;
  variant?: 'badge' | 'pill';
}) {
  const hasBreakdown =
    breakdown && typeof breakdown === 'object' && Object.keys(breakdown).length > 0;

  const colorClass =
    variant === 'pill'
      ? score >= 80
        ? 'bg-green-50 text-green-700'
        : score >= 50
        ? 'bg-amber-50 text-amber-700'
        : 'bg-red-50 text-red-600'
      : score >= 70
      ? 'bg-green-100 text-green-700'
      : score >= 40
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-600';

  const badge = (
    <span
      className={cn(
        variant === 'pill'
          ? 'inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-xs'
          : 'inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md flex-shrink-0',
        colorClass,
        hasBreakdown && 'cursor-help',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {Math.round(score)}%
      {hasBreakdown && <Info className="h-3 w-3 opacity-70" />}
    </span>
  );

  if (!hasBreakdown) return badge;

  const entries = Object.entries(breakdown).filter(
    ([, v]: any) => v && typeof v === 'object',
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3 space-y-2">
          <div className="text-xs font-semibold border-b border-border pb-1">
            Composição do score: {Math.round(score)}%
          </div>
          <div className="space-y-1.5">
            {entries.map(([key, val]: any) => {
              const label = SCORE_LABELS[key] || key;
              const earned = typeof val.earned === 'number' ? val.earned : null;
              const max = typeof val.max === 'number' ? val.max : null;
              const details = Object.entries(val)
                .filter(([k]) => !['earned', 'max'].includes(k))
                .map(([k, v]: any) => {
                  if (typeof v === 'boolean') return v ? SCORE_DETAIL_LABELS[k] || k : null;
                  if (v === null || v === undefined || v === '') return null;
                  return `${SCORE_DETAIL_LABELS[k] || k}: ${v}`;
                })
                .filter(Boolean);
              return (
                <div key={key} className="text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{label}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {earned !== null && max !== null
                        ? `${earned}/${max}`
                        : earned !== null
                        ? `${earned} pts`
                        : ''}
                    </span>
                  </div>
                  {details.length > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {details.join(' • ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


export default function JobPipeline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [applications, setApplications] = useState<any[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, { avatar_url?: string | null; phone?: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<CandidateStageId>('triagem');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [noteDialog, setNoteDialog] = useState<{
    app: any | null;
    open: boolean;
    value: string;
    saving: boolean;
  }>({
    app: null,
    open: false,
    value: '',
    saving: false,
  });
  const [interviewSheet, setInterviewSheet] = useState<{
    open: boolean;
    app: any | null;
    tab: 'agendar' | 'feedback';
    existing: any | null;
    saving: boolean;
    scheduledAt: string;
    format: string;
    meetingLink: string;
    location: string;
    interviewer: string;
    feedbackText: string;
    feedbackScore: number;
  }>({
    open: false,
    app: null,
    tab: 'agendar',
    existing: null,
    saving: false,
    scheduledAt: '',
    format: 'video',
    meetingLink: '',
    location: '',
    interviewer: '',
    feedbackText: '',
    feedbackScore: 0,
  });
  const [interviewsByApp, setInterviewsByApp] = useState<Record<string, any>>({});
  const [offersByApp, setOffersByApp] = useState<Record<string, any>>({});
  const [documentsByApp, setDocumentsByApp] = useState<Record<string, any[]>>({});
  const [offerDialog, setOfferDialog] = useState<{
    open: boolean;
    app: any | null;
    salary: string;
    benefits: string;
    notes: string;
    saving: boolean;
  }>({
    open: false,
    app: null,
    salary: '',
    benefits: '',
    notes: '',
    saving: false,
  });
  const [moveDialog, setMoveDialog] = useState<{
    open: boolean;
    app: any | null;
    targetStage: CandidateStageId | '';
    saving: boolean;
  }>({
    open: false,
    app: null,
    targetStage: '',
    saving: false,
  });

  const [confirmReject, setConfirmReject] = useState<{ open: boolean; app: any | null }>({
    open: false,
    app: null,
  });
  const [confirmBulk, setConfirmBulk] = useState<{
    open: boolean;
    count: number;
    nextLabel: string;
    nextId: CandidateStageId | null;
  }>({ open: false, count: 0, nextLabel: '', nextId: null });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelected = (appId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [jobRes, appsRes] = await Promise.all([
        supabase.from('jobs').select('title, company_name').eq('id', id).maybeSingle(),
        supabase
          .from('applications')
          .select(
            'id, candidate_id, candidate_name, candidate_email, status, current_stage, score, adherence_score, score_breakdown, applied_at, updated_at, notes'
          )
          .eq('job_id', id)
          .order('adherence_score', { ascending: false })
          .order('applied_at', { ascending: false }),
      ]);
      if (jobRes.data) {
        setJobTitle(jobRes.data.title);
        setCompanyName((jobRes.data as any).company_name || '');
      }
      const apps = appsRes.data || [];
      setApplications(apps);

      if (apps.length) {
        const ids = Array.from(new Set(apps.map((a: any) => a.candidate_id)));
        const appIds = apps.map((a: any) => a.id);
        const [profsRes, intRes, offersRes] = await Promise.all([
          supabase.from('profiles').select('id, avatar_url, phone').in('id', ids),
          supabase.from('interviews').select('*').in('application_id', appIds),
          supabase.from('job_offers').select('*').in('application_id', appIds),
        ]);
        const map: Record<string, any> = {};
        (profsRes.data || []).forEach((p: any) => (map[p.id] = p));
        setProfilesById(map);
        const intMap: Record<string, any> = {};
        (intRes.data || []).forEach((i: any) => (intMap[i.application_id] = i));
        setInterviewsByApp(intMap);
        const offMap: Record<string, any> = {};
        (offersRes.data || []).forEach((o: any) => (offMap[o.application_id] = o));
        setOffersByApp(offMap);

        // Carrega documentos enviados pelo candidato (bucket hiring-documents)
        const docsMap: Record<string, any[]> = {};
        await Promise.all(
          appIds.map(async (appId: string) => {
            const { data: files } = await supabase.storage
              .from('hiring-documents')
              .list(appId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
            if (files && files.length) {
              docsMap[appId] = files.filter((f: any) => f.name && !f.name.startsWith('.'));
            }
          })
        );
        setDocumentsByApp(docsMap);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const getCountForStage = (stageId: CandidateStageId) =>
    applications.filter((a) => getCandidateStage(a) === stageId).length;

  const candidatesInActiveStage = useMemo(
    () => applications.filter((a) => getCandidateStage(a) === activeStage),
    [applications, activeStage]
  );

  const activeStageLabel = CANDIDATE_STAGES.find((s) => s.id === activeStage)?.label || '';

  const updateApplication = async (
    appId: string,
    patch: { current_stage?: string; status?: string }
  ) => {
    setActionLoading(appId);
    const { error } = await supabase.from('applications').update(patch).eq('id', appId);
    setActionLoading(null);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return false;
    }
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, ...patch } : a))
    );
    return true;
  };

  const moveToNextStage = async (app: any) => {
    const currentStage = getCandidateStage(app);
    const next = getNextStage(currentStage);
    if (!next) {
      toast({ title: 'Candidato já está na etapa final', variant: 'destructive' });
      return;
    }
    const ok = await updateApplication(app.id, {
      current_stage: next.id,
      status: STATUS_FOR_STAGE[next.id],
    });
    if (!ok) return;
    toast({ title: `${app.candidate_name} movido para ${next.label}` });

    const emailStatus = EMAIL_STATUS_FOR_STAGE[next.id];
    if (emailStatus) {
      supabase.functions.invoke('send-candidate-status-email', {
        body: {
          candidateName: app.candidate_name,
          candidateEmail: app.candidate_email,
          jobTitle,
          companyName: companyName || 'Sinapse RH',
          newStatus: emailStatus,
        },
      }).catch(console.error);
    }
  };

  const advanceSelectedInStage = () => {
    const stageCandidates = applications.filter(
      (a) => getCandidateStage(a) === activeStage && selectedIds.has(a.id)
    );
    if (stageCandidates.length === 0) {
      toast({ title: 'Nenhum candidato selecionado', variant: 'destructive' });
      return;
    }
    const next = getNextStage(activeStage);
    if (!next) {
      toast({
        title: 'Etapa final',
        description: 'Não há próxima etapa para avançar.',
        variant: 'destructive',
      });
      return;
    }
    setConfirmBulk({
      open: true,
      count: stageCandidates.length,
      nextLabel: next.label,
      nextId: next.id,
    });
  };

  const performBulkAdvance = async () => {
    const nextId = confirmBulk.nextId;
    if (!nextId) return;
    const stageCandidates = applications.filter(
      (a) => getCandidateStage(a) === activeStage && selectedIds.has(a.id)
    );
    setConfirmBulk({ open: false, count: 0, nextLabel: '', nextId: null });
    setActionLoading('bulk');
    let ok = 0;
    let fail = 0;
    for (const app of stageCandidates) {
      const success = await updateApplication(app.id, {
        current_stage: nextId,
        status: STATUS_FOR_STAGE[nextId],
      });
      if (success) ok++;
      else fail++;
    }
    setActionLoading(null);
    setSelectedIds(new Set());

    toast({
      title: `${ok} candidato(s) movidos`,
      description: fail > 0 ? `${fail} falharam.` : undefined,
      variant: fail > 0 ? 'destructive' : 'default',
    });
  };

  const rejectCandidate = (app: any) => {
    setConfirmReject({ open: true, app });
  };

  const performReject = async () => {
    const app = confirmReject.app;
    if (!app) return;
    setConfirmReject({ open: false, app: null });
    const ok = await updateApplication(app.id, { current_stage: 'reprovado', status: 'rejected' });
    if (!ok) return;
    toast({ title: `${app.candidate_name} rejeitado`, description: 'E-mail enviado.' });

    supabase.functions.invoke('send-candidate-status-email', {
      body: {
        candidateName: app.candidate_name,
        candidateEmail: app.candidate_email,
        jobTitle,
        companyName: companyName || 'Sinapse RH',
        newStatus: 'rejected',
      },
    }).catch(console.error);
  };

  const openMoveDialog = (app: any) => {
    setMoveDialog({
      open: true,
      app,
      targetStage: '',
      saving: false,
    });
  };

  const confirmMove = async () => {
    const { app, targetStage } = moveDialog;
    if (!app || !targetStage) return;
    const current = getCandidateStage(app);
    if (targetStage === current) {
      toast({ title: 'O candidato já está nesta etapa', variant: 'destructive' });
      return;
    }

    setMoveDialog((prev) => ({ ...prev, saving: true }));

    const ok = await updateApplication(app.id, {
      current_stage: targetStage,
      status: STATUS_FOR_STAGE[targetStage as CandidateStageId],
    });

    if (!ok) {
      setMoveDialog((prev) => ({ ...prev, saving: false }));
      return;
    }

    const targetLabel =
      CANDIDATE_STAGES.find((s) => s.id === targetStage)?.label || targetStage;

    setMoveDialog({
      open: false,
      app: null,
      targetStage: '',
      saving: false,
    });

    toast({ title: `${app.candidate_name} movido para ${targetLabel}` });
  };

  const openInterviewSheet = async (app: any, tab: 'agendar' | 'feedback' = 'agendar') => {
    setInterviewSheet((prev) => ({
      ...prev,
      open: true,
      app,
      tab,
      existing: null,
      saving: false,
      scheduledAt: '',
      format: 'video',
      meetingLink: '',
      location: '',
      interviewer: '',
      feedbackText: '',
      feedbackScore: 0,
    }));

    const { data } = await supabase
      .from('interviews')
      .select('*')
      .eq('application_id', app.id)
      .maybeSingle();

    if (data) {
      setInterviewSheet((prev) => ({
        ...prev,
        existing: data,
        scheduledAt: data.scheduled_at
          ? new Date(data.scheduled_at).toISOString().slice(0, 16)
          : '',
        format: data.format || 'video',
        meetingLink: data.meeting_link || '',
        location: data.location || '',
        interviewer: data.interviewer_name || '',
        feedbackText: data.feedback || '',
        feedbackScore: data.feedback_score || 0,
        tab: data.status === 'done' ? 'feedback' : tab,
      }));
    }
  };

  const saveInterview = async () => {
    const {
      app,
      existing,
      scheduledAt,
      format,
      meetingLink,
      location,
      interviewer,
    } = interviewSheet;
    if (!app || !scheduledAt) return;

    setInterviewSheet((prev) => ({ ...prev, saving: true }));

    const userRes = await supabase.auth.getUser();
    const payload: any = {
      application_id: app.id,
      job_id: id,
      company_id: userRes.data.user?.id,
      scheduled_at: new Date(scheduledAt).toISOString(),
      format,
      meeting_link: meetingLink || null,
      location: location || null,
      interviewer_name: interviewer || null,
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    };

    let saved: any = null;
    if (existing) {
      const { data, error } = await supabase
        .from('interviews')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .maybeSingle();
      if (error) {
        setInterviewSheet((prev) => ({ ...prev, saving: false }));
        toast({ title: 'Erro ao salvar entrevista', description: error.message, variant: 'destructive' });
        return;
      }
      saved = data;
    } else {
      const { data, error } = await supabase
        .from('interviews')
        .insert(payload)
        .select()
        .maybeSingle();
      if (error) {
        setInterviewSheet((prev) => ({ ...prev, saving: false }));
        toast({ title: 'Erro ao salvar entrevista', description: error.message, variant: 'destructive' });
        return;
      }
      saved = data;
    }
    if (saved) {
      setInterviewsByApp((prev) => ({ ...prev, [app.id]: saved }));
    }

    const dateFormatted = new Date(scheduledAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const formatLabels: Record<string, string> = {
      video: 'Videochamada',
      presencial: 'Presencial',
      telefone: 'Ligação',
    };

    supabase.functions
      .invoke('send-candidate-status-email', {
        body: {
          candidateName: app.candidate_name,
          candidateEmail: app.candidate_email,
          jobTitle,
          companyName: companyName || 'Sinapse RH',
          newStatus: 'interview',
          customSubject: `Entrevista agendada — ${jobTitle}`,
          customBody: `Olá ${app.candidate_name},\n\nSua entrevista foi agendada:\n\n📅 ${dateFormatted}\n📋 ${formatLabels[format] || format}${meetingLink ? `\n🔗 ${meetingLink}` : ''}${location ? `\n📍 ${location}` : ''}${interviewer ? `\n👤 ${interviewer}` : ''}\n\nQualquer dúvida, entre em contato.\n\nEquipe ${companyName || 'Sinapse RH'}`,
        },
      })
      .catch(console.error);

    setInterviewSheet((prev) => ({ ...prev, saving: false, open: false }));
    toast({
      title: 'Entrevista agendada!',
      description: `E-mail enviado para ${app.candidate_name}.`,
    });
  };

  const saveFeedback = async () => {
    const { existing, app, feedbackText, feedbackScore } = interviewSheet;
    if (!existing || !feedbackText.trim()) return;

    setInterviewSheet((prev) => ({ ...prev, saving: true }));

    const { data, error } = await supabase
      .from('interviews')
      .update({
        feedback: feedbackText,
        feedback_score: feedbackScore || null,
        status: 'done',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .maybeSingle();

    if (error) {
      setInterviewSheet((prev) => ({ ...prev, saving: false }));
      toast({ title: 'Erro ao registrar feedback', description: error.message, variant: 'destructive' });
      return;
    }

    if (data && app) {
      setInterviewsByApp((prev) => ({ ...prev, [app.id]: data }));
    }

    setInterviewSheet((prev) => ({ ...prev, saving: false, open: false }));
    toast({ title: 'Feedback registrado!' });
  };

  // Normaliza notes em uma lista [{id, text, author, created_at}]
  // Aceita formato antigo: string ou { text }
  const getNotesList = (
    notes: any
  ): Array<{ id: string; text: string; author?: string | null; created_at: string }> => {
    if (!notes) return [];
    if (Array.isArray(notes)) return notes.filter((n) => n && (n.text || '').trim());
    if (typeof notes === 'string') {
      const t = notes.trim();
      return t
        ? [{ id: 'legacy', text: t, author: null, created_at: new Date(0).toISOString() }]
        : [];
    }
    if (typeof notes === 'object') {
      if (Array.isArray((notes as any).items)) {
        return (notes as any).items.filter((n: any) => n && (n.text || '').trim());
      }
      const t = ((notes as any).text || '').trim();
      return t ? [{ id: 'legacy', text: t, author: null, created_at: new Date(0).toISOString() }] : [];
    }
    return [];
  };

  const openNoteDialog = (app: any) => {
    setNoteDialog({ app, open: true, value: '', saving: false });
  };

  const saveNote = async () => {
    if (!noteDialog.app) return;
    const text = noteDialog.value.trim();
    if (!text) return;
    setNoteDialog((prev) => ({ ...prev, saving: true }));

    const existing = getNotesList(noteDialog.app.notes);
    const { data: userData } = await supabase.auth.getUser();
    const authorName =
      (userData.user?.user_metadata as any)?.name ||
      userData.user?.email ||
      'Usuário';
    const newEntry = {
      id: crypto.randomUUID(),
      text,
      author: authorName,
      created_at: new Date().toISOString(),
    };
    const nextItems = [...existing, newEntry];
    const nextNotes = { items: nextItems } as any;

    const { error } = await supabase
      .from('applications')
      .update({ notes: nextNotes })
      .eq('id', noteDialog.app.id);
    if (error) {
      setNoteDialog((prev) => ({ ...prev, saving: false }));
      toast({ title: 'Erro ao salvar nota', variant: 'destructive' });
      return;
    }
    setApplications((prev) =>
      prev.map((a) => (a.id === noteDialog.app.id ? { ...a, notes: nextNotes } : a))
    );
    setNoteDialog((prev) => ({
      ...prev,
      app: { ...prev.app, notes: nextNotes },
      value: '',
      saving: false,
    }));
    toast({ title: 'Nota adicionada' });
  };

  const deleteNote = async (noteId: string) => {
    if (!noteDialog.app) return;
    const existing = getNotesList(noteDialog.app.notes);
    const nextItems = existing.filter((n) => n.id !== noteId);
    const nextNotes = { items: nextItems } as any;
    const { error } = await supabase
      .from('applications')
      .update({ notes: nextNotes })
      .eq('id', noteDialog.app.id);
    if (error) {
      toast({ title: 'Erro ao excluir nota', variant: 'destructive' });
      return;
    }
    setApplications((prev) =>
      prev.map((a) => (a.id === noteDialog.app.id ? { ...a, notes: nextNotes } : a))
    );
    setNoteDialog((prev) => ({ ...prev, app: { ...prev.app, notes: nextNotes } }));
  };

  const openOfferDialog = (app: any) => {
    const existing = offersByApp[app.id];
    setOfferDialog({
      open: true,
      app,
      salary: existing?.offered_salary?.toString() || '',
      benefits: existing?.benefits_offered || '',
      notes: existing?.notes || '',
      saving: false,
    });
  };

  const saveOffer = async () => {
    const { app, salary, benefits, notes } = offerDialog;
    if (!app || !salary) return;
    setOfferDialog((prev) => ({ ...prev, saving: true }));

    const existing = offersByApp[app.id];
    const userRes = await supabase.auth.getUser();
    const payload: any = {
      application_id: app.id,
      job_id: id,
      company_id: userRes.data.user?.id,
      offered_salary: parseFloat(salary),
      benefits_offered: benefits || null,
      notes: notes || null,
      status: 'pending',
      updated_at: new Date().toISOString(),
    };

    let saved: any = null;
    if (existing) {
      const { data, error } = await supabase
        .from('job_offers')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .maybeSingle();
      if (error) {
        setOfferDialog((prev) => ({ ...prev, saving: false }));
        toast({ title: 'Erro ao salvar proposta', description: error.message, variant: 'destructive' });
        return;
      }
      saved = data;
    } else {
      const { data, error } = await supabase
        .from('job_offers')
        .insert(payload)
        .select()
        .maybeSingle();
      if (error) {
        setOfferDialog((prev) => ({ ...prev, saving: false }));
        toast({ title: 'Erro ao salvar proposta', description: error.message, variant: 'destructive' });
        return;
      }
      saved = data;
    }
    if (saved) {
      setOffersByApp((prev) => ({ ...prev, [app.id]: saved }));
    }

    supabase.functions
      .invoke('send-job-offer-email', {
        body: {
          candidateName: app.candidate_name,
          candidateEmail: app.candidate_email,
          jobTitle,
          companyName: companyName || 'Sinapse RH',
          offeredSalary: parseFloat(salary),
          benefits: benefits || '',
        },
      })
      .catch(console.error);

    setOfferDialog((prev) => ({ ...prev, saving: false, open: false }));
    toast({
      title: 'Proposta registrada!',
      description: `E-mail enviado para ${app.candidate_name}.`,
    });
  };

  const requestHiringDocuments = async (app: any) => {
    await supabase.functions
      .invoke('send-hiring-documents-email', {
        body: {
          candidateEmail: app.candidate_email,
          candidateName: app.candidate_name,
          jobTitle,
        },
      })
      .catch(console.error);
    toast({
      title: 'Documentos solicitados!',
      description: `E-mail enviado para ${app.candidate_name}.`,
    });
  };

  const openDocument = async (appId: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('hiring-documents')
      .createSignedUrl(`${appId}/${fileName}`, 60 * 10);
    if (error || !data?.signedUrl) {
      toast({
        title: 'Erro ao abrir documento',
        description: error?.message || 'Tente novamente.',
        variant: 'destructive',
      });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const formatDocLabel = (fileName: string) => {
    // Padrão do upload: {docType}_{timestamp}_{nomeOriginal}
    const parts = fileName.split('_');
    if (parts.length >= 3) {
      const docType = parts[0];
      const original = parts.slice(2).join('_');
      const labels: Record<string, string> = {
        rg: 'RG',
        cpf: 'CPF',
        comprovante: 'Comprovante Residência',
        ctps: 'Carteira de Trabalho',
        titulo: 'Título de Eleitor',
        reservista: 'Reservista',
        escolaridade: 'Escolaridade',
        certidao: 'Certidão',
        foto: 'Foto 3x4',
      };
      const key = docType.toLowerCase().split('-')[0];
      const friendly = labels[key] || docType.toUpperCase();
      return `${friendly} — ${original}`;
    }
    return fileName;
  };
  if (loading) {
    return (
      <CompanyLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CompanyLayout>
    );
  }

  const isTriagem = activeStage === 'triagem';
  const rankedCandidates = isTriagem
    ? [...candidatesInActiveStage].sort(
        (a, b) => (b.adherence_score ?? b.score ?? 0) - (a.adherence_score ?? a.score ?? 0)
      )
    : candidatesInActiveStage;

  return (
    <CompanyLayout>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/company/dashboard')}
          className="mb-2 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para vagas
        </Button>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">{jobTitle || 'Vaga'}</h1>
            <p className="text-sm text-muted-foreground">
              Pipeline de candidatos • {applications.length}{' '}
              {applications.length === 1 ? 'candidato' : 'candidatos'}
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline — contadores clicáveis */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CANDIDATE_STAGES.map((stage) => {
          const isActive = activeStage === stage.id;
          const count = getCountForStage(stage.id);
          return (
            <button
              key={stage.id}
              onClick={() => {
                setActiveStage(stage.id);
                setSelectedIds(new Set());
              }}
              className={cn(
                'flex-shrink-0 min-w-[110px] p-3 rounded-xl border text-left transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card border-border hover:border-primary/50 hover:bg-primary/5'
              )}
            >
              <div
                className={cn(
                  'text-2xl font-bold mb-0.5',
                  isActive ? 'text-primary-foreground' : stage.color
                )}
              >
                {count}
              </div>
              <div
                className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                )}
              >
                {stage.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Conteúdo da etapa selecionada */}
      <div>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {activeStageLabel} — {candidatesInActiveStage.length}{' '}
              {candidatesInActiveStage.length === 1 ? 'candidato' : 'candidatos'}
            </h2>
            {candidatesInActiveStage.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <Checkbox
                  checked={
                    candidatesInActiveStage.every((a) => selectedIds.has(a.id))
                      ? true
                      : candidatesInActiveStage.some((a) => selectedIds.has(a.id))
                      ? 'indeterminate'
                      : false
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedIds(
                        new Set(candidatesInActiveStage.map((a) => a.id))
                      );
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
                Selecionar todos
              </label>
            )}
          </div>
          {(() => {
            const next = getNextStage(activeStage);
            const selectedCount = candidatesInActiveStage.filter((a) =>
              selectedIds.has(a.id)
            ).length;
            const canBulk = !!next && selectedCount > 0;
            return (
              <div className="flex items-center gap-2">
                {selectedCount > 0 && (
                  <>
                    <Badge variant="secondary" className="gap-1">
                      {selectedCount} selecionado{selectedCount === 1 ? '' : 's'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedIds(new Set())}
                      disabled={actionLoading === 'bulk'}
                    >
                      Limpar
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canBulk || actionLoading === 'bulk'}
                  onClick={advanceSelectedInStage}
                  className="gap-2"
                  title={
                    !next
                      ? 'Etapa final — não há próxima etapa'
                      : selectedCount === 0
                      ? 'Selecione candidatos para avançar'
                      : `Mover selecionados para ${next.label}`
                  }
                >
                  {actionLoading === 'bulk' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Avançar selecionados
                  {next && (
                    <span className="text-muted-foreground">→ {next.label}</span>
                  )}
                </Button>
              </div>
            );
          })()}
        </div>

        {isTriagem ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold">Ranqueados por score</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {rankedCandidates.length} {rankedCandidates.length === 1 ? 'candidato' : 'candidatos'}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        rankedCandidates.length > 0 &&
                        rankedCandidates.every((a) => selectedIds.has(a.id))
                          ? true
                          : rankedCandidates.some((a) => selectedIds.has(a.id))
                          ? 'indeterminate'
                          : false
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(new Set(rankedCandidates.map((a) => a.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead className="w-24">Score</TableHead>
                  <TableHead className="w-28">Entrada</TableHead>
                  <TableHead className="w-44 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedCandidates.map((app, idx) => {
                  const profile = profilesById[app.candidate_id];
                  const score = app.adherence_score ?? app.score ?? 0;
                  const isSelected = selectedIds.has(app.id);
                  const goToProfile = () =>
                    navigate(`/company/candidates/${app.candidate_id}?jobId=${id}`);
                  return (
                    <TableRow
                      key={app.id}
                      onClick={goToProfile}
                      data-state={isSelected ? 'selected' : undefined}
                      className="cursor-pointer hover:bg-muted/50 data-[state=selected]:bg-primary/5"
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelected(app.id)}
                          aria-label={`Selecionar ${app.candidate_name}`}
                        />
                      </TableCell>
                      <TableCell className="font-bold text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {initials(app.candidate_name || '?')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate leading-tight">
                              {app.candidate_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {app.candidate_email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {score > 0 ? (
                          <ScoreTooltip
                            score={score}
                            breakdown={app.score_breakdown}
                            className="min-w-[2.75rem] justify-center text-sm"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        Há {daysAgo(app.applied_at)}d
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          {(() => {
                            const next = getNextStage(getCandidateStage(app));
                            return (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                onClick={() => moveToNextStage(app)}
                                disabled={actionLoading === app.id || !next}
                                title={next ? `Mover para ${next.label}` : 'Etapa final'}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            );
                          })()}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-500/10"
                            onClick={() => openMoveDialog(app)}
                            disabled={actionLoading === app.id}
                            title="Mover para outra etapa"
                          >
                            <MoveHorizontal className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => rejectCandidate(app)}
                            disabled={actionLoading === app.id}
                            title="Rejeitar (envia e-mail)"
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                          {profile?.phone ? (
                            <a
                              href={`https://wa.me/${profile.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Olá ${app.candidate_name}, vimos sua candidatura para ${jobTitle}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-[#25D366] hover:bg-[#25D366]/10"
                                title="WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </a>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 opacity-30"
                              disabled
                              title="Sem telefone cadastrado"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {(() => {
                            const notesList = getNotesList(app.notes);
                            const hasNote = notesList.length > 0;
                            const lastNote = hasNote ? notesList[notesList.length - 1].text : '';
                            return (
                              <Button
                                size="sm"
                                variant="ghost"
                                className={cn(
                                  'h-8 w-8 p-0 relative',
                                  hasNote
                                    ? 'text-amber-600 bg-amber-500/10 hover:bg-amber-500/20'
                                    : 'text-amber-600 hover:bg-amber-500/10'
                                )}
                                onClick={() => openNoteDialog(app)}
                                title={
                                  hasNote
                                    ? `${notesList.length} nota(s) — última: ${lastNote}`
                                    : 'Adicionar nota interna'
                                }
                              >
                                <StickyNote className={cn('h-4 w-4', hasNote && 'fill-amber-500/30')} />
                                {hasNote && (
                                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-white ring-2 ring-background flex items-center justify-center">
                                    {notesList.length}
                                  </span>
                                )}
                              </Button>
                            );
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rankedCandidates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                      Nenhum candidato em Triagem
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {candidatesInActiveStage.map((app, idx) => {
              const score = app.adherence_score ?? app.score ?? 0;
              const rank = idx + 1;
              const profile = profilesById[app.candidate_id];
              const next = getNextStage(getCandidateStage(app));
              const goToProfile = () =>
                navigate(`/company/candidates/${app.candidate_id}?jobId=${id}`);
              const isTerminal = getCandidateStage(app) === 'reprovado';
              const interview = interviewsByApp[app.id];

              // Card especializado para Entrevista
              if (activeStage === 'entrevista') {
                const notesList = getNotesList(app.notes);
                const hasNote = notesList.length > 0;
                const lastNote = hasNote ? notesList[notesList.length - 1].text : '';
                const hasInterview = !!interview;
                const interviewDone = interview?.status === 'done';
                return (
                  <div
                    key={app.id}
                    onClick={goToProfile}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') goToProfile();
                    }}
                    className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {initials(app.candidate_name || '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold group-hover:text-primary truncate">
                          {app.candidate_name || 'Candidato'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          {app.candidate_email}
                        </p>
                      </div>
                      {score > 0 && (
                        <ScoreTooltip score={score} breakdown={app.score_breakdown} />
                      )}
                    </div>

                    {/* Status da entrevista */}
                    {hasInterview && interview.scheduled_at && (
                      <div className="mb-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs gap-1 font-medium',
                            interviewDone
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : 'border-blue-200 bg-blue-50 text-blue-700'
                          )}
                        >
                          {interviewDone ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Calendar className="h-3 w-3" />
                          )}
                          {interviewDone ? 'Entrevista realizada' : 'Agendada'} —{' '}
                          {new Date(interview.scheduled_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Badge>
                        {interview.feedback_score ? (
                          <div className="flex items-center gap-0.5 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  'h-3 w-3',
                                  i < interview.feedback_score
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-muted-foreground/30'
                                )}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Há {daysAgo(app.applied_at)} dia(s) no processo
                    </div>

                    {/* Botões de ação */}
                    <div
                      className="flex items-center flex-wrap gap-1 pt-3 border-t border-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-500/10"
                        onClick={() => openInterviewSheet(app, 'agendar')}
                        title={hasInterview ? 'Reagendar entrevista' : 'Agendar entrevista'}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          'h-8 w-8 p-0',
                          interview?.feedback
                            ? 'text-green-600 bg-green-500/10 hover:bg-green-500/20'
                            : 'text-purple-600 hover:bg-purple-500/10',
                          !hasInterview && 'opacity-30'
                        )}
                        onClick={() => openInterviewSheet(app, 'feedback')}
                        disabled={!hasInterview}
                        title={interview?.feedback ? 'Editar feedback' : 'Registrar feedback'}
                      >
                        <ClipboardList className="h-4 w-4" />
                      </Button>
                      {profile?.phone ? (
                        <a
                          href={`https://wa.me/${profile.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá ${app.candidate_name}, vimos sua candidatura para ${jobTitle}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-[#25D366] hover:bg-[#25D366]/10"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </a>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 opacity-30"
                          disabled
                          title="Sem telefone cadastrado"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          'h-8 w-8 p-0 relative',
                          hasNote
                            ? 'text-amber-600 bg-amber-500/10 hover:bg-amber-500/20'
                            : 'text-amber-600 hover:bg-amber-500/10'
                        )}
                        onClick={() => openNoteDialog(app)}
                        title={
                          hasNote
                            ? `${notesList.length} nota(s) — última: ${lastNote}`
                            : 'Adicionar nota interna'
                        }
                      >
                        <StickyNote className={cn('h-4 w-4', hasNote && 'fill-amber-500/30')} />
                        {hasNote && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-white ring-2 ring-background flex items-center justify-center">
                            {notesList.length}
                          </span>
                        )}
                      </Button>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => moveToNextStage(app)}
                          disabled={actionLoading === app.id || !next}
                          title={next ? `Mover para ${next.label}` : 'Etapa final'}
                        >
                          <ArrowRight className="h-3 w-3" />
                          {next?.label || 'Final'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-indigo-600 hover:bg-indigo-500/10"
                          onClick={() => openMoveDialog(app)}
                          disabled={actionLoading === app.id}
                          title="Mover para outra etapa"
                        >
                          <MoveHorizontal className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => rejectCandidate(app)}
                          disabled={actionLoading === app.id}
                          title="Rejeitar (envia e-mail)"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }

              // Header reutilizável (avatar + nome + email + score)
              const isSelected = selectedIds.has(app.id);
              const renderCardHeader = () => (
                <div className="flex items-start gap-3 mb-3">
                  <div onClick={(e) => e.stopPropagation()} className="pt-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelected(app.id)}
                      aria-label={`Selecionar ${app.candidate_name}`}
                    />
                  </div>
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {initials(app.candidate_name || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold group-hover:text-primary truncate">
                      {app.candidate_name || 'Candidato'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      {app.candidate_email}
                    </p>
                  </div>
                  {score > 0 && (
                    <ScoreTooltip score={score} breakdown={app.score_breakdown} />
                  )}
                </div>
              );


              // Ações comuns reutilizáveis (WhatsApp, nota, mover, reprovar) + ações extras
              const notesList = getNotesList(app.notes);
              const hasNote = notesList.length > 0;
              const lastNote = hasNote ? notesList[notesList.length - 1].text : '';

              const renderStageActions = (extraButtons?: React.ReactNode) => (
                <div
                  className="flex items-center flex-wrap gap-1 pt-3 border-t border-border"
                  onClick={(e) => e.stopPropagation()}
                >
                  {profile?.phone ? (
                    <a
                      href={`https://wa.me/${profile.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Olá ${app.candidate_name}, vimos sua candidatura para ${jobTitle}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-[#25D366] hover:bg-[#25D366]/10"
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </a>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 opacity-30"
                      disabled
                      title="Sem telefone cadastrado"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      'h-8 w-8 p-0 relative',
                      hasNote
                        ? 'text-amber-600 bg-amber-500/10 hover:bg-amber-500/20'
                        : 'text-amber-600 hover:bg-amber-500/10'
                    )}
                    onClick={() => openNoteDialog(app)}
                    title={
                      hasNote
                        ? `${notesList.length} nota(s) — última: ${lastNote}`
                        : 'Adicionar nota interna'
                    }
                  >
                    <StickyNote className={cn('h-4 w-4', hasNote && 'fill-amber-500/30')} />
                    {hasNote && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-white ring-2 ring-background flex items-center justify-center">
                        {notesList.length}
                      </span>
                    )}
                  </Button>

                  {extraButtons}

                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => moveToNextStage(app)}
                      disabled={actionLoading === app.id || !next}
                      title={next ? `Mover para ${next.label}` : 'Etapa final'}
                    >
                      <ArrowRight className="h-3 w-3" />
                      {next?.label || 'Final'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-indigo-600 hover:bg-indigo-500/10"
                      onClick={() => openMoveDialog(app)}
                      disabled={actionLoading === app.id}
                      title="Mover para outra etapa"
                    >
                      <MoveHorizontal className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => rejectCandidate(app)}
                      disabled={actionLoading === app.id}
                      title="Rejeitar (envia e-mail)"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );

              // Card especializado AVALIAÇÃO
              if (activeStage === 'avaliacao') {
                return (
                  <div
                    key={app.id}
                    onClick={goToProfile}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') goToProfile();
                    }}
                    className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-sm transition-all group cursor-pointer"
                  >
                    {renderCardHeader()}
                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Há {daysAgo(app.applied_at)} dia(s) no processo
                    </div>
                    {renderStageActions()}
                  </div>
                );
              }

              // Card especializado PROPOSTA
              if (activeStage === 'proposta') {
                const offer = offersByApp[app.id];
                return (
                  <div
                    key={app.id}
                    onClick={goToProfile}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') goToProfile();
                    }}
                    className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-sm transition-all group cursor-pointer"
                  >
                    {renderCardHeader()}

                    {offer && (
                      <div className="mb-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs gap-1 font-medium',
                            offer.status === 'accepted'
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : offer.status === 'declined'
                              ? 'border-red-200 bg-red-50 text-red-600'
                              : 'border-orange-200 bg-orange-50 text-orange-700'
                          )}
                        >
                          <DollarSign className="h-3 w-3" />
                          {offer.status === 'accepted'
                            ? 'Proposta aceita'
                            : offer.status === 'declined'
                            ? 'Proposta recusada'
                            : `Proposta: R$ ${Number(offer.offered_salary).toLocaleString('pt-BR')}`}
                        </Badge>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Há {daysAgo(app.applied_at)} dia(s) no processo
                    </div>

                    {renderStageActions(
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          'h-8 w-8 p-0',
                          offer
                            ? 'text-green-600 bg-green-500/10 hover:bg-green-500/20'
                            : 'text-orange-600 hover:bg-orange-500/10'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          openOfferDialog(app);
                        }}
                        title={offer ? 'Editar proposta salarial' : 'Fazer proposta salarial'}
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              }

              // Card especializado ADMISSÃO
              if (activeStage === 'admissao') {
                return (
                  <div
                    key={app.id}
                    onClick={goToProfile}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') goToProfile();
                    }}
                    className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-sm transition-all group cursor-pointer"
                  >
                    {renderCardHeader()}
                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Há {daysAgo(app.applied_at)} dia(s) no processo
                    </div>

                    {/* Documentos enviados pelo candidato */}
                    {(() => {
                      const docs = documentsByApp[app.id] || [];
                      return (
                        <div
                          className="mb-3 rounded-lg border border-border bg-muted/30 p-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <FileText className="h-3.5 w-3.5 text-teal-600" />
                              Documentos recebidos
                            </div>
                            <span
                              className={cn(
                                'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                                docs.length > 0
                                  ? 'bg-teal-500/10 text-teal-700'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {docs.length}
                            </span>
                          </div>
                          {docs.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic">
                              Nenhum documento enviado ainda.
                            </p>
                          ) : (
                            <ul className="space-y-1 max-h-32 overflow-y-auto">
                              {docs.map((file: any) => (
                                <li
                                  key={file.name}
                                  className="flex items-center gap-1.5 text-[11px]"
                                >
                                  <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate flex-1" title={file.name}>
                                    {formatDocLabel(file.name)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDocument(app.id, file.name);
                                    }}
                                    className="text-primary hover:text-primary/80 p-0.5 rounded"
                                    title="Abrir / baixar"
                                  >
                                    <Download className="h-3 w-3" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })()}

                    {renderStageActions(
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestHiringDocuments(app);
                        }}
                        title="Solicitar documentos de contratação"
                      >
                        <FileCheck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={app.id}
                  onClick={goToProfile}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') goToProfile();
                  }}
                  className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all group cursor-pointer"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {initials(app.candidate_name || '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold group-hover:text-primary truncate">
                        {app.candidate_name || 'Candidato'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        {app.candidate_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Há {daysAgo(app.applied_at)} dia(s)
                    </span>
                    {score > 0 && (
                      <ScoreTooltip
                        score={score}
                        breakdown={app.score_breakdown}
                        variant="pill"
                      />
                    )}
                  </div>
                  <div
                    className="flex items-center gap-2 pt-3 border-t border-border"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isTerminal && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs gap-1"
                          onClick={() => moveToNextStage(app)}
                          disabled={actionLoading === app.id || !next}
                          title={next ? `Mover para ${next.label}` : 'Etapa final'}
                        >
                          <ArrowRight className="h-3 w-3" />
                          {next ? next.label : 'Final'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => rejectCandidate(app)}
                          disabled={actionLoading === app.id}
                          title="Rejeitar (envia e-mail)"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        'h-8 px-2 text-indigo-600 hover:bg-indigo-500/10',
                        isTerminal && 'flex-1 text-xs gap-1'
                      )}
                      onClick={() => openMoveDialog(app)}
                      disabled={actionLoading === app.id}
                      title="Mover para outra etapa"
                    >
                      <MoveHorizontal className="h-3 w-3" />
                      {isTerminal && 'Mover para outra etapa'}
                    </Button>
                  </div>
                </div>
              );
            })}

            {candidatesInActiveStage.length === 0 && (
              <div className="col-span-full border-2 border-dashed border-border rounded-xl p-12 text-center bg-card/50">
                <p className="text-muted-foreground text-sm">Nenhum candidato nesta etapa</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog de Proposta Salarial */}
      <Dialog
        open={offerDialog.open}
        onOpenChange={(open) => setOfferDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              Proposta salarial
            </DialogTitle>
            <DialogDescription>
              {offerDialog.app?.candidate_name
                ? `Registrar proposta para ${offerDialog.app.candidate_name} e enviar e-mail.`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="offerSalary" className="text-xs">
                Salário ofertado (R$) *
              </Label>
              <Input
                id="offerSalary"
                type="number"
                placeholder="5000"
                value={offerDialog.salary}
                onChange={(e) =>
                  setOfferDialog((prev) => ({ ...prev, salary: e.target.value }))
                }
                className="mt-1 h-9 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="offerBenefits" className="text-xs">
                Benefícios
              </Label>
              <Input
                id="offerBenefits"
                placeholder="VR, VT, Plano de saúde..."
                value={offerDialog.benefits}
                onChange={(e) =>
                  setOfferDialog((prev) => ({ ...prev, benefits: e.target.value }))
                }
                className="mt-1 h-9 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="offerNotes" className="text-xs">
                Observações
              </Label>
              <Textarea
                id="offerNotes"
                placeholder="Informações adicionais..."
                value={offerDialog.notes}
                onChange={(e) =>
                  setOfferDialog((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="mt-1 text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOfferDialog((prev) => ({ ...prev, open: false }))}
              disabled={offerDialog.saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveOffer}
              disabled={!offerDialog.salary || offerDialog.saving}
            >
              {offerDialog.saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {offerDialog.saving ? 'Salvando...' : 'Registrar e enviar e-mail'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={noteDialog.open}
        onOpenChange={(open) => {
          if (!open) setNoteDialog({ app: null, open: false, value: '', saving: false });
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notas internas</DialogTitle>
            <DialogDescription>
              {noteDialog.app?.candidate_name
                ? `Anotações privadas sobre ${noteDialog.app.candidate_name}. Visível apenas para a equipe.`
                : 'Anotações privadas visíveis apenas para a equipe.'}
            </DialogDescription>
          </DialogHeader>

          {/* Lista segmentada de notas */}
          {(() => {
            const items = getNotesList(noteDialog.app?.notes);
            if (items.length === 0) {
              return (
                <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                  Nenhuma nota registrada ainda.
                </div>
              );
            }
            // mais recente primeiro
            const ordered = [...items].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            return (
              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                {ordered.map((n) => {
                  const isLegacy = n.id === 'legacy';
                  const dt = isLegacy ? null : new Date(n.created_at);
                  return (
                    <div
                      key={n.id}
                      className="rounded-md border border-border bg-muted/20 p-3 text-sm space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <UserIcon className="h-3 w-3 shrink-0" />
                          <span className="font-medium text-foreground/80 truncate">
                            {n.author || 'Equipe'}
                          </span>
                          {dt && (
                            <>
                              <span>·</span>
                              <span className="shrink-0">
                                {dt.toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </>
                          )}
                          {isLegacy && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                              antiga
                            </Badge>
                          )}
                        </div>
                        {!isLegacy && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteNote(n.id)}
                            title="Excluir nota"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                        {n.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Adicionar nova nota */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium text-muted-foreground">
              Nova nota
            </label>
            <Textarea
              value={noteDialog.value}
              onChange={(e) => setNoteDialog((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="Escreva uma observação sobre o candidato..."
              rows={3}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialog({ app: null, open: false, value: '', saving: false })}
              disabled={noteDialog.saving}
            >
              Fechar
            </Button>
            <Button
              onClick={saveNote}
              disabled={noteDialog.saving || !noteDialog.value.trim()}
            >
              {noteDialog.saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Mover entre etapas */}
      <Dialog
        open={moveDialog.open}
        onOpenChange={(open) => {
          if (!open && !moveDialog.saving)
            setMoveDialog({
              open: false,
              app: null,
              targetStage: '',
              saving: false,
            });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MoveHorizontal className="h-5 w-5 text-primary" />
              Mover candidato
            </DialogTitle>
            <DialogDescription>
              {moveDialog.app
                ? `${moveDialog.app.candidate_name} está atualmente em ${
                    CANDIDATE_STAGES.find((s) => s.id === getCandidateStage(moveDialog.app))?.label
                  }.`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label>Mover para qual etapa?</Label>
            <Select
              value={moveDialog.targetStage}
              onValueChange={(v) =>
                setMoveDialog((prev) => ({ ...prev, targetStage: v as CandidateStageId }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a etapa de destino" />
              </SelectTrigger>
              <SelectContent>
                {CANDIDATE_STAGES.filter(
                  (s) => !moveDialog.app || s.id !== getCandidateStage(moveDialog.app)
                ).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setMoveDialog({
                  open: false,
                  app: null,
                  targetStage: '',
                  saving: false,
                })
              }
              disabled={moveDialog.saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmMove}
              disabled={moveDialog.saving || !moveDialog.targetStage}
            >
              {moveDialog.saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet de Entrevista */}
      <Sheet
        open={interviewSheet.open}
        onOpenChange={(open) => {
          if (!open) setInterviewSheet((prev) => ({ ...prev, open: false }));
        }}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {interviewSheet.tab === 'feedback' ? 'Feedback da entrevista' : 'Agendar entrevista'}
            </SheetTitle>
            <SheetDescription>
              {interviewSheet.app?.candidate_name
                ? `Candidato: ${interviewSheet.app.candidate_name}`
                : ''}
            </SheetDescription>
          </SheetHeader>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 mb-4 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setInterviewSheet((prev) => ({ ...prev, tab: 'agendar' }))}
              className={cn(
                'flex-1 text-xs font-semibold py-2 rounded-md transition-colors',
                interviewSheet.tab === 'agendar'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Agendamento
            </button>
            <button
              type="button"
              onClick={() => setInterviewSheet((prev) => ({ ...prev, tab: 'feedback' }))}
              disabled={!interviewSheet.existing}
              className={cn(
                'flex-1 text-xs font-semibold py-2 rounded-md transition-colors',
                interviewSheet.tab === 'feedback'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                !interviewSheet.existing && 'opacity-40 cursor-not-allowed'
              )}
            >
              Feedback
            </button>
          </div>

          {interviewSheet.tab === 'agendar' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Data e hora *</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={interviewSheet.scheduledAt}
                  onChange={(e) =>
                    setInterviewSheet((prev) => ({ ...prev, scheduledAt: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="format">Formato</Label>
                <Select
                  value={interviewSheet.format}
                  onValueChange={(v) =>
                    setInterviewSheet((prev) => ({ ...prev, format: v }))
                  }
                >
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">
                      <span className="flex items-center gap-2">
                        <Video className="h-4 w-4" /> Videochamada
                      </span>
                    </SelectItem>
                    <SelectItem value="presencial">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Presencial
                      </span>
                    </SelectItem>
                    <SelectItem value="telefone">
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" /> Ligação
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {interviewSheet.format === 'video' && (
                <div className="space-y-2">
                  <Label htmlFor="meetingLink">Link da reunião</Label>
                  <Input
                    id="meetingLink"
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={interviewSheet.meetingLink}
                    onChange={(e) =>
                      setInterviewSheet((prev) => ({ ...prev, meetingLink: e.target.value }))
                    }
                  />
                </div>
              )}

              {interviewSheet.format === 'presencial' && (
                <div className="space-y-2">
                  <Label htmlFor="location">Endereço</Label>
                  <Input
                    id="location"
                    placeholder="Rua, número, sala..."
                    value={interviewSheet.location}
                    onChange={(e) =>
                      setInterviewSheet((prev) => ({ ...prev, location: e.target.value }))
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="interviewer">Entrevistador</Label>
                <Input
                  id="interviewer"
                  placeholder="Nome do responsável"
                  value={interviewSheet.interviewer}
                  onChange={(e) =>
                    setInterviewSheet((prev) => ({ ...prev, interviewer: e.target.value }))
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setInterviewSheet((prev) => ({ ...prev, open: false }))}
                  disabled={interviewSheet.saving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={saveInterview}
                  disabled={interviewSheet.saving || !interviewSheet.scheduledAt}
                >
                  {interviewSheet.saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {interviewSheet.existing ? 'Atualizar e notificar' : 'Agendar e notificar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Avaliação geral</Label>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const value = i + 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setInterviewSheet((prev) => ({ ...prev, feedbackScore: value }))
                        }
                        className="p-1"
                      >
                        <Star
                          className={cn(
                            'h-7 w-7 transition-colors',
                            value <= interviewSheet.feedbackScore
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground/30 hover:text-amber-300'
                          )}
                        />
                      </button>
                    );
                  })}
                  {interviewSheet.feedbackScore > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setInterviewSheet((prev) => ({ ...prev, feedbackScore: 0 }))
                      }
                      className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Anotações da entrevista *</Label>
                <Textarea
                  id="feedback"
                  rows={8}
                  placeholder="Pontos fortes, pontos a melhorar, fit cultural, recomendações..."
                  value={interviewSheet.feedbackText}
                  onChange={(e) =>
                    setInterviewSheet((prev) => ({ ...prev, feedbackText: e.target.value }))
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setInterviewSheet((prev) => ({ ...prev, open: false }))}
                  disabled={interviewSheet.saving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={saveFeedback}
                  disabled={
                    interviewSheet.saving ||
                    !interviewSheet.existing ||
                    !interviewSheet.feedbackText.trim()
                  }
                >
                  {interviewSheet.saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Salvar feedback
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={confirmBulk.open}
        onOpenChange={(open) =>
          !open && setConfirmBulk({ open: false, count: 0, nextLabel: '', nextId: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avançar todos os candidatos?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBulk.count} candidato(s) de {activeStageLabel} serão movidos para{' '}
              <strong>{confirmBulk.nextLabel}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={performBulkAdvance}>
              Avançar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmReject.open}
        onOpenChange={(open) => !open && setConfirmReject({ open: false, app: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar candidato?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmReject.app?.candidate_name} será rejeitado e um e-mail de notificação
              será enviado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={performReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CompanyLayout>
  );
}
