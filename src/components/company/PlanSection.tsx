import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Crown, Loader2, Sparkles, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  max_users: number | null;
  max_jobs: number | null;
  max_employees: number | null;
  features: any;
}

export function PlanSection() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [{ data: plansData }, { data: tenantData }] = await Promise.all([
        supabase.from('platform_plans').select('*').eq('is_active', true).order('price_monthly', { ascending: true }),
        supabase.from('tenants').select('id, plan_id').eq('company_id', user!.id).maybeSingle(),
      ]);
      setPlans(plansData ?? []);
      setCurrentPlanId(tenantData?.plan_id ?? null);
      setTenantId(tenantData?.id ?? null);
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const currentName = (currentPlan?.name ?? 'Starter').toLowerCase();
  const isPro = currentName === 'pro';

  const handleRequestUpgrade = async (plan: Plan) => {
    setSelectedPlan(plan);
    setUpgradeOpen(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedPlan || !user) return;
    try {
      setRequesting(true);
      // Registra um lead de upgrade (não troca o plano automaticamente)
      await supabase.from('leads').insert({
        name: user.user_metadata?.name || user.email || 'Empresa',
        email: user.email!,
        message: `Solicitação de upgrade para o plano ${selectedPlan.name}. Tenant: ${tenantId ?? 'sem tenant'}.`,
        source: 'plan_upgrade_request',
        status: 'new',
      });
      toast({
        title: 'Solicitação enviada',
        description: 'Nossa equipe entrará em contato em breve para concluir o upgrade.',
      });
      setUpgradeOpen(false);
    } catch (e: any) {
      toast({
        title: 'Erro ao solicitar upgrade',
        description: e?.message ?? 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isPro ? <Crown className="h-5 w-5 text-primary" /> : <Zap className="h-5 w-5 text-primary" />}
                Plano da Conta
              </CardTitle>
              <CardDescription>Gerencie seu plano e recursos disponíveis</CardDescription>
            </div>
            <Badge variant={isPro ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              {currentPlan?.name ?? 'Starter'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentPlan && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  R$ {Number(currentPlan.price_monthly ?? 0).toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              {currentPlan.description && (
                <p className="text-sm text-muted-foreground mt-1">{currentPlan.description}</p>
              )}
              <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Vagas</p>
                  <p className="font-semibold">{currentPlan.max_jobs ?? '∞'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Usuários</p>
                  <p className="font-semibold">{currentPlan.max_users ?? '∞'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Colaboradores</p>
                  <p className="font-semibold">{currentPlan.max_employees ?? '∞'}</p>
                </div>
              </div>
            </div>
          )}

          {!isPro && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Faça upgrade para desbloquear</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {plans
                  .filter((p) => p.id !== currentPlanId && p.name.toLowerCase() !== 'starter')
                  .map((plan) => (
                    <div
                      key={plan.id}
                      className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-lg flex items-center gap-1.5">
                          <Crown className="h-4 w-4 text-primary" />
                          {plan.name}
                        </h4>
                        <Badge variant="outline" className="text-xs">Recomendado</Badge>
                      </div>
                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-xl font-bold">R$ {Number(plan.price_monthly ?? 0).toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">/mês</span>
                      </div>
                      <ul className="space-y-1.5 text-sm mb-4">
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" />
                          Workflow configurável
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" />
                          Banco de talentos & IA
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" />
                          Templates de e-mail e Career Page
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" />
                          Audit log completo
                        </li>
                      </ul>
                      <Button className="w-full" onClick={() => handleRequestUpgrade(plan)}>
                        Fazer upgrade
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {isPro && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
              <Crown className="h-5 w-5 text-primary" />
              <div className="text-sm">
                <p className="font-semibold">Você está no plano Pro</p>
                <p className="text-muted-foreground">Todos os recursos avançados estão liberados.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar upgrade para {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              Ao confirmar, nossa equipe será notificada e entrará em contato pelo seu e-mail
              cadastrado para finalizar a contratação e ativar os novos recursos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)} disabled={requesting}>
              Cancelar
            </Button>
            <Button onClick={confirmUpgrade} disabled={requesting}>
              {requesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
