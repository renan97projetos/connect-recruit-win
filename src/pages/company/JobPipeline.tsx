import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  ArrowLeft,
  Loader2,
  Mail,
  Calendar,
  Trophy,
  Eye,
  ArrowRight,
  CheckCircle2,
  XCircle,
  MessageSquare,
  CalendarPlus,
  X,
  LayoutGrid,
  List,
  DollarSign,
  Video,
  MapPin,
  Phone,
  Star,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CandidateStageId =
  | 'triagem'
  | 'entrevista'
  | 'avaliacao'
  | 'proposta'
  | 'admissao'
  | 'aprovado'
  | 'reprovado';

const CANDIDATE_STAGES: { id: CandidateStageId; label: string; color: string }[] = [
  { id: 'triagem', label: 'Triagem', color: 'text-gray-600' },
  { id: 'entrevista', label: 'Entrevista', color: 'text-blue-600' },
  { id: 'avaliacao', label: 'Avaliação', color: 'text-amber-600' },
  { id: 'proposta', label: 'Proposta', color: 'text-orange-600' },
  { id: 'admissao', label: 'Admissão', color: 'text-teal-600' },
  { id: 'aprovado', label: 'Aprovado', color: 'text-green-600' },
  { id: 'reprovado', label: 'Reprovado', color: 'text-red-500' },
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
  approved: 'aprovado',
  aprovado: 'aprovado',
  rejected: 'reprovado',
  reprovado: 'reprovado',
};

function getCandidateStage(app: any): CandidateStageId {
  const key = String(app.current_stage || app.status || '').toLowerCase();
  return STAGE_ALIASES[key] || 'triagem';
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

const daysAgo = (date: string) =>
  Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

const scoreClass = (score: number) =>
  score >= 80
    ? 'bg-green-50 text-green-700'
    : score >= 50
    ? 'bg-amber-50 text-amber-700'
    : 'bg-red-50 text-red-600';

export default function JobPipeline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useSupabaseAuth();

  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<CandidateStageId>('triagem');
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [triagemView, setTriagemView] = useState<'table' | 'cards'>('table');

  // Entrevista
  const [interviewSheetOpen, setInterviewSheetOpen] = useState(false);
  const [interviewApp, setInterviewApp] = useState<any | null>(null);
  const [interviewTab, setInterviewTab] = useState<'agendar' | 'feedback'>('agendar');
  const [existingInterview, setExistingInterview] = useState<any>(null);
  const [interviewData, setInterviewData] = useState({
    scheduled_at: '',
    format: 'video',
    meeting_link: '',
    location: '',
    interviewer_name: '',
  });
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackScore, setFeedbackScore] = useState(0);
  const [savingInterview, setSavingInterview] = useState(false);

  // Proposta
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerCandidate, setOfferCandidate] = useState<any | null>(null);
  const [offerSalary, setOfferSalary] = useState('');
  const [offerBenefits, setOfferBenefits] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [savingOffer, setSavingOffer] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [jobRes, appsRes] = await Promise.all([
        supabase.from('jobs').select('title, company_name').eq('id', id).maybeSingle(),
        supabase
          .from('applications')
          .select(
            'id, candidate_id, candidate_name, candidate_email, status, current_stage, score, adherence_score, applied_at, updated_at'
          )
          .eq('job_id', id)
          .order('adherence_score', { ascending: false })
          .order('applied_at', { ascending: false }),
      ]);
      if (jobRes.data) {
        setJobTitle(jobRes.data.title);
        setCompanyName((jobRes.data as any).company_name || '');
      }
      setApplications(appsRes.data || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const getCountForStage = (stageId: CandidateStageId) =>
    applications.filter((a) => getCandidateStage(a) === stageId).length;

  const candidatesInActiveStage = useMemo(
    () =>
      applications
        .filter((a) => getCandidateStage(a) === activeStage)
        .sort(
          (a, b) =>
            (b.adherence_score ?? b.score ?? 0) - (a.adherence_score ?? a.score ?? 0)
        ),
    [applications, activeStage]
  );

  const activeStageLabel = CANDIDATE_STAGES.find((s) => s.id === activeStage)?.label || '';

  const updateApplication = async (
    appId: string,
    patch: { current_stage?: string; status?: string }
  ) => {
    setActionLoading(true);
    const { error } = await supabase.from('applications').update(patch).eq('id', appId);
    setActionLoading(false);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return false;
    }
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, ...patch } : a)));
    setSelectedCandidate((prev: any) => (prev && prev.id === appId ? { ...prev, ...patch } : prev));
    return true;
  };

  const moveToNextStage = async () => {
    if (!selectedCandidate) return;
    const currentIdx = CANDIDATE_STAGES.findIndex(
      (s) => s.id === getCandidateStage(selectedCandidate)
    );
    const next = CANDIDATE_STAGES[currentIdx + 1];
    if (!next || next.id === 'reprovado') {
      toast({ title: 'Etapa final atingida' });
      return;
    }
    const ok = await updateApplication(selectedCandidate.id, { current_stage: next.id });
    if (ok) toast({ title: `Movido para ${next.label}` });
  };

  const approveCandidate = async () => {
    if (!selectedCandidate) return;
    const ok = await updateApplication(selectedCandidate.id, {
      current_stage: 'aprovado',
      status: 'approved',
    });
    if (ok) toast({ title: 'Candidato aprovado' });
  };

  const rejectCandidate = async () => {
    if (!selectedCandidate) return;
    const ok = await updateApplication(selectedCandidate.id, {
      current_stage: 'reprovado',
      status: 'rejected',
    });
    if (ok) toast({ title: 'Candidato reprovado' });
  };

  // ==== Entrevista ====
  const openInterviewSheet = async (app: any) => {
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

    const { data } = await (supabase as any)
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

  const saveInterview = async () => {
    if (!interviewApp || !interviewData.scheduled_at || !user) return;
    setSavingInterview(true);

    const payload = {
      application_id: interviewApp.id,
      job_id: id,
      company_id: user.id,
      scheduled_at: new Date(interviewData.scheduled_at).toISOString(),
      format: interviewData.format,
      meeting_link: interviewData.meeting_link || null,
      location: interviewData.location || null,
      interviewer_name: interviewData.interviewer_name || null,
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    };

    if (existingInterview) {
      await (supabase as any).from('interviews').update(payload).eq('id', existingInterview.id);
    } else {
      await (supabase as any).from('interviews').insert(payload);
    }

    // mover para entrevista se ainda não estiver
    await updateApplication(interviewApp.id, { current_stage: 'entrevista' });

    setSavingInterview(false);
    toast({
      title: 'Entrevista agendada!',
      description: `E-mail enviado para ${interviewApp.candidate_name}.`,
    });
    setInterviewSheetOpen(false);

    // notificação por email (best-effort)
    supabase.functions
      .invoke('send-candidate-status-email', {
        body: {
          candidateName: interviewApp.candidate_name,
          candidateEmail: interviewApp.candidate_email,
          jobTitle,
          companyName: companyName || 'Empresa',
          newStatus: 'interview',
          customSubject: `Entrevista agendada — ${jobTitle}`,
        },
      })
      .catch(console.error);
  };

  const saveFeedback = async () => {
    if (!interviewApp || !existingInterview) return;
    setSavingInterview(true);
    await (supabase as any)
      .from('interviews')
      .update({
        feedback: feedbackText,
        feedback_score: feedbackScore || null,
        status: 'done',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingInterview.id);
    setSavingInterview(false);
    toast({ title: 'Feedback registrado!' });
    setInterviewSheetOpen(false);
  };

  // ==== Proposta ====
  const openOfferDialog = (app: any) => {
    setOfferCandidate(app);
    setOfferSalary('');
    setOfferBenefits('');
    setOfferNotes('');
    setOfferDialogOpen(true);
  };

  const handleSaveOffer = async () => {
    if (!offerCandidate || !offerSalary || !user) return;
    setSavingOffer(true);
    const { error } = await (supabase as any).from('job_offers').insert({
      application_id: offerCandidate.id,
      job_id: id,
      company_id: user.id,
      offered_salary: parseFloat(offerSalary),
      benefits_offered: offerBenefits || null,
      notes: offerNotes || null,
      status: 'pending',
    });
    if (error) {
      setSavingOffer(false);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a proposta.',
        variant: 'destructive',
      });
      return;
    }

    await updateApplication(offerCandidate.id, { current_stage: 'proposta' });

    supabase.functions
      .invoke('send-job-offer-email', {
        body: {
          candidateName: offerCandidate.candidate_name,
          candidateEmail: offerCandidate.candidate_email,
          jobTitle,
          companyName,
          offeredSalary: parseFloat(offerSalary),
          benefits: offerBenefits || null,
          notes: offerNotes || null,
        },
      })
      .catch(console.error);

    setSavingOffer(false);
    toast({ title: 'Proposta registrada!', description: `Para ${offerCandidate.candidate_name}.` });
    setOfferDialogOpen(false);
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

  const selectedScore = selectedCandidate
    ? selectedCandidate.adherence_score ?? selectedCandidate.score ?? 0
    : 0;
  const selectedStageId = selectedCandidate ? getCandidateStage(selectedCandidate) : null;
  const selectedStageLabel =
    CANDIDATE_STAGES.find((s) => s.id === selectedStageId)?.label || '';

  return (
    <CompanyLayout>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/company/dashboard')}
          className="mb-2 -ml-2 text-gray-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para vagas
        </Button>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{jobTitle || 'Vaga'}</h1>
            <p className="text-sm text-gray-500">
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
              onClick={() => setActiveStage(stage.id)}
              className={cn(
                'flex-shrink-0 min-w-[110px] p-3 rounded-xl border text-left transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-white border-gray-200 hover:border-primary/50 hover:bg-primary/5'
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
                  isActive ? 'text-primary-foreground/80' : 'text-gray-500'
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
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {activeStageLabel} — {candidatesInActiveStage.length}{' '}
            {candidatesInActiveStage.length === 1 ? 'candidato' : 'candidatos'}
          </h2>

          {/* Toggle visualização — só na triagem */}
          {activeStage === 'triagem' && candidatesInActiveStage.length > 0 && (
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setTriagemView('table')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  triagemView === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <List className="h-3.5 w-3.5" /> Tabela ranqueada
              </button>
              <button
                onClick={() => setTriagemView('cards')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  triagemView === 'cards'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Cards
              </button>
            </div>
          )}
        </div>

        {/* TRIAGEM em formato de tabela ranqueada */}
        {activeStage === 'triagem' && triagemView === 'table' && candidatesInActiveStage.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Candidatura</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatesInActiveStage.map((app, idx) => {
                  const score = app.adherence_score ?? app.score ?? 0;
                  const rank = idx + 1;
                  return (
                    <TableRow
                      key={app.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedCandidate(app)}
                    >
                      <TableCell>
                        <div
                          className={cn(
                            'flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold',
                            rank === 1
                              ? 'bg-amber-100 text-amber-700'
                              : rank === 2
                              ? 'bg-gray-200 text-gray-700'
                              : rank === 3
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-50 text-gray-500'
                          )}
                        >
                          {rank <= 3 ? <Trophy className="h-3.5 w-3.5" /> : rank}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {initials(app.candidate_name || '?')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {app.candidate_name || 'Candidato'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {app.candidate_email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {score > 0 ? (
                          <span
                            className={cn(
                              'inline-flex items-center font-semibold px-2 py-0.5 rounded-full text-xs',
                              scoreClass(score)
                            )}
                          >
                            {Math.round(score)}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        Há {daysAgo(app.applied_at)} dia(s)
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-blue-600 hover:bg-blue-50"
                            title="Agendar entrevista"
                            onClick={() => openInterviewSheet(app)}
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-green-600 hover:bg-green-50"
                            title="Aprovar"
                            onClick={async () => {
                              setSelectedCandidate(app);
                              setTimeout(() => approveCandidate(), 0);
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-600 hover:bg-red-50"
                            title="Reprovar"
                            onClick={async () => {
                              setSelectedCandidate(app);
                              setTimeout(() => rejectCandidate(), 0);
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Cards (default para outras etapas; opcional na triagem) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {candidatesInActiveStage.map((app, idx) => {
              const score = app.adherence_score ?? app.score ?? 0;
              const rank = idx + 1;
              return (
                <button
                  key={app.id}
                  onClick={() => setSelectedCandidate(app)}
                  className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {initials(app.candidate_name || '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-primary truncate">
                        {app.candidate_name || 'Candidato'}
                      </p>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        {app.candidate_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Calendar className="h-3 w-3" />
                      Há {daysAgo(app.applied_at)} dia(s)
                    </span>
                    {score > 0 && (
                      <span
                        className={cn(
                          'flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full',
                          scoreClass(score)
                        )}
                      >
                        {activeStage === 'triagem' && rank <= 3 && <Trophy className="h-3 w-3" />}
                        {Math.round(score)}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {candidatesInActiveStage.length === 0 && (
              <div className="col-span-full border-2 border-dashed border-gray-200 rounded-xl p-12 text-center bg-white/50">
                <p className="text-gray-400 text-sm">Nenhum candidato nesta etapa</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Painel lateral de ações */}
      <Sheet open={!!selectedCandidate} onOpenChange={(o) => !o && setSelectedCandidate(null)}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto">
          {selectedCandidate && (
            <>
              <SheetHeader className="p-6 border-b">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {initials(selectedCandidate.candidate_name || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-left text-lg truncate">
                      {selectedCandidate.candidate_name || 'Candidato'}
                    </SheetTitle>
                    <SheetDescription className="text-left flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      {selectedCandidate.candidate_email}
                    </SheetDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {selectedStageLabel}
                      </span>
                      {selectedScore > 0 && (
                        <span
                          className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            scoreClass(selectedScore)
                          )}
                        >
                          {Math.round(selectedScore)}% aderência
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Candidatura</p>
                    <p className="font-medium text-gray-900">
                      Há {daysAgo(selectedCandidate.applied_at)} dia(s)
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Score</p>
                    <p className="font-medium text-gray-900">
                      {selectedScore > 0 ? `${Math.round(selectedScore)}%` : '—'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Ações
                  </p>
                  <Button
                    className="w-full justify-start"
                    onClick={() =>
                      navigate(
                        `/company/candidates/${selectedCandidate.candidate_id}?jobId=${id}`
                      )
                    }
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver perfil completo
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={moveToNextStage}
                    disabled={
                      actionLoading ||
                      selectedStageId === 'aprovado' ||
                      selectedStageId === 'reprovado'
                    }
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Mover para próxima etapa
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-green-700 border-green-200 hover:bg-green-50"
                    onClick={approveCandidate}
                    disabled={actionLoading || selectedStageId === 'aprovado'}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Aprovar candidato
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                    onClick={rejectCandidate}
                    disabled={actionLoading || selectedStageId === 'reprovado'}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reprovar candidato
                  </Button>
                </div>

                {/* Ações específicas da etapa */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Ações da etapa
                  </p>

                  {(selectedStageId === 'triagem' || selectedStageId === 'entrevista') && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      onClick={() => openInterviewSheet(selectedCandidate)}
                    >
                      <CalendarPlus className="h-4 w-4 mr-2" />
                      Agendar / ver entrevista
                    </Button>
                  )}

                  {(selectedStageId === 'avaliacao' ||
                    selectedStageId === 'proposta' ||
                    selectedStageId === 'aprovado') && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-orange-700 border-orange-200 hover:bg-orange-50"
                      onClick={() => openOfferDialog(selectedCandidate)}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Registrar proposta
                    </Button>
                  )}

                  {selectedStageId === 'admissao' && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-teal-700 border-teal-200 hover:bg-teal-50"
                      onClick={() =>
                        navigate(
                          `/company/candidates/${selectedCandidate.candidate_id}?jobId=${id}#documents`
                        )
                      }
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Enviar documentos de admissão
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Comunicação
                  </p>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() =>
                      window.open(
                        `mailto:${selectedCandidate.candidate_email}?subject=${encodeURIComponent(
                          jobTitle
                        )}`
                      )
                    }
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Enviar e-mail
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  className="w-full text-gray-500"
                  onClick={() => setSelectedCandidate(null)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Fechar
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet de entrevista (agendar + feedback) */}
      <Sheet open={interviewSheetOpen} onOpenChange={setInterviewSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base">Entrevista</SheetTitle>
                <p className="text-xs text-muted-foreground truncate">
                  {interviewApp?.candidate_name}
                </p>
              </div>
            </div>

            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {(['agendar', 'feedback'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setInterviewTab(tab)}
                  className={cn(
                    'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors capitalize',
                    interviewTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'agendar' ? 'Agendar' : 'Feedback'}
                </button>
              ))}
            </div>
          </SheetHeader>

          <div className="mt-5 space-y-4">
            {interviewTab === 'agendar' && (
              <div className="space-y-4">
                {existingInterview?.status === 'scheduled' && (
                  <div className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md px-3 py-2">
                    ✓ Entrevista já agendada — edite abaixo se precisar alterar
                  </div>
                )}

                <div>
                  <Label className="text-xs">Data e horário *</Label>
                  <Input
                    type="datetime-local"
                    value={interviewData.scheduled_at}
                    onChange={(e) =>
                      setInterviewData((p) => ({ ...p, scheduled_at: e.target.value }))
                    }
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
                        <div className="flex items-center gap-2">
                          <Video className="h-3.5 w-3.5" /> Videochamada
                        </div>
                      </SelectItem>
                      <SelectItem value="presencial">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" /> Presencial
                        </div>
                      </SelectItem>
                      <SelectItem value="telefone">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" /> Telefone
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {interviewData.format === 'video' && (
                  <div>
                    <Label className="text-xs">Link da reunião</Label>
                    <Input
                      value={interviewData.meeting_link}
                      onChange={(e) =>
                        setInterviewData((p) => ({ ...p, meeting_link: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setInterviewData((p) => ({ ...p, location: e.target.value }))
                      }
                      placeholder="Rua das Flores, 123 — Sala 201"
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs">Entrevistador</Label>
                  <Input
                    value={interviewData.interviewer_name}
                    onChange={(e) =>
                      setInterviewData((p) => ({ ...p, interviewer_name: e.target.value }))
                    }
                    placeholder="Nome de quem vai conduzir"
                    className="mt-1 h-9 text-sm"
                  />
                </div>

                <Button
                  onClick={saveInterview}
                  disabled={!interviewData.scheduled_at || savingInterview}
                  className="w-full"
                >
                  {savingInterview ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : existingInterview ? (
                    'Atualizar agendamento'
                  ) : (
                    'Agendar e notificar candidato'
                  )}
                </Button>
              </div>
            )}

            {interviewTab === 'feedback' && (
              <div className="space-y-4">
                {!existingInterview && (
                  <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-3 py-2">
                    Agende a entrevista primeiro antes de registrar o feedback.
                  </div>
                )}

                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" /> Avaliação geral
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFeedbackScore(n)}
                        disabled={!existingInterview}
                        className={cn(
                          'w-9 h-9 rounded-lg border text-sm font-bold transition-colors',
                          feedbackScore >= n
                            ? 'bg-amber-400 border-amber-400 text-white'
                            : 'bg-muted border-border text-muted-foreground hover:border-amber-300'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Observações da entrevista</Label>
                  <Textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Pontos fortes, pontos de atenção, próximos passos..."
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
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Registrar feedback'
                  )}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog de proposta */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Registrar proposta</DialogTitle>
            <DialogDescription className="text-xs">
              Para: {offerCandidate?.candidate_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Salário ofertado (R$)</Label>
              <Input
                type="number"
                placeholder="5000"
                value={offerSalary}
                onChange={(e) => setOfferSalary(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Benefícios</Label>
              <Input
                placeholder="VT, VR, plano de saúde..."
                value={offerBenefits}
                onChange={(e) => setOfferBenefits(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={offerNotes}
                onChange={(e) => setOfferNotes(e.target.value)}
                rows={2}
                className="mt-1 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setOfferDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSaveOffer} disabled={!offerSalary || savingOffer}>
              {savingOffer ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar proposta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CompanyLayout>
  );
}
