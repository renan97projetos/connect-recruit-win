import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { CompanyLayout } from '@/components/CompanyLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Eye, Clock, CheckCircle, XCircle, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface JobRequest {
  id: string;
  position_title: string;
  opening_reason: string;
  department: string;
  status: string;
  current_stage: number;
  created_at: string;
}

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', color: 'secondary', icon: FileText },
  pending_approval: { label: 'Aguardando Aprovação', color: 'default', icon: Clock },
  approved: { label: 'Aprovado', color: 'default', icon: CheckCircle },
  rejected: { label: 'Rejeitado', color: 'destructive', icon: XCircle },
  in_creation: { label: 'Em Criação', color: 'default', icon: FileText },
  pending_review: { label: 'Aguardando Revisão', color: 'default', icon: Clock },
  published: { label: 'Publicado', color: 'default', icon: CheckCircle }
};

const STAGE_NAMES = [
  'Solicitação',
  'Aprovação da Requisição',
  'Criação da Vaga',
  'Revisão da Vaga',
  'Publicação'
];

export default function JobRequests() {
  const navigate = useNavigate();
  const { user, userRole } = useSupabaseAuth();
  const { companyId, loading: roleLoading } = useCompanyRole();
  const { hasPermission } = usePermissions();
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && (userRole === 'company' || userRole === 'admin') && companyId && !roleLoading) {
      fetchRequests();
    }
  }, [user, userRole, companyId, roleLoading]);

  const handleDeleteRequest = async (requestId: string) => {
    setDeletingId(requestId);
    try {
      const { error } = await supabase
        .from('job_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Requisição excluída com sucesso!');
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast.error('Erro ao excluir requisição');
    } finally {
      setDeletingId(null);
    }
  };

  const canDeleteRequest = (status: string) => {
    return status === 'draft' || status === 'rejected';
  };

  const fetchRequests = async () => {
    try {
      console.log('📋 Fetching requests for company:', companyId);
      
      const { data, error } = await supabase
        .from('job_requests')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('📋 Requests found:', data?.length);
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching job requests:', error);
      toast.error('Erro ao carregar requisições');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getReasonLabel = (reason: string) => {
    const reasons = {
      replacement: 'Substituição',
      expansion: 'Aumento de Quadro',
      new_project: 'Novo Projeto',
      seasonal: 'Sazonal',
      other: 'Outro'
    };
    return reasons[reason as keyof typeof reasons] || reason;
  };

  return (
    <CompanyLayout
      title="Criação de Vagas"
      description="Gerencie as solicitações de abertura de vagas"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              Total de requisições: {requests.length}
            </p>
          </div>
          <PermissionGuard permission="create_vagas" showAlert={false}>
            <Button onClick={() => navigate('/company/job-requests/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Requisição
            </Button>
          </PermissionGuard>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma requisição encontrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece criando uma nova requisição de vaga
              </p>
              <PermissionGuard permission="create_vagas" showAlert={false}>
                <Button onClick={() => navigate('/company/job-requests/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Requisição
                </Button>
              </PermissionGuard>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{request.position_title}</CardTitle>
                      <CardDescription>
                        {request.department && `${request.department} • `}
                        {getReasonLabel(request.opening_reason)}
                      </CardDescription>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Etapa atual: {STAGE_NAMES[request.current_stage - 1]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criado em {new Date(request.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/company/job-requests/${request.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </Button>
                      
                      {canDeleteRequest(request.status) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Requisição</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a requisição "{request.position_title}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteRequest(request.id)}
                                disabled={deletingId === request.id}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deletingId === request.id ? 'Excluindo...' : 'Excluir'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CompanyLayout>
  );
}
