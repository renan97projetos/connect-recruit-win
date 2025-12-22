import { useEffect, useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/BackofficeLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useBackofficeAuth } from '@/contexts/BackofficeAuthContext';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Search, MoreVertical, Pencil, Ban, CheckCircle, Trash2, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Tenant {
  id: string;
  company_id: string;
  company_name: string;
  company_email: string;
  company_phone: string | null;
  cnpj: string | null;
  status: string;
  plan_id: string | null;
  created_at: string;
  notes: string | null;
  platform_plans?: { name: string } | null;
}

interface Plan {
  id: string;
  name: string;
}

export default function BackofficeTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    cnpj: '',
    plan_id: '',
    notes: '',
  });
  const { user } = useBackofficeAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTenants();
    fetchPlans();
  }, []);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, platform_plans(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: 'Erro ao carregar empresas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data } = await supabase
        .from('platform_plans')
        .select('id, name')
        .eq('is_active', true);
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleCreateTenant = async () => {
    try {
      const { error } = await supabase.from('tenants').insert({
        company_id: crypto.randomUUID(),
        company_name: formData.company_name,
        company_email: formData.company_email,
        company_phone: formData.company_phone || null,
        cnpj: formData.cnpj || null,
        plan_id: formData.plan_id || null,
        notes: formData.notes || null,
        status: 'active',
      });

      if (error) throw error;

      // Log de auditoria
      await supabase.from('backoffice_audit_logs').insert({
        super_admin_id: user?.id,
        action: 'CREATE',
        entity_type: 'tenant',
        new_data: formData,
      });

      toast({ title: 'Empresa criada com sucesso!' });
      setIsCreateOpen(false);
      resetForm();
      fetchTenants();
    } catch (error) {
      console.error('Error creating tenant:', error);
      toast({
        title: 'Erro ao criar empresa',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTenant = async () => {
    if (!selectedTenant) return;

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          company_name: formData.company_name,
          company_email: formData.company_email,
          company_phone: formData.company_phone || null,
          cnpj: formData.cnpj || null,
          plan_id: formData.plan_id || null,
          notes: formData.notes || null,
        })
        .eq('id', selectedTenant.id);

      if (error) throw error;

      // Log de auditoria
      await supabase.from('backoffice_audit_logs').insert({
        super_admin_id: user?.id,
        action: 'UPDATE',
        entity_type: 'tenant',
        entity_id: selectedTenant.id,
        old_data: selectedTenant,
        new_data: formData,
      });

      toast({ title: 'Empresa atualizada com sucesso!' });
      setIsEditOpen(false);
      setSelectedTenant(null);
      resetForm();
      fetchTenants();
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast({
        title: 'Erro ao atualizar empresa',
        variant: 'destructive',
      });
    }
  };

  const handleChangeStatus = async (tenant: Tenant, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ status: newStatus })
        .eq('id', tenant.id);

      if (error) throw error;

      // Log de auditoria
      await supabase.from('backoffice_audit_logs').insert({
        super_admin_id: user?.id,
        action: 'STATUS_CHANGE',
        entity_type: 'tenant',
        entity_id: tenant.id,
        old_data: { status: tenant.status },
        new_data: { status: newStatus },
      });

      toast({ title: `Status alterado para ${newStatus}` });
      fetchTenants();
    } catch (error) {
      console.error('Error changing status:', error);
      toast({
        title: 'Erro ao alterar status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(`Tem certeza que deseja excluir ${tenant.company_name}?`)) return;

    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenant.id);

      if (error) throw error;

      // Log de auditoria
      await supabase.from('backoffice_audit_logs').insert({
        super_admin_id: user?.id,
        action: 'DELETE',
        entity_type: 'tenant',
        entity_id: tenant.id,
        old_data: tenant,
      });

      toast({ title: 'Empresa excluída com sucesso!' });
      fetchTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast({
        title: 'Erro ao excluir empresa',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      company_email: '',
      company_phone: '',
      cnpj: '',
      plan_id: '',
      notes: '',
    });
  };

  const openEditModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      company_name: tenant.company_name,
      company_email: tenant.company_email,
      company_phone: tenant.company_phone || '',
      cnpj: tenant.cnpj || '',
      plan_id: tenant.plan_id || '',
      notes: tenant.notes || '',
    });
    setIsEditOpen(true);
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.company_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-500/10 text-green-500',
      suspended: 'bg-orange-500/10 text-orange-500',
      blocked: 'bg-red-500/10 text-red-500',
      trial: 'bg-blue-500/10 text-blue-500',
      cancelled: 'bg-slate-500/10 text-slate-500',
    };
    const labels: Record<string, string> = {
      active: 'Ativa',
      suspended: 'Suspensa',
      blocked: 'Bloqueada',
      trial: 'Trial',
      cancelled: 'Cancelada',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Empresas</h1>
            <p className="text-muted-foreground">Gerencie as empresas da plataforma</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Nova Empresa</DialogTitle>
                <DialogDescription>Preencha os dados da nova empresa</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Empresa *</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.company_email}
                    onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.company_phone}
                    onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select
                    value={formData.plan_id}
                    onValueChange={(value) => setFormData({ ...formData, plan_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notas internas..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTenant} disabled={!formData.company_name || !formData.company_email}>
                  Criar Empresa
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspensas</SelectItem>
                  <SelectItem value="blocked">Bloqueadas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma empresa encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tenant.company_name}</p>
                          <p className="text-sm text-muted-foreground">{tenant.company_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{tenant.platform_plans?.name || '-'}</TableCell>
                      <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                      <TableCell>
                        {format(new Date(tenant.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(tenant)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {tenant.status === 'active' && (
                              <DropdownMenuItem onClick={() => handleChangeStatus(tenant, 'suspended')}>
                                <Ban className="w-4 h-4 mr-2" />
                                Suspender
                              </DropdownMenuItem>
                            )}
                            {tenant.status === 'suspended' && (
                              <DropdownMenuItem onClick={() => handleChangeStatus(tenant, 'active')}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Ativar
                              </DropdownMenuItem>
                            )}
                            {tenant.status !== 'blocked' && (
                              <DropdownMenuItem onClick={() => handleChangeStatus(tenant, 'blocked')}>
                                <Ban className="w-4 h-4 mr-2 text-destructive" />
                                Bloquear
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDeleteTenant(tenant)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Empresa</DialogTitle>
              <DialogDescription>Atualize os dados da empresa</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Empresa *</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.company_email}
                  onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.company_phone}
                  onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select
                  value={formData.plan_id}
                  onValueChange={(value) => setFormData({ ...formData, plan_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateTenant}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BackofficeLayout>
  );
}
