import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MoreVertical, 
  Users, 
  Calendar, 
  Edit, 
  Trash2, 
  Archive,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Briefcase,
  UserCheck,
  GripVertical,
  Filter,
  Search,
  ClipboardList,
  MessageSquare,
  UserPlus,
  Award,
  FileCheck,
  Send,
  Settings,
  Plus,
  X,
  Phone,
  Video,
  Target,
  Sparkles,
  Shield,
  HeartHandshake,
  Mail,
  ThumbsUp,
  ThumbsDown,
  CalendarCheck,
  FileSearch,
  Play,
  Pause,
  Copy,
  ExternalLink,
  ListChecks,
  BarChart3,
  Building2,
  type LucideIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { StagePanel } from './StagePanel';

interface JobRequest {
  id: string;
  position_title: string;
  department?: string;
  opening_reason: string;
  status: string;
  current_stage: number;
  created_at: string;
  job_type: string;
  location: string;
  city?: string;
  state?: string;
  company_id: string;
  published_job_id?: string;
}

interface PublishedJob {
  id: string;
  title: string;
  job_type: string;
  location: string;
  city?: string;
  state?: string;
  created_at: string;
  is_active: boolean;
  is_archived: boolean;
  applications?: { id: string; status: string; current_stage?: string }[];
  job_request_id?: string;
}

interface ColumnConfig {
  id: string;
  title: string;
  color: string;
  icon: React.ElementType;
  type: 'request' | 'job';
  phase: 'requisition' | 'recruitment' | 'selection';
  description?: string;
  isRequired?: boolean;
  isOptional?: boolean;
}

interface KanbanColumn extends ColumnConfig {
  items: (JobRequest | PublishedJob)[];
}

interface PermissionsProps {
  canCreate: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canApprove: boolean;
  canReject: boolean;
  canDelete: boolean;
  canManageCandidates: boolean;
  canEvaluate: boolean;
}

interface JobsKanbanBoardProps {
  jobRequests: JobRequest[];
  publishedJobs: PublishedJob[];
  isOwner: boolean;
  onRefresh: () => void;
  permissions: PermissionsProps;
}

// Tipos para workflow dinâmico
interface DynamicWorkflowStage {
  id: string;
  name: string;
  stage_type: string;
  order_position: number;
  is_active: boolean;
}

interface WorkflowWithStages {
  id: string;
  job_id: string;
  stages: DynamicWorkflowStage[];
}

// Mapeamento de status para garantir consistência
const STATUS_STAGE_MAPPING: Record<string, string[]> = {
  pending: ['screening', 'pending', 'published', 'triagem'],
  screening: ['screening', 'triagem'],
  interview: ['interview', 'phone_screening', 'video_interview', 'entrevista'],
  assessment: ['assessment', 'practical_test', 'behavioral', 'avaliacao'],
  offer: ['offer', 'negotiation', 'proposta'],
  approved: ['hiring', 'approved', 'contratacao'],
  rejected: ['rejected'],
};

// Função para sincronizar status com etapa
const getStatusForStage = (stageId: string): string => {
  for (const [status, stages] of Object.entries(STATUS_STAGE_MAPPING)) {
    if (stages.includes(stageId)) {
      return status;
    }
  }
  return 'pending';
};

// Verificar se um movimento é válido no Kanban
const isValidDragTarget = (sourceStage: string, targetStage: string, itemType: 'request' | 'job'): boolean => {
  if (itemType === 'request') {
    // Requisições podem fluir em qualquer direção dentro da fase de requisição
    const requestStages = ['draft', 'pending_approval', 'approved'];
    return requestStages.includes(targetStage);
  }
  
  // Jobs publicados não podem voltar para requisição
  const requestStages = ['draft', 'pending_approval', 'approved'];
  if (requestStages.includes(targetStage)) {
    return false;
  }
  
  return true;
};

// Todas as etapas disponíveis
const ALL_AVAILABLE_STAGES: ColumnConfig[] = [
  // Requisição (obrigatórias)
  { 
    id: 'draft', 
    title: 'Rascunho', 
    color: 'bg-slate-100 dark:bg-slate-800', 
    icon: FileText, 
    type: 'request',
    phase: 'requisition',
    description: 'Requisições em elaboração',
    isRequired: true
  },
  { 
    id: 'pending_approval', 
    title: 'Aguardando Aprovação', 
    color: 'bg-amber-100 dark:bg-amber-900/30', 
    icon: Clock, 
    type: 'request',
    phase: 'requisition',
    description: 'Aguardando aprovação do gestor',
    isRequired: true
  },
  { 
    id: 'approved', 
    title: 'Aprovada', 
    color: 'bg-lime-100 dark:bg-lime-900/30', 
    icon: CheckCircle, 
    type: 'request',
    phase: 'requisition',
    description: 'Aprovada, pronta para publicação',
    isRequired: true
  },
  // Recrutamento
  { 
    id: 'published', 
    title: 'Publicada', 
    color: 'bg-violet-100 dark:bg-violet-900/30', 
    icon: Send, 
    type: 'job',
    phase: 'recruitment',
    description: 'Vaga ativa recebendo candidaturas',
    isRequired: true
  },
  { 
    id: 'screening', 
    title: 'Triagem', 
    color: 'bg-blue-100 dark:bg-blue-900/30', 
    icon: Filter, 
    type: 'job',
    phase: 'recruitment',
    description: 'Análise inicial de currículos',
    isOptional: true
  },
  { 
    id: 'phone_screening', 
    title: 'Triagem Telefônica', 
    color: 'bg-sky-100 dark:bg-sky-900/30', 
    icon: Phone, 
    type: 'job',
    phase: 'recruitment',
    description: 'Contato inicial por telefone',
    isOptional: true
  },
  { 
    id: 'interview', 
    title: 'Entrevista RH', 
    color: 'bg-indigo-100 dark:bg-indigo-900/30', 
    icon: MessageSquare, 
    type: 'job',
    phase: 'recruitment',
    description: 'Entrevista com RH',
    isOptional: true
  },
  { 
    id: 'video_interview', 
    title: 'Entrevista por Vídeo', 
    color: 'bg-blue-100 dark:bg-blue-900/30', 
    icon: Video, 
    type: 'job',
    phase: 'recruitment',
    description: 'Entrevista remota por vídeo',
    isOptional: true
  },
  // Seleção
  { 
    id: 'assessment', 
    title: 'Avaliação Técnica', 
    color: 'bg-orange-100 dark:bg-orange-900/30', 
    icon: ClipboardList, 
    type: 'job',
    phase: 'selection',
    description: 'Testes e avaliações técnicas',
    isOptional: true
  },
  { 
    id: 'practical_test', 
    title: 'Teste Prático', 
    color: 'bg-amber-100 dark:bg-amber-900/30', 
    icon: Target, 
    type: 'job',
    phase: 'selection',
    description: 'Desafio ou case prático',
    isOptional: true
  },
  { 
    id: 'behavioral', 
    title: 'Avaliação Comportamental', 
    color: 'bg-rose-100 dark:bg-rose-900/30', 
    icon: Sparkles, 
    type: 'job',
    phase: 'selection',
    description: 'Análise de perfil comportamental',
    isOptional: true
  },
  { 
    id: 'final_interview', 
    title: 'Entrevista Final', 
    color: 'bg-purple-100 dark:bg-purple-900/30', 
    icon: Award, 
    type: 'job',
    phase: 'selection',
    description: 'Entrevista com gestores',
    isOptional: true
  },
  { 
    id: 'reference_check', 
    title: 'Verificação de Referências', 
    color: 'bg-teal-100 dark:bg-teal-900/30', 
    icon: Shield, 
    type: 'job',
    phase: 'selection',
    description: 'Contato com referências profissionais',
    isOptional: true
  },
  { 
    id: 'offer', 
    title: 'Proposta', 
    color: 'bg-emerald-100 dark:bg-emerald-900/30', 
    icon: FileCheck, 
    type: 'job',
    phase: 'selection',
    description: 'Elaboração e envio de proposta',
    isOptional: true
  },
  { 
    id: 'negotiation', 
    title: 'Negociação', 
    color: 'bg-yellow-100 dark:bg-yellow-900/30', 
    icon: HeartHandshake, 
    type: 'job',
    phase: 'selection',
    description: 'Negociação de termos e benefícios',
    isOptional: true
  },
  { 
    id: 'hiring', 
    title: 'Contratação', 
    color: 'bg-green-100 dark:bg-green-900/30', 
    icon: UserCheck, 
    type: 'job',
    phase: 'selection',
    description: 'Candidatos aprovados e contratados',
    isRequired: true
  },
];

// Ações específicas por etapa
interface StageAction {
  id: string;
  label: string;
  icon: LucideIcon;
  action: string; // Identificador da ação para o handler
  variant?: 'default' | 'destructive';
}

const STAGE_ACTIONS: Record<string, StageAction[]> = {
  // Fase de Requisição
  draft: [
    { id: 'edit', label: 'Editar Requisição', icon: Edit, action: 'edit_request' },
    { id: 'submit', label: 'Enviar para Aprovação', icon: Send, action: 'submit_approval' },
    { id: 'duplicate', label: 'Duplicar', icon: Copy, action: 'duplicate_request' },
  ],
  pending_approval: [
    { id: 'view', label: 'Ver Detalhes', icon: Eye, action: 'view_request' },
    { id: 'approve', label: 'Aprovar', icon: ThumbsUp, action: 'approve_request' },
    { id: 'reject', label: 'Rejeitar', icon: ThumbsDown, action: 'reject_request', variant: 'destructive' },
  ],
  approved: [
    { id: 'view', label: 'Ver Detalhes', icon: Eye, action: 'view_request' },
    { id: 'publish', label: 'Publicar Vaga', icon: Send, action: 'publish_job' },
  ],
  // Fase de Recrutamento
  published: [
    { id: 'share', label: 'Compartilhar Vaga', icon: ExternalLink, action: 'share_job' },
    { id: 'edit', label: 'Editar Vaga', icon: Edit, action: 'edit_job' },
    { id: 'pause', label: 'Pausar Vaga', icon: Pause, action: 'pause_job' },
  ],
  screening: [
    { id: 'screen', label: 'Triar Currículos', icon: Filter, action: 'screen_resumes' },
    { id: 'bulk_approve', label: 'Aprovar Selecionados', icon: ThumbsUp, action: 'bulk_approve' },
    { id: 'bulk_reject', label: 'Reprovar Selecionados', icon: ThumbsDown, action: 'bulk_reject' },
    { id: 'view_all', label: 'Ver Todos Candidatos', icon: Users, action: 'view_candidates' },
  ],
  phone_screening: [
    { id: 'contact_list', label: 'Lista de Contatos', icon: Phone, action: 'contact_list' },
    { id: 'schedule_calls', label: 'Agendar Ligações', icon: CalendarCheck, action: 'schedule_calls' },
    { id: 'log_call', label: 'Registrar Ligação', icon: MessageSquare, action: 'log_call' },
  ],
  interview: [
    { id: 'schedule', label: 'Agendar Entrevistas', icon: CalendarCheck, action: 'schedule_interviews' },
    { id: 'view_scheduled', label: 'Ver Agendamentos', icon: Calendar, action: 'view_scheduled' },
    { id: 'evaluate', label: 'Avaliar Candidatos', icon: ClipboardList, action: 'evaluate_candidates' },
  ],
  video_interview: [
    { id: 'send_link', label: 'Enviar Link da Entrevista', icon: Video, action: 'send_video_link' },
    { id: 'schedule', label: 'Agendar Entrevista', icon: CalendarCheck, action: 'schedule_video' },
    { id: 'view_recordings', label: 'Ver Gravações', icon: Eye, action: 'view_recordings' },
  ],
  // Fase de Seleção
  assessment: [
    { id: 'send_test', label: 'Enviar Teste', icon: Send, action: 'send_test' },
    { id: 'view_results', label: 'Ver Resultados', icon: BarChart3, action: 'view_test_results' },
    { id: 'configure_test', label: 'Configurar Avaliação', icon: Settings, action: 'configure_test' },
  ],
  practical_test: [
    { id: 'send_challenge', label: 'Enviar Desafio', icon: Target, action: 'send_challenge' },
    { id: 'review_submissions', label: 'Revisar Entregas', icon: FileSearch, action: 'review_submissions' },
    { id: 'set_deadline', label: 'Definir Prazo', icon: Clock, action: 'set_deadline' },
  ],
  behavioral: [
    { id: 'send_assessment', label: 'Enviar Avaliação', icon: Sparkles, action: 'send_behavioral' },
    { id: 'view_profiles', label: 'Ver Perfis', icon: Users, action: 'view_behavioral_profiles' },
    { id: 'compare', label: 'Comparar Candidatos', icon: BarChart3, action: 'compare_candidates' },
  ],
  final_interview: [
    { id: 'schedule', label: 'Agendar com Gestor', icon: CalendarCheck, action: 'schedule_final' },
    { id: 'invite_manager', label: 'Convidar Gestor', icon: UserPlus, action: 'invite_manager' },
    { id: 'prepare_brief', label: 'Preparar Briefing', icon: FileText, action: 'prepare_brief' },
  ],
  reference_check: [
    { id: 'request_references', label: 'Solicitar Referências', icon: Mail, action: 'request_references' },
    { id: 'contact_references', label: 'Contatar Referências', icon: Phone, action: 'contact_references' },
    { id: 'log_feedback', label: 'Registrar Feedback', icon: MessageSquare, action: 'log_reference_feedback' },
  ],
  offer: [
    { id: 'create_offer', label: 'Criar Proposta', icon: FileText, action: 'create_offer' },
    { id: 'send_offer', label: 'Enviar Proposta', icon: Send, action: 'send_offer' },
    { id: 'view_template', label: 'Ver Modelos', icon: FileCheck, action: 'view_offer_templates' },
  ],
  negotiation: [
    { id: 'update_terms', label: 'Atualizar Termos', icon: Edit, action: 'update_terms' },
    { id: 'compare_offers', label: 'Comparar Propostas', icon: BarChart3, action: 'compare_offers' },
    { id: 'finalize', label: 'Finalizar Negociação', icon: CheckCircle, action: 'finalize_negotiation' },
  ],
  hiring: [
    { id: 'collect_docs', label: 'Coletar Documentos', icon: FileText, action: 'collect_documents' },
    { id: 'send_welcome', label: 'Enviar Boas-vindas', icon: Mail, action: 'send_welcome' },
    { id: 'onboarding', label: 'Iniciar Onboarding', icon: Building2, action: 'start_onboarding' },
    { id: 'complete', label: 'Concluir Contratação', icon: CheckCircle, action: 'complete_hiring' },
  ],
};

const STORAGE_KEY = 'kanban_enabled_stages';

const DEFAULT_ENABLED_STAGES = [
  'draft', 'pending_approval', 'approved', 'in_creation', 'pending_review',
  'published', 'screening', 'interview', 'assessment', 'final_interview', 'offer', 'hiring'
];

export function JobsKanbanBoard({ jobRequests, publishedJobs, isOwner, onRefresh, permissions }: JobsKanbanBoardProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'request' | 'job'; title: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [enabledStages, setEnabledStages] = useState<string[]>(DEFAULT_ENABLED_STAGES);
  
  // Estado para o painel de etapa
  const [stagePanelOpen, setStagePanelOpen] = useState(false);
  const [selectedStageItem, setSelectedStageItem] = useState<{
    id: string;
    type: 'request' | 'job';
    title: string;
    stageId: string;
    stageTitle: string;
  } | null>(null);
  
  // Estado para workflows dinâmicos e drag feedback
  const [jobWorkflows, setJobWorkflows] = useState<Record<string, WorkflowWithStages>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [draggingItem, setDraggingItem] = useState<{ id: string; type: 'request' | 'job'; sourceStage: string } | null>(null);
  
  // Carregar workflows dinâmicos para os jobs
  useEffect(() => {
    const loadWorkflows = async () => {
      if (publishedJobs.length === 0) return;
      
      const jobIds = publishedJobs.map(j => j.id);
      
      try {
        const { data: workflows, error } = await supabase
          .from('workflows')
          .select(`
            id,
            job_id,
            workflow_stages (
              id,
              name,
              stage_type,
              order_position,
              is_active
            )
          `)
          .in('job_id', jobIds)
          .eq('status', 'active');
        
        if (error) throw error;
        
        const workflowMap: Record<string, WorkflowWithStages> = {};
        workflows?.forEach((w: any) => {
          if (w.job_id) {
            workflowMap[w.job_id] = {
              id: w.id,
              job_id: w.job_id,
              stages: (w.workflow_stages || [])
                .filter((s: any) => s.is_active)
                .sort((a: any, b: any) => a.order_position - b.order_position)
            };
          }
        });
        
        setJobWorkflows(workflowMap);
      } catch (error) {
        console.error('Error loading workflows:', error);
      }
    };
    
    loadWorkflows();
  }, [publishedJobs]);

  // Carregar configuração do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEnabledStages(parsed);
      } catch {
        setEnabledStages(DEFAULT_ENABLED_STAGES);
      }
    }
  }, []);

  // Salvar configuração
  const saveEnabledStages = (stages: string[]) => {
    setEnabledStages(stages);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stages));
  };

  const toggleStage = (stageId: string) => {
    const stage = ALL_AVAILABLE_STAGES.find(s => s.id === stageId);
    if (stage?.isRequired) return; // Não pode desabilitar etapas obrigatórias

    const newStages = enabledStages.includes(stageId)
      ? enabledStages.filter(id => id !== stageId)
      : [...enabledStages, stageId];
    
    saveEnabledStages(newStages);
  };

  // Filtrar colunas habilitadas
  const getEnabledColumns = (): ColumnConfig[] => {
    return ALL_AVAILABLE_STAGES.filter(stage => enabledStages.includes(stage.id));
  };

  // Função auxiliar para determinar a fase de uma vaga publicada
  const getJobPhase = (job: PublishedJob): string => {
    const apps = job.applications || [];
    const hasApproved = apps.some(a => a.status === 'approved');
    
    // Verificar em ordem reversa de prioridade
    const stageChecks = [
      { id: 'hiring', check: hasApproved },
      { id: 'negotiation', check: apps.some(a => a.current_stage === 'negotiation') },
      { id: 'offer', check: apps.some(a => a.current_stage === 'offer' || a.current_stage === 'proposta') },
      { id: 'reference_check', check: apps.some(a => a.current_stage === 'reference_check') },
      { id: 'final_interview', check: apps.some(a => a.current_stage === 'final_interview' || a.current_stage === 'entrevista_final') },
      { id: 'behavioral', check: apps.some(a => a.current_stage === 'behavioral') },
      { id: 'practical_test', check: apps.some(a => a.current_stage === 'practical_test') },
      { id: 'assessment', check: apps.some(a => a.current_stage === 'assessment' || a.current_stage === 'avaliacao') },
      { id: 'video_interview', check: apps.some(a => a.current_stage === 'video_interview') },
      { id: 'interview', check: apps.some(a => a.current_stage === 'interview' || a.current_stage === 'entrevista') },
      { id: 'phone_screening', check: apps.some(a => a.current_stage === 'phone_screening') },
      { id: 'screening', check: apps.some(a => a.current_stage === 'screening' || a.current_stage === 'triagem') || apps.length > 0 },
    ];

    for (const { id, check } of stageChecks) {
      if (check && enabledStages.includes(id)) return id;
    }

    return 'published';
  };

  // Organizar items nas colunas
  const getColumns = (columnsConfig: ColumnConfig[]): KanbanColumn[] => {
    return columnsConfig.map(col => {
      let items: (JobRequest | PublishedJob)[] = [];
      
      if (col.type === 'request') {
        items = jobRequests.filter(req => {
          const matchesStatus = req.status === col.id;
          const matchesSearch = !searchTerm || 
            req.position_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.department?.toLowerCase().includes(searchTerm.toLowerCase()));
          return matchesStatus && matchesSearch;
        });
      } else {
        items = publishedJobs.filter(job => {
          // Não filtrar vagas pausadas - elas devem aparecer com badge
          const phase = getJobPhase(job);
          const matchesPhase = phase === col.id;
          const matchesSearch = !searchTerm || 
            job.title.toLowerCase().includes(searchTerm.toLowerCase());
          return matchesPhase && matchesSearch;
        });
      }

      return {
        ...col,
        items
      };
    });
  };

  const getFilteredColumns = () => {
    const enabledCols = getEnabledColumns();
    switch (activeTab) {
      case 'requisition':
        return getColumns(enabledCols.filter(c => c.phase === 'requisition'));
      case 'recruitment':
        return getColumns(enabledCols.filter(c => c.phase === 'recruitment'));
      case 'selection':
        return getColumns(enabledCols.filter(c => c.phase === 'selection'));
      default:
        return getColumns(enabledCols);
    }
  };

  const columns = getFilteredColumns();

  const handleDragStart = (start: any) => {
    const allCols = getColumns(getEnabledColumns());
    const sourceCol = allCols.find(c => c.id === start.source.droppableId);
    if (sourceCol) {
      const item = sourceCol.items[start.source.index];
      if (item) {
        setIsDragging(true);
        setDraggingItem({
          id: item.id,
          type: sourceCol.type,
          sourceStage: start.source.droppableId
        });
      }
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    setDraggingItem(null);
    
    if (!result.destination) return;

    const sourceColId = result.source.droppableId;
    const destColId = result.destination.droppableId;
    
    if (sourceColId === destColId) return;

    const allCols = getColumns(getEnabledColumns());
    const sourceCol = allCols.find(c => c.id === sourceColId);
    const destCol = allCols.find(c => c.id === destColId);
    
    if (!sourceCol || !destCol) return;

    const item = sourceCol.items[result.source.index];
    if (!item) return;

    // Validar se o movimento é permitido
    if (!isValidDragTarget(sourceColId, destColId, sourceCol.type)) {
      toast.error('Movimento não permitido. Vagas publicadas não podem voltar para requisição.');
      return;
    }

    // Verificar permissões para mover entre colunas
    if (sourceCol.type === 'request' && destCol.type === 'request') {
      // Aprovar requisição: precisa de approve_vagas
      if (destColId === 'approved' && !permissions.canApprove && !isOwner) {
        toast.error('Você não tem permissão para aprovar requisições');
        return;
      }
      // Publicar (via pending_review ou published): precisa de publish_vagas
      if (['pending_review', 'published'].includes(destColId) && !permissions.canPublish && !isOwner) {
        toast.error('Você não tem permissão para publicar vagas');
        return;
      }
      // Editar requisição: precisa de edit_vagas
      if (['in_creation', 'draft'].includes(destColId) && !permissions.canEdit && !isOwner) {
        toast.error('Você não tem permissão para editar requisições');
        return;
      }
    }

    setActionLoading(true);

    try {
      if (sourceCol.type === 'request' && destCol.type === 'request') {
        const validStatuses = ['draft', 'pending_approval', 'approved', 'rejected', 'in_creation', 'pending_review', 'published'] as const;
        type JobRequestStatus = typeof validStatuses[number];
        
        if (validStatuses.includes(destColId as JobRequestStatus)) {
          const { error } = await supabase
            .from('job_requests')
            .update({ 
              status: destColId as JobRequestStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);
          
          if (error) throw error;
          toast.success(`Requisição movida para ${destCol.title}`);
        }
      } else if (sourceCol.type === 'request' && destColId === 'published') {
        toast.info('Use o botão "Aprovar e Publicar" na página de detalhes');
        return;
      } else if (sourceCol.type === 'job' && destCol.type === 'job') {
        // Atualizar candidatos para a nova etapa - sincronizar status
        const newStatus = getStatusForStage(destColId);
        toast.info('Gerencie candidatos na página de processo seletivo');
        navigate(`/company/jobs/${item.id}`);
        return;
      }
      
      onRefresh();
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error('Erro ao mover item');
    } finally {
      setActionLoading(false);
    }
  };

  // Verificar se uma coluna é um alvo válido para drop
  const isDroppableTarget = (columnId: string, columnType: 'request' | 'job'): boolean => {
    if (!draggingItem) return true;
    return isValidDragTarget(draggingItem.sourceStage, columnId, draggingItem.type);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setActionLoading(true);

    try {
      if (selectedItem.type === 'request') {
        await supabase.from('job_requests').delete().eq('id', selectedItem.id);
      }
      toast.success('Item excluído com sucesso');
      onRefresh();
    } catch (error) {
      toast.error('Erro ao excluir');
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handleArchive = async () => {
    if (!selectedItem) return;
    setActionLoading(true);

    try {
      if (selectedItem.type === 'job') {
        await supabase.from('jobs').update({ is_archived: true }).eq('id', selectedItem.id);
      }
      toast.success('Vaga arquivada com sucesso');
      onRefresh();
    } catch (error) {
      toast.error('Erro ao arquivar');
    } finally {
      setActionLoading(false);
      setArchiveDialogOpen(false);
      setSelectedItem(null);
    }
  };

  // Handler para ações específicas de cada etapa
  const handleStageAction = (action: string, item: JobRequest | PublishedJob, type: 'request' | 'job') => {
    const itemId = item.id;
    
    switch (action) {
      // Ações de Requisição
      case 'edit_request':
      case 'view_request':
        navigate(`/company/job-requests/${itemId}`);
        break;
      case 'submit_approval':
        handleStatusChange(item as JobRequest, 'pending_approval');
        break;
      case 'duplicate_request':
        toast.info('Funcionalidade de duplicar em desenvolvimento');
        break;
      case 'approve_request':
        handleStatusChange(item as JobRequest, 'approved');
        break;
      case 'reject_request':
        toast.info('Rejeição via página de detalhes');
        navigate(`/company/job-requests/${itemId}`);
        break;
      case 'start_creation':
        handleStatusChange(item as JobRequest, 'in_creation');
        break;
      case 'edit_job_description':
        navigate(`/company/job-requests/${itemId}/edit`);
        break;
      case 'preview_job':
        navigate(`/company/job-requests/${itemId}`);
        break;
      case 'submit_review':
        handleStatusChange(item as JobRequest, 'pending_review');
        break;
      case 'review_job':
      case 'publish_job':
      case 'request_changes':
        navigate(`/company/job-requests/${itemId}`);
        break;
      
      // Ações de Recrutamento
      case 'view_candidates':
      case 'screen_resumes':
      case 'bulk_approve':
      case 'bulk_reject':
        navigate(`/company/jobs/${itemId}`);
        break;
      case 'share_job':
        navigator.clipboard.writeText(`https://www.sinapserh.com.br/jobs/${itemId}`);
        toast.success('Link da vaga copiado!');
        break;
      case 'edit_job':
        navigate(`/company/jobs/${itemId}/edit`);
        break;
      case 'pause_job':
        handlePauseJob(itemId);
        break;
      case 'contact_list':
      case 'schedule_calls':
      case 'log_call':
      case 'schedule_interviews':
      case 'view_scheduled':
      case 'evaluate_candidates':
      case 'send_video_link':
      case 'schedule_video':
      case 'view_recordings':
        navigate(`/company/jobs/${itemId}`);
        break;
      
      // Ações de Seleção
      case 'send_test':
      case 'view_test_results':
      case 'configure_test':
      case 'send_challenge':
      case 'review_submissions':
      case 'set_deadline':
      case 'send_behavioral':
      case 'view_behavioral_profiles':
      case 'compare_candidates':
      case 'schedule_final':
      case 'invite_manager':
      case 'prepare_brief':
      case 'request_references':
      case 'contact_references':
      case 'log_reference_feedback':
      case 'create_offer':
      case 'send_offer':
      case 'view_offer_templates':
      case 'update_terms':
      case 'compare_offers':
      case 'finalize_negotiation':
        navigate(`/company/jobs/${itemId}`);
        break;
      
      // Ações de Contratação
      case 'collect_documents':
        navigate(`/company/jobs/${itemId}?tab=documents`);
        break;
      case 'send_welcome':
        toast.info('Funcionalidade de boas-vindas em desenvolvimento');
        break;
      case 'start_onboarding':
        navigate(`/company/jobs/${itemId}?tab=onboarding`);
        break;
      case 'complete_hiring':
        navigate(`/company/jobs/${itemId}`);
        break;
      
      default:
        toast.info(`Ação "${action}" em desenvolvimento`);
    }
  };

  const handleStatusChange = async (request: JobRequest, newStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'in_creation' | 'pending_review' | 'published') => {
    try {
      setActionLoading(true);
      await supabase
        .from('job_requests')
        .update({ status: newStatus })
        .eq('id', request.id);
      
      const statusLabels: Record<string, string> = {
        draft: 'Rascunho',
        pending_approval: 'Aguardando Aprovação',
        approved: 'Aprovada',
        rejected: 'Rejeitada',
        in_creation: 'Em Criação',
        pending_review: 'Revisão Final',
        published: 'Publicada',
      };
      toast.success(`Status atualizado para ${statusLabels[newStatus]}`);
      onRefresh();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseJob = async (jobId: string) => {
    try {
      setActionLoading(true);
      await supabase
        .from('jobs')
        .update({ is_active: false })
        .eq('id', jobId);
      
      toast.success('Vaga pausada');
      onRefresh();
    } catch (error) {
      toast.error('Erro ao pausar vaga');
    } finally {
      setActionLoading(false);
    }
  };

  const getJobTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'full-time': 'Integral',
      'part-time': 'Parcial',
      'contract': 'Contrato',
      'internship': 'Estágio',
      'temporary': 'Temporário',
    };
    return types[type] || type;
  };

  const getReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      'replacement': 'Substituição',
      'expansion': 'Expansão',
      'new_project': 'Novo Projeto',
      'seasonal': 'Sazonal',
      'other': 'Outro'
    };
    return reasons[reason] || reason;
  };

  // Obter a etapa atual do item para buscar as ações corretas
  const getItemStage = (item: JobRequest | PublishedJob, type: 'request' | 'job'): string => {
    if (type === 'request') {
      return (item as JobRequest).status;
    }
    return getJobPhase(item as PublishedJob);
  };

  // Filtrar ações baseado nas permissões
  const filterActionsByPermission = (actions: StageAction[], stage: string): StageAction[] => {
    if (isOwner) return actions; // Owner tem todas as permissões
    
    return actions.filter(action => {
      // Ações que requerem permissões específicas
      const requiresApprove = ['approve_request', 'publish_job'].includes(action.action);
      const requiresReject = ['reject_request'].includes(action.action);
      const requiresEdit = ['edit_request', 'edit_job_description', 'edit_job', 'start_creation', 'submit_review', 'request_changes'].includes(action.action);
      const requiresPublish = ['publish_job', 'submit_review'].includes(action.action);
      const requiresManageCandidates = ['view_candidates', 'screen_resumes', 'bulk_approve', 'bulk_reject', 'contact_list', 'schedule_calls', 'schedule_interviews', 'send_video_link', 'schedule_video'].includes(action.action);
      const requiresEvaluate = ['evaluate_candidates', 'send_test', 'view_test_results', 'send_challenge', 'review_submissions', 'send_behavioral', 'view_behavioral_profiles', 'compare_candidates'].includes(action.action);
      const requiresDelete = ['delete'].includes(action.action);

      // View actions são sempre permitidas
      const isViewAction = ['view', 'view_request', 'preview_job', 'review_job', 'share_job', 'view_scheduled', 'view_recordings', 'view_offer_templates', 'view_behavioral_profiles'].includes(action.action);
      if (isViewAction) return true;

      if (requiresApprove && !permissions.canApprove) return false;
      if (requiresReject && !permissions.canReject) return false;
      if (requiresEdit && !permissions.canEdit) return false;
      if (requiresPublish && !permissions.canPublish) return false;
      if (requiresManageCandidates && !permissions.canManageCandidates) return false;
      if (requiresEvaluate && !permissions.canEvaluate) return false;
      if (requiresDelete && !permissions.canDelete) return false;

      return true;
    });
  };

  const renderCard = (item: JobRequest | PublishedJob, type: 'request' | 'job', index: number, columnConfig: ColumnConfig) => {
    const isRequest = type === 'request';
    const title = isRequest ? (item as JobRequest).position_title : (item as PublishedJob).title;
    const appCount = !isRequest ? ((item as PublishedJob).applications?.length || 0) : 0;
    const requestStatus = isRequest ? (item as JobRequest).status : '';
    const isPaused = !isRequest && !(item as PublishedJob).is_active;
    
    // Permitir excluir com permissão delete_vagas
    const canDeleteItem = isRequest && (permissions.canDelete || isOwner) && (
      ['draft', 'pending_approval', 'rejected'].includes(requestStatus) ||
      (requestStatus === 'in_creation')
    );
    const canArchive = !isRequest && (permissions.canEdit || isOwner) && (item as PublishedJob).applications?.some(a => a.status === 'approved');
    const department = isRequest ? (item as JobRequest).department : null;
    
    // Obter ações da etapa atual e filtrar por permissões
    const currentStage = getItemStage(item, type);
    const allStageActions = STAGE_ACTIONS[currentStage] || [];
    const stageActions = filterActionsByPermission(allStageActions, currentStage);

    // Handler para abrir o painel da etapa
    const handleCardClick = () => {
      setSelectedStageItem({
        id: item.id,
        type,
        title,
        stageId: columnConfig.id,
        stageTitle: columnConfig.title,
      });
      setStagePanelOpen(true);
    };

    return (
      <Draggable key={item.id} draggableId={item.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              "mb-3 transition-shadow",
              snapshot.isDragging && "shadow-lg rotate-2"
            )}
          >
            <Card 
              className="border hover:shadow-md transition-all bg-background cursor-pointer group"
              onClick={handleCardClick}
            >
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div 
                    {...provided.dragHandleProps}
                    className="cursor-grab active:cursor-grabbing mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">{title}</CardTitle>
                    <CardDescription className="text-xs mt-0.5 truncate">
                      {isRequest 
                        ? (department || getReasonLabel((item as JobRequest).opening_reason))
                        : getJobTypeLabel((item as PublishedJob).job_type)
                      }
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      {/* Ações específicas da etapa */}
                      
                      {/* Ações específicas da etapa */}
                      {stageActions.map((action) => (
                        <DropdownMenuItem 
                          key={action.id}
                          className={action.variant === 'destructive' ? 'text-destructive' : ''}
                          onClick={() => handleStageAction(action.action, item, type)}
                        >
                          <action.icon className="mr-2 h-4 w-4" />
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                      
                      {(canDeleteItem || canArchive) && <DropdownMenuSeparator />}
                      
                      {/* Ações destrutivas */}
                      {canDeleteItem && (
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setSelectedItem({ id: item.id, type, title });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                      {canArchive && (
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedItem({ id: item.id, type, title });
                            setArchiveDialogOpen(true);
                          }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Arquivar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isPaused && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                        <Pause className="h-3 w-3 mr-1" />
                        Pausada
                      </Badge>
                    )}
                    {!isRequest && appCount > 0 && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        <Users className="h-3 w-3 mr-1" />
                        {appCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Draggable>
    );
  };

  // Contadores para as tabs
  const requisitionCount = jobRequests.filter(r => 
    ['draft', 'pending_approval', 'approved', 'in_creation', 'pending_review'].includes(r.status)
  ).length;
  const recruitmentCount = publishedJobs.filter(j => {
    const phase = getJobPhase(j);
    return getEnabledColumns().filter(c => c.phase === 'recruitment').some(c => c.id === phase) && j.is_active;
  }).length;
  const selectionCount = publishedJobs.filter(j => {
    const phase = getJobPhase(j);
    return getEnabledColumns().filter(c => c.phase === 'selection').some(c => c.id === phase) && j.is_active;
  }).length;

  // Agrupar etapas por fase para o modal de configuração
  const getStagesByPhase = (phase: 'requisition' | 'recruitment' | 'selection') => {
    return ALL_AVAILABLE_STAGES.filter(s => s.phase === phase);
  };

  return (
    <div className="space-y-4">
      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid w-full sm:w-auto grid-cols-4">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              Todas
            </TabsTrigger>
            <TabsTrigger value="requisition" className="text-xs sm:text-sm">
              Requisição
              {requisitionCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{requisitionCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recruitment" className="text-xs sm:text-sm">
              Recrutamento
              {recruitmentCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{recruitmentCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="selection" className="text-xs sm:text-sm">
              Seleção
              {selectionCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{selectionCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar vagas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setSettingsDialogOpen(true)}
            title="Configurar Etapas"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => {
            const isValidTarget = isDroppableTarget(column.id, column.type);
            const isBlocked = isDragging && !isValidTarget;
            
            return (
              <div key={column.id} className="flex-shrink-0 w-64">
                <div className={cn(
                  "rounded-lg p-3 mb-3 transition-all",
                  column.color,
                  isBlocked && "opacity-50"
                )}>
                  <div className="flex items-center gap-2">
                    <column.icon className="h-4 w-4" />
                    <h3 className="font-semibold text-sm flex-1 truncate">{column.title}</h3>
                    {isBlocked && (
                      <Badge variant="destructive" className="text-xs">
                        Bloqueado
                      </Badge>
                    )}
                    {!isBlocked && (
                      <Badge variant="outline" className="text-xs">
                        {column.items.length}
                      </Badge>
                    )}
                  </div>
                  {column.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{column.description}</p>
                  )}
                </div>
                
                <Droppable droppableId={column.id} isDropDisabled={isBlocked}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-[200px] rounded-lg p-1 transition-all",
                        snapshot.isDraggingOver && isValidTarget && "bg-primary/10 ring-2 ring-primary/30",
                        snapshot.isDraggingOver && !isValidTarget && "bg-destructive/10",
                        isBlocked && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {column.items.map((item, index) => 
                        renderCard(item, column.type, index, column)
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Etapas do Kanban
            </DialogTitle>
            <DialogDescription>
              Selecione quais etapas deseja exibir. Etapas obrigatórias não podem ser desativadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
            {/* Requisição */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                Fase de Requisição
              </h4>
              <div className="space-y-1">
                {getStagesByPhase('requisition').map(stage => (
                  <div 
                    key={stage.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <stage.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{stage.title}</span>
                      {stage.isRequired && (
                        <Badge variant="outline" className="text-xs">Obrigatória</Badge>
                      )}
                    </div>
                    <Switch
                      checked={enabledStages.includes(stage.id)}
                      onCheckedChange={() => toggleStage(stage.id)}
                      disabled={stage.isRequired}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Recrutamento */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                Fase de Recrutamento
              </h4>
              <div className="space-y-1">
                {getStagesByPhase('recruitment').map(stage => (
                  <div 
                    key={stage.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <stage.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{stage.title}</span>
                      {stage.isRequired && (
                        <Badge variant="outline" className="text-xs">Obrigatória</Badge>
                      )}
                    </div>
                    <Switch
                      checked={enabledStages.includes(stage.id)}
                      onCheckedChange={() => toggleStage(stage.id)}
                      disabled={stage.isRequired}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Seleção */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-muted-foreground">
                <Award className="h-4 w-4" />
                Fase de Seleção
              </h4>
              <div className="space-y-1">
                {getStagesByPhase('selection').map(stage => (
                  <div 
                    key={stage.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <stage.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{stage.title}</span>
                      {stage.isRequired && (
                        <Badge variant="outline" className="text-xs">Obrigatória</Badge>
                      )}
                    </div>
                    <Switch
                      checked={enabledStages.includes(stage.id)}
                      onCheckedChange={() => toggleStage(stage.id)}
                      disabled={stage.isRequired}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => saveEnabledStages(DEFAULT_ENABLED_STAGES)}>
              Restaurar Padrão
            </Button>
            <Button size="sm" onClick={() => setSettingsDialogOpen(false)}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Requisição</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{selectedItem?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Vaga</AlertDialogTitle>
            <AlertDialogDescription>
              A vaga "{selectedItem?.title}" será movida para o histórico. Você ainda poderá visualizar os dados do processo seletivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={actionLoading}>
              {actionLoading ? 'Arquivando...' : 'Arquivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stage Panel */}
      {selectedStageItem && (
        <StagePanel
          open={stagePanelOpen}
          onOpenChange={setStagePanelOpen}
          stageId={selectedStageItem.stageId}
          stageTitle={selectedStageItem.stageTitle}
          itemId={selectedStageItem.id}
          itemType={selectedStageItem.type}
          itemTitle={selectedStageItem.title}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
