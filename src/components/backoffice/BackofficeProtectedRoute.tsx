import { Navigate } from 'react-router-dom';
import { useBackofficeAuth } from '@/contexts/BackofficeAuthContext';
import { Loader2 } from 'lucide-react';

interface BackofficeProtectedRouteProps {
  children: React.ReactNode;
}

export function BackofficeProtectedRoute({ children }: BackofficeProtectedRouteProps) {
  const { user, isSuperAdmin, loading } = useBackofficeAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/backoffice/login" replace />;
  }

  return <>{children}</>;
}
