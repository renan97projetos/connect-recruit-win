import { ReactNode, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePlanType } from '@/hooks/usePlanType';
import { useUpgradeModal } from '@/contexts/UpgradeModalContext';
import { Loader2 } from 'lucide-react';

interface ProRouteGuardProps {
  children: ReactNode;
  /** Para onde redirecionar quando o usuário não é Pro. Default: voltar ao Hub. */
  redirectTo?: string;
  /** Nome amigável do recurso (mostrado no modal). */
  featureName?: string;
}

/**
 * Bloqueia rotas exclusivas do plano Pro.
 * - Usuários Pro: renderiza o conteúdo normalmente.
 * - Usuários Starter: abre o modal de upgrade e redireciona pro Hub (ou redirectTo).
 */
export function ProRouteGuard({
  children,
  redirectTo = '/company',
  featureName = 'Gestão RH Interna',
}: ProRouteGuardProps) {
  const { isPro, loading } = usePlanType();
  const { openUpgradeModal } = useUpgradeModal();
  const location = useLocation();
  const triggered = useRef(false);

  useEffect(() => {
    if (!loading && !isPro && !triggered.current) {
      triggered.current = true;
      openUpgradeModal({ featureName });
    }
  }, [loading, isPro, openUpgradeModal, featureName, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f8f6]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPro) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
