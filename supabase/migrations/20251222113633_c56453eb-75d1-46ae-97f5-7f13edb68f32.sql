-- 1. Adicionar coluna is_owner na tabela company_users para identificar o dono da empresa
-- O OWNER é identificado quando company_id = user_id (o usuário que criou a empresa)

-- 2. Criar função para verificar se um usuário é OWNER da empresa
CREATE OR REPLACE FUNCTION public.is_company_owner(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- O OWNER é o usuário cujo ID é igual ao company_id (criador da empresa)
  SELECT _user_id = _company_id
$$;

-- 3. Criar função para verificar se usuário pode gerenciar outros usuários (só OWNER)
CREATE OR REPLACE FUNCTION public.can_manage_company_users(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_company_owner(_user_id, _company_id)
$$;

-- 4. Atualizar política de INSERT na company_users - só OWNER pode adicionar
DROP POLICY IF EXISTS "Empresas podem criar usuários" ON public.company_users;
CREATE POLICY "Apenas OWNER pode criar usuários" 
ON public.company_users 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'company'::app_role) 
  AND public.is_company_owner(auth.uid(), company_id)
);

-- 5. Atualizar política de UPDATE na company_users - só OWNER pode editar
DROP POLICY IF EXISTS "Empresas podem atualizar seus usuários" ON public.company_users;
CREATE POLICY "Apenas OWNER pode atualizar usuários" 
ON public.company_users 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'company'::app_role) 
  AND public.is_company_owner(auth.uid(), company_id)
);

-- 6. Atualizar política de DELETE na company_users - só OWNER pode remover
DROP POLICY IF EXISTS "Empresas podem deletar seus usuários" ON public.company_users;
CREATE POLICY "Apenas OWNER pode deletar usuários" 
ON public.company_users 
FOR DELETE 
USING (
  has_role(auth.uid(), 'company'::app_role) 
  AND public.is_company_owner(auth.uid(), company_id)
);

-- 7. Manter política de SELECT - OWNER e próprios usuários podem ver
DROP POLICY IF EXISTS "Empresas podem ver seus usuários" ON public.company_users;
CREATE POLICY "OWNER e colaboradores podem ver usuários da empresa" 
ON public.company_users 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (has_role(auth.uid(), 'company'::app_role) AND public.is_company_owner(auth.uid(), company_id))
  OR (has_role(auth.uid(), 'company'::app_role) AND user_id = auth.uid())
);

-- 8. Atualizar políticas de user_permissions - só OWNER pode gerenciar
DROP POLICY IF EXISTS "Empresas podem criar permissões" ON public.user_permissions;
CREATE POLICY "Apenas OWNER pode criar permissões" 
ON public.user_permissions 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'company'::app_role) 
  AND EXISTS (
    SELECT 1 FROM company_users cu 
    WHERE cu.id = user_permissions.company_user_id 
    AND public.is_company_owner(auth.uid(), cu.company_id)
  )
);

DROP POLICY IF EXISTS "Empresas podem atualizar permissões" ON public.user_permissions;
CREATE POLICY "Apenas OWNER pode atualizar permissões" 
ON public.user_permissions 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'company'::app_role) 
  AND EXISTS (
    SELECT 1 FROM company_users cu 
    WHERE cu.id = user_permissions.company_user_id 
    AND public.is_company_owner(auth.uid(), cu.company_id)
  )
);

DROP POLICY IF EXISTS "Empresas podem deletar permissões" ON public.user_permissions;
CREATE POLICY "Apenas OWNER pode deletar permissões" 
ON public.user_permissions 
FOR DELETE 
USING (
  has_role(auth.uid(), 'company'::app_role) 
  AND EXISTS (
    SELECT 1 FROM company_users cu 
    WHERE cu.id = user_permissions.company_user_id 
    AND public.is_company_owner(auth.uid(), cu.company_id)
  )
);

-- 9. Manter leitura de permissões para OWNER e próprio usuário
DROP POLICY IF EXISTS "Empresas podem ver permissões de seus usuários" ON public.user_permissions;
CREATE POLICY "OWNER e próprio usuário podem ver permissões" 
ON public.user_permissions 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'company'::app_role) 
    AND EXISTS (
      SELECT 1 FROM company_users cu 
      WHERE cu.id = user_permissions.company_user_id 
      AND (public.is_company_owner(auth.uid(), cu.company_id) OR cu.user_id = auth.uid())
    )
  )
);

-- 10. Atualizar políticas de audit_logs - só OWNER pode ver logs
DROP POLICY IF EXISTS "Empresas podem ver seus logs" ON public.audit_logs;
CREATE POLICY "Apenas OWNER pode ver logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'company'::app_role) AND public.is_company_owner(auth.uid(), company_id))
);

DROP POLICY IF EXISTS "Empresas podem criar logs" ON public.audit_logs;
CREATE POLICY "OWNER e sistema podem criar logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'company'::app_role) 
  AND public.is_company_owner(auth.uid(), company_id)
);