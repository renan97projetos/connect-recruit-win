import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Menu, X } from 'lucide-react';
import { SRHIcon } from '@/components/icons/SRHIcon';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const { user, userRole, signOut, isAuthenticated } = useSupabaseAuth();
  const navigate = useNavigate();
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    const now = Date.now();

    if (now - lastClickTime > 2000) {
      setLogoClickCount(1);
    } else {
      setLogoClickCount(prev => prev + 1);
    }
    setLastClickTime(now);

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

  const navLinks = [
    { to: "/", label: "Vagas" },
    { to: "/about", label: "Para Empresas" },
    { to: "/about", label: "Sobre" },
    { to: "/contact", label: "Ajuda" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b-2 border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 group" 
            onClick={handleLogoClick}
          >
            <SRHIcon size={40} className="text-primary transition-transform group-hover:scale-105" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.label}
                to={link.to} 
                className="font-body font-medium text-foreground/80 hover:text-primary transition-colors link-editorial"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Button variant="ghost" asChild className="font-body">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild className="font-body shadow-sm">
                  <Link to="/register">Cadastrar</Link>
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full border-2">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-2">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-body font-medium">{user?.email}</span>
                      <span className="font-body text-xs text-muted-foreground">
                        {userRole === 'admin' ? 'Administrador' : userRole === 'company' ? 'Empresa' : 'Candidato'}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardRoute()} className="cursor-pointer flex items-center font-body">
                      <SRHIcon size={16} className="mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive font-body">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link 
                  key={link.label}
                  to={link.to} 
                  className="font-body font-medium py-2 px-4 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-border mt-2 pt-4 flex flex-col gap-2">
                {!isAuthenticated ? (
                  <>
                    <Button variant="ghost" asChild className="justify-start font-body">
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Entrar</Link>
                    </Button>
                    <Button asChild className="font-body">
                      <Link to="/register" onClick={() => setMobileMenuOpen(false)}>Cadastrar</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Link 
                      to={getDashboardRoute()} 
                      className="font-body font-medium py-2 px-4 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Button variant="ghost" onClick={handleLogout} className="justify-start text-destructive font-body">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </nav>
  );
}
