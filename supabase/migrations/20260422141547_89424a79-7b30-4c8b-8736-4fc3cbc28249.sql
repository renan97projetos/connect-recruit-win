-- Permitir que o owner da empresa (user_id = company_id) tenha acesso total às vagas
-- sem depender de entradas em user_permissions

-- INSERT: owner pode criar vagas em sua própria empresa
DROP POLICY IF EXISTS "Company users can create jobs" ON public.jobs;
CREATE POLICY "Company users can create jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (
  -- Owner (criador da empresa) pode sempre criar
  public.is_company_owner(auth.uid(), company_id)
  OR
  -- Colaboradores com permissão create_vagas podem criar
  (has_role(auth.uid(), 'company'::app_role)
   AND public.user_has_permission(auth.uid(), company_id, 'create_vagas'::permission_key))
);

-- SELECT: owner pode ver todas as vagas da sua empresa
DROP POLICY IF EXISTS "Company users can view their own jobs" ON public.jobs;
CREATE POLICY "Company users can view their own jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  public.is_company_owner(auth.uid(), company_id)
  OR
  (company_id = auth.uid())
  OR
  public.user_has_permission(auth.uid(), company_id, 'view_vagas'::permission_key)
);

-- UPDATE: owner pode atualizar todas as vagas da sua empresa
DROP POLICY IF EXISTS "Company users can update their own jobs" ON public.jobs;
CREATE POLICY "Company users can update their own jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (
  public.is_company_owner(auth.uid(), company_id)
  OR
  public.user_has_permission(auth.uid(), company_id, 'edit_vagas'::permission_key)
);

-- DELETE: owner pode deletar; colaboradores precisam de manage_usuarios (mantido)
DROP POLICY IF EXISTS "Company users can delete their own jobs" ON public.jobs;
CREATE POLICY "Company users can delete their own jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (
  public.is_company_owner(auth.uid(), company_id)
  OR
  public.user_has_permission(auth.uid(), company_id, 'delete_vagas'::permission_key)
);