import { useEffect, useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/BackofficeLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users, Briefcase, FileText, TrendingUp, DollarSign, UserPlus, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalJobs: number;
  totalApplications: number;
  monthlyRevenue: number;
  newTenantsThisMonth: number;
}

export default function BackofficeDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTenants, setRecentTenants] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Buscar estatísticas dos tenants
      const { data: tenants } = await supabase
        .from('tenants')
        .select('*');

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id', { count: 'exact' });

      const { data: applications } = await supabase
        .from('applications')
        .select('id', { count: 'exact' });

      const { data: users } = await supabase
        .from('user_roles')
        .select('id', { count: 'exact' });

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const activeTenants = tenants?.filter(t => t.status === 'active').length || 0;
      const suspendedTenants = tenants?.filter(t => t.status === 'suspended' || t.status === 'blocked').length || 0;
      const newThisMonth = tenants?.filter(t => new Date(t.created_at) >= startOfMonth).length || 0;

      // Calcular receita mensal estimada
      const { data: plans } = await supabase.from('platform_plans').select('*');
      let monthlyRevenue = 0;
      if (tenants && plans) {
        tenants.forEach(tenant => {
          if (tenant.status === 'active' && tenant.plan_id) {
            const plan = plans.find(p => p.id === tenant.plan_id);
            if (plan) {
              monthlyRevenue += Number(plan.price_monthly) || 0;
            }
          }
        });
      }

      setStats({
        totalTenants: tenants?.length || 0,
        activeTenants,
        suspendedTenants,
        totalUsers: users?.length || 0,
        totalJobs: jobs?.length || 0,
        totalApplications: applications?.length || 0,
        monthlyRevenue,
        newTenantsThisMonth: newThisMonth,
      });

      // Buscar tenants recentes
      const { data: recent } = await supabase
        .from('tenants')
        .select('*, platform_plans(name)')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentTenants(recent || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Total de Empresas', 
      value: stats?.totalTenants || 0, 
      icon: Building2, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      title: 'Empresas Ativas', 
      value: stats?.activeTenants || 0, 
      icon: TrendingUp, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    { 
      title: 'Empresas Suspensas', 
      value: stats?.suspendedTenants || 0, 
      icon: AlertTriangle, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    { 
      title: 'Total de Usuários', 
      value: stats?.totalUsers || 0, 
      icon: Users, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    { 
      title: 'Vagas Publicadas', 
      value: stats?.totalJobs || 0, 
      icon: Briefcase, 
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10'
    },
    { 
      title: 'Candidaturas', 
      value: stats?.totalApplications || 0, 
      icon: FileText, 
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10'
    },
    { 
      title: 'Receita Mensal', 
      value: `R$ ${(stats?.monthlyRevenue || 0).toLocaleString('pt-BR')}`, 
      icon: DollarSign, 
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      isText: true
    },
    { 
      title: 'Novas este Mês', 
      value: stats?.newTenantsThisMonth || 0, 
      icon: UserPlus, 
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
  ];

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
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da plataforma</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            statCards.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">
                        {stat.isText ? stat.value : stat.value.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Recent Tenants */}
        <Card>
          <CardHeader>
            <CardTitle>Empresas Recentes</CardTitle>
            <CardDescription>Últimas empresas cadastradas na plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentTenants.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma empresa cadastrada ainda
              </p>
            ) : (
              <div className="space-y-4">
                {recentTenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{tenant.company_name}</p>
                        <p className="text-sm text-muted-foreground">{tenant.company_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {tenant.platform_plans?.name || 'Sem plano'}
                      </span>
                      {getStatusBadge(tenant.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
