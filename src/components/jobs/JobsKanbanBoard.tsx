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
  HeartHandshake
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

interface JobsKanbanBoardProps {
  jobRequests: JobRequest[];
  publishedJobs: PublishedJob[];
  isOwner: boolean;
  onRefresh: () => void;
}

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
    description: 'Aprovada, pronta para criação',
    isRequired: true
  },
  { 
    id: 'in_creation', 
    title: 'Em Criação', 
    color: 'bg-cyan-100 dark:bg-cyan-900/30', 
    icon: Edit, 
    type: 'request',
    phase: 'requisition',
    description: 'Descrição sendo elaborada',
    isRequired: true
  },
  { 
    id: 'pending_review', 
    title: 'Revisão Final', 
    color: 'bg-pink-100 dark:bg-pink-900/30', 
    icon: Eye, 
    type: 'request',
    phase: 'requisition',
    description: 'Pronta para revisão e publicação',
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

const STORAGE_KEY = 'kanban_enabled_stages';

const DEFAULT_ENABLED_STAGES = [
  'draft', 'pending_approval', 'approved', 'in_creation', 'pending_review',
  'published', 'screening', 'interview', 'assessment', 'final_interview', 'offer', 'hiring'
];

export function JobsKanbanBoard({ jobRequests, publishedJobs, isOwner, onRefresh }: JobsKanbanBoardProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'request' | 'job'; title: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [enabledStages, setEnabledStages] = useState<string[]>(DEFAULT_ENABLED_STAGES);

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
          if (!job.is_active) return false;
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

  const handleDragEnd = async (result: DropResult) => {
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

    // Verificar permissões
    if (!isOwner && ['approved', 'pending_review', 'published'].includes(destColId)) {
      toast.error('Apenas o gestor pode aprovar requisições');
      return;
    }

    setActionLoading(true);

    try {
      if (sourceCol.type === 'request' && destCol.type === 'request') {
        const validStatuses = ['draft', 'pending_approval', 'approved', 'rejected', 'in_creation', 'pending_review', 'published'] as const;
        type JobRequestStatus = typeof validStatuses[number];
        
        if (validStatuses.includes(destColId as JobRequestStatus)) {
          await supabase
            .from('job_requests')
            .update({ 
              status: destColId as JobRequestStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);
          
          toast.success(`Requisição movida para ${destCol.title}`);
        }
      } else if (sourceCol.type === 'request' && destColId === 'published') {
        toast.info('Use o botão "Aprovar e Publicar" na página de detalhes');
        return;
      } else if (sourceCol.type === 'job' && destCol.type === 'job') {
        toast.info('Gerencie candidatos na página de processo seletivo');
        navigate(`/company/selection-process/${item.id}`);
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

  const renderCard = (item: JobRequest | PublishedJob, type: 'request' | 'job', index: number) => {
    const isRequest = type === 'request';
    const title = isRequest ? (item as JobRequest).position_title : (item as PublishedJob).title;
    const appCount = !isRequest ? ((item as PublishedJob).applications?.length || 0) : 0;
    const requestStatus = isRequest ? (item as JobRequest).status : '';
    // Permitir excluir em draft, pending_approval, rejected sempre. Em in_creation só o owner pode excluir.
    const canDelete = isRequest && (
      ['draft', 'pending_approval', 'rejected'].includes(requestStatus) ||
      (requestStatus === 'in_creation' && isOwner)
    );
    const canArchive = !isRequest && (item as PublishedJob).applications?.some(a => a.status === 'approved');
    const department = isRequest ? (item as JobRequest).department : null;

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
              onClick={() => navigate(
                isRequest 
                  ? `/company/job-requests/${item.id}`
                  : `/company/selection-process/${item.id}`
              )}
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
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        onClick={() => navigate(
                          isRequest 
                            ? `/company/job-requests/${item.id}`
                            : `/company/selection-process/${item.id}`
                        )}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {isRequest ? 'Ver Detalhes' : 'Gerenciar Candidatos'}
                      </DropdownMenuItem>
                      {isRequest && (item as JobRequest).status === 'in_creation' && (
                        <DropdownMenuItem onClick={() => navigate(`/company/job-requests/${item.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Vaga
                        </DropdownMenuItem>
                      )}
                      {!isRequest && (
                        <DropdownMenuItem onClick={() => navigate(`/company/workflow/${item.id}`)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Configurar Etapas
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {canDelete && (
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
                  {!isRequest && appCount > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      <Users className="h-3 w-3 mr-1" />
                      {appCount}
                    </Badge>
                  )}
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
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <div key={column.id} className="flex-shrink-0 w-64">
              <div className={cn(
                "rounded-lg p-3 mb-3",
                column.color
              )}>
                <div className="flex items-center gap-2">
                  <column.icon className="h-4 w-4" />
                  <h3 className="font-semibold text-sm flex-1 truncate">{column.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {column.items.length}
                  </Badge>
                </div>
                {column.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{column.description}</p>
                )}
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[200px] rounded-lg p-1 transition-colors",
                      snapshot.isDraggingOver && "bg-muted/50"
                    )}
                  >
                    {column.items.map((item, index) => 
                      renderCard(item, column.type, index)
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Etapas do Kanban
            </DialogTitle>
            <DialogDescription>
              Selecione quais etapas deseja exibir no seu fluxo de gestão de vagas. Etapas obrigatórias não podem ser desativadas.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {/* Requisição */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Fase de Requisição
                </h4>
                <div className="grid gap-2">
                  {getStagesByPhase('requisition').map(stage => (
                    <div 
                      key={stage.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        enabledStages.includes(stage.id) ? stage.color : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <stage.icon className="h-4 w-4" />
                        <div>
                          <p className="font-medium text-sm">{stage.title}</p>
                          <p className="text-xs text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {stage.isRequired && (
                          <Badge variant="secondary" className="text-xs">Obrigatória</Badge>
                        )}
                        <Switch
                          checked={enabledStages.includes(stage.id)}
                          onCheckedChange={() => toggleStage(stage.id)}
                          disabled={stage.isRequired}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recrutamento */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Fase de Recrutamento
                </h4>
                <div className="grid gap-2">
                  {getStagesByPhase('recruitment').map(stage => (
                    <div 
                      key={stage.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        enabledStages.includes(stage.id) ? stage.color : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <stage.icon className="h-4 w-4" />
                        <div>
                          <p className="font-medium text-sm">{stage.title}</p>
                          <p className="text-xs text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {stage.isRequired && (
                          <Badge variant="secondary" className="text-xs">Obrigatória</Badge>
                        )}
                        {stage.isOptional && (
                          <Badge variant="outline" className="text-xs">Opcional</Badge>
                        )}
                        <Switch
                          checked={enabledStages.includes(stage.id)}
                          onCheckedChange={() => toggleStage(stage.id)}
                          disabled={stage.isRequired}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seleção */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Fase de Seleção
                </h4>
                <div className="grid gap-2">
                  {getStagesByPhase('selection').map(stage => (
                    <div 
                      key={stage.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        enabledStages.includes(stage.id) ? stage.color : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <stage.icon className="h-4 w-4" />
                        <div>
                          <p className="font-medium text-sm">{stage.title}</p>
                          <p className="text-xs text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {stage.isRequired && (
                          <Badge variant="secondary" className="text-xs">Obrigatória</Badge>
                        )}
                        {stage.isOptional && (
                          <Badge variant="outline" className="text-xs">Opcional</Badge>
                        )}
                        <Switch
                          checked={enabledStages.includes(stage.id)}
                          onCheckedChange={() => toggleStage(stage.id)}
                          disabled={stage.isRequired}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => saveEnabledStages(DEFAULT_ENABLED_STAGES)}>
              Restaurar Padrão
            </Button>
            <Button onClick={() => setSettingsDialogOpen(false)}>
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
    </div>
  );
}
