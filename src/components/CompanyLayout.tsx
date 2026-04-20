import { ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CompanyHeader } from '@/components/CompanyHeader';
import {
  LayoutDashboard,
  ClipboardList,
  Archive,
  TrendingUp,
  Users,
  BarChart3,
  FileText,
  Clock,
  Settings,
  Shield,
  ChevronDown,
  Briefcase,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CompanyLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  /** Área desta página: 'jobs' (recrutamento) ou 'hr' (RH interno). Default: 'jobs' */
  area?: 'jobs' | 'hr';
}

const jobsMainItems = [
  { path: '/company/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/company/talent-pool', label: 'Banco de Talentos', icon: TrendingUp },
];

const jobsExtraItems = [
  { path: '/company/job-requests', label: 'Solicitações de Vagas', icon: ClipboardList },
  { path: '/company/job-history', label: 'Histórico de Vagas', icon: Archive },
  { path: '/company/workflow-configuration', label: 'Fluxo Seletivo', icon: TrendingUp },
];

const hrItems = [
  { path: '/company/employee-dashboard', label: 'Dashboard RH', icon: BarChart3 },
  { path: '/company/employees', label: 'Colaboradores', icon: Users },
  { path: '/company/assessments', label: 'Avaliações', icon: FileText },
  { path: '/company/employee-requests', label: 'Solicitações', icon: Clock },
];

const configItems = [
  { path: '/company/profile', label: 'Minha Conta', icon: Settings, ownerOnly: false },
  { path: '/company/permissions', label: 'Permissões', icon: Shield, ownerOnly: true },
];

export function CompanyLayout({ children, title, description, area = 'jobs' }: CompanyLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const isActive = (path: string) => location.pathname === path;
  const isInGroup = (items: { path: string }[]) =>
    items.some(item => location.pathname === item.path);

  const themeColor = area === 'hr' ? 'bg-cyan' : 'bg-lime';
  const areaLabel = area === 'hr' ? 'Gestão RH Interna' : 'Gestão de Vagas';

  return (
    <div className="min-h-screen bg-background">
      <CompanyHeader />

      {/* Hero Header da área */}
      <div className={cn(themeColor, 'border-b-3 border-foreground')}>
        <div className="container mx-auto px-4 py-6">
          {/* Voltar para hub */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/company')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-3 border-foreground bg-background font-bold text-xs uppercase tracking-wide shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-hover transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <span className="text-xs md:text-sm font-bold uppercase tracking-wide bg-foreground text-background px-3 py-1.5 rounded-full">
              {areaLabel}
            </span>
          </div>

          {title && (
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-black text-foreground mb-1">{title}</h1>
              {description && (
                <p className="text-foreground/80 text-sm md:text-base">{description}</p>
              )}
            </div>
          )}

          {/* Menu da área */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            {area === 'jobs' && (
              <>
                <div className="flex items-center gap-2 md:gap-3 px-3 py-1.5 bg-background/30 rounded-2xl">
                  {jobsMainItems.map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={cn(
                          'flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-3 font-bold text-xs md:text-sm transition-all',
                          active
                            ? 'bg-yellow text-foreground border-foreground shadow-brutal'
                            : 'bg-background text-foreground border-foreground hover:bg-yellow hover:-translate-y-0.5 hover:shadow-brutal'
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 md:gap-3 px-3 py-1.5 bg-background/30 rounded-2xl">
                  <DropdownMenu
                    open={openDropdown === 'jobs'}
                    onOpenChange={open => setOpenDropdown(open ? 'jobs' : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          'flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-3 font-bold text-xs md:text-sm transition-all',
                          isInGroup(jobsExtraItems)
                            ? 'bg-yellow text-foreground border-foreground shadow-brutal'
                            : 'bg-background text-foreground border-foreground hover:bg-yellow hover:-translate-y-0.5 hover:shadow-brutal'
                        )}
                      >
                        <Briefcase className="h-4 w-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Vagas & Processo</span>
                        <ChevronDown className="h-3 w-3 flex-shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="center"
                      className="w-56 border-3 border-foreground bg-background shadow-brutal rounded-xl p-2"
                    >
                      {jobsExtraItems.map(item => {
                        const Icon = item.icon;
                        return (
                          <DropdownMenuItem
                            key={item.path}
                            onClick={() => {
                              navigate(item.path);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold cursor-pointer transition-colors',
                              isActive(item.path) ? 'bg-lime text-foreground' : 'hover:bg-muted'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}

            {area === 'hr' && !roleLoading && isOwner && (
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 px-3 py-1.5 bg-background/30 rounded-2xl">
                {hrItems.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-3 font-bold text-xs md:text-sm transition-all',
                        active
                          ? 'bg-yellow text-foreground border-foreground shadow-brutal'
                          : 'bg-background text-foreground border-foreground hover:bg-yellow hover:-translate-y-0.5 hover:shadow-brutal'
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Configurações sempre disponível */}
            <div className="flex items-center gap-2 md:gap-3 px-3 py-1.5 bg-background/30 rounded-2xl">
              <DropdownMenu
                open={openDropdown === 'config'}
                onOpenChange={open => setOpenDropdown(open ? 'config' : null)}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-3 font-bold text-xs md:text-sm transition-all',
                      isInGroup(configItems)
                        ? 'bg-pink text-foreground border-foreground shadow-brutal'
                        : 'bg-background text-foreground border-foreground hover:bg-pink hover:-translate-y-0.5 hover:shadow-brutal'
                    )}
                  >
                    <Settings className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">Configurações</span>
                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="w-48 border-3 border-foreground bg-background shadow-brutal rounded-xl p-2"
                >
                  {configItems
                    .filter(item => !item.ownerOnly || isOwner)
                    .map(item => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setOpenDropdown(null);
                          }}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold cursor-pointer transition-colors',
                            isActive(item.path) ? 'bg-pink text-foreground' : 'hover:bg-muted'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </DropdownMenuItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
