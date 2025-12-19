import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

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

export function usePermissions() {
  const { user, userRole } = useSupabaseAuth();
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userRole === 'company') {
      fetchPermissions();
    } else {
      setLoading(false);
    }
  }, [user, userRole]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      
      // Buscar company_user vinculado ao usuário logado
      const { data: companyUser, error: userError } = await supabase
        .from('company_users')
        .select('id, company_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (userError) throw userError;

      if (companyUser) {
        // É um colaborador - buscar permissões específicas
        const { data: userPermissions, error: permError } = await supabase
          .from('user_permissions')
          .select('permission_key')
          .eq('company_user_id', companyUser.id)
          .eq('allowed', true);

        if (permError) throw permError;

        const permSet = new Set<PermissionKey>(
          userPermissions?.map(p => p.permission_key as PermissionKey) || []
        );
        setPermissions(permSet);
      } else {
        // É o owner da empresa - tem todas as permissões
        setPermissions(new Set([
          'view_vagas',
          'create_vagas',
          'edit_vagas',
          'publish_vagas',
          'manage_candidatos',
          'avaliar_candidatos',
          'view_dashboard',
          'manage_configuracoes',
          'manage_usuarios',
        ]));
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // Em caso de erro, não concede permissões
      setPermissions(new Set());
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    // Admin sempre tem todas as permissões
    if (userRole === 'admin') return true;
    
    // Verifica se tem a permissão específica
    return permissions.has(permission);
  };

  const hasAnyPermission = (perms: PermissionKey[]): boolean => {
    // Admin sempre tem todas as permissões
    if (userRole === 'admin') return true;
    
    // Verifica se tem pelo menos uma das permissões
    return perms.some(p => permissions.has(p));
  };

  const hasAllPermissions = (perms: PermissionKey[]): boolean => {
    // Admin sempre tem todas as permissões
    if (userRole === 'admin') return true;
    
    // Verifica se tem todas as permissões
    return perms.every(p => permissions.has(p));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
