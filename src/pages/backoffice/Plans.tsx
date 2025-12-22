import { useEffect, useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/BackofficeLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useBackofficeAuth } from '@/contexts/BackofficeAuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, CreditCard, Users, Briefcase, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  max_users: number;
  max_jobs: number;
  max_employees: number;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_active: boolean;
}

export default function BackofficePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    max_users: 10,
    max_jobs: 50,
    max_employees: 100,
    price_monthly: 0,
    price_yearly: 0,
    features: '',
    is_active: true,
  });
  const { user } = useBackofficeAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(
        data?.map((p) => ({
          ...p,
          features: Array.isArray(p.features) ? (p.features as string[]) : [],
        })) || []
      );
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Erro ao carregar planos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      const featuresArray = formData.features
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f);

      const { error } = await supabase.from('platform_plans').insert({
        name: formData.name,
        description: formData.description || null,
        max_users: formData.max_users,
        max_jobs: formData.max_jobs,
        max_employees: formData.max_employees,
        price_monthly: formData.price_monthly,
        price_yearly: formData.price_yearly,
        features: featuresArray,
        is_active: formData.is_active,
      });

      if (error) throw error;

      await supabase.from('backoffice_audit_logs').insert({
        super_admin_id: user?.id,
        action: 'CREATE',
        entity_type: 'plan',
        new_data: formData,
      });

      toast({ title: 'Plano criado com sucesso!' });
      setIsCreateOpen(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error('Error creating plan:', error);
      toast({
        title: 'Erro ao criar plano',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return;

    try {
      const featuresArray = formData.features
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f);

      const { error } = await supabase
        .from('platform_plans')
        .update({
          name: formData.name,
          description: formData.description || null,
          max_users: formData.max_users,
          max_jobs: formData.max_jobs,
          max_employees: formData.max_employees,
          price_monthly: formData.price_monthly,
          price_yearly: formData.price_yearly,
          features: featuresArray,
          is_active: formData.is_active,
        })
        .eq('id', selectedPlan.id);

      if (error) throw error;

      await supabase.from('backoffice_audit_logs').insert({
        super_admin_id: user?.id,
        action: 'UPDATE',
        entity_type: 'plan',
        entity_id: selectedPlan.id,
        old_data: selectedPlan,
        new_data: formData,
      });

      toast({ title: 'Plano atualizado com sucesso!' });
      setIsEditOpen(false);
      setSelectedPlan(null);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: 'Erro ao atualizar plano',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePlan = async (plan: Plan) => {
    if (!confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) return;

    try {
      const { error } = await supabase.from('platform_plans').delete().eq('id', plan.id);

      if (error) throw error;

      await supabase.from('backoffice_audit_logs').insert({
        super_admin_id: user?.id,
        action: 'DELETE',
        entity_type: 'plan',
        entity_id: plan.id,
        old_data: plan,
      });

      toast({ title: 'Plano excluído com sucesso!' });
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: 'Erro ao excluir plano',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      max_users: 10,
      max_jobs: 50,
      max_employees: 100,
      price_monthly: 0,
      price_yearly: 0,
      features: '',
      is_active: true,
    });
  };

  const openEditModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      max_users: plan.max_users,
      max_jobs: plan.max_jobs,
      max_employees: plan.max_employees,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      features: plan.features.join('\n'),
      is_active: plan.is_active,
    });
    setIsEditOpen(true);
  };

  const formatLimit = (value: number) => {
    return value === -1 ? 'Ilimitado' : value.toLocaleString('pt-BR');
  };

  const PlanForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Professional"
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label>Ativo</Label>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição do plano"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Máx. Usuários</Label>
          <Input
            type="number"
            value={formData.max_users}
            onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 0 })}
            placeholder="-1 para ilimitado"
          />
        </div>
        <div className="space-y-2">
          <Label>Máx. Vagas</Label>
          <Input
            type="number"
            value={formData.max_jobs}
            onChange={(e) => setFormData({ ...formData, max_jobs: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Máx. Colaboradores</Label>
          <Input
            type="number"
            value={formData.max_employees}
            onChange={(e) => setFormData({ ...formData, max_employees: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Preço Mensal (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.price_monthly}
            onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Preço Anual (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.price_yearly}
            onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Funcionalidades (uma por linha)</Label>
        <Textarea
          value={formData.features}
          onChange={(e) => setFormData({ ...formData, features: e.target.value })}
          placeholder="Acesso completo&#10;Suporte prioritário&#10;Relatórios avançados"
          rows={4}
        />
      </div>
    </div>
  );

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Planos</h1>
            <p className="text-muted-foreground">Gerencie os planos da plataforma</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Novo Plano</DialogTitle>
                <DialogDescription>Configure os limites e preços do plano</DialogDescription>
              </DialogHeader>
              <PlanForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePlan} disabled={!formData.name}>
                  Criar Plano
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-40 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(plan)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePlan(plan)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{plan.description || 'Sem descrição'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4 border-y">
                    <p className="text-3xl font-bold">
                      R$ {plan.price_monthly.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-sm text-muted-foreground">/mês</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ou R$ {plan.price_yearly.toLocaleString('pt-BR')}/ano
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{formatLimit(plan.max_users)} usuários</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span>{formatLimit(plan.max_jobs)} vagas</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <span>{formatLimit(plan.max_employees)} colaboradores</span>
                    </div>
                  </div>

                  {plan.features.length > 0 && (
                    <div className="pt-4 border-t">
                      <ul className="space-y-1 text-sm">
                        {plan.features.slice(0, 4).map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {feature}
                          </li>
                        ))}
                        {plan.features.length > 4 && (
                          <li className="text-muted-foreground">
                            +{plan.features.length - 4} mais...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {!plan.is_active && (
                    <div className="pt-2">
                      <span className="text-xs bg-muted px-2 py-1 rounded">Inativo</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Plano</DialogTitle>
              <DialogDescription>Atualize as configurações do plano</DialogDescription>
            </DialogHeader>
            <PlanForm isEdit />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdatePlan}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BackofficeLayout>
  );
}
