import { Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'company' | 'candidate';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, userRole, loading } = useSupabaseAuth();

  // Aguarda o carregamento inicial OU o role ser resolvido (se houver user logado)
  if (loading || (user && userRole === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    // Redireciona para o dashboard apropriado baseado no role do usuário
    const dashboardRoutes = {
      admin: '/admin/dashboard',
      company: '/company',
      candidate: '/candidate',
    };

    return <Navigate to={userRole ? dashboardRoutes[userRole] : '/'} replace />;
  }

  return <>{children}</>;
}
