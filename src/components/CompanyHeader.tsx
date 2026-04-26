import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Home } from 'lucide-react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SRHIcon } from '@/components/icons/SRHIcon';

interface CompanyHeaderProps {
  showHubLink?: boolean;
}

/**
 * Header simples para área da empresa: apenas logo do SaaS + nome/logo da empresa cliente.
 * Substitui o Navbar público (sem menus de Vagas/Sobre/Ajuda).
 */
export function CompanyHeader({ showHubLink = true }: CompanyHeaderProps) {
  const { user, signOut } = useSupabaseAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('company_name, name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setCompanyName(data.company_name || data.name || 'Minha Empresa');
        setAvatarUrl(data.avatar_url ?? null);
      }
    };
    fetchCompany();
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate('/empresa/acesso');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo SaaS */}
          <Link to="/company" className="flex items-center gap-3 group min-w-0">
            <div className="w-10 h-10 bg-primary rounded-xl border-3 border-foreground shadow-brutal flex items-center justify-center group-hover:rotate-3 transition-transform shrink-0">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">SinapseRH</span>
          </Link>

          {/* Logo / Nome da empresa cliente (canto direito) */}
          <div className="flex items-center gap-3 min-w-0">
            {showHubLink && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/company')}
                className="hidden md:inline-flex"
              >
                <Home className="h-4 w-4 mr-2" />
                Início
              </Button>
            )}

            <span className="font-bold text-sm truncate max-w-[220px]">
              {companyName || 'Empresa'}
            </span>

            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              aria-label="Sair"
              className="text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
