import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Edit, MapPin, Briefcase, DollarSign, Calendar, Clock,
  PauseCircle, PlayCircle, Send, CheckCircle2, XCircle, AlertTriangle,
  Trash2, Ban,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { usePlanType } from '@/hooks/usePlanType';

interface JobStagePanelProps {
  job: any;
  onClose: () => void;
  onJobUpdated?: () => void;
}

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  aberta: { label: 'Vagas', color: 'bg-violet-50 text-violet-700' },
  triagem: { label: 'Triagem', color: 'bg-gray-100 text-gray-700' },
  entrevista: { label: 'Entrevista', color: 'bg-blue-50 text-blue-700' },
  avaliacao: { label: 'Avaliação', color: 'bg-amber-50 text-amber-700' },
  proposta: { label: 'Proposta', color: 'bg-orange-50 text-orange-700' },
  admissao: { label: 'Admissão', color: 'bg-teal-50 text-teal-700' },
  reprovado: { label: 'Reprovado', color: 'bg-red-50 text-red-700' },
  cancelada: { label: 'Cancelada', color: 'bg-rose-50 text-rose-700' },
};

const APPROVAL_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  pending_approval: { label: 'Aguardando Aprovação', color: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Aprovada', color: 'bg-green-50 text-green-700' },
  rejected: { label: 'Reprovada', color: 'bg-red-50 text-red-700' },
};

const LOCATION_LABELS: Record<string, string> = {
  remote: 'Remoto', onsite: 'Presencial', hybrid: 'Híbrido',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

const daysAgo = (date: string) =>
  Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

export function JobStagePanel({ job, onClose, onJobUpdated }: JobStagePanelProps) {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const { isPro } = usePlanType();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelRequestOpen, setCancelRequestOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelRejectOpen, setCancelRejectOpen] = useState(false);
  const [cancelRejectReason, setCancelRejectReason] = useState('');

  useEffect(() => {
    const loadCandidates = async () => {
      if (!job?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('applications')
        .select('id, candidate_name, candidate_email, status, score, applied_at')
        .eq('job_id', job.id)
        .order('applied_at', { ascending: false })
        .limit(5);
      setCandidates(data || []);
      setLoading(false);
    };
    loadCandidates();
  }, [job?.id]);

  const stage = STAGE_LABELS[job.pipeline_stage || 'aberta'] || STAGE_LABELS.aberta;
  const approvalStatus: string = job.approval_status || 'not_required';
  const requiresApproval: boolean = !!job.requires_approval;
  const isPaused: boolean = !!job.is_paused;
  const isApprover: boolean = job.approver_id && user?.id === job.approver_id;
  const cancellationStatus: string = job.cancellation_status || 'none';
  const isCancelled: boolean = (job.pipeline_stage || 'aberta') === 'cancelada';

  // Vaga é "rascunho" (pode excluir direto, sem precisar de autorização) APENAS se:
  // - approval_status === 'draft' (nunca foi enviada para aprovação nem publicada)
  // - OU não exige aprovação E ainda não foi ativada/publicada
  // Vagas em 'pending_approval', 'approved', 'rejected' ou já publicadas
  // exigem solicitação de cancelamento ao gestor.
  const isDraft: boolean =
    approvalStatus === 'draft' ||
    (!requiresApproval && approvalStatus === 'not_required' && !job.is_active);

  const refresh = () => onJobUpdated?.();

  const handlePause = async () => {
    setBusy(true);
    const { error } = await supabase
      .from('jobs')
      .update({
        is_paused: true,
        paused_at: new Date().toISOString(),
        paused_reason: pauseReason || null,
        is_active: false,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', job.id);
    setBusy(false);
    setPauseOpen(false);
    setPauseReason('');
    if (error) return toast({ title: 'Erro ao pausar', description: error.message, variant: 'destructive' });
    toast({ title: 'Vaga pausada', description: 'A vaga não receberá novas candidaturas.' });
    refresh();
    onClose();
  };

  const handleResume = async () => {
    setBusy(true);
    // Só pode reativar se não exigir aprovação OU já estiver aprovada
    const canActivate = !requiresApproval || approvalStatus === 'approved';
    const { error } = await supabase
      .from('jobs')
      .update({
        is_paused: false,
        paused_at: null,
        paused_reason: null,
        is_active: canActivate,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', job.id);
    setBusy(false);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({
      title: 'Vaga retomada',
      description: canActivate ? 'A vaga voltou a receber candidaturas.' : 'A vaga voltou ao rascunho.',
    });
    refresh();
    onClose();
  };

  const handleSubmitForApproval = async () => {
    setBusy(true);
    // calcular deadline
    const { data: tenant } = await supabase
      .from('tenants')
      .select('default_approver_id, default_approval_deadline_days')
      .eq('company_id', job.company_id)
      .maybeSingle();
    const approverId = job.approver_id || (tenant as any)?.default_approver_id;
    const days = job.approval_deadline_days || (tenant as any)?.default_approval_deadline_days || 3;
    if (!approverId) {
      setBusy(false);
      toast({
        title: 'Configure um aprovador',
        description: 'Defina o aprovador padrão em Perfil da Empresa.',
        variant: 'destructive',
      });
      return;
    }
    const deadlineAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('jobs')
      .update({
        approval_status: 'pending_approval',
        approver_id: approverId,
        approval_deadline_days: days,
        approval_deadline_at: deadlineAt,
        approval_submitted_at: new Date().toISOString(),
        approval_rejection_reason: null,
        is_active: false,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', job.id);

    if (error) {
      setBusy(false);
      return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }

    // disparar e-mail (não bloqueante)
    supabase.functions.invoke('send-job-approval-email', {
      body: { jobId: job.id, type: 'request' },
    }).catch(() => {});

    setBusy(false);
    toast({ title: 'Enviada para aprovação', description: 'O aprovador receberá um e-mail.' });
    refresh();
    onClose();
  };

  const handleApprove = async () => {
    setBusy(true);
    const { error } = await supabase
      .from('jobs')
      .update({
        approval_status: 'approved',
        approval_decided_at: new Date().toISOString(),
        approval_rejection_reason: null,
        // Aprovação não ativa direto: vaga aguarda divulgação manual pelo time interno
        is_active: false,
        pending_manual_publication: true,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', job.id);
    setBusy(false);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    supabase.functions.invoke('send-job-approval-email', {
      body: { jobId: job.id, type: 'approved' },
    }).catch(() => {});
    // Cria solicitação de publicação manual + notifica o time
    supabase.functions.invoke('notify-saas-job-published', {
      body: { jobId: job.id },
    }).catch(() => {});
    toast({ title: 'Vaga aprovada', description: 'Aguardando divulgação manual pelo time SinapseRH.' });
    refresh();
    onClose();
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({ title: 'Justificativa obrigatória', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('jobs')
      .update({
        approval_status: 'rejected',
        approval_decided_at: new Date().toISOString(),
        approval_rejection_reason: rejectReason.trim(),
        is_active: false,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', job.id);
    setBusy(false);
    setRejectOpen(false);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    supabase.functions.invoke('send-job-approval-email', {
      body: { jobId: job.id, type: 'rejected', reason: rejectReason.trim() },
    }).catch(() => {});
    setRejectReason('');
    toast({ title: 'Vaga reprovada', description: 'O recrutador foi notificado.' });
    refresh();
    onClose();
  };

  // Excluir vaga (apenas rascunho)
  const handleDelete = async () => {
    setBusy(true);
    const { error } = await supabase.from('jobs').delete().eq('id', job.id);
    setBusy(false);
    setDeleteOpen(false);
    if (error) return toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    toast({ title: 'Vaga excluída', description: 'O rascunho foi removido.' });
    refresh();
    onClose();
  };

  // Cancelar vaga
  // - Starter (sem fluxo de aprovação): cancela imediatamente, sem precisar de gestor.
  // - Pro: envia solicitação para o gestor aprovar.
  const handleRequestCancellation = async () => {
    if (!cancelReason.trim()) {
      toast({ title: 'Justificativa obrigatória', variant: 'destructive' });
      return;
    }

    // Plano Starter: o próprio usuário é o gestor — cancelamento direto
    if (!isPro) {
      setBusy(true);
      const { error } = await supabase
        .from('jobs')
        .update({
          cancellation_status: 'approved',
          cancellation_reason: cancelReason.trim(),
          cancellation_requested_at: new Date().toISOString(),
          cancellation_requested_by: user?.id,
          cancellation_decided_at: new Date().toISOString(),
          cancellation_decided_by: user?.id,
          pipeline_stage: 'cancelada',
          is_active: false,
          is_archived: true,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', job.id);
      setBusy(false);
      setCancelRequestOpen(false);
      setCancelReason('');
      if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      // Notifica candidatos por e-mail (assíncrono, não bloqueia)
      supabase.functions.invoke('notify-candidates-job-cancelled', {
        body: { jobId: job.id, reason: cancelReason.trim() },
      }).catch(() => {});
      toast({ title: 'Vaga cancelada', description: 'Os candidatos foram notificados e a vaga foi movida para o Histórico.' });
      refresh();
      onClose();
      return;
    }

    // Plano Pro: fluxo de aprovação pelo gestor responsável
    let approverId = job.approver_id;
    if (!approverId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('default_approver_id')
        .eq('company_id', job.company_id)
        .maybeSingle();
      approverId = (tenant as any)?.default_approver_id;
    }
    if (!approverId) {
      toast({
        title: 'Configure um gestor',
        description: 'Defina o aprovador padrão em Perfil da Empresa.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('jobs')
      .update({
        cancellation_status: 'pending',
        cancellation_reason: cancelReason.trim(),
        cancellation_requested_at: new Date().toISOString(),
        cancellation_requested_by: user?.id,
        approver_id: approverId,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', job.id);
    setBusy(false);
    setCancelRequestOpen(false);
    setCancelReason('');
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({
      title: 'Solicitação enviada',
      description: 'O gestor foi notificado para aprovar o cancelamento.',
    });
    refresh();
    onClose();
  };

  // Aprovar cancelamento (gestor)
  const handleApproveCancellation = async () => {
    setBusy(true);
    const { error } = await supabase
      .from('jobs')
      .update({
        cancellation_status: 'approved',
        cancellation_decided_at: new Date().toISOString(),
        cancellation_decided_by: user?.id,
        cancellation_rejection_reason: null,
        pipeline_stage: 'cancelada',
        is_active: false,
        is_archived: true,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', job.id);
    setBusy(false);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    // Notifica candidatos por e-mail
    supabase.functions.invoke('notify-candidates-job-cancelled', {
      body: { jobId: job.id, reason: job.cancellation_reason || undefined },
    }).catch(() => {});
    toast({ title: 'Cancelamento aprovado', description: 'Os candidatos foram notificados e a vaga foi movida para o Histórico.' });
    refresh();
    onClose();
  };

  // Recusar cancelamento (gestor)
  const handleRejectCancellation = async () => {
    if (!cancelRejectReason.trim()) {
      toast({ title: 'Justificativa obrigatória', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('jobs')
      .update({
        cancellation_status: 'rejected',
        cancellation_decided_at: new Date().toISOString(),
        cancellation_decided_by: user?.id,
        cancellation_rejection_reason: cancelRejectReason.trim(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', job.id);
    setBusy(false);
    setCancelRejectOpen(false);
    setCancelRejectReason('');
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: 'Cancelamento recusado', description: 'O recrutador foi notificado.' });
    refresh();
    onClose();
  };

  const isOverdue =
    approvalStatus === 'pending_approval' &&
    job.approval_deadline_at &&
    new Date(job.approval_deadline_at).getTime() < Date.now();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-200">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900 truncate">{job.title}</h2>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={cn('inline-block text-[11px] font-medium px-2 py-0.5 rounded-full', stage.color)}>
              {stage.label}
            </span>
            {requiresApproval && APPROVAL_BADGE[approvalStatus] && (
              <span
                className={cn(
                  'inline-block text-[11px] font-medium px-2 py-0.5 rounded-full',
                  APPROVAL_BADGE[approvalStatus].color
                )}
              >
                {APPROVAL_BADGE[approvalStatus].label}
              </span>
            )}
            {isPaused && (
              <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                Pausada
              </span>
            )}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                <AlertTriangle className="h-3 w-3" /> Prazo vencido
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Aprovação - mensagem de reprovação (somente Pro) */}
        {isPro && approvalStatus === 'rejected' && job.approval_rejection_reason && (
          <section className="px-6 py-4 bg-red-50/40 border-b border-red-100">
            <p className="text-[11px] uppercase tracking-wide text-red-700 font-semibold mb-1">
              Motivo da recusa
            </p>
            <p className="text-[13px] text-red-900">{job.approval_rejection_reason}</p>
          </section>
        )}

        {/* Cancelamento - solicitação pendente */}
        {cancellationStatus === 'pending' && !isCancelled && (
          <section className="px-6 py-4 bg-amber-50/60 border-b border-amber-100">
            <p className="text-[11px] uppercase tracking-wide text-amber-700 font-semibold mb-1">
              Cancelamento solicitado
            </p>
            {job.cancellation_reason && (
              <p className="text-[13px] text-amber-900 mb-1">{job.cancellation_reason}</p>
            )}
            <p className="text-[11px] text-amber-700">
              {isApprover ? 'Aguardando sua decisão.' : 'Aguardando aprovação do gestor.'}
            </p>
          </section>
        )}

        {/* Cancelamento - recusado */}
        {cancellationStatus === 'rejected' && job.cancellation_rejection_reason && !isCancelled && (
          <section className="px-6 py-4 bg-red-50/40 border-b border-red-100">
            <p className="text-[11px] uppercase tracking-wide text-red-700 font-semibold mb-1">
              Cancelamento recusado pelo gestor
            </p>
            <p className="text-[13px] text-red-900">{job.cancellation_rejection_reason}</p>
          </section>
        )}

        {/* Cancelamento - aprovado (vaga cancelada) */}
        {isCancelled && (
          <section className="px-6 py-4 bg-rose-50/60 border-b border-rose-100">
            <p className="text-[11px] uppercase tracking-wide text-rose-700 font-semibold mb-1">
              Vaga cancelada
            </p>
            {job.cancellation_reason && (
              <p className="text-[13px] text-rose-900">{job.cancellation_reason}</p>
            )}
            {job.cancellation_decided_at && (
              <p className="text-[11px] text-rose-700 mt-1">
                em {new Date(job.cancellation_decided_at).toLocaleDateString('pt-BR')}
              </p>
            )}
          </section>
        )}

        <section className="px-6 py-5 border-b border-gray-200">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-3">
            Ações
          </p>
          <div className="flex flex-col gap-2">
            {/* Aprovação - aprovador (somente Pro) */}
            {isPro && isApprover && approvalStatus === 'pending_approval' && (
              <>
                <button
                  disabled={busy}
                  onClick={handleApprove}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" /> Aprovar vaga
                </button>
                <button
                  disabled={busy}
                  onClick={() => setRejectOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                >
                  <XCircle className="h-4 w-4" /> Recusar vaga
                </button>
              </>
            )}

            {/* Submeter para aprovação - recrutador (somente Pro) */}
            {isPro && requiresApproval &&
              (approvalStatus === 'draft' || approvalStatus === 'rejected') && (
                <button
                  disabled={busy}
                  onClick={handleSubmitForApproval}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary bg-primary/5 hover:bg-primary/10 text-sm font-medium text-primary transition-colors"
                >
                  <Send className="h-4 w-4" />
                  {approvalStatus === 'rejected' ? 'Reenviar para aprovação' : 'Enviar para aprovação'}
                </button>
              )}

            <button
              onClick={() => navigate(`/company/jobs/${job.id}`)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-primary/5 text-sm font-medium text-gray-700 transition-colors"
            >
              <Users className="h-4 w-4 text-primary" /> Ver candidatos
            </button>
            <button
              onClick={() => navigate(`/company/jobs/${job.id}/edit`)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-primary/5 text-sm font-medium text-gray-700 transition-colors"
            >
              <Edit className="h-4 w-4 text-primary" /> Editar vaga
            </button>

            {/* Pausar / Retomar — não disponível para vagas canceladas */}
            {!isCancelled && (
              !isPaused ? (
                <button
                  disabled={busy}
                  onClick={() => setPauseOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-yellow-500/50 hover:bg-yellow-50 text-sm font-medium text-gray-700 transition-colors"
                >
                  <PauseCircle className="h-4 w-4 text-yellow-600" /> Pausar vaga
                </button>
              ) : (
                <button
                  disabled={busy}
                  onClick={handleResume}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-green-500/50 hover:bg-green-50 text-sm font-medium text-gray-700 transition-colors"
                >
                  <PlayCircle className="h-4 w-4 text-green-600" /> Retomar vaga
                </button>
              )
            )}

            {/* Aprovação de cancelamento — gestor */}
            {isApprover && cancellationStatus === 'pending' && !isCancelled && (
              <>
                <button
                  disabled={busy}
                  onClick={handleApproveCancellation}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                >
                  <Ban className="h-4 w-4" /> Aprovar cancelamento
                </button>
                <button
                  disabled={busy}
                  onClick={() => setCancelRejectOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-400 text-sm font-medium text-gray-700 transition-colors"
                >
                  <XCircle className="h-4 w-4 text-gray-500" /> Recusar cancelamento
                </button>
              </>
            )}

            {/* Excluir (rascunho) ou Solicitar cancelamento (publicada) */}
            {!isCancelled && isDraft && (
              <button
                disabled={busy}
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 hover:border-red-500 hover:bg-red-50 text-sm font-medium text-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Excluir vaga
              </button>
            )}
            {!isCancelled && !isDraft && cancellationStatus === 'none' && (
              <button
                disabled={busy}
                onClick={() => setCancelRequestOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-200 hover:border-rose-500 hover:bg-rose-50 text-sm font-medium text-rose-700 transition-colors"
              >
                <Ban className="h-4 w-4" /> {isPro ? 'Solicitar cancelamento' : 'Cancelar vaga'}
              </button>
            )}
            {!isCancelled && cancellationStatus === 'pending' && !isApprover && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
                <Clock className="h-4 w-4" />
                Cancelamento aguardando aprovação do gestor
              </div>
            )}
          </div>
        </section>

        {/* Informações */}
        <section className="px-6 py-5 border-b border-gray-200">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-3">Informações</p>
          <dl className="space-y-3">
            <div className="flex items-start gap-3">
              <Briefcase className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <dt className="text-[11px] uppercase text-gray-500">Tipo</dt>
                <dd className="text-[13px] text-gray-900 font-medium">{job.job_type || '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <dt className="text-[11px] uppercase text-gray-500">Localização</dt>
                <dd className="text-[13px] text-gray-900 font-medium">
                  {LOCATION_LABELS[job.location] || job.location}
                  {job.city && ` · ${job.city}`}
                  {job.state && `/${job.state}`}
                </dd>
              </div>
            </div>
            {(job.salary_min || job.salary_max) && (
              <div className="flex items-start gap-3">
                <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <dt className="text-[11px] uppercase text-gray-500">Salário</dt>
                  <dd className="text-[13px] text-gray-900 font-medium">
                    {job.salary_min && formatCurrency(Number(job.salary_min))}
                    {job.salary_min && job.salary_max && ' – '}
                    {job.salary_max && formatCurrency(Number(job.salary_max))}
                  </dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <dt className="text-[11px] uppercase text-gray-500">Criada em</dt>
                <dd className="text-[13px] text-gray-900 font-medium">
                  {new Date(job.created_at).toLocaleDateString('pt-BR')}
                </dd>
              </div>
            </div>
            {requiresApproval && job.approval_deadline_at && approvalStatus === 'pending_approval' && (
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <dt className="text-[11px] uppercase text-gray-500">Prazo de aprovação</dt>
                  <dd className={cn('text-[13px] font-medium', isOverdue ? 'text-red-600' : 'text-gray-900')}>
                    {new Date(job.approval_deadline_at).toLocaleDateString('pt-BR')}
                  </dd>
                </div>
              </div>
            )}
          </dl>
        </section>

        {/* Candidatos */}
        <section className="px-6 py-5 border-b border-gray-200">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-3">
            Últimos candidatos
          </p>
          {loading ? (
            <p className="text-[13px] text-gray-400">Carregando…</p>
          ) : candidates.length === 0 ? (
            <p className="text-[13px] text-gray-400">Nenhum candidato ainda.</p>
          ) : (
            <ul className="space-y-2">
              {candidates.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{c.candidate_name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{c.candidate_email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.score != null && (
                      <span className="text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {c.score}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">{c.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Histórico */}
        <section className="px-6 py-5">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-3">Histórico</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-[13px] text-gray-700">Vaga criada</p>
                <p className="text-[11px] text-gray-500">
                  Há {daysAgo(job.created_at)} dia(s) · {new Date(job.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </li>
            {job.approval_submitted_at && (
              <li className="flex items-start gap-2">
                <Send className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-[13px] text-gray-700">Submetida para aprovação</p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(job.approval_submitted_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </li>
            )}
            {job.approval_decided_at && (
              <li className="flex items-start gap-2">
                {approvalStatus === 'approved' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className="text-[13px] text-gray-700">
                    {approvalStatus === 'approved' ? 'Aprovada' : 'Reprovada'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(job.approval_decided_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </li>
            )}
            {job.paused_at && isPaused && (
              <li className="flex items-start gap-2">
                <PauseCircle className="h-3.5 w-3.5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-[13px] text-gray-700">Vaga pausada</p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(job.paused_at).toLocaleDateString('pt-BR')}
                    {job.paused_reason && ` · ${job.paused_reason}`}
                  </p>
                </div>
              </li>
            )}
            {job.updated_at && job.updated_at !== job.created_at && (
              <li className="flex items-start gap-2">
                <Clock className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-[13px] text-gray-700">Última atualização</p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(job.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </li>
            )}
          </ul>
        </section>
      </div>

      {/* Modal de pausa */}
      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pausar vaga</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            A vaga ficará indisponível para novas candidaturas. Você pode retomá-la quando quiser.
          </p>
          <Textarea
            placeholder="Motivo (opcional)"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handlePause} disabled={busy}>
              {busy ? 'Pausando...' : 'Pausar vaga'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de recusa */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar vaga</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Informe o motivo da recusa. O recrutador será notificado para fazer os ajustes.
          </p>
          <Textarea
            placeholder="Motivo da recusa (obrigatório)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={busy || !rejectReason.trim()}>
              {busy ? 'Enviando...' : 'Recusar vaga'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de exclusão (rascunho) */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir vaga</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Esta vaga ainda está em rascunho e será removida permanentemente. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? 'Excluindo...' : 'Excluir definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de cancelamento (Starter cancela direto, Pro envia ao gestor) */}
      <Dialog open={cancelRequestOpen} onOpenChange={setCancelRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isPro ? 'Solicitar cancelamento da vaga' : 'Cancelar vaga'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {isPro
              ? 'Como esta vaga já foi publicada, o cancelamento precisa ser aprovado pelo gestor responsável.'
              : 'Esta vaga será movida para Canceladas e ficará indisponível para novas candidaturas.'}
          </p>
          <Textarea
            placeholder="Motivo do cancelamento (obrigatório)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelRequestOpen(false)} disabled={busy}>
              Voltar
            </Button>
            <Button
              variant={isPro ? 'default' : 'destructive'}
              onClick={handleRequestCancellation}
              disabled={busy || !cancelReason.trim()}
            >
              {busy
                ? isPro ? 'Enviando...' : 'Cancelando...'
                : isPro ? 'Enviar para o gestor' : 'Cancelar vaga'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de recusa de cancelamento */}
      <Dialog open={cancelRejectOpen} onOpenChange={setCancelRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar cancelamento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Informe o motivo da recusa. O recrutador será notificado e a vaga continuará ativa.
          </p>
          <Textarea
            placeholder="Motivo da recusa (obrigatório)"
            value={cancelRejectReason}
            onChange={(e) => setCancelRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelRejectOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRejectCancellation} disabled={busy || !cancelRejectReason.trim()}>
              {busy ? 'Enviando...' : 'Recusar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
