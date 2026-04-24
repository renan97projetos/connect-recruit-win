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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

// Mapeia status / current_stage do banco para nossas etapas visuais
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

const daysAgo = (date: string) => {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
};

export default function JobPipeline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [jobTitle, setJobTitle] = useState('');
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<CandidateStageId>('triagem');
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [jobRes, appsRes] = await Promise.all([
        supabase.from('jobs').select('title').eq('id', id).maybeSingle(),
        supabase
          .from('applications')
          .select(
            'id, candidate_id, candidate_name, candidate_email, status, current_stage, score, adherence_score, applied_at, updated_at'
          )
          .eq('job_id', id)
          .order('adherence_score', { ascending: false })
          .order('applied_at', { ascending: false }),
      ]);
      if (jobRes.data) setJobTitle(jobRes.data.title);
      setApplications(appsRes.data || []);
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

  // Atualiza status/current_stage de uma application
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
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, ...patch } : a))
    );
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {activeStageLabel} — {candidatesInActiveStage.length}{' '}
            {candidatesInActiveStage.length === 1 ? 'candidato' : 'candidatos'}
          </h2>
        </div>

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
                        score >= 80
                          ? 'bg-green-50 text-green-700'
                          : score >= 50
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-600'
                      )}
                    >
                      {rank <= 3 && <Trophy className="h-3 w-3" />}
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
                            selectedScore >= 80
                              ? 'bg-green-50 text-green-700'
                              : selectedScore >= 50
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-600'
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
                {/* Info rápida */}
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

                {/* Ações principais */}
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

                {/* Ações secundárias */}
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
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() =>
                      navigate(
                        `/company/candidates/${selectedCandidate.candidate_id}?jobId=${id}#schedule`
                      )
                    }
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Agendar entrevista
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
    </CompanyLayout>
  );
}
