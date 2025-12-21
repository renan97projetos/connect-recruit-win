import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
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
  LogOut,
  Building2,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { useState } from 'react';
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
}

const mainMenuItems = [
  { path: '/company', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/company/job-requests', label: 'Criação de Vagas', icon: ClipboardList },
  { path: '/company/selection-process', label: 'Processo Seletivo', icon: ClipboardList },
  { path: '/company/job-history', label: 'Histórico', icon: Archive },
  { path: '/company/talent-pool', label: 'Banco de Talentos', icon: TrendingUp },
];

const hrMenuItems = [
  { path: '/company/employee-dashboard', label: 'Dashboard RH', icon: BarChart3 },
  { path: '/company/employees', label: 'Colaboradores', icon: Users },
  { path: '/company/assessments', label: 'Avaliações', icon: FileText },
  { path: '/company/employee-requests', label: 'Solicitações', icon: Clock },
];

const configMenuItems = [
  { path: '/company/profile', label: 'Minha Conta', icon: Settings },
  { path: '/company/permissions', label: 'Permissões', icon: Shield, ownerOnly: true },
];

export function CompanyLayout({ children, title, description }: CompanyLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useSupabaseAuth();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const isActive = (path: string) => location.pathname === path;
  const isInGroup = (items: typeof mainMenuItems) => items.some(item => location.pathname === item.path);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Header - Company Theme (Violet/Purple) */}
      <div className="bg-violet border-b-3 border-foreground">
        <div className="container mx-auto px-4 py-6">
          {/* Company Badge & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-background/20 backdrop-blur-sm px-4 py-1.5 rounded-full border-2 border-background/30 mb-3">
              <Building2 className="h-4 w-4 text-background" />
              <span className="text-sm font-bold text-background uppercase tracking-wide">Portal Empresa</span>
            </div>
            {title && (
              <>
                <h1 className="text-2xl md:text-3xl font-black text-background mb-1">
                  {title}
                </h1>
                {description && (
                  <p className="text-background/80 text-sm md:text-base">
                    {description}
                  </p>
                )}
              </>
            )}
          </div>
          
          {/* Navigation Menu */}
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {/* Main Menu Items */}
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-3 font-bold text-xs md:text-sm transition-all",
                    active
                      ? "bg-yellow text-foreground border-foreground shadow-brutal"
                      : "bg-background text-foreground border-foreground hover:bg-lime hover:-translate-y-0.5 hover:shadow-brutal"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}

            {/* HR Dropdown - Only for Owners */}
            {!roleLoading && isOwner && (
              <DropdownMenu open={openDropdown === 'hr'} onOpenChange={(open) => setOpenDropdown(open ? 'hr' : null)}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-3 font-bold text-xs md:text-sm transition-all",
                      isInGroup(hrMenuItems)
                        ? "bg-cyan text-foreground border-foreground shadow-brutal"
                        : "bg-background text-foreground border-foreground hover:bg-cyan hover:-translate-y-0.5 hover:shadow-brutal"
                    )}
                  >
                    <Users className="h-4 w-4" />
                    <span className="hidden lg:inline">Gestão RH</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="center" 
                  className="w-56 border-3 border-foreground bg-background shadow-brutal rounded-xl p-2"
                >
                  {hrMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setOpenDropdown(null);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold cursor-pointer transition-colors",
                          isActive(item.path)
                            ? "bg-cyan text-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Config Dropdown */}
            <DropdownMenu open={openDropdown === 'config'} onOpenChange={(open) => setOpenDropdown(open ? 'config' : null)}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-3 font-bold text-xs md:text-sm transition-all",
                    isInGroup(configMenuItems)
                      ? "bg-pink text-foreground border-foreground shadow-brutal"
                      : "bg-background text-foreground border-foreground hover:bg-pink hover:-translate-y-0.5 hover:shadow-brutal"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden lg:inline">Config</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="center" 
                className="w-48 border-3 border-foreground bg-background shadow-brutal rounded-xl p-2"
              >
                {configMenuItems
                  .filter(item => !item.ownerOnly || isOwner)
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setOpenDropdown(null);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold cursor-pointer transition-colors",
                          isActive(item.path)
                            ? "bg-pink text-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Logout */}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-3 font-bold text-xs md:text-sm bg-destructive text-destructive-foreground border-foreground hover:-translate-y-0.5 hover:shadow-brutal transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
