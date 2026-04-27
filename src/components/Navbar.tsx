import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, Menu, X, LayoutDashboard } from 'lucide-react';
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
  const { user, userRole, signOut, isAuthenticated, loading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        
        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      }
    };

    if (isAuthenticated && user) {
      fetchProfile();
    } else {
      setAvatarUrl(null);
    }
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
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

  const location = useLocation();
  const isCandidateArea =
    location.pathname.startsWith('/candidate') ||
    (userRole === 'candidate' && location.pathname.startsWith('/jobs'));

  const navLinks = isCandidateArea ? [] : [
    { to: "/#vagas", label: "Vagas" },
    { to: "/about", label: "Empresas" },
    { to: "/about", label: "Sobre" },
    { to: "https://wa.me/5527998119863?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20SinapseRH", label: "Ajuda", external: true },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    if (to.includes('#')) {
      e.preventDefault();
      const [path, hash] = to.split('#');
      
      // Se já estamos na página correta, apenas faz scroll
      if (location.pathname === path || (path === '/' && location.pathname === '/')) {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        // Navega para a página e depois faz scroll
        navigate(path || '/');
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b-3 border-foreground bg-background">
      <div className="container mx-auto px-4">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-3 group"
          >
            <SRHIcon size={40} className="group-hover:rotate-3 transition-transform" />
            <span className="font-bold text-xl tracking-tight hidden sm:block">SinapseRH</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.label}
                  href={link.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 font-semibold text-sm uppercase tracking-wide hover:bg-secondary rounded-lg transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <Link 
                  key={link.label}
                  to={link.to} 
                  className="px-4 py-2 font-semibold text-sm uppercase tracking-wide hover:bg-secondary rounded-lg transition-colors"
                  onClick={(e) => handleNavClick(e, link.to)}
                >
                  {link.label}
                </Link>
              )
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Button variant="default" asChild>
                  <Link to="/login?as=candidate">Área de Candidato</Link>
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="overflow-hidden p-0">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Foto do perfil" 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-bold">{user?.email}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {userRole === 'admin' ? 'ADMIN' : userRole === 'company' ? 'EMPRESA' : 'CANDIDATO'}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      const route = getDashboardRoute();
                      if (route === '/' || loading) {
                        // userRole ainda não carregou — evita redirect para home
                        return;
                      }
                      navigate(route);
                    }}
                    className="cursor-pointer flex items-center font-semibold"
                    disabled={loading || !userRole}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {loading || !userRole ? 'Carregando...' : 'Minha Área'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive font-semibold">
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
          <div className="md:hidden py-4 border-t-3 border-foreground">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                link.external ? (
                  <a
                    key={link.label}
                    href={link.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold py-3 px-4 rounded-lg hover:bg-secondary transition-colors uppercase tracking-wide"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link 
                    key={link.label}
                    to={link.to} 
                    className="font-semibold py-3 px-4 rounded-lg hover:bg-secondary transition-colors uppercase tracking-wide"
                    onClick={(e) => {
                      handleNavClick(e, link.to);
                      setMobileMenuOpen(false);
                    }}
                  >
                    {link.label}
                  </Link>
                )
              ))}
              <div className="border-t-3 border-foreground mt-2 pt-4 flex flex-col gap-2">
                {!isAuthenticated ? (
                  <>
                    <Button variant="default" asChild className="justify-start">
                      <Link to="/login?as=candidate" onClick={() => setMobileMenuOpen(false)}>Área de Candidato</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Link 
                      to={getDashboardRoute()} 
                      className="font-semibold py-3 px-4 rounded-lg hover:bg-secondary transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Button variant="ghost" onClick={handleLogout} className="justify-start text-destructive">
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
