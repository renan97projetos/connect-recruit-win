import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export function useCompanyRole() {
  const { user, userRole } = useSupabaseAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userRole === 'company') {
      checkRole();
    } else {
      setLoading(false);
    }
  }, [user, userRole]);

  const checkRole = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Checking role for user:', user?.id);
      
      // Verifica se o usuário é um colaborador (existe em company_users)
      const { data: collaboratorData, error } = await supabase
        .from('company_users')
        .select('company_id, user_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      console.log('📊 Collaborator data:', collaboratorData);
      console.log('❌ Error:', error);

      if (collaboratorData) {
        // É um colaborador - usa o company_id da empresa (owner)
        console.log('👤 User is COLLABORATOR - Company:', collaboratorData.company_id);
        setIsCollaborator(true);
        setIsOwner(false);
        setCompanyId(collaboratorData.company_id);
      } else {
        // É o owner da empresa (não está em company_users) - usa o próprio user.id
        console.log('👑 User is OWNER - Company:', user?.id);
        setIsOwner(true);
        setIsCollaborator(false);
        setCompanyId(user?.id || null);
      }
      
      console.log('✅ Final role state:', {
        isOwner: !collaboratorData,
        isCollaborator: !!collaboratorData,
        companyId: collaboratorData?.company_id || user?.id
      });
    } catch (error) {
      console.error('Error checking company role:', error);
      // Em caso de erro, assume que não é owner (mais seguro)
      setIsOwner(false);
      setIsCollaborator(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    isOwner,
    isCollaborator,
    companyId,
    loading,
  };
}
