import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  TrendingUp,
  FileText,
  Clock,
  GraduationCap,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  ClipboardList,
  Archive,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCompanyRole } from '@/hooks/useCompanyRole';

const menuItems = [
  {
    title: 'Vagas',
    items: [
      { title: 'Dashboard', url: '/company', icon: LayoutDashboard },
      { title: 'Criação de Vagas', url: '/company/job-requests', icon: ClipboardList },
      { title: 'Processo Seletivo', url: '/company/selection-process', icon: ClipboardList },
      { title: 'Histórico de Processos', url: '/company/job-history', icon: Archive },
      { title: 'Banco de Talentos', url: '/company/talent-pool', icon: TrendingUp },
    ],
  },
  {
    title: 'Gestão de Colaboradores',
    ownerOnly: true, // Grupo inteiro só para owner
    items: [
      { title: 'Dashboard RH', url: '/company/employee-dashboard', icon: BarChart3, ownerOnly: true },
      { title: 'Colaboradores', url: '/company/employees', icon: Users, ownerOnly: true },
      { title: 'Testes e Avaliações', url: '/company/assessments', icon: FileText, ownerOnly: true },
      { title: 'Solicitações', url: '/company/employee-requests', icon: Clock, ownerOnly: true },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { title: 'Minha Conta', url: '/company/profile', icon: Settings },
      { title: 'Permissões', url: '/company/permissions', icon: Shield, ownerOnly: true },
    ],
  },
];

export function CompanySidebar() {
  const { user, signOut } = useSupabaseAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOwner } = useCompanyRole();
  const [profile, setProfile] = useState<{ name: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso.',
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Erro ao sair',
        description: 'Não foi possível fazer logout.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || 'User'} />
            <AvatarFallback>{profile?.name ? getInitials(profile.name) : 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.name || 'Usuário'}</p>
            <p className="text-xs text-muted-foreground">Empresa</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {menuItems
          .filter((group) => {
            // Esconde o grupo inteiro se for ownerOnly e não for owner
            if ('ownerOnly' in group && group.ownerOnly && !isOwner) {
              console.log('🚫 Hiding group:', group.title, 'isOwner:', isOwner);
              return false;
            }
            return true;
          })
          .map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items
                  .filter((item) => {
                    // Esconde itens marcados como ownerOnly se não for owner
                    if ('ownerOnly' in item && item.ownerOnly && !isOwner) {
                      console.log('🚫 Hiding item:', item.title, 'isOwner:', isOwner);
                      return false;
                    }
                    return true;
                  })
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === '/company'}
                          className={({ isActive }) =>
                            isActive ? 'bg-muted text-primary font-medium' : 'hover:bg-muted/50'
                          }
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t space-y-2">
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}