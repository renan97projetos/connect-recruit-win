import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MoreVertical, 
  Users, 
  MapPin, 
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
  GripVertical
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
  applications?: { id: string; status: string }[];
  job_request_id?: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  icon: React.ElementType;
  items: (JobRequest | PublishedJob)[];
  type: 'request' | 'job';
}

interface JobsKanbanBoardProps {
  jobRequests: JobRequest[];
  publishedJobs: PublishedJob[];
  isOwner: boolean;
  onRefresh: () => void;
}

const COLUMNS_CONFIG = [
  { id: 'draft', title: 'Rascunho', color: 'bg-muted', icon: FileText, type: 'request' as const },
  { id: 'pending_approval', title: 'Aguardando Aprovação', color: 'bg-yellow', icon: Clock, type: 'request' as const },
  { id: 'approved', title: 'Aprovada', color: 'bg-lime', icon: CheckCircle, type: 'request' as const },
  { id: 'in_creation', title: 'Em Criação', color: 'bg-cyan', icon: Edit, type: 'request' as const },
  { id: 'pending_review', title: 'Revisão Final', color: 'bg-pink', icon: Eye, type: 'request' as const },
  { id: 'published', title: 'Publicada', color: 'bg-violet', icon: Briefcase, type: 'job' as const },
  { id: 'in_selection', title: 'Em Seleção', color: 'bg-primary', icon: Users, type: 'job' as const },
  { id: 'hiring', title: 'Contratação', color: 'bg-success', icon: UserCheck, type: 'job' as const },
];

export function JobsKanbanBoard({ jobRequests, publishedJobs, isOwner, onRefresh }: JobsKanbanBoardProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'request' | 'job'; title: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Organizar items nas colunas
  const getColumns = (): KanbanColumn[] => {
    return COLUMNS_CONFIG.map(col => {
      let items: (JobRequest | PublishedJob)[] = [];
      
      if (col.type === 'request') {
        items = jobRequests.filter(req => req.status === col.id);
      } else if (col.id === 'published') {
        // Vagas publicadas sem candidatos ou recém publicadas
        items = publishedJobs.filter(job => {
          const appCount = job.applications?.length || 0;
          return appCount === 0 && job.is_active;
        });
      } else if (col.id === 'in_selection') {
        // Vagas com candidatos em análise
        items = publishedJobs.filter(job => {
          const appCount = job.applications?.length || 0;
          const hasApproved = job.applications?.some(a => a.status === 'approved');
          return appCount > 0 && !hasApproved && job.is_active;
        });
      } else if (col.id === 'hiring') {
        // Vagas com candidatos aprovados
        items = publishedJobs.filter(job => {
          const hasApproved = job.applications?.some(a => a.status === 'approved');
          return hasApproved && job.is_active;
        });
      }

      return {
        ...col,
        items
      };
    });
  };

  const columns = getColumns();

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceColId = result.source.droppableId;
    const destColId = result.destination.droppableId;
    
    if (sourceColId === destColId) return;

    const sourceCol = columns.find(c => c.id === sourceColId);
    const destCol = columns.find(c => c.id === destColId);
    
    if (!sourceCol || !destCol) return;

    const item = sourceCol.items[result.source.index];
    if (!item) return;

    // Verificar permissões
    if (!isOwner && (destColId === 'approved' || destColId === 'pending_review' || destColId === 'published')) {
      toast.error('Apenas o gestor pode aprovar requisições');
      return;
    }

    // Validar transições permitidas
    const validTransitions: Record<string, string[]> = {
      'draft': ['pending_approval'],
      'pending_approval': ['approved', 'draft'], // approved ou voltar para draft
      'approved': ['in_creation'],
      'in_creation': ['pending_review'],
      'pending_review': ['published', 'in_creation'], // publicar ou voltar para edição
      'published': ['in_selection'],
      'in_selection': ['hiring'],
      'hiring': [], // Fim do fluxo
    };

    if (!validTransitions[sourceColId]?.includes(destColId)) {
      toast.error('Movimento não permitido neste fluxo');
      return;
    }

    setActionLoading(true);

    try {
      if (sourceCol.type === 'request' && destCol.type === 'request') {
        // Atualizar status da requisição
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
        // Publicar a vaga - chamar a lógica de publicação
        toast.info('Use o botão "Aprovar e Publicar" na página de detalhes');
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
    const canDelete = isRequest && ['draft', 'pending_approval', 'rejected'].includes((item as JobRequest).status);
    const canArchive = !isRequest && (item as PublishedJob).applications?.some(a => a.status === 'approved');

    return (
      <Draggable key={item.id} draggableId={item.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              "mb-3 transition-shadow",
              snapshot.isDragging && "shadow-brutal-lg"
            )}
          >
            <Card className="border-2 border-foreground hover:shadow-brutal transition-all bg-background">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div 
                    {...provided.dragHandleProps}
                    className="cursor-grab active:cursor-grabbing mt-1"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-bold truncate">{title}</CardTitle>
                    <CardDescription className="text-xs mt-0.5 truncate">
                      {isRequest 
                        ? getReasonLabel((item as JobRequest).opening_reason)
                        : getJobTypeLabel((item as PublishedJob).job_type)
                      }
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 border-2 border-foreground bg-background">
                      <DropdownMenuItem 
                        onClick={() => navigate(
                          isRequest 
                            ? `/company/job-requests/${item.id}`
                            : `/company/selection-process/${item.id}`
                        )}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      {isRequest && (item as JobRequest).status === 'in_creation' && (
                        <DropdownMenuItem onClick={() => navigate(`/company/job-requests/${item.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Vaga
                        </DropdownMenuItem>
                      )}
                      {!isRequest && (
                        <DropdownMenuItem onClick={() => navigate(`/company/workflow/${item.id}`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Configurar Workflow
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

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <div key={column.id} className="flex-shrink-0 w-72">
              <div className={cn(
                "rounded-xl border-3 border-foreground p-3 mb-3",
                column.color
              )}>
                <div className="flex items-center gap-2">
                  <column.icon className="h-4 w-4" />
                  <h3 className="font-bold text-sm">{column.title}</h3>
                  <Badge variant="outline" className="ml-auto text-xs border-foreground">
                    {column.items.length}
                  </Badge>
                </div>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[200px] rounded-xl p-2 transition-colors",
                      snapshot.isDraggingOver && "bg-muted/50"
                    )}
                  >
                    {column.items.map((item, index) => 
                      renderCard(item, column.type, index)
                    )}
                    {provided.placeholder}
                    {column.items.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum item
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

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
    </>
  );
}
