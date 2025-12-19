import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { AddUserModal } from '@/components/company/AddUserModal';
import { EditPermissionsModal } from '@/components/company/EditPermissionsModal';
import { AuditLogs } from '@/components/company/AuditLogs';
import { PermissionInfo } from '@/components/company/PermissionInfo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

export default function Permissions() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user, refreshKey]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_users')
        .select('*')
        .eq('company_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('company_users')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Registrar log de auditoria
      await supabase.from('audit_logs').insert({
        company_id: user?.id,
        company_user_id: selectedUser.id,
        action: `Usuário ${selectedUser.name} foi removido`,
        changed_by: user?.id,
      });

      toast({
        title: 'Usuário removido',
        description: 'O usuário foi removido com sucesso.',
      });

      setRefreshKey(prev => prev + 1);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao remover usuário',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditPermissions = (user: CompanyUser) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (user: CompanyUser) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  // Bloquear acesso se não for owner
  if (roleLoading) {
    return (
      <CompanyLayout title="Carregando...">
        <div className="text-center py-12">Verificando permissões...</div>
      </CompanyLayout>
    );
  }

  if (!isOwner) {
    return (
      <CompanyLayout title="Acesso Negado">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Apenas o gestor da empresa pode acessar esta página. Entre em contato com o administrador.
          </AlertDescription>
        </Alert>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout
      title="Permissões"
      description="Gerencie usuários e permissões de acesso"
    >
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="info">Como Funciona</TabsTrigger>
          <TabsTrigger value="logs">Logs de Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              Adicione e gerencie usuários vinculados à empresa
            </p>
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Usuário
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Nenhum usuário cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'ativo' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPermissions(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="info">
          <PermissionInfo />
        </TabsContent>

        <TabsContent value="logs">
          <AuditLogs />
        </TabsContent>
      </Tabs>

      <AddUserModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
          setAddModalOpen(false);
        }}
      />

      {selectedUser && (
        <EditPermissionsModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          user={selectedUser}
          onSuccess={() => {
            setRefreshKey(prev => prev + 1);
            setEditModalOpen(false);
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o usuário {selectedUser?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CompanyLayout>
  );
}
