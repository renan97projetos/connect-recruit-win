import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Archive,
  BarChart3,
  Users,
  FileText,
  Clock,
  Settings,
  Shield,
  LogOut,
  Menu,
  ChevronDown,
  LayoutGrid,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NavItem = { path: string; label: string; icon: any; end?: boolean };

const recruitmentItems: NavItem[] = [
  { path: '/company/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/company/job-requests', label: 'Gestão de Vagas', icon: Briefcase },
  { path: '/company/talent-pool', label: 'Banco de Talentos', icon: TrendingUp },
  { path: '/company/job-history', label: 'Histórico', icon: Archive },
];

const hrItems: NavItem[] = [
  { path: '/company/employee-dashboard', label: 'Dashboard RH', icon: BarChart3 },
  { path: '/company/employees', label: 'Colaboradores', icon: Users },
  { path: '/company/assessments', label: 'Avaliações', icon: FileText },
  { path: '/company/employee-requests', label: 'Solicitações', icon: Clock },
];

const HR_PATHS = ['/company/employee-dashboard', '/company/employees', '/company/assessments', '/company/employee-requests'];

export function CompanyTopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useSupabaseAuth();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Detecta área ativa pela rota: 'hr' para gestão interna, 'recruitment' para o restante
  const area: 'hr' | 'recruitment' = useMemo(() => {
    return HR_PATHS.some((p) => location.pathname.startsWith(p)) ? 'hr' : 'recruitment';
  }, [location.pathname]);

  const isHubRoute = location.pathname === '/company' || location.pathname === '/company/hub';
  const activeItems = area === 'hr' ? hrItems : recruitmentItems;
  const areaLabel = area === 'hr' ? 'Gestão RH Interna' : 'Recrutamento e Seleção';

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('company_name, name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setCompanyName(data.company_name || data.name || 'Empresa');
        setUserName(data.name || user.email || '');
        setAvatarUrl(data.avatar_url ?? null);
      }
    };
    fetchProfile();
  }, [user?.id, user?.email]);

  const isActive = (path: string, end = false) =>
    end ? location.pathname === path : location.pathname.startsWith(path) && path !== '/company';

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const initials = (companyName || 'E').charAt(0).toUpperCase();

  const NavLinkItem = ({ item }: { item: NavItem }) => {
    const active = item.end ? location.pathname === item.path : isActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
          active
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground/70 hover:text-foreground hover:bg-muted'
        )}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.label}</span>
      </Link>
    );
  };

  const DropdownGroup = ({
    label,
    items,
    icon: Icon,
  }: {
    label: string;
    items: NavItem[];
    icon: any;
  }) => {
    const anyActive = items.some((i) => isActive(i.path, i.end));
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              anyActive
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map((item) => (
            <DropdownMenuItem
              key={item.path}
              onClick={() => navigate(item.path)}
              className="cursor-pointer"
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        {/* Logo + nome empresa */}
        <Link to="/company" className="flex items-center gap-3 min-w-0 flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={companyName}
              className="h-9 w-9 rounded-md object-cover border border-border"
            />
          ) : (
            <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              {initials}
            </div>
          )}
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-bold leading-tight truncate max-w-[180px]">
              {companyName || 'Empresa'}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">
              SinapseRH
            </p>
          </div>
        </Link>

        {/* Centro: navegação desktop */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-1">
          <DropdownGroup label="Recrutamento" items={recruitmentItems} icon={Briefcase} />
          {!roleLoading && isOwner && (
            <DropdownGroup label="Gestão RH" items={hrItems} icon={Users} />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted transition-colors">
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem
                onClick={() => navigate('/company/profile')}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Minha Conta
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuItem
                  onClick={() => navigate('/company/permissions')}
                  className="cursor-pointer"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Permissões
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex-1 lg:hidden" />

        {/* Direita: usuário + sair */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs font-medium leading-tight truncate max-w-[160px]">
              {userName || 'Usuário'}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[160px]">
              {user?.email}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden xl:inline">Sair</span>
          </Button>
        </div>

        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] p-0">
            <div className="p-4 border-b border-border">
              <p className="font-bold text-base truncate">{companyName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <nav className="p-3 space-y-4 overflow-y-auto">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 px-2">
                  Recrutamento
                </p>
                <div className="flex flex-col gap-1">
                  {recruitmentItems.map((item) => (
                    <NavLinkItem key={item.path} item={item} />
                  ))}
                </div>
              </div>
              {!roleLoading && isOwner && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 px-2">
                    Gestão RH
                  </p>
                  <div className="flex flex-col gap-1">
                    {hrItems.map((item) => (
                      <NavLinkItem key={item.path} item={item} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 px-2">
                  Configurações
                </p>
                <div className="flex flex-col gap-1">
                  <NavLinkItem
                    item={{ path: '/company/profile', label: 'Minha Conta', icon: Settings }}
                  />
                  {isOwner && (
                    <NavLinkItem
                      item={{ path: '/company/permissions', label: 'Permissões', icon: Shield }}
                    />
                  )}
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full gap-2"
                >
                  <LogOut className="h-4 w-4" /> Sair
                </Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
