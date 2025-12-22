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

// Todas as permissões disponíveis
const ALL_PERMISSIONS: PermissionKey[] = [
  'view_vagas',
  'create_vagas',
  'edit_vagas',
  'publish_vagas',
  'manage_candidatos',
  'avaliar_candidatos',
  'view_dashboard',
  'manage_configuracoes',
  'manage_usuarios',
];

export function usePermissions() {
  const { user, userRole } = useSupabaseAuth();
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [isOwner, setIsOwner] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userRole === 'company') {
      fetchPermissions();
    } else if (userRole === 'admin') {
      // Admin tem todas as permissões
      setPermissions(new Set(ALL_PERMISSIONS));
      setLoading(false);
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
        setIsOwner(false);
        setCompanyId(companyUser.company_id);

        const { data: userPermissions, error: permError } = await supabase
          .from('user_permissions')
          .select('permission_key')
          .eq('company_user_id', companyUser.id)
          .eq('allowed', true);

        if (permError) throw permError;

        const permSet = new Set<PermissionKey>(
          userPermissions?.map(p => p.permission_key as PermissionKey) || []
        );
        
        // Colaboradores NUNCA têm manage_usuarios
        permSet.delete('manage_usuarios');
        
        setPermissions(permSet);
      } else {
        // Não está em company_users - é o OWNER da empresa
        // OWNER tem TODAS as permissões incluindo manage_usuarios
        setIsOwner(true);
        setCompanyId(user?.id || null);
        setPermissions(new Set(ALL_PERMISSIONS));
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
    
    // OWNER tem todas as permissões
    if (isOwner) return true;
    
    // Verifica se tem a permissão específica
    return permissions.has(permission);
  };

  const hasAnyPermission = (perms: PermissionKey[]): boolean => {
    // Admin sempre tem todas as permissões
    if (userRole === 'admin') return true;
    
    // OWNER tem todas as permissões
    if (isOwner) return true;
    
    // Verifica se tem pelo menos uma das permissões
    return perms.some(p => permissions.has(p));
  };

  const hasAllPermissions = (perms: PermissionKey[]): boolean => {
    // Admin sempre tem todas as permissões
    if (userRole === 'admin') return true;
    
    // OWNER tem todas as permissões
    if (isOwner) return true;
    
    // Verifica se tem todas as permissões
    return perms.every(p => permissions.has(p));
  };

  // Método para verificar se pode gerenciar usuários (apenas OWNER)
  const canManageUsers = (): boolean => {
    if (userRole === 'admin') return true;
    return isOwner;
  };

  return {
    permissions,
    isOwner,
    companyId,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canManageUsers,
  };
}
