import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Plus, Loader2, Download, Search, Eye, MoreHorizontal, Pause, Play, Ban, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { usePlanType } from '@/hooks/usePlanType';
import { useJarvisContext } from '@/hooks/useJarvisContext';
import { JarvisFab } from '@/components/jarvis/JarvisFab';
import { JarvisPanel } from '@/components/jarvis/JarvisPanel';
import { JarvisStrip } from '@/components/jarvis/JarvisStrip';
import { JarvisBriefing } from '@/components/jarvis/JarvisBriefing';
import { JarvisCommandBar } from '@/components/jarvis/JarvisCommandBar';

const LOCATION_LABELS: Record<string, string> = {
  remote: 'Remoto',
  onsite: 'Presencial',
  hybrid: 'Híbrido',
};

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'CLT',
  'part-time': 'Meio período',
  contract: 'PJ',
  internship: 'Estágio',
  temporary: 'Temporário',
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
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [metricsOpen, setMetricsOpen] = useState(false);
  const metricsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // === Action dialogs ===
  type ActionType = 'pause' | 'resume' | 'cancel' | 'delete' | 'cancel-request';
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: ActionType | null;
    job: any | null;
    reason: string;
    saving: boolean;
  }>({ open: false, type: null, job: null, reason: '', saving: false });

  const openActionDialog = (type: ActionType, job: any) => {
    setActionDialog({ open: true, type, job, reason: '', saving: false });
  };

  const closeActionDialog = () => {
    setActionDialog({ open: false, type: null, job: null, reason: '', saving: false });
  };

  const notifyCandidates = async (
    fnName: 'notify-candidates-job-cancelled' | 'notify-candidates-job-paused',
    payload: Record<string, unknown>
  ) => {
    try {
      await supabase.functions.invoke(fnName, { body: payload });
    } catch (err) {
      console.warn('[notifyCandidates]', fnName, err);
    }
  };

  const handleConfirmAction = async () => {
    const { type, job, reason } = actionDialog;
    if (!type || !job) return;
    setActionDialog((p) => ({ ...p, saving: true }));
    const candidateCount = job.applications?.length || 0;

    try {
      if (type === 'pause') {
        const { error } = await supabase
          .from('jobs')
          .update({
            is_paused: true,
            paused_at: new Date().toISOString(),
            paused_reason: reason || null,
          })
          .eq('id', job.id);
        if (error) throw error;
        if (candidateCount > 0) {
          await notifyCandidates('notify-candidates-job-paused', {
            jobId: job.id,
            reason,
            resumed: false,
          });
        }
        toast({
          title: 'Vaga pausada',
          description:
            candidateCount > 0
              ? `Os ${candidateCount} candidatos foram notificados.`
              : 'A vaga foi pausada.',
        });
      } else if (type === 'resume') {
        const { error } = await supabase
          .from('jobs')
          .update({ is_paused: false, paused_reason: null })
          .eq('id', job.id);
        if (error) throw error;
        if (candidateCount > 0) {
          await notifyCandidates('notify-candidates-job-paused', {
            jobId: job.id,
            reason,
            resumed: true,
          });
        }
        toast({ title: 'Vaga reaberta' });
      } else if (type === 'cancel') {
        // Starter ou rascunho: cancela direto
        const { error } = await supabase
          .from('jobs')
          .update({
            is_active: false,
            is_archived: true,
            pipeline_stage: 'cancelada',
            cancellation_reason: reason || null,
            cancellation_status: 'approved',
            cancellation_requested_by: user?.id,
            cancellation_requested_at: new Date().toISOString(),
            cancellation_decided_at: new Date().toISOString(),
            cancellation_decided_by: user?.id,
          })
          .eq('id', job.id);
        if (error) throw error;
        if (candidateCount > 0) {
          await notifyCandidates('notify-candidates-job-cancelled', {
            jobId: job.id,
            reason,
          });
        }
        toast({
          title: 'Vaga cancelada',
          description:
            candidateCount > 0
              ? `Os ${candidateCount} candidatos foram notificados.`
              : 'A vaga foi cancelada.',
        });
      } else if (type === 'cancel-request') {
        // Pro com vaga publicada: solicita aprovação do gestor
        const { error } = await supabase
          .from('jobs')
          .update({
            cancellation_status: 'pending',
            cancellation_reason: reason || null,
            cancellation_requested_by: user?.id,
            cancellation_requested_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        if (error) throw error;
        toast({
          title: 'Solicitação de cancelamento enviada',
          description: 'Aguardando aprovação do gestor responsável.',
        });
      } else if (type === 'delete') {
        const { error } = await supabase.from('jobs').delete().eq('id', job.id);
        if (error) throw error;
        toast({ title: 'Vaga excluída' });
      }

      closeActionDialog();
      await loadData();
    } catch (err: any) {
      console.error('[handleConfirmAction]', err);
      toast({
        title: 'Erro ao executar ação',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
      setActionDialog((p) => ({ ...p, saving: false }));
    }
  };


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
      .select('id, title, is_active, is_archived, is_paused, pending_manual_publication, pipeline_stage, created_at, city, location, job_type, applications(id, status, current_stage, applied_at, updated_at)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (jobsData) {
      setJobs(jobsData);
      const allApps = jobsData.flatMap((j: any) => j.applications || []);
      setApplications(allApps);
    }
    setLoading(false);
  };

  // === KPIs ===
  const totalVagas = jobs.length;
  const ativas = jobs.filter((j) => j.is_active && !j.is_archived && !j.is_paused).length;
  const rascunho = jobs.filter((j) => !j.is_active && !j.is_archived).length;
  const pausadas = jobs.filter((j) => j.is_paused && !j.is_archived).length;
  const encerradas = jobs.filter((j) => j.is_archived).length;

  const getJobStatus = (j: any) => {
    if (j.is_archived) return 'encerrada';
    if (j.is_paused) return 'pausada';
    if (j.is_active) return 'ativa';
    return 'rascunho';
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchSearch = j.title.toLowerCase().includes(search.toLowerCase());
      const status = getJobStatus(j);
      const matchStatus = filterStatus === 'all' || status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [jobs, search, filterStatus]);

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

  // Tempo médio
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

  const kpis = [
    { label: 'Total de vagas', value: totalVagas, color: 'text-gray-900' },
    { label: 'Ativas', value: ativas, color: 'text-green-600' },
    { label: 'Rascunho', value: rascunho, color: 'text-gray-500' },
    { label: 'Pausadas', value: pausadas, color: 'text-amber-600' },
    { label: 'Encerradas', value: encerradas, color: 'text-red-500' },
  ];

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

      {/* SEÇÃO 4 — Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gestão de Vagas</h1>
          <p className="text-sm text-gray-500">
            {jobs.length} {jobs.length === 1 ? 'vaga cadastrada' : 'vagas cadastradas'}
          </p>
        </div>
        <Button
          data-tour="metrics-btn"
          variant="outline"
          size="sm"
          onClick={() => setMetricsOpen(true)}
          className="gap-2 border-gray-200 shadow-none hover:bg-gray-50 text-gray-700 font-medium"
        >
          <BarChart3 className="h-4 w-4" />
          Métricas
        </Button>
      </div>

      {/* SEÇÃO 1 — KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-gray-200 rounded-xl p-4"
          >
            <p className="text-xs text-gray-500 font-medium mb-1">{kpi.label}</p>
            <p className={cn('text-2xl font-bold', kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* SEÇÃO 2 — Barra de ações */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar vaga por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativa">Ativas</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="pausada">Pausadas</SelectItem>
            <SelectItem value="encerrada">Encerradas</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          data-tour="new-job-btn"
          size="sm"
          onClick={() => navigate('/company/jobs/new')}
          className="h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nova vaga
        </Button>
      </div>

      {/* SEÇÃO 3 — Tabela */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
              <TableHead className="text-xs font-semibold text-gray-700">Vaga</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">Localização</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">Tipo</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 text-center">Candidatos</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 text-center">Em processo</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">Status</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">Criada em</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-sm text-gray-400">
                  Nenhuma vaga encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => {
                const totalCandidatos = job.applications?.length || 0;
                const emProcesso = job.applications?.filter(
                  (a: any) =>
                    !['reprovado', 'rejected', 'contratado', 'approved'].includes(
                      a.current_stage || a.status
                    )
                ).length || 0;

                const statusInfo = job.is_archived
                  ? { label: 'Encerrada', className: 'bg-red-50 text-red-600' }
                  : job.is_paused
                  ? { label: 'Pausada', className: 'bg-amber-50 text-amber-600' }
                  : job.is_active
                  ? { label: 'Ativa', className: 'bg-green-50 text-green-700' }
                  : { label: 'Rascunho', className: 'bg-gray-100 text-gray-500' };

                const jobType = JOB_TYPE_LABELS[job.job_type] || job.job_type || '—';
                const created = daysAgo(job.created_at);

                return (
                  <TableRow
                    key={job.id}
                    onClick={() => navigate(`/company/jobs/${job.id}`)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <TableCell>
                      <p className="text-sm font-semibold text-gray-900">{job.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Criada {created === 0 ? 'hoje' : `há ${created} dia(s)`}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {job.city
                        ? `${job.city}${job.location ? ` · ${LOCATION_LABELS[job.location] || job.location}` : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{jobType}</TableCell>
                    <TableCell className="text-sm text-gray-700 text-center font-medium">
                      {totalCandidatos}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          emProcesso > 0 ? 'text-blue-600' : 'text-gray-400'
                        )}
                      >
                        {emProcesso}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          statusInfo.className
                        )}
                      >
                        {statusInfo.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {format(new Date(job.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-primary hover:text-primary"
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          title="Ver dados e descrição da vaga"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Ver vaga
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-primary hover:text-primary"
                          onClick={() => navigate(`/company/jobs/${job.id}`)}
                        >
                          Ver Processo
                        </Button>
                        {(() => {
                          const isDraft = !job.is_active && !job.is_archived;
                          const isPublished = job.is_active && !job.is_archived;
                          const isPaused = job.is_paused && !job.is_archived;
                          const isCancelled = job.is_archived;
                          const cancelPending = job.cancellation_status === 'pending';
                          const candidateCount = job.applications?.length || 0;
                          const canDelete = isDraft && candidateCount === 0;
                          const canPause = !isCancelled && !isPaused && isPublished;
                          const canResume = isPaused;
                          // Cancelar:
                          // - Starter: qualquer estado publicado/pausado/rascunho com candidatos
                          // - Pro publicada: requer aprovação (cancel-request)
                          // - Pro rascunho: cancela direto (sem candidatos)
                          const canCancel = !isCancelled && !cancelPending && (isPublished || isPaused || (isDraft && candidateCount > 0));

                          return (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Mais ações"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                {canPause && (
                                  <DropdownMenuItem onClick={() => openActionDialog('pause', job)}>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Pausar (congelar) vaga
                                  </DropdownMenuItem>
                                )}
                                {canResume && (
                                  <DropdownMenuItem onClick={() => openActionDialog('resume', job)}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Reabrir vaga
                                  </DropdownMenuItem>
                                )}
                                {canCancel && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openActionDialog(
                                        isPro && isPublished ? 'cancel-request' : 'cancel',
                                        job,
                                      )
                                    }
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    {isPro && isPublished ? 'Solicitar cancelamento' : 'Cancelar vaga'}
                                  </DropdownMenuItem>
                                )}
                                {cancelPending && (
                                  <DropdownMenuItem disabled>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Cancelamento pendente
                                  </DropdownMenuItem>
                                )}
                                {(canPause || canResume || canCancel) && canDelete && <DropdownMenuSeparator />}
                                {canDelete && (
                                  <DropdownMenuItem
                                    onClick={() => openActionDialog('delete', job)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir vaga (rascunho)
                                  </DropdownMenuItem>
                                )}
                                {!canPause && !canResume && !canCancel && !canDelete && !cancelPending && (
                                  <DropdownMenuItem disabled>Nenhuma ação disponível</DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          );
                        })()}
                      </div>
                    </TableCell>

                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

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

      {/* Dialog de confirmação de ações na vaga */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => !open && !actionDialog.saving && closeActionDialog()}
      >
        <DialogContent>
          {(() => {
            const t = actionDialog.type;
            const job = actionDialog.job;
            const candidateCount = job?.applications?.length || 0;
            const titles: Record<string, string> = {
              pause: 'Pausar (congelar) vaga',
              resume: 'Reabrir vaga',
              cancel: 'Cancelar vaga',
              'cancel-request': 'Solicitar cancelamento da vaga',
              delete: 'Excluir vaga',
            };
            const descriptions: Record<string, string> = {
              pause:
                candidateCount > 0
                  ? `A vaga será congelada e os ${candidateCount} candidatos serão notificados por e-mail.`
                  : 'A vaga será congelada. Você pode reabri-la a qualquer momento.',
              resume:
                candidateCount > 0
                  ? `A vaga voltará a ficar ativa e os ${candidateCount} candidatos serão notificados.`
                  : 'A vaga voltará a ficar ativa.',
              cancel:
                candidateCount > 0
                  ? `A vaga será cancelada e os ${candidateCount} candidatos serão notificados por e-mail.`
                  : 'A vaga será cancelada e arquivada.',
              'cancel-request':
                'Como sua vaga já foi publicada, o cancelamento precisa ser aprovado pelo gestor responsável. Os candidatos serão notificados após a aprovação.',
              delete:
                'Esta vaga em rascunho será removida permanentemente. Esta ação não pode ser desfeita.',
            };
            const showReason = t === 'pause' || t === 'cancel' || t === 'cancel-request' || t === 'resume';
            const reasonLabel =
              t === 'cancel' || t === 'cancel-request'
                ? 'Motivo do cancelamento'
                : t === 'pause'
                ? 'Motivo da pausa (opcional)'
                : 'Mensagem aos candidatos (opcional)';

            return (
              <>
                <DialogHeader>
                  <DialogTitle>{t ? titles[t] : ''}</DialogTitle>
                  <DialogDescription>
                    {t ? descriptions[t] : ''}
                    {job?.title && (
                      <span className="block mt-2 font-medium text-foreground">"{job.title}"</span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                {showReason && (
                  <div className="space-y-2">
                    <Label htmlFor="action-reason">{reasonLabel}</Label>
                    <Textarea
                      id="action-reason"
                      value={actionDialog.reason}
                      onChange={(e) =>
                        setActionDialog((p) => ({ ...p, reason: e.target.value }))
                      }
                      rows={3}
                      placeholder="Descreva brevemente..."
                      disabled={actionDialog.saving}
                    />
                  </div>
                )}

                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={closeActionDialog}
                    disabled={actionDialog.saving}
                  >
                    Voltar
                  </Button>
                  <Button
                    variant={t === 'delete' || t === 'cancel' || t === 'cancel-request' ? 'destructive' : 'default'}
                    onClick={handleConfirmAction}
                    disabled={
                      actionDialog.saving ||
                      ((t === 'cancel' || t === 'cancel-request') && !actionDialog.reason.trim())
                    }
                  >
                    {actionDialog.saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirmar
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </CompanyLayout>
  );
}
