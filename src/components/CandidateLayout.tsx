import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Briefcase, User, Home, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

interface CandidateLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

const menuItems = [
  { path: '/candidate', label: 'Minhas Candidaturas', icon: Briefcase },
  { path: '/candidate/profile', label: 'Meu Perfil', icon: User },
];

export function CandidateLayout({ children, title, description }: CandidateLayoutProps) {
  const location = useLocation();
  const { signOut } = useSupabaseAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Header with centered navigation */}
      <div className="bg-foreground border-b-3 border-foreground">
        <div className="container mx-auto px-4 py-6">
          {/* Page Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-black text-background mb-1">
              {title}
            </h1>
            {description && (
              <p className="text-background/70 text-sm md:text-base">
                {description}
              </p>
            )}
          </div>
          
          {/* Centered Navigation Menu */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border-3 font-bold text-sm transition-all",
                    isActive
                      ? "bg-yellow text-foreground border-foreground shadow-brutal"
                      : "bg-background text-foreground border-foreground hover:bg-primary hover:text-primary-foreground hover:-translate-y-0.5 hover:shadow-brutal"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            
            {/* Back to Home */}
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-3 font-bold text-sm bg-cyan text-foreground border-foreground hover:-translate-y-0.5 hover:shadow-brutal transition-all"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Ver Vagas</span>
            </Link>
            
            {/* Logout */}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-3 font-bold text-sm bg-pink text-foreground border-foreground hover:-translate-y-0.5 hover:shadow-brutal transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
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
