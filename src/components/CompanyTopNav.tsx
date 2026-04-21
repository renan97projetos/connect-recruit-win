import { useEffect, useState } from 'react';
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
  Globe,
  Mail,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { HelpButton } from '@/components/onboarding/HelpButton';

type NavItem = {
  path: string;
  label: string;
  icon: any;
  end?: boolean;
  ownerOnly?: boolean;
};

const mainMenuItems: NavItem[] = [
  { path: '/company/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/company/job-requests', label: 'Requisições', icon: Briefcase },
  { path: '/company/job-history', label: 'Histórico', icon: Archive },
  { path: '/company/talent-pool', label: 'Banco de Talentos', icon: TrendingUp },
];

const hrMenuItems: NavItem[] = [
  { path: '/company/employee-dashboard', label: 'Dashboard RH', icon: BarChart3 },
  { path: '/company/employees', label: 'Colaboradores', icon: Users },
  { path: '/company/assessments', label: 'Avaliações', icon: FileText },
  { path: '/company/employee-requests', label: 'Solicitações', icon: Clock },
];

const configMenuItems: NavItem[] = [
  { path: '/company/profile', label: 'Minha Conta', icon: Settings },
  { path: '/company/career-page', label: 'Career Page', icon: Globe, ownerOnly: true },
  { path: '/company/email-templates', label: 'Templates de E-mail', icon: Mail, ownerOnly: true },
  { path: '/company/permissions', label: 'Permissões', icon: Shield, ownerOnly: true },
  { path: '/company/audit-log', label: 'Audit Log', icon: Shield, ownerOnly: true },
];

export function CompanyTopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useSupabaseAuth();
  const { isOwner } = useCompanyRole();
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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

    if (!user?.id) return;
    const channel = supabase
      .channel(`profile-nav-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload: any) => {
          const row = payload.new || {};
          setCompanyName(row.company_name || row.name || 'Empresa');
          setUserName(row.name || user.email || '');
          setAvatarUrl(row.avatar_url ?? null);
        }
      )
      .subscribe();

    const onFocus = () => fetchProfile();
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id, user?.email]);

  const isActive = (path: string, end = false) =>
    end ? location.pathname === path : location.pathname.startsWith(path) && path !== '/company';

  const isInGroup = (items: NavItem[]) =>
    items.some((i) => isActive(i.path, i.end));

  const handleLogout = async () => {
    await signOut();
    navigate('/empresa/acesso');
  };

  const companyInitials = (companyName || 'E').charAt(0).toUpperCase();
  const userInitials = (userName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 h-12 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 gap-4 md:gap-6">
      {/* Logo + nome empresa */}
      <Link to="/company" data-tour="company-logo" className="flex items-center gap-2 mr-2 min-w-0 flex-shrink-0">
        <Avatar className="h-7 w-7 rounded-md">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={companyName} className="object-contain" />}
          <AvatarFallback className="bg-primary text-primary-foreground text-xs rounded-md font-semibold">
            {companyInitials}
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold text-sm text-gray-900 truncate max-w-[160px] hidden sm:inline">
          {companyName || 'Empresa'}
        </span>
      </Link>

      {/* Separador */}
      <div className="hidden md:block h-5 w-px bg-gray-200" />

      {/* Nav links — desktop */}
      <nav data-tour="nav-main" className="hidden md:flex items-center gap-1 flex-1 min-w-0">
        {mainMenuItems.map((item) => {
          const active = item.end ? location.pathname === item.path : isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}

        {/* Gestão RH — dropdown (só owner) */}
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isInGroup(hrMenuItems)
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Users className="h-3.5 w-3.5" />
                Gestão RH
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 shadow-lg border border-gray-200">
              {hrMenuItems.map((item) => (
                <DropdownMenuItem
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="cursor-pointer"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>

      {/* Right side */}
      <div className="hidden md:flex items-center gap-2 ml-auto flex-shrink-0">
        <HelpButton />
        {/* Configurações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Configurações</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 shadow-lg border border-gray-200">
            {configMenuItems
              .filter((item) => !item.ownerOnly || isOwner)
              .map((item) => (
                <DropdownMenuItem
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="cursor-pointer"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Avatar + nome do usuário + sair */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 flex-shrink-0 px-1.5 py-1 rounded-md hover:bg-gray-100 transition-colors">
              <Avatar className="h-7 w-7 cursor-pointer">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="bg-gray-200 text-gray-600 text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col items-start leading-tight">
                <span className="text-xs font-medium text-gray-700 max-w-[120px] truncate">
                  {userName || user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-gray-400">
                  {isOwner ? 'Administrador' : 'Colaborador'}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 shadow-lg border border-gray-200">
            <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden ml-auto flex items-center gap-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] p-0 bg-white">
            <div className="p-4 border-b border-gray-200">
              <p className="font-semibold text-sm text-gray-900 truncate">{companyName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <nav className="p-3 space-y-4 overflow-y-auto">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 px-2">
                  Recrutamento
                </p>
                <div className="flex flex-col gap-0.5">
                  {mainMenuItems.map((item) => {
                    const active = item.end
                      ? location.pathname === item.path
                      : isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {isOwner && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 px-2">
                    Gestão RH
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {hrMenuItems.map((item) => {
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                            active
                              ? 'bg-primary/10 text-primary'
                              : 'text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 px-2">
                  Configurações
                </p>
                <div className="flex flex-col gap-0.5">
                  {configMenuItems
                    .filter((item) => !item.ownerOnly || isOwner)
                    .map((item) => {
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                            active
                              ? 'bg-primary/10 text-primary'
                              : 'text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
