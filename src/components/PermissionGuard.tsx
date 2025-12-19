import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

type PermissionKey = 
  | 'view_vagas'
  | 'create_vagas'
  | 'edit_vagas'
  | 'publish_vagas'
  | 'manage_candidatos'
  | 'avaliar_candidatos'
  | 'view_dashboard'
  | 'manage_configuracoes'
  | 'manage_usuarios';

interface PermissionGuardProps {
  children: ReactNode;
  permission: PermissionKey | PermissionKey[];
  requireAll?: boolean; // Se true, requer todas as permissões. Se false, requer pelo menos uma
  fallback?: ReactNode;
  showAlert?: boolean;
}

export function PermissionGuard({
  children,
  permission,
  requireAll = false,
  fallback,
  showAlert = true,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) {
    return <div className="text-center py-4">Verificando permissões...</div>;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  
  let hasAccess = false;
  if (requireAll) {
    hasAccess = hasAllPermissions(permissions);
  } else {
    hasAccess = Array.isArray(permission) 
      ? hasAnyPermission(permissions)
      : hasPermission(permission);
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (showAlert) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar este recurso. Entre em contato com o administrador.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  return <>{children}</>;
}
