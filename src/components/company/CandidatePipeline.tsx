import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  Filter,
  MessageSquare,
  ClipboardList,
  CheckCircle,
  XCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Users,
  Inbox,
  Loader2,
  X,
  DollarSign,
  Calendar,
  Video,
  MapPin,
  Phone,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProFeatureGate } from '@/components/ProFeatureGate';

interface PipelineProps {
  jobId: string;
  jobTitle: string;
  onChanged?: () => void;
}

interface Stage {
  id: string;
  name: string;
  icon: any;
  color: string;
  active: string; // active variant bg
}

interface ApplicationRow {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  current_stage: string | null;
  score: number | null;
  applied_at: string;
  updated_at: string;
  source?: string | null;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  board: { label: 'Board', color: 'bg-gray-100 text-gray-500' },
  career_page: { label: 'Career Page', color: 'bg-violet-50 text-violet-600' },
  indicacao: { label: 'Indicação', color: 'bg-amber-50 text-amber-600' },
};

const DEFAULT_STAGES: Stage[] = [
  { id: 'screening', name: 'Triagem', icon: Filter, color: 'border-blue-300', active: 'bg-blue-500 text-white border-blue-500' },
  { id: 'interview', name: 'Entrevista RH', icon: MessageSquare, color: 'border-indigo-300', active: 'bg-indigo-500 text-white border-indigo-500' },
  { id: 'assessment', name: 'Entrevista Técnica', icon: ClipboardList, color: 'border-orange-300', active: 'bg-orange-500 text-white border-orange-500' },
  { id: 'approved', name: 'Aprovado', icon: CheckCircle, color: 'border-green-300', active: 'bg-green-500 text-white border-green-500' },
  { id: 'rejected', name: 'Recusado', icon: XCircle, color: 'border-red-300', active: 'bg-red-500 text-white border-red-500' },
];

// Mapeia status/stage → bucket de etapa do pipeline
const STAGE_ALIASES: Record<string, string> = {
  pending: 'screening',
  screening: 'screening',
  triagem: 'screening',
  published: 'screening',
  in_review: 'screening',
  interview: 'interview',
  entrevista: 'interview',
  phone_screening: 'interview',
  video_interview: 'interview',
  assessment: 'assessment',
  practical_test: 'assessment',
  behavioral: 'assessment',
  final_interview: 'assessment',
  approved: 'approved',
  hiring: 'approved',
  contratacao: 'approved',
  offer: 'approved',
  rejected: 'rejected',
};

const stageStatusMap: Record<string, string> = {
  screening: 'pending',
  interview: 'in-review',
  assessment: 'in-review',
  approved: 'approved',
  rejected: 'rejected',
};

function getStageBucket(app: ApplicationRow): string {
  const key = (app.current_stage || app.status || '').toLowerCase();
  return STAGE_ALIASES[key] || 'screening';
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

export function CandidatePipeline({ jobId, jobTitle, onChanged }: PipelineProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [activeStageId, setActiveStageId] = useState<string>('screening');
  const [profilesById, setProfilesById] = useState<Record<string, { avatar_url?: string | null; phone?: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  // Job offers
  const [offersByApp, setOffersByApp] = useState<Record<string, { id: string; status: string }>>({});
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ApplicationRow | null>(null);
  const [offerSalary, setOfferSalary] = useState('');
  const [offerBenefits, setOfferBenefits] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [savingOffer, setSavingOffer] = useState(false);

  // Interview scheduling
  const [interviewSheetOpen, setInterviewSheetOpen] = useState(false);
  const [interviewApp, setInterviewApp] = useState<ApplicationRow | null>(null);
  const [interviewData, setInterviewData] = useState<{
    scheduled_at: string;
    format: string;
    meeting_link: string;
    location: string;
    interviewer_name: string;
  }>({
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
    if (!jobId) return;
    loadData();
  }, [jobId]);

  const loadData = async () => {
    setLoading(true);

    // Tenta carregar workflow da vaga
    const { data: wfData } = await supabase
      .from('workflows')
      .select('id, workflow_stages(id, name, stage_type, order_position, is_active)')
      .eq('job_id', jobId)
      .maybeSingle();

    if (wfData && (wfData as any).workflow_stages?.length) {
      const wfStages = (wfData as any).workflow_stages
        .filter((s: any) => s.is_active !== false)
        .sort((a: any, b: any) => a.order_position - b.order_position);
      const mapped: Stage[] = wfStages.map((s: any, idx: number) => {
        const fallback = DEFAULT_STAGES[idx % DEFAULT_STAGES.length];
        return {
          id: s.stage_type || s.id,
          name: s.name,
          icon: fallback.icon,
          color: fallback.color,
          active: fallback.active,
        };
      });
      if (mapped.length) setStages(mapped);
    } else {
      setStages(DEFAULT_STAGES);
    }

    const { data: apps } = await supabase
      .from('applications')
      .select('id, candidate_id, candidate_name, candidate_email, status, current_stage, score, applied_at, updated_at, source')
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false });

    setApplications((apps as ApplicationRow[]) || []);

    if (apps && apps.length) {
      const ids = Array.from(new Set(apps.map((a: any) => a.candidate_id)));
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, avatar_url, phone')
        .in('id', ids);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => (map[p.id] = p));
      setProfilesById(map);

      // Carrega propostas existentes para essas candidaturas
      const appIds = apps.map((a: any) => a.id);
      const { data: offersData } = await (supabase as any)
        .from('job_offers')
        .select('id, application_id, status')
        .in('application_id', appIds);
      const offersMap: Record<string, { id: string; status: string }> = {};
      (offersData || []).forEach((o: any) => {
        // Mantém a mais recente (a query já volta ordenada por created_at desc seria ideal, mas aqui basta a última iteração)
        offersMap[o.application_id] = { id: o.id, status: o.status };
      });
      setOffersByApp(offersMap);
    }

    setLoading(false);
  };

  const openInterviewSheet = async (app: ApplicationRow) => {
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
      job_id: jobId,
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

    const dateFormatted = new Date(interviewData.scheduled_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const formatLabels: Record<string, string> = {
      video: 'Videochamada',
      presencial: 'Presencial',
      telefone: 'Ligação telefônica',
    };

    const { data: jobData } = await supabase
      .from('jobs')
      .select('company_name')
      .eq('id', jobId)
      .maybeSingle();

    const companyName = jobData?.company_name || 'Sinapse RH';

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
    toast({ title: 'Entrevista agendada!', description: `E-mail enviado para ${interviewApp.candidate_name}.` });
    setInterviewSheetOpen(false);
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

  const openOfferDialog = (app: ApplicationRow) => {
    setSelectedCandidate(app);
    setOfferSalary('');
    setOfferBenefits('');
    setOfferNotes('');
    setOfferDialogOpen(true);
  };

  const handleSaveOffer = async () => {
    if (!selectedCandidate || !offerSalary || !user) return;
    setSavingOffer(true);
    const { data, error } = await (supabase as any)
      .from('job_offers')
      .insert({
        application_id: selectedCandidate.id,
        job_id: jobId,
        company_id: user.id,
        offered_salary: parseFloat(offerSalary),
        benefits_offered: offerBenefits || null,
        notes: offerNotes || null,
        status: 'pending',
      })
      .select('id, status')
      .single();
    setSavingOffer(false);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível registrar a proposta.', variant: 'destructive' });
      return;
    }

    setOffersByApp((prev) => ({ ...prev, [selectedCandidate.id]: { id: data.id, status: data.status } }));

    // Disparar email para o candidato com a proposta
    try {
      const { data: jobInfo } = await supabase
        .from('jobs')
        .select('title, company_name')
        .eq('id', jobId)
        .single();
      supabase.functions.invoke('send-job-offer-email', {
        body: {
          candidateName: selectedCandidate.candidate_name,
          candidateEmail: selectedCandidate.candidate_email,
          jobTitle: jobInfo?.title || jobTitle,
          companyName: jobInfo?.company_name || '',
          offeredSalary: parseFloat(offerSalary),
          benefits: offerBenefits || null,
          notes: offerNotes || null,
        },
      });
    } catch (e) {
      console.error('Erro ao enviar email de proposta:', e);
    }

    toast({ title: 'Proposta registrada!', description: `Para ${selectedCandidate.candidate_name}.` });
    setOfferDialogOpen(false);
  };

  const grouped = useMemo(() => {
    const acc: Record<string, ApplicationRow[]> = {};
    stages.forEach((s) => (acc[s.id] = []));
    applications.forEach((app) => {
      const bucket = getStageBucket(app);
      if (acc[bucket]) acc[bucket].push(app);
      else if (acc['screening']) acc['screening'].push(app);
    });
    return acc;
  }, [applications, stages]);

  // Garante que activeStageId exista
  useEffect(() => {
    if (!stages.find((s) => s.id === activeStageId)) {
      setActiveStageId(stages[0]?.id || 'screening');
    }
  }, [stages, activeStageId]);

  const moveCandidate = async (appId: string, targetStageId: string) => {
    setUpdating(appId);
    const newStatus = stageStatusMap[targetStageId] || 'pending';
    const { error } = await supabase
      .from('applications')
      .update({
        current_stage: targetStageId,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appId);

    setUpdating(null);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível mover o candidato.',
        variant: 'destructive',
      });
      return;
    }

    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId ? { ...a, current_stage: targetStageId, status: newStatus } : a
      )
    );
    toast({ title: 'Candidato movido', description: 'Etapa atualizada com sucesso.' });
    onChanged?.();

    // Notificar candidato por e-mail (não bloqueia UI)
    const app = applications.find((a) => a.id === appId);
    const emailStatusMap: Record<string, string> = {
      screening: 'in-review',
      interview: 'interview',
      assessment: 'interview',
      technical: 'interview',
      approved: 'approved',
      rejected: 'rejected',
    };
    const emailStatus = emailStatusMap[targetStageId] || null;

    if (emailStatus && app?.candidate_email) {
      supabase
        .from('jobs')
        .select('company_name, company_id')
        .eq('id', jobId)
        .maybeSingle()
        .then(async ({ data: jobData }) => {
          const companyName = jobData?.company_name || 'SinapseRH';
          const ownerId = jobData?.company_id || user?.id;

          // Buscar template customizado da empresa para esta etapa
          let customSubject: string | null = null;
          let customBody: string | null = null;
          if (ownerId) {
            const { data: tmpl } = await supabase
              .from('email_templates' as any)
              .select('subject, body')
              .eq('company_id', ownerId)
              .eq('stage_trigger', emailStatus)
              .maybeSingle();
            if (tmpl) {
              const t = tmpl as any;
              customSubject = String(t.subject)
                .replace(/\{\{vaga_titulo\}\}/g, jobTitle)
                .replace(/\{\{empresa_nome\}\}/g, companyName)
                .replace(/\{\{candidato_nome\}\}/g, app.candidate_name);
              customBody = String(t.body)
                .replace(/\{\{candidato_nome\}\}/g, app.candidate_name)
                .replace(/\{\{vaga_titulo\}\}/g, jobTitle)
                .replace(/\{\{empresa_nome\}\}/g, companyName);
            }
          }

          supabase.functions
            .invoke('send-candidate-status-email', {
              body: {
                candidateName: app.candidate_name,
                candidateEmail: app.candidate_email,
                jobTitle: jobTitle,
                companyName,
                newStatus: emailStatus,
                customSubject,
                customBody,
              },
            })
            .catch(console.error);
        });
    }

    // WhatsApp automático baseado no workflow da etapa
    if (targetStageId && app) {
      const { data: wfStage } = await supabase
        .from('workflow_stages')
        .select('automation_config')
        .eq('id', targetStageId)
        .maybeSingle();
      const autoConfig = wfStage?.automation_config as any;

      if (autoConfig?.whatsapp_enabled && autoConfig?.whatsapp_message) {
        const phone = profilesById[app.candidate_id]?.phone;
        if (phone) {
          const message = (autoConfig.whatsapp_message as string)
            .replace(/\{\{candidato_nome\}\}/g, app.candidate_name)
            .replace(/\{\{vaga_titulo\}\}/g, jobTitle);

          setTimeout(() => {
            window.open(
              `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`,
              '_blank'
            );
          }, 600);
        }
      }
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const targetStageId = result.destination.droppableId;
    const appId = result.draggableId;
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    const current = getStageBucket(app);
    if (current === targetStageId) return;
    moveCandidate(appId, targetStageId);
  };

  const activeStage = stages.find((s) => s.id === activeStageId) || stages[0];
  const activeCandidates = grouped[activeStageId] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Bloco B — Faixa de contadores de etapa */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1">
        <div className="flex items-stretch gap-2 min-w-max md:min-w-0 md:flex-wrap">
          {stages.map((stage) => {
            const count = (grouped[stage.id] || []).length;
            const isActive = stage.id === activeStageId;
            const Icon = stage.icon;
            return (
              <Droppable droppableId={stage.id} key={stage.id}>
                {(provided, snapshot) => (
                  <button
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    onClick={() => setActiveStageId(stage.id)}
                    className={cn(
                      'flex flex-col items-start gap-1 min-w-[150px] flex-1 px-4 py-3 rounded-lg border-2 transition-all text-left',
                      isActive
                        ? stage.active + ' shadow-md scale-[1.02]'
                        : 'bg-card border-border hover:border-primary/40 hover:bg-muted/50',
                      snapshot.isDraggingOver && 'ring-2 ring-primary ring-offset-2'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        {stage.name}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold leading-none">{count}</span>
                      <span
                        className={cn(
                          'text-[10px] uppercase',
                          isActive ? 'opacity-90' : 'text-muted-foreground'
                        )}
                      >
                        {count === 1 ? 'candidato' : 'candidatos'}
                      </span>
                    </div>
                    {provided.placeholder}
                  </button>
                )}
              </Droppable>
            );
          })}
        </div>
      </div>

      {/* Bloco C — Candidatos da etapa selecionada */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {activeStage && <activeStage.icon className="h-5 w-5 text-primary" />}
            <h3 className="text-base font-bold">
              {activeStage?.name}{' '}
              <Badge variant="secondary" className="ml-1">
                {activeCandidates.length}
              </Badge>
            </h3>
          </div>
        </div>

        <Droppable droppableId={`active-${activeStageId}`}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {activeCandidates.length === 0 ? (
                <Card className="col-span-full border-dashed">
                  <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                    <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">
                      Nenhum candidato na etapa "{activeStage?.name}"
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      Arraste candidatos para esta etapa ou divulgue mais a vaga.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/company/jobs/${jobId}`)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Ver todos os candidatos
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                activeCandidates.map((app, idx) => {
                  const profile = profilesById[app.candidate_id];
                  return (
                    <Draggable draggableId={app.id} index={idx} key={app.id}>
                      {(prov, snap) => (
                        <Card
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className={cn(
                            'relative cursor-grab active:cursor-grabbing transition-shadow',
                            snap.isDragging && 'shadow-lg ring-2 ring-primary',
                            updating === app.id && 'opacity-60',
                            selectedForCompare.has(app.id) && 'ring-2 ring-primary'
                          )}
                        >
                          <ProFeatureGate compact featureName="Comparar">
                            <input
                              type="checkbox"
                              checked={selectedForCompare.has(app.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedForCompare((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(app.id)) next.delete(app.id);
                                  else if (next.size < 4) next.add(app.id);
                                  return next;
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Selecionar para comparar"
                              className="absolute top-2 left-2 z-10 h-3.5 w-3.5 accent-primary cursor-pointer"
                            />
                          </ProFeatureGate>
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-start gap-3 pl-5">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={profile?.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                  {initials(app.candidate_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold truncate leading-tight">
                                  {app.candidate_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {app.candidate_email}
                                </p>
                                {profile?.phone && (
                                  <a
                                    href={`https://wa.me/${profile.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                      `Olá ${app.candidate_name}, vimos sua candidatura para ${jobTitle} e gostaríamos de conversar. Você tem disponibilidade?`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-full transition-colors mt-1"
                                  >
                                    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-green-600">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                    WhatsApp
                                  </a>
                                )}
                              </div>
                              {typeof app.score === 'number' && app.score > 0 && (
                                <Badge variant="outline" className="flex-shrink-0">
                                  {app.score}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[11px] text-muted-foreground">
                                Entrou em{' '}
                                {format(new Date(app.updated_at || app.applied_at), "dd 'de' MMM", {
                                  locale: ptBR,
                                })}
                              </div>
                              <div className="flex items-center gap-1">
                                {app.source && (
                                  <span
                                    className={cn(
                                      'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                      SOURCE_LABELS[app.source]?.color || 'bg-gray-100 text-gray-500'
                                    )}
                                  >
                                    {SOURCE_LABELS[app.source]?.label || app.source}
                                  </span>
                                )}
                                {offersByApp[app.id] && offersByApp[app.id].status === 'pending' && (
                                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 text-[10px] h-5 px-2">
                                    Proposta enviada
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 pt-1 border-t border-border">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="flex-1 h-7 text-xs"
                                onClick={() => navigate(`/company/jobs/${jobId}`)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                              </Button>
                              {getStageBucket(app) === 'interview' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10"
                                  onClick={(e) => { e.stopPropagation(); openInterviewSheet(app); }}
                                  aria-label="Agendar entrevista"
                                  title="Agendar entrevista"
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {getStageBucket(app) === 'approved' && (
                                <ProFeatureGate compact featureName="Proposta">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                                    onClick={() => openOfferDialog(app)}
                                    aria-label="Fazer proposta"
                                    title="Fazer proposta"
                                  >
                                    <DollarSign className="h-3.5 w-3.5" />
                                  </Button>
                                </ProFeatureGate>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                onClick={() => moveCandidate(app.id, 'approved')}
                                disabled={updating === app.id}
                                aria-label="Aprovar"
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-destructive hover:bg-destructive/10"
                                onClick={() => moveCandidate(app.id, 'rejected')}
                                disabled={updating === app.id}
                                aria-label="Rejeitar"
                              >
                                <ThumbsDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>

    {selectedForCompare.size >= 2 && (
      <ProFeatureGate featureName="Comparar candidatos">
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-full px-5 py-2.5 shadow-xl flex items-center gap-3 text-sm">
        <span>{selectedForCompare.size} candidatos selecionados</span>
        <button
          onClick={() => setCompareOpen(true)}
          className="bg-primary text-primary-foreground rounded-full px-4 py-1 text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          Comparar
        </button>
        <button
          onClick={() => setSelectedForCompare(new Set())}
          className="text-background/70 hover:text-background"
          aria-label="Limpar seleção"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      </ProFeatureGate>
    )}

    <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Comparar candidatos</DialogTitle>
        </DialogHeader>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${Math.max(selectedForCompare.size, 1)}, minmax(0, 1fr))` }}
        >
          {applications
            .filter((a) => selectedForCompare.has(a.id))
            .map((app) => (
              <div key={app.id} className="border border-border rounded-xl p-4">
                <div className="text-sm font-semibold mb-0.5">{app.candidate_name}</div>
                <div className="text-xs text-muted-foreground mb-3 truncate">{app.candidate_email}</div>
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div
                      key={s}
                      className={cn(
                        'w-4 h-4 rounded-sm',
                        (app.score || 0) >= s * 20 ? 'bg-amber-400' : 'bg-muted'
                      )}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{app.score || 0}/100</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium text-foreground">Etapa:</span>{' '}
                    {app.current_stage || 'triagem'}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Candidatou-se:</span>{' '}
                    {new Date(app.applied_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Registrar proposta</DialogTitle>
          <DialogDescription className="text-xs">
            Para: {selectedCandidate?.candidate_name}
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
          <Button
            className="flex-1"
            onClick={handleSaveOffer}
            disabled={!offerSalary || savingOffer}
          >
            {savingOffer ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar proposta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

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

              <div className="space-y-2">
                <Button
                  onClick={saveInterview}
                  disabled={!interviewData.scheduled_at || savingInterview}
                  className="w-full"
                >
                  {savingInterview ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                  ) : existingInterview ? 'Atualizar agendamento' : 'Agendar e notificar candidato'}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Um e-mail com os detalhes será enviado automaticamente ao candidato.
                </p>
              </div>
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
    </>
  );
}
