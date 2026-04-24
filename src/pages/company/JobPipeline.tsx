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

const daysAgo = (date: string) => {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
};

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

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [jobRes, appsRes] = await Promise.all([
        supabase.from('jobs').select('title, company_name').eq('id', id).maybeSingle(),
        supabase
          .from('applications')
          .select(
            'id, candidate_id, candidate_name, candidate_email, status, current_stage, score, adherence_score, applied_at, updated_at, notes'
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
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, avatar_url, phone')
          .in('id', ids);
        const map: Record<string, any> = {};
        (profs || []).forEach((p: any) => (map[p.id] = p));
        setProfilesById(map);
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

  const moveToInterview = async (app: any) => {
    const ok = await updateApplication(app.id, { current_stage: 'entrevista', status: 'in-review' });
    if (!ok) return;
    toast({ title: `${app.candidate_name} movido para Entrevista` });

    supabase.functions.invoke('send-candidate-status-email', {
      body: {
        candidateName: app.candidate_name,
        candidateEmail: app.candidate_email,
        jobTitle,
        companyName: companyName || 'Sinapse RH',
        newStatus: 'interview',
      },
    }).catch(console.error);
  };

  const rejectCandidate = async (app: any) => {
    if (!confirm(`Reprovar ${app.candidate_name}? Um e-mail será enviado ao candidato.`)) return;
    const ok = await updateApplication(app.id, { current_stage: 'reprovado', status: 'rejected' });
    if (!ok) return;
    toast({ title: `${app.candidate_name} reprovado`, description: 'E-mail enviado.' });

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

  const editNote = async (app: any) => {
    const current = app.notes
      ? typeof app.notes === 'string'
        ? app.notes
        : (app.notes as any)?.text || ''
      : '';
    const next = window.prompt(`Notas internas — ${app.candidate_name}`, current);
    if (next === null) return;
    const { error } = await supabase
      .from('applications')
      .update({ notes: { text: next } as any })
      .eq('id', app.id);
    if (error) {
      toast({ title: 'Erro ao salvar nota', variant: 'destructive' });
      return;
    }
    setApplications((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, notes: { text: next } } : a))
    );
    toast({ title: 'Nota salva' });
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
              onClick={() => setActiveStage(stage.id)}
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {activeStageLabel} — {candidatesInActiveStage.length}{' '}
            {candidatesInActiveStage.length === 1 ? 'candidato' : 'candidatos'}
          </h2>
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
                  return (
                    <TableRow key={app.id}>
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
                          <span
                            className={cn(
                              'inline-flex items-center justify-center min-w-[2.75rem] px-2 py-1 rounded-md text-sm font-bold',
                              score >= 70
                                ? 'bg-green-100 text-green-700'
                                : score >= 40
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-600'
                            )}
                          >
                            {Math.round(score)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        Há {daysAgo(app.applied_at)}d
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            onClick={() => moveToInterview(app)}
                            disabled={actionLoading === app.id}
                            title="Mover para Entrevista"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => rejectCandidate(app)}
                            disabled={actionLoading === app.id}
                            title="Reprovar (envia e-mail)"
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
                            className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-500/10"
                            onClick={() => editNote(app)}
                            title="Notas internas"
                          >
                            <StickyNote className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rankedCandidates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
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
              return (
                <button
                  key={app.id}
                  onClick={() => navigate(`/company/candidates/${app.candidate_id}?jobId=${id}`)}
                  className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all group"
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
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
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
              <div className="col-span-full border-2 border-dashed border-border rounded-xl p-12 text-center bg-card/50">
                <p className="text-muted-foreground text-sm">Nenhum candidato nesta etapa</p>
              </div>
            )}
          </div>
        )}
      </div>
    </CompanyLayout>
  );
}
