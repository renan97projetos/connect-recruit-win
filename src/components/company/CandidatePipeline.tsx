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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
}

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
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [activeStageId, setActiveStageId] = useState<string>('screening');
  const [profilesById, setProfilesById] = useState<Record<string, { avatar_url?: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

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
      .select('id, candidate_id, candidate_name, candidate_email, status, current_stage, score, applied_at, updated_at')
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false });

    setApplications((apps as ApplicationRow[]) || []);

    if (apps && apps.length) {
      const ids = Array.from(new Set(apps.map((a: any) => a.candidate_id)));
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', ids);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => (map[p.id] = p));
      setProfilesById(map);
    }

    setLoading(false);
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
                      onClick={() => navigate(`/company/jobs/${jobId}/candidates`)}
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
                            'cursor-grab active:cursor-grabbing transition-shadow',
                            snap.isDragging && 'shadow-lg ring-2 ring-primary',
                            updating === app.id && 'opacity-60'
                          )}
                        >
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-start gap-3">
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
                              </div>
                              {typeof app.score === 'number' && app.score > 0 && (
                                <Badge variant="outline" className="flex-shrink-0">
                                  {app.score}
                                </Badge>
                              )}
                            </div>

                            <div className="text-[11px] text-muted-foreground">
                              Entrou em{' '}
                              {format(new Date(app.updated_at || app.applied_at), "dd 'de' MMM", {
                                locale: ptBR,
                              })}
                            </div>

                            <div className="flex items-center gap-1 pt-1 border-t border-border">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="flex-1 h-7 text-xs"
                                onClick={() => navigate(`/company/jobs/${jobId}/candidates`)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                              </Button>
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
  );
}
