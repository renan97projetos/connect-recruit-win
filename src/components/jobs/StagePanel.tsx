import { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Users, 
  Star, 
  Mail, 
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Send,
  Eye,
  Info,
  History,
  Edit,
  Play,
  AlertCircle,
  Briefcase,
  MapPin,
  DollarSign,
  User,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { usePermissions } from '@/hooks/usePermissions';

interface StagePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageId: string;
  stageTitle: string;
  itemId: string;
  itemType: 'request' | 'job';
  itemTitle: string;
  onRefresh: () => void;
}

// Configuração de status e badges
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  draft: { label: 'Rascunho', variant: 'secondary', color: 'bg-slate-500' },
  pending_approval: { label: 'Aguardando Aprovação', variant: 'default', color: 'bg-amber-500' },
  approved: { label: 'Aprovada', variant: 'default', color: 'bg-lime-500' },
  rejected: { label: 'Rejeitada', variant: 'destructive', color: 'bg-red-500' },
  in_creation: { label: 'Em Criação', variant: 'secondary', color: 'bg-cyan-500' },
  pending_review: { label: 'Revisão Final', variant: 'default', color: 'bg-pink-500' },
  published: { label: 'Publicada', variant: 'default', color: 'bg-violet-500' },
};

// Mapeamento de motivos de abertura
const OPENING_REASONS: Record<string, string> = {
  replacement: 'Substituição',
  expansion: 'Aumento de Quadro',
  new_project: 'Novo Projeto',
  seasonal: 'Demanda Sazonal',
  other: 'Outro',
};

// Helper para obter iniciais
const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

interface JobRequestData {
  id: string;
  position_title: string;
  department: string | null;
  opening_reason: string;
  opening_reason_detail: string | null;
  job_type: string;
  location: string;
  city: string | null;
  state: string | null;
  salary_min: number | null;
  salary_max: number | null;
  status: string;
  current_stage: number;
  created_at: string;
  created_by: string;
  company_id: string;
  requisition_approved_by: string | null;
  requisition_approved_at: string | null;
  requisition_rejection_reason: string | null;
  review_approved_by: string | null;
  review_approved_at: string | null;
  review_rejection_reason: string | null;
  desired_profile: string | null;
}

interface HistoryEntry {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  details?: string;
}

// Painel para etapas de requisição
function RequestStageDialog({ 
  stageId, 
  itemId, 
  onClose,
  onRefresh 
}: { 
  stageId: string; 
  itemId: string; 
  onClose: () => void;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { isOwner } = useCompanyRole();
  const { hasPermission } = usePermissions();
  
  const [request, setRequest] = useState<JobRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState('');
  const [creatorProfile, setCreatorProfile] = useState<{ name: string } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    loadRequestData();
  }, [itemId]);

  const loadRequestData = async () => {
    try {
      // Carregar dados da requisição
      const { data: requestData, error: requestError } = await supabase
        .from('job_requests')
        .select('*')
        .eq('id', itemId)
        .single();

      if (requestError) throw requestError;
      setRequest(requestData);

      // Carregar perfil do criador
      if (requestData?.created_by) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', requestData.created_by)
          .single();
        
        setCreatorProfile(profileData);
      }

      // Montar histórico baseado nos timestamps da requisição
      const historyEntries: HistoryEntry[] = [];
      
      if (requestData?.created_at) {
        historyEntries.push({
          id: '1',
          action: 'Criou e enviou para aprovação',
          timestamp: requestData.created_at,
          user: creatorProfile?.name || 'Usuário'
        });
      }
      
      if (requestData?.requisition_approved_at) {
        historyEntries.push({
          id: '2',
          action: requestData.status === 'rejected' ? 'Rejeitou a requisição' : 'Aprovou a requisição',
          timestamp: requestData.requisition_approved_at,
          user: 'Aprovador',
          details: requestData.requisition_rejection_reason || undefined
        });
      }
      
      if (requestData?.review_approved_at) {
        historyEntries.push({
          id: '3',
          action: 'Aprovou e publicou a vaga',
          timestamp: requestData.review_approved_at,
          user: 'Aprovador'
        });
      }

      setHistory(historyEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (error) {
      console.error('Error loading request:', error);
      toast.error('Erro ao carregar requisição');
    } finally {
      setLoading(false);
    }
  };

  // Permissões
  const canApprove = isOwner || hasPermission('approve_vagas');
  const canReject = isOwner || hasPermission('reject_vagas');
  const canEdit = isOwner || hasPermission('edit_vagas');

  // Ações
  const handleApprove = async () => {
    if (!request) return;
    setActionLoading(true);
    
    try {
      if (request.status === 'pending_approval') {
        await supabase
          .from('job_requests')
          .update({
            status: 'approved',
            current_stage: 3,
            requisition_approved_by: user?.id,
            requisition_approved_at: new Date().toISOString()
          })
          .eq('id', itemId);
        
        toast.success('Requisição aprovada com sucesso!');
      } else if (request.status === 'pending_review') {
        // Buscar nome da empresa
        const { data: profileData } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('id', request.company_id)
          .single();

        // Criar a vaga
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .insert({
            company_id: request.company_id,
            company_name: profileData?.company_name || 'Empresa',
            title: request.position_title,
            description: request.desired_profile || '',
            job_type: request.job_type,
            location: request.location,
            city: request.city,
            state: request.state,
            salary_min: request.salary_min,
            salary_max: request.salary_max,
            is_active: true,
            job_request_id: itemId
          })
          .select()
          .single();

        if (jobError) throw jobError;

        // Atualizar requisição
        await supabase
          .from('job_requests')
          .update({
            status: 'published',
            current_stage: 5,
            published_job_id: jobData.id,
            published_at: new Date().toISOString(),
            review_approved_by: user?.id,
            review_approved_at: new Date().toISOString()
          })
          .eq('id', itemId);

        toast.success('Vaga aprovada e publicada!');
      }
      
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Erro ao aprovar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    if (!comments.trim()) {
      toast.error('Adicione um comentário explicando a rejeição');
      return;
    }
    
    setActionLoading(true);
    
    try {
      if (request.status === 'pending_approval') {
        await supabase
          .from('job_requests')
          .update({
            status: 'rejected',
            requisition_rejection_reason: comments
          })
          .eq('id', itemId);
      } else if (request.status === 'pending_review') {
        await supabase
          .from('job_requests')
          .update({
            status: 'in_creation',
            current_stage: 3,
            review_rejection_reason: comments
          })
          .eq('id', itemId);
      }
      
      toast.success('Requisição rejeitada');
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Erro ao rejeitar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestAdjustments = async () => {
    if (!request) return;
    
    setActionLoading(true);
    
    try {
      const newStatus = request.status === 'pending_approval' ? 'draft' : 'in_creation';
      await supabase
        .from('job_requests')
        .update({
          status: newStatus,
          current_stage: newStatus === 'draft' ? 1 : 3
        })
        .eq('id', itemId);
      
      toast.success('Requisição devolvida para ajustes');
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error requesting adjustments:', error);
      toast.error('Erro ao solicitar ajustes');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/company/job-requests/${itemId}`);
    onClose();
  };

  const handleSubmitForApproval = async () => {
    if (!request) return;
    
    setActionLoading(true);
    
    try {
      const newStatus = request.status === 'draft' ? 'pending_approval' : 'pending_review';
      await supabase
        .from('job_requests')
        .update({
          status: newStatus,
          current_stage: newStatus === 'pending_approval' ? 2 : 4
        })
        .eq('id', itemId);
      
      toast.success(newStatus === 'pending_approval' ? 'Enviado para aprovação!' : 'Enviado para revisão final!');
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error('Erro ao enviar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartCreation = async () => {
    if (!request) return;
    
    setActionLoading(true);
    
    try {
      await supabase
        .from('job_requests')
        .update({
          status: 'in_creation',
          current_stage: 3
        })
        .eq('id', itemId);
      
      toast.success('Iniciando criação da vaga');
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error starting creation:', error);
      toast.error('Erro ao iniciar');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!request) return null;

  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.draft;
  const showApprovalActions = (request.status === 'pending_approval' || request.status === 'pending_review') && canApprove;
  const showEditActions = (request.status === 'draft' || request.status === 'in_creation') && canEdit;
  const showStartCreation = request.status === 'approved' && canEdit;

  return (
    <div className="space-y-6">
      {/* Header com título e status */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{request.position_title}</h2>
        </div>
        <Badge className={`${statusConfig.color} text-white`}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Informações principais em grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Gestor Solicitante</p>
          <p className="font-medium">{creatorProfile?.name || 'Carregando...'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Quantidade de Vagas</p>
          <p className="font-medium">1</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Motivo</p>
          <p className="font-medium">{OPENING_REASONS[request.opening_reason] || request.opening_reason}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Tipo de Vaga</p>
          <p className="font-medium">{request.job_type === 'full-time' ? 'CLT' : request.job_type}</p>
        </div>
      </div>

      {/* Departamento */}
      {request.department && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Departamento</p>
          <p className="font-medium">{request.department}</p>
        </div>
      )}

      {/* Localização e Salário */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{request.city ? `${request.city}, ${request.state}` : request.location}</span>
        </div>
        {(request.salary_min || request.salary_max) && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {request.salary_min && request.salary_max 
                ? `R$ ${request.salary_min.toLocaleString()} - R$ ${request.salary_max.toLocaleString()}`
                : request.salary_min 
                  ? `A partir de R$ ${request.salary_min.toLocaleString()}`
                  : `Até R$ ${request.salary_max?.toLocaleString()}`
              }
            </span>
          </div>
        )}
      </div>

      {/* Seção de comentários para ações */}
      {showApprovalActions && (
        <div className="space-y-2">
          <Label htmlFor="comments">Comentários (opcional)</Label>
          <Textarea
            id="comments"
            placeholder="Adicione comentários sobre a decisão..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
          />
        </div>
      )}

      {/* Motivo de rejeição (se houver) */}
      {request.requisition_rejection_reason && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm font-medium text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Motivo da Rejeição
          </p>
          <p className="text-sm mt-1">{request.requisition_rejection_reason}</p>
        </div>
      )}

      {request.review_rejection_reason && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-sm font-medium text-amber-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Ajustes Solicitados
          </p>
          <p className="text-sm mt-1">{request.review_rejection_reason}</p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-3">
        {showApprovalActions && (
          <>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reprovar
            </Button>
            <Button
              variant="outline"
              onClick={handleRequestAdjustments}
              disabled={actionLoading}
              className="flex-1"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Solicitar Ajustes
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {request.status === 'pending_review' ? 'Aprovar e Publicar' : 'Aprovar'}
            </Button>
          </>
        )}

        {showEditActions && (
          <>
            <Button
              variant="outline"
              onClick={handleEdit}
              disabled={actionLoading}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Requisição
            </Button>
            <Button
              onClick={handleSubmitForApproval}
              disabled={actionLoading}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              {request.status === 'draft' ? 'Enviar para Aprovação' : 'Enviar para Revisão'}
            </Button>
          </>
        )}

        {showStartCreation && (
          <>
            <Button
              variant="outline"
              onClick={handleEdit}
              disabled={actionLoading}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalhes
            </Button>
            <Button
              onClick={handleStartCreation}
              disabled={actionLoading}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar Criação da Vaga
            </Button>
          </>
        )}
      </div>

      <Separator />

      {/* Histórico de Aprovações */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <History className="h-4 w-4" />
          Histórico de Aprovações
        </h3>
        
        <div className="space-y-3">
          {history.length > 0 ? (
            history.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.user} • {new Date(entry.timestamp).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {entry.details && (
                    <p className="text-xs text-muted-foreground mt-1 italic">"{entry.details}"</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum histórico disponível</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Painel para vagas publicadas (candidatos)
function PublishedJobDialog({ 
  stageId, 
  jobId,
  stageTitle,
  onClose,
  onRefresh 
}: { 
  stageId: string; 
  jobId: string;
  stageTitle: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [jobId, stageId]);

  const loadData = async () => {
    try {
      // Carregar job
      const { data: jobData } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      setJob(jobData);

      // Carregar candidatos da etapa
      let query = supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId);

      // Filtrar por etapa
      if (stageId === 'screening' || stageId === 'published') {
        query = query.in('status', ['pending', 'screening']);
      } else if (stageId === 'hiring') {
        query = query.eq('status', 'approved');
      } else {
        query = query.eq('current_stage', stageId);
      }

      const { data: appData, error } = await query;
      if (error) throw error;
      
      setApplications(appData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProcess = () => {
    navigate(`/company/selection-process/${jobId}`);
    onClose();
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{job?.title || 'Vaga'}</h2>
          <p className="text-sm text-muted-foreground mt-1">Etapa: {stageTitle}</p>
        </div>
        <Badge className="bg-violet-500 text-white">
          {applications.length} candidato(s)
        </Badge>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{applications.length}</p>
              <p className="text-xs text-muted-foreground">Total na etapa</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {applications.length > 0 
                  ? Math.round(applications.reduce((acc, a) => acc + (a.score || 0), 0) / applications.length)
                  : 0}
              </p>
              <p className="text-xs text-muted-foreground">Score médio</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{applications.filter(a => a.is_favorite).length}</p>
              <p className="text-xs text-muted-foreground">Favoritos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de candidatos */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Candidatos nesta etapa
        </h3>
        
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {applications.length > 0 ? (
              applications
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((app) => (
                  <div key={app.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(app.candidate_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{app.candidate_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.candidate_email}</p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1">
                          <span className={`font-bold text-sm ${getScoreColor(app.score)}`}>
                            {app.score || 0}
                          </span>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Score de compatibilidade</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum candidato nesta etapa</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Botão de ação principal */}
      <Button onClick={handleViewProcess} className="w-full">
        <Eye className="h-4 w-4 mr-2" />
        Ver Processo Seletivo Completo
      </Button>
    </div>
  );
}

export function StagePanel({ 
  open, 
  onOpenChange, 
  stageId, 
  stageTitle, 
  itemId, 
  itemType,
  itemTitle,
  onRefresh 
}: StagePanelProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>{itemTitle}</DialogTitle>
        </DialogHeader>
        
        {itemType === 'request' ? (
          <RequestStageDialog 
            stageId={stageId} 
            itemId={itemId} 
            onClose={handleClose}
            onRefresh={onRefresh}
          />
        ) : (
          <PublishedJobDialog 
            stageId={stageId} 
            jobId={itemId}
            stageTitle={stageTitle}
            onClose={handleClose}
            onRefresh={onRefresh}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}