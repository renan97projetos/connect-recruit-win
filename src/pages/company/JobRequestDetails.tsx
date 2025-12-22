import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface JobRequest {
  id: string;
  position_title: string;
  opening_reason: string;
  opening_reason_detail: string;
  department: string;
  desired_profile: string;
  requirements: string[];
  responsibilities: string[];
  job_type: string;
  location: string;
  city: string;
  state: string;
  salary_min: number;
  salary_max: number;
  status: string;
  current_stage: number;
  job_description: string;
  benefits: string[];
  requisition_rejection_reason: string;
  review_rejection_reason: string;
  created_at: string;
  company_id: string;
}

export default function JobRequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useSupabaseAuth();
  const { isOwner } = useCompanyRole();
  const [request, setRequest] = useState<JobRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectAction, setRejectAction] = useState<'requisition' | 'review'>('requisition');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (id && user && userRole) {
      fetchRequest();
    }
  }, [id, user, userRole]);

  const fetchRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('job_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setRequest(data);
    } catch (error: any) {
      console.error('Error fetching request:', error);
      toast.error('Erro ao carregar requisição');
      navigate('/company/job-requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequisition = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('job_requests')
        .update({
          status: 'approved',
          current_stage: 3,
          requisition_approved_by: user?.id,
          requisition_approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Requisição aprovada com sucesso!');
      fetchRequest();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error('Erro ao aprovar requisição');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequisition = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('job_requests')
        .update({
          status: 'rejected',
          requisition_rejection_reason: rejectionReason
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Requisição rejeitada');
      setShowRejectDialog(false);
      setRejectionReason('');
      fetchRequest();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error('Erro ao rejeitar requisição');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveReview = async () => {
    setActionLoading(true);
    try {
      // Buscar nome da empresa do perfil do DONO da requisição (não do admin)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', request?.company_id)
        .single();

      // Criar a vaga no sistema - a vaga pertence à empresa (company_id da requisição)
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          company_id: request?.company_id,
          company_name: profileData?.company_name || 'Empresa',
          title: request?.position_title,
          description: request?.job_description || request?.desired_profile,
          requirements: request?.requirements || [],
          responsibilities: request?.responsibilities || [],
          job_type: request?.job_type,
          location: request?.location,
          city: request?.city,
          state: request?.state,
          salary_min: request?.salary_min,
          salary_max: request?.salary_max,
          benefits: request?.benefits || [],
          is_active: true,
          job_request_id: id
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Atualizar a requisição
      const { error: updateError } = await supabase
        .from('job_requests')
        .update({
          status: 'published',
          current_stage: 5,
          published_job_id: jobData.id,
          published_at: new Date().toISOString(),
          review_approved_by: user?.id,
          review_approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Vaga aprovada e publicada com sucesso!');
      navigate('/company/jobs');
    } catch (error: any) {
      console.error('Error publishing job:', error);
      toast.error('Erro ao publicar vaga');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectReview = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('job_requests')
        .update({
          status: 'in_creation',
          current_stage: 3,
          review_rejection_reason: rejectionReason
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Vaga rejeitada, retornando para edição');
      setShowRejectDialog(false);
      setRejectionReason('');
      fetchRequest();
    } catch (error: any) {
      console.error('Error rejecting review:', error);
      toast.error('Erro ao rejeitar revisão');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('job_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Requisição excluída com sucesso!');
      navigate('/company/job-requests');
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast.error('Erro ao excluir requisição');
    } finally {
      setActionLoading(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <CompanyLayout title="Carregando...">
        <div className="text-center py-12">Carregando detalhes...</div>
      </CompanyLayout>
    );
  }

  if (!request) {
    return null;
  }

  const isAdmin = userRole === 'admin';
  const isCompanyOwnerForRequest = user?.id === request.company_id;
  
  // OWNER da empresa ou Admin podem aprovar/rejeitar requisições
  // O OWNER pode aprovar requisições de sua própria empresa
  const canApproveRequisition = (isAdmin || (isOwner && isCompanyOwnerForRequest)) && request.status === 'pending_approval';
  const canApproveReview = (isAdmin || (isOwner && isCompanyOwnerForRequest)) && request.status === 'pending_review';
  
  // Verifica se está aguardando aprovação (para colaboradores que não podem aprovar)
  const isWaitingApproval = !isAdmin && !isOwner && (
    request.status === 'pending_approval' || 
    request.status === 'pending_review'
  );
  
  // OWNER e Admin podem excluir qualquer requisição
  // Colaboradores só podem excluir rascunhos ou rejeitados que eles criaram
  const canDeleteRequest = isAdmin || (isOwner && isCompanyOwnerForRequest) || (
    isCompanyOwnerForRequest && (
      request.status === 'draft' || 
      request.status === 'rejected'
    )
  );

  return (
    <CompanyLayout title={request.position_title}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/company/job-requests')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          
          {canDeleteRequest && (
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Requisição
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir esta requisição? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteRequest}
                    disabled={actionLoading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {actionLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Mensagem para colaboradores aguardando aprovação */}
        {isWaitingApproval && (
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Aguardando Aprovação
              </CardTitle>
              <CardDescription className="text-amber-600 dark:text-amber-300">
                {request.status === 'pending_approval' 
                  ? 'Esta requisição está aguardando aprovação do responsável.'
                  : 'Esta vaga está aguardando revisão e publicação.'}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Ações de Aprovação/Rejeição - OWNER ou ADMIN */}
        {(canApproveRequisition || canApproveReview) && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Ações Necessárias</CardTitle>
              <CardDescription>
                {canApproveRequisition && 'Você precisa aprovar ou rejeitar esta requisição de vaga.'}
                {canApproveReview && 'Você precisa revisar e publicar esta vaga.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button
                onClick={canApproveRequisition ? handleApproveRequisition : handleApproveReview}
                disabled={actionLoading}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {canApproveRequisition ? 'Aprovar Requisição' : 'Aprovar e Publicar Vaga'}
              </Button>
              
              <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    onClick={() => setRejectAction(canApproveRequisition ? 'requisition' : 'review')}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rejeitar {rejectAction === 'requisition' ? 'Requisição' : 'Revisão'}</DialogTitle>
                    <DialogDescription>
                      Informe o motivo da rejeição
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Justificativa</Label>
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Descreva o motivo da rejeição..."
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end gap-4">
                      <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={rejectAction === 'requisition' ? handleRejectRequisition : handleRejectReview}
                        disabled={actionLoading}
                      >
                        Confirmar Rejeição
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Status e Estágio */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Status da Requisição</CardTitle>
                <CardDescription>Etapa {request.current_stage} de 5</CardDescription>
              </div>
              <Badge>{request.status}</Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Motivo da Abertura</Label>
                <p className="text-sm">{request.opening_reason}</p>
              </div>
              <div>
                <Label>Departamento</Label>
                <p className="text-sm">{request.department || '-'}</p>
              </div>
            </div>
            {request.opening_reason_detail && (
              <div>
                <Label>Detalhes do Motivo</Label>
                <p className="text-sm">{request.opening_reason_detail}</p>
              </div>
            )}
            <div>
              <Label>Perfil Desejado</Label>
              <p className="text-sm whitespace-pre-wrap">{request.desired_profile}</p>
            </div>
          </CardContent>
        </Card>

        {/* Requisitos e Responsabilidades */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Posição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tipo de Contrato</Label>
              <p className="text-sm">{request.job_type}</p>
            </div>
            <div>
              <Label>Requisitos</Label>
              <ul className="list-disc list-inside space-y-1">
                {request.requirements?.map((req, index) => (
                  <li key={index} className="text-sm">{req}</li>
                ))}
              </ul>
            </div>
            <div>
              <Label>Responsabilidades</Label>
              <ul className="list-disc list-inside space-y-1">
                {request.responsibilities?.map((resp, index) => (
                  <li key={index} className="text-sm">{resp}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Localização e Salário */}
        <Card>
          <CardHeader>
            <CardTitle>Localização e Remuneração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Localização</Label>
                <p className="text-sm capitalize">{request.location}</p>
                {request.city && <p className="text-sm text-muted-foreground">{request.city}, {request.state}</p>}
              </div>
              <div>
                <Label>Faixa Salarial</Label>
                <p className="text-sm">
                  {request.salary_min && request.salary_max
                    ? `R$ ${request.salary_min.toLocaleString()} - R$ ${request.salary_max.toLocaleString()}`
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Motivos de Rejeição */}
        {request.requisition_rejection_reason && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Motivo da Rejeição (Requisição)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{request.requisition_rejection_reason}</p>
            </CardContent>
          </Card>
        )}

        {request.review_rejection_reason && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Motivo da Rejeição (Revisão)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{request.review_rejection_reason}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </CompanyLayout>
  );
}
