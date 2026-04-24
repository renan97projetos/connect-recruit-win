import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Plus, Loader2, Users, MapPin, Clock, Download, Crown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobStagePanel } from '@/components/company/JobStagePanel';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { usePlanType } from '@/hooks/usePlanType';
import { useUpgradeModal } from '@/contexts/UpgradeModalContext';
import { useJarvisContext } from '@/hooks/useJarvisContext';
import { JarvisFab } from '@/components/jarvis/JarvisFab';
import { JarvisPanel } from '@/components/jarvis/JarvisPanel';
import { JarvisStrip } from '@/components/jarvis/JarvisStrip';
import { JarvisBriefing } from '@/components/jarvis/JarvisBriefing';
import { JarvisCommandBar } from '@/components/jarvis/JarvisCommandBar';

type PipelineStageId =
  | 'aberta'
  | 'aguardando'
  | 'triagem'
  | 'entrevista'
  | 'avaliacao'
  | 'proposta'
  | 'admissao'
  | 'reprovado';

const PIPELINE_STAGES: { id: PipelineStageId; label: string; color: string }[] = [
  { id: 'aberta', label: 'Rascunho', color: 'text-violet-600' },
  { id: 'aguardando', label: 'Aguardando 1º candidato', color: 'text-purple-600' },
  { id: 'triagem', label: 'Triagem', color: 'text-gray-600' },
  { id: 'entrevista', label: 'Entrevista', color: 'text-blue-600' },
  { id: 'avaliacao', label: 'Avaliação', color: 'text-amber-600' },
  { id: 'proposta', label: 'Proposta', color: 'text-orange-600' },
  { id: 'admissao', label: 'Admissão', color: 'text-teal-600' },
  { id: 'reprovado', label: 'Reprovado', color: 'text-red-500' },
];

const LOCATION_LABELS: Record<string, string> = {
  remote: 'Remoto',
  onsite: 'Presencial',
  hybrid: 'Híbrido',
};

const daysAgo = (date: string) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

export default function CompanyDashboard() {
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();
  const { companyId, loading: roleLoading } = useCompanyRole();
  const { isPro } = usePlanType();
  const { openUpgradeModal } = useUpgradeModal();
  const { context: jarvisContext } = useJarvisContext();
  const [jarvisOpen, setJarvisOpen] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [pendingExchange, setPendingExchange] = useState<{ question: string; answer: string } | null>(null);

  // Mostrar briefing 1x por dia
  useEffect(() => {
    if (!isPro || !user?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `jarvis_briefing_${user.id}_${today}`;
    if (!localStorage.getItem(key)) setShowBriefing(true);
  }, [isPro, user?.id]);

  // Atalho Cmd/Ctrl + K
  useEffect(() => {
    if (!isPro) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandBarOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPro]);

  const closeBriefing = () => {
    if (user?.id) {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`jarvis_briefing_${user.id}_${today}`, '1');
    }
    setShowBriefing(false);
  };

  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<PipelineStageId>('aberta');

  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const metricsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleExportPDF = async () => {
    if (!metricsRef.current) return;
    try {
      const canvas = await html2canvas(metricsRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 1.5, canvas.height / 1.5],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 1.5, canvas.height / 1.5);
      pdf.save(
        `relatorio-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`
      );
    } catch (err) {
      toast({ title: 'Erro ao exportar PDF', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!user || !companyId || roleLoading) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, companyId, roleLoading]);

  const loadData = async () => {
    setLoading(true);
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*, applications(id, status, current_stage, applied_at, updated_at)')
      .eq('company_id', companyId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (jobsData) {
      setJobs(jobsData);
      const allApps = jobsData.flatMap((j: any) => j.applications || []);
      setApplications(allApps);
    }
    setLoading(false);
  };

  const getCountForStage = (stageId: PipelineStageId) => {
    if (stageId === 'aguardando') {
      return jobs.filter(
        (j) =>
          j.is_active &&
          (j.pipeline_stage || 'aberta') === 'aberta' &&
          (!j.applications || j.applications.length === 0)
      ).length;
    }
    if (stageId === 'aberta') {
      // 'Vagas' = vagas ativas publicadas em 'aberta' que JÁ receberam candidatos,
      // ou pausadas. Exclui drafts (is_active=false), arquivadas e aguardando 1º candidato.
      return jobs.filter((j) => {
        const stage = j.pipeline_stage || 'aberta';
        if (stage !== 'aberta') return false;
        if (j.is_archived) return false;
        const hasApps = j.applications && j.applications.length > 0;
        // pausadas contam aqui mesmo sem candidatos
        if (j.is_paused) return true;
        // ativas só contam se já tiverem candidatos (senão vão para "Aguardando 1º candidato")
        return j.is_active && hasApps;
      }).length;
    }
    return jobs.filter((j) => {
      if (j.is_archived) return false;
      return (j.pipeline_stage || 'aberta') === stageId;
    }).length;
  };

  const visibleStages = useMemo(
    () => PIPELINE_STAGES.filter((s) => s.id !== 'aguardando' || getCountForStage('aguardando') > 0),
    [jobs]
  );

  const jobsInActiveStage = useMemo(() => {
    if (activeStage === 'aguardando') {
      return jobs.filter(
        (j) =>
          j.is_active &&
          (j.pipeline_stage || 'aberta') === 'aberta' &&
          (!j.applications || j.applications.length === 0)
      );
    }
    if (activeStage === 'aberta') {
      return jobs.filter((j) => {
        const stage = j.pipeline_stage || 'aberta';
        if (stage !== 'aberta') return false;
        if (j.is_archived) return false;
        const hasApps = j.applications && j.applications.length > 0;
        if (j.is_paused) return true;
        return j.is_active && hasApps;
      });
    }
    return jobs.filter((j) => {
      if (j.is_archived) return false;
      return (j.pipeline_stage || 'aberta') === activeStage;
    });
  }, [jobs, activeStage]);

  const activeStageLabel = PIPELINE_STAGES.find((s) => s.id === activeStage)?.label || '';

  const openJobPanel = (job: any) => {
    setSelectedJob(job);
    setPanelOpen(true);
  };

  // === Dados de métricas (mantidos para o Sheet) ===
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 29 - i));
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      date: format(date, 'dd/MM', { locale: ptBR }),
      candidaturas: applications.filter(
        (a) => a.applied_at && format(new Date(a.applied_at), 'yyyy-MM-dd') === dateStr
      ).length,
    };
  });

  const topJobs = jobs
    .map((j) => ({
      title: j.title.length > 28 ? j.title.substring(0, 28) + '…' : j.title,
      candidaturas: j.applications?.length || 0,
    }))
    .sort((a, b) => b.candidaturas - a.candidaturas)
    .slice(0, 5);

  const stagesData = PIPELINE_STAGES.map((s) => ({
    name: s.label,
    value: getCountForStage(s.id),
  })).filter((i) => i.value > 0);

  const statusData = [
    { name: 'Pendente', value: applications.filter((a) => a.status === 'pending').length, color: 'hsl(var(--warning))' },
    { name: 'Em Análise', value: applications.filter((a) => a.status === 'in-review').length, color: 'hsl(var(--primary))' },
    { name: 'Aprovado', value: applications.filter((a) => a.status === 'approved').length, color: 'hsl(var(--success))' },
    { name: 'Rejeitado', value: applications.filter((a) => a.status === 'rejected').length, color: 'hsl(var(--destructive))' },
  ].filter((i) => i.value > 0);

  // === Funil de etapas ===
  const stageLabels: Record<string, string> = {
    screening: 'Triagem',
    interview: 'Entrevista RH',
    technical: 'Teste Técnico',
    approved: 'Aprovado',
    rejected: 'Reprovado',
  };
  const funnelData = Object.entries(stageLabels).map(([id, label]) => ({
    stage: id,
    label,
    count: applications.filter((a) => a.current_stage === id || a.status === id).length,
  }));

  // Tempo médio (dias) entre applied_at e updated_at por current_stage
  const avgDaysMap = useMemo(() => {
    const groups: Record<string, number[]> = {};
    applications.forEach((app) => {
      if (app.current_stage && app.applied_at && app.updated_at) {
        const days = Math.max(
          0,
          Math.round(
            (new Date(app.updated_at).getTime() - new Date(app.applied_at).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        if (!groups[app.current_stage]) groups[app.current_stage] = [];
        groups[app.current_stage].push(days);
      }
    });
    const out: Record<string, number> = {};
    Object.entries(groups).forEach(([stage, vals]) => {
      out[stage] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    });
    return out;
  }, [applications]);

  if (loading || roleLoading) {
    return (
      <CompanyLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      {isPro && (
        <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-4">
          <JarvisStrip
            context={jarvisContext}
            onOpenPanel={() => setJarvisOpen(true)}
          />
        </div>
      )}
      {/* Header da página */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gestão de Vagas</h1>
          <p className="text-sm text-gray-500">Pipeline de recrutamento</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-tour="metrics-btn"
            variant="outline"
            size="sm"
            onClick={() => setMetricsOpen(true)}
            className="gap-2 border-gray-200 shadow-none hover:bg-gray-50 text-gray-700 font-medium"
          >
            <BarChart3 className="h-4 w-4" />
            Ver Métricas
          </Button>
          <Button
            data-tour="new-job-btn"
            size="sm"
            onClick={() => navigate('/company/jobs/new')}
            className="gap-2 bg-primary text-primary-foreground shadow-none border-transparent hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nova Vaga
          </Button>
        </div>
      </div>

      {/* Pipeline — contadores clicáveis */}
      <div data-tour="pipeline-stages" className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {visibleStages.map((stage) => {
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
            {activeStageLabel} — {jobsInActiveStage.length} {jobsInActiveStage.length === 1 ? 'vaga' : 'vagas'}
          </h2>
        </div>

        {activeStage === 'aberta' ? (
          (() => {
            const isPaused = (j: any) => !!j.is_paused;
            const isPendingApproval = (j: any) =>
              j.requires_approval && j.approval_status === 'pending_approval';
            const isDraft = (j: any) =>
              !j.is_active &&
              !isPaused(j) &&
              !isPendingApproval(j);

            const pausadas = jobsInActiveStage.filter(isPaused);
            const aguardando = jobsInActiveStage.filter(isPendingApproval);
            const rascunhos = jobsInActiveStage.filter(isDraft);

            const renderJobCard = (job: typeof jobsInActiveStage[number]) => {
              const approvalLabel: Record<string, { text: string; cls: string }> = {
                pending_approval: { text: 'Aguardando aprovação', cls: 'bg-amber-50 text-amber-700' },
                rejected: { text: 'Reprovada', cls: 'bg-red-50 text-red-700' },
                approved: { text: 'Aprovada', cls: 'bg-green-50 text-green-700' },
                draft: { text: 'Rascunho', cls: 'bg-gray-100 text-gray-600' },
              };
              const badge = job.is_paused
                ? { text: 'Pausada', cls: 'bg-yellow-50 text-yellow-700' }
                : isPro && job.requires_approval && approvalLabel[job.approval_status]
                  ? approvalLabel[job.approval_status]
                  : job.is_active
                    ? { text: 'Ativa', cls: 'bg-green-50 text-green-700' }
                    : { text: 'Rascunho', cls: 'bg-gray-100 text-gray-500' };

              return (
                <button
                  key={job.id}
                  onClick={() => openJobPanel(job)}
                  className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-primary line-clamp-2">
                      {job.title}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', badge.cls)}>
                      {badge.text}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Users className="h-3 w-3" />
                      {job.applications?.length || 0} candidatos
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {job.city || 'Sem localização'}
                      {job.location && ` · ${LOCATION_LABELS[job.location] || job.location}`}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      Há {daysAgo(job.created_at)} dia(s)
                    </div>
                  </div>
                </button>
              );
            };

            const renderGroup = (title: string, dotColor: string, items: any[]) => (
              <section key={title}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                  <span className={cn('h-2 w-2 rounded-full', dotColor)} />
                  <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
                  <span className="text-xs text-gray-500">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map(renderJobCard)}
                </div>
              </section>
            );

            const renderApprovalUpgradeCard = () => (
              <section key="approval-upgrade">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Aguardando aprovação</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    <Lock className="h-3 w-3" /> Pro
                  </span>
                </div>
                <div className="rounded-xl border-2 border-dashed border-amber-200 bg-gradient-to-br from-amber-50/60 to-transparent p-6 text-center">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 mb-3">
                    <Crown className="h-5 w-5 text-amber-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    Fluxo de aprovação de vagas
                  </h4>
                  <p className="text-xs text-gray-600 mb-4 max-w-md mx-auto">
                    Exija a aprovação de um gestor antes de publicar uma vaga, defina prazos e
                    acompanhe o status em tempo real. Disponível no plano Pro.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => openUpgradeModal({ featureName: 'Aprovação de vagas' })}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Crown className="h-3.5 w-3.5 mr-1.5" />
                    Fazer upgrade para Pro
                  </Button>
                </div>
              </section>
            );

            const hasAny =
              pausadas.length + (isPro ? aguardando.length : 0) + rascunhos.length > 0;

            return (
              <div className="space-y-8">
                {isPro
                  ? aguardando.length > 0 && renderGroup('Aguardando aprovação', 'bg-amber-500', aguardando)
                  : renderApprovalUpgradeCard()}
                {rascunhos.length > 0 && renderGroup('Rascunho', 'bg-gray-400', rascunhos)}
                {pausadas.length > 0 && renderGroup('Pausadas', 'bg-yellow-500', pausadas)}

                {!hasAny && isPro && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center bg-white/50">
                    <p className="text-gray-400 text-sm mb-1">Nenhuma vaga em rascunho, aguardando ou pausada</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/company/jobs/new')}
                      className="mt-3 border-gray-200 shadow-none hover:bg-gray-50 text-gray-700 font-medium"
                    >
                      Criar nova vaga
                    </Button>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {jobsInActiveStage.map((job) => (
              <button
                key={job.id}
                onClick={() => openJobPanel(job)}
                className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-primary line-clamp-2">
                    {job.title}
                  </span>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                      job.is_active
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {job.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="h-3 w-3" />
                    {job.applications?.length || 0} candidatos
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {job.city || 'Sem localização'}
                    {job.location && ` · ${LOCATION_LABELS[job.location] || job.location}`}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    Há {daysAgo(job.created_at)} dia(s)
                  </div>
                </div>
              </button>
            ))}

            {jobsInActiveStage.length === 0 && (
              <div className="col-span-full border-2 border-dashed border-gray-200 rounded-xl p-12 text-center bg-white/50">
                <p className="text-gray-400 text-sm mb-1">Nenhuma vaga nesta etapa</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sheet do painel da vaga */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] p-0 overflow-y-auto bg-white">
          {selectedJob && (
            <JobStagePanel
              job={selectedJob}
              onClose={() => setPanelOpen(false)}
              onJobUpdated={loadData}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet de métricas */}
      <Sheet open={metricsOpen} onOpenChange={setMetricsOpen}>
        <SheetContent side="right" className="w-[520px] sm:max-w-[520px] overflow-y-auto bg-white">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold text-gray-900">Métricas</SheetTitle>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-7 text-xs">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Exportar PDF
              </Button>
            </div>
          </SheetHeader>
          <div ref={metricsRef} className="mt-6">
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="funnel">Funil</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                    Candidaturas (últimos 30 dias)
                  </p>
                  <ChartContainer
                    config={{ candidaturas: { label: 'Candidaturas', color: 'hsl(var(--primary))' } }}
                    className="h-[220px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={last30Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="candidaturas"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>

                {topJobs.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                      Top vagas
                    </p>
                    <ChartContainer
                      config={{ candidaturas: { label: 'Candidaturas', color: 'hsl(var(--primary))' } }}
                      className="h-[220px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topJobs} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <YAxis dataKey="title" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={130} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="candidaturas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                )}

                {stagesData.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                      Vagas por etapa
                    </p>
                    <ChartContainer config={{ value: { label: 'Vagas' } }} className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stagesData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                )}

                {statusData.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                      Status das candidaturas
                    </p>
                    <ChartContainer config={{ value: { label: 'Candidatos' } }} className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={70}
                            dataKey="value"
                          >
                            {statusData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="funnel" className="mt-4">
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Distribuição de candidatos por etapa
                  </p>
                  {funnelData.filter((s) => s.count > 0).length > 0 ? (
                    (() => {
                      const visible = funnelData.filter((s) => s.count > 0);
                      const maxCount = Math.max(...visible.map((s) => s.count));
                      return visible.map((stage, i, arr) => {
                        const pct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                        return (
                          <div key={stage.stage}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                              <span className="text-xs text-gray-500">{stage.count} candidatos</span>
                            </div>
                            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {i < arr.length - 1 && (
                              <div className="text-xs text-gray-400 mt-1.5 ml-1">
                                {arr[i + 1].count > 0 && stage.count > 0
                                  ? `${Math.round((arr[i + 1].count / stage.count) * 100)}% avançam para ${arr[i + 1].label}`
                                  : ''}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div className="text-center py-12 text-sm text-gray-400">
                      Nenhum candidato para exibir no funil
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">
                      Tempo médio por etapa
                    </p>
                    <div className="space-y-2">
                      {Object.entries({
                        screening: 'Triagem',
                        interview: 'Entrevista RH',
                        technical: 'Teste Técnico',
                        approved: 'Aprovado',
                      }).map(([stage, label]) => {
                        const avg = avgDaysMap[stage] ?? null;
                        return (
                          <div
                            key={stage}
                            className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0"
                          >
                            <span className="text-gray-600">{label}</span>
                            <span
                              className={
                                avg === null
                                  ? 'text-gray-300'
                                  : avg > 7
                                  ? 'text-red-500 font-medium'
                                  : avg > 3
                                  ? 'text-amber-500 font-medium'
                                  : 'text-green-600 font-medium'
                              }
                            >
                              {avg === null ? '—' : `${avg} dias`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      Vermelho {'>'} 7 dias · Amarelo {'>'} 3 dias · Verde ≤ 3 dias
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {isPro && (
        <>
          <JarvisFab onClick={() => setJarvisOpen(true)} />
          <JarvisPanel
            open={jarvisOpen}
            onClose={() => setJarvisOpen(false)}
            context={jarvisContext}
            injectedExchange={pendingExchange}
            onExchangeConsumed={() => setPendingExchange(null)}
          />
          <JarvisCommandBar
            open={commandBarOpen}
            onClose={() => setCommandBarOpen(false)}
            context={jarvisContext}
            onAnswer={(question, answer) => {
              setPendingExchange({ question, answer });
              setJarvisOpen(true);
            }}
          />
          {showBriefing && (
            <JarvisBriefing
              context={jarvisContext}
              userName={(user?.user_metadata as any)?.name?.split(' ')[0] || 'gestor'}
              onClose={closeBriefing}
            />
          )}
        </>
      )}
    </CompanyLayout>
  );
}
