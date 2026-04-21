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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [profilesById, setProfilesById] = useState<Record<string, { avatar_url?: string | null; phone?: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

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
        .select('id, avatar_url, phone')
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
        .select('company_name')
        .eq('id', jobId)
        .maybeSingle()
        .then(({ data: jobData }) => {
          supabase.functions
            .invoke('send-candidate-status-email', {
              body: {
                candidateName: app.candidate_name,
                candidateEmail: app.candidate_email,
                jobTitle: jobTitle,
                companyName: jobData?.company_name || 'Sinapse RH',
                newStatus: emailStatus,
              },
            })
            .catch(console.error);
        });
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
                            'relative cursor-grab active:cursor-grabbing transition-shadow',
                            snap.isDragging && 'shadow-lg ring-2 ring-primary',
                            updating === app.id && 'opacity-60',
                            selectedForCompare.has(app.id) && 'ring-2 ring-primary'
                          )}
                        >
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

    {selectedForCompare.size >= 2 && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background rounded-full px-5 py-2.5 shadow-lg flex items-center gap-3 text-sm">
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
    </>
  );
}
