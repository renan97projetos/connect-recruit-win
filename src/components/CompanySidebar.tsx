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
  Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const recruitmentItems = [
  { path: '/company', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/company/job-requests', label: 'Gestão de Vagas', icon: Briefcase },
  { path: '/company/talent-pool', label: 'Banco de Talentos', icon: TrendingUp },
  { path: '/company/job-history', label: 'Histórico', icon: Archive },
];

const hrItems = [
  { path: '/company/employee-dashboard', label: 'Dashboard RH', icon: BarChart3 },
  { path: '/company/employees', label: 'Colaboradores', icon: Users },
  { path: '/company/assessments', label: 'Avaliações', icon: FileText },
  { path: '/company/employee-requests', label: 'Solicitações', icon: Clock },
];

const accountItems = [
  { path: '/company/profile', label: 'Minha Conta', icon: Settings, ownerOnly: false },
  { path: '/company/permissions', label: 'Permissões', icon: Shield, ownerOnly: true },
];

export function CompanySidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { user, signOut } = useSupabaseAuth();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const collapsed = state === 'collapsed';

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

  const initials = companyName.charAt(0).toUpperCase() || 'E';

  const renderItem = (item: { path: string; label: string; icon: any; end?: boolean }) => {
    const Icon = item.icon;
    const active =
      item.end ? location.pathname === item.path : isActive(item.path) || location.pathname === item.path;
    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
          <Link to={item.path}>
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-2 border-border">
      <SidebarHeader className="border-b border-border p-3">
        <Link to="/company" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-base tracking-tight truncate">SinapseRH</span>
          )}
        </Link>

        <div className={cn('flex items-center gap-2 mt-3 p-2 rounded-lg bg-muted/50', collapsed && 'justify-center')}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={companyName}
              className="h-9 w-9 rounded-md object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
              {initials}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{companyName}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Empresa</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recrutamento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{recruitmentItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!roleLoading && isOwner && (
          <SidebarGroup>
            <SidebarGroupLabel>Equipe</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{hrItems.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems
                .filter(i => !i.ownerOnly || isOwner)
                .map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3">
        <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{userName || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            aria-label="Sair"
            className="p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors flex-shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
