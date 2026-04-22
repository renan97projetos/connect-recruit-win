import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePlanType } from '@/hooks/usePlanType';
import { Loader2 } from 'lucide-react';

interface ProRouteGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Bloqueia o acesso a rotas exclusivas do plano Pro.
 * Usuários Starter são redirecionados para a página de planos.
 */
export function ProRouteGuard({ children, redirectTo = '/company/profile' }: ProRouteGuardProps) {
  const { isPro, loading } = usePlanType();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f8f6]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPro) {
    return <Navigate to={redirectTo} replace state={{ proLocked: true }} />;
  }

  return <>{children}</>;
}
