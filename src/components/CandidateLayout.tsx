import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Briefcase, User, Search, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

interface CandidateLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

const menuItems = [
  { path: '/candidate', label: 'Minhas Candidaturas', icon: Briefcase },
  { path: '/candidate/jobs', label: 'Ver Vagas', icon: Search },
  { path: '/candidate/profile', label: 'Meu Perfil', icon: User },
];

export function CandidateLayout({ children, title, description }: CandidateLayoutProps) {
  const location = useLocation();
  const { signOut } = useSupabaseAuth();

  return (
    <div className="min-h-screen bg-[#f8f8f6] app-internal">
      <Navbar />

      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-1">
              {title}
            </h1>
            {description && (
              <p className="text-gray-500 text-sm md:text-base">
                {description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}

            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
