import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { SRHIcon } from '@/components/icons/SRHIcon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
export function Navbar() {
  const {
    user,
    userRole,
    signOut,
    isAuthenticated
  } = useSupabaseAuth();
  const navigate = useNavigate();
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };
  const handleLogoClick = (e: React.MouseEvent) => {
    const now = Date.now();

    // Reset counter if more than 2 seconds between clicks
    if (now - lastClickTime > 2000) {
      setLogoClickCount(1);
    } else {
      setLogoClickCount(prev => prev + 1);
    }
    setLastClickTime(now);

    // Redirect to admin login after 5 clicks
    if (logoClickCount + 1 >= 5) {
      e.preventDefault();
      navigate('/admin/auth');
      setLogoClickCount(0);
    }
  };
  const getDashboardRoute = () => {
    if (!userRole) return '/';
    switch (userRole) {
      case 'admin':
        return '/admin/dashboard';
      case 'company':
        return '/company';
      case 'candidate':
        return '/candidate';
      default:
        return '/';
    }
  };
  return <nav className="sticky top-0 z-50 w-full border-b bg-[#1a2332] backdrop-blur">
      <div className="container mx-auto bg-secondary px-0">
        <div className="h-16 flex-row flex items-center justify-between gap-0 my-0 py-0 px-[16px] mx-0 bg-destructive-foreground">
          <Link to="/" className="flex items-center gap-2" onClick={handleLogoClick}>
            <SRHIcon size={40} className="text-primary" />
          </Link>

          <nav className="flex-1 flex items-center justify-center gap-8">
            <Link to="/" className="transition-colors font-medium text-blue-900">
              Vagas
            </Link>
            <Link to="/about" className="transition-colors font-medium text-blue-900">
              Para Empresas
            </Link>
            <Link to="/about" className="transition-colors font-medium text-blue-900">
              Sobre
            </Link>
            <Link to="/contact" className="transition-colors font-medium text-blue-900">
              Ajuda/Suporte
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {!isAuthenticated ? <>
                <Button asChild>
                  <Link to="/login" className="text-primary-foreground bg-blue-900">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link to="/register" className="bg-blue-900">Cadastrar</Link>
                </Button>
              </> : <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {userRole === 'admin' ? 'Administrador' : userRole === 'company' ? 'Empresa' : 'Candidato'}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardRoute()} className="cursor-pointer flex items-center">
                      <SRHIcon size={16} className="mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>}
          </div>
        </div>
      </div>
    </nav>;
}