import { useEffect, useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/BackofficeLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Building2, Users, Briefcase, FileText, TrendingUp, DollarSign } from 'lucide-react';

interface MetricsData {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalJobs: number;
  totalApplications: number;
  monthlyRevenue: number;
  tenantsByPlan: { name: string; count: number }[];
  tenantsByStatus: { name: string; count: number }[];
  growthByMonth: { month: string; tenants: number; revenue: number }[];
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function BackofficeMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Fetch all data
      const [tenantsRes, plansRes, usersRes, jobsRes, applicationsRes] = await Promise.all([
        supabase.from('tenants').select('*, platform_plans(name, price_monthly)'),
        supabase.from('platform_plans').select('*'),
        supabase.from('user_roles').select('id'),
        supabase.from('jobs').select('id'),
        supabase.from('applications').select('id'),
      ]);

      const tenants = tenantsRes.data || [];
      const plans = plansRes.data || [];

      // Calculate metrics
      const activeTenants = tenants.filter((t) => t.status === 'active').length;

      // Revenue calculation
      let monthlyRevenue = 0;
      tenants.forEach((tenant) => {
        if (tenant.status === 'active' && tenant.platform_plans) {
          monthlyRevenue += Number(tenant.platform_plans.price_monthly) || 0;
        }
      });

      // Tenants by plan
      const planCounts = new Map<string, number>();
      tenants.forEach((t) => {
        const planName = t.platform_plans?.name || 'Sem plano';
        planCounts.set(planName, (planCounts.get(planName) || 0) + 1);
      });
      const tenantsByPlan = Array.from(planCounts.entries()).map(([name, count]) => ({ name, count }));

      // Tenants by status
      const statusLabels: Record<string, string> = {
        active: 'Ativas',
        suspended: 'Suspensas',
        blocked: 'Bloqueadas',
        trial: 'Trial',
        cancelled: 'Canceladas',
      };
      const statusCounts = new Map<string, number>();
      tenants.forEach((t) => {
        const status = statusLabels[t.status] || t.status;
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });
      const tenantsByStatus = Array.from(statusCounts.entries()).map(([name, count]) => ({ name, count }));

      // Growth by month (simulated - in real app you'd aggregate from database)
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
      const growthByMonth = months.map((month, i) => ({
        month,
        tenants: Math.floor(tenants.length * (0.5 + i * 0.1)),
        revenue: Math.floor(monthlyRevenue * (0.5 + i * 0.1)),
      }));

      setMetrics({
        totalTenants: tenants.length,
        activeTenants,
        totalUsers: usersRes.data?.length || 0,
        totalJobs: jobsRes.data?.length || 0,
        totalApplications: applicationsRes.data?.length || 0,
        monthlyRevenue,
        tenantsByPlan,
        tenantsByStatus,
        growthByMonth,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total de Empresas', value: metrics?.totalTenants || 0, icon: Building2, color: 'text-blue-500' },
    { title: 'Empresas Ativas', value: metrics?.activeTenants || 0, icon: TrendingUp, color: 'text-green-500' },
    { title: 'Total de Usuários', value: metrics?.totalUsers || 0, icon: Users, color: 'text-purple-500' },
    { title: 'Vagas Publicadas', value: metrics?.totalJobs || 0, icon: Briefcase, color: 'text-cyan-500' },
    { title: 'Candidaturas', value: metrics?.totalApplications || 0, icon: FileText, color: 'text-pink-500' },
    {
      title: 'Receita Mensal',
      value: `R$ ${(metrics?.monthlyRevenue || 0).toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: 'text-emerald-500',
      isText: true,
    },
  ];

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Métricas</h1>
          <p className="text-muted-foreground">Análise detalhada da plataforma</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))
            : statCards.map((stat, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.title}</p>
                        <p className="text-xl font-bold">
                          {stat.isText ? stat.value : (stat.value as number).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Crescimento Mensal</CardTitle>
              <CardDescription>Evolução de empresas e receita</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics?.growthByMonth || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line type="monotone" dataKey="tenants" stroke="#3b82f6" strokeWidth={2} name="Empresas" />
                    <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} name="Receita" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Tenants by Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Empresas por Plano</CardTitle>
              <CardDescription>Distribuição de empresas por plano contratado</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics?.tenantsByPlan || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Empresas" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Tenants by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Empresas por Status</CardTitle>
              <CardDescription>Situação atual das empresas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics?.tenantsByStatus || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics?.tenantsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
              <CardDescription>Indicadores chave da plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Taxa de Ativação</span>
                    <span className="text-xl font-bold">
                      {metrics?.totalTenants
                        ? ((metrics.activeTenants / metrics.totalTenants) * 100).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Média de Vagas por Empresa</span>
                    <span className="text-xl font-bold">
                      {metrics?.totalTenants
                        ? (metrics.totalJobs / metrics.totalTenants).toFixed(1)
                        : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Candidaturas por Vaga</span>
                    <span className="text-xl font-bold">
                      {metrics?.totalJobs
                        ? (metrics.totalApplications / metrics.totalJobs).toFixed(1)
                        : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Ticket Médio Mensal</span>
                    <span className="text-xl font-bold">
                      R${' '}
                      {metrics?.activeTenants
                        ? (metrics.monthlyRevenue / metrics.activeTenants).toLocaleString('pt-BR', {
                            maximumFractionDigits: 0,
                          })
                        : 0}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </BackofficeLayout>
  );
}
