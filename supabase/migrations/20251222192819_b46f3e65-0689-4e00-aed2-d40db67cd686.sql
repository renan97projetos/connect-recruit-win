-- Atualizar política de INSERT na tabela jobs para permitir owners diretamente
DROP POLICY IF EXISTS "Company users can create jobs" ON public.jobs;

CREATE POLICY "Company users can create jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (
  (company_id = auth.uid() AND has_role(auth.uid(), 'company'::app_role))
  OR
  (has_role(auth.uid(), 'company'::app_role) AND user_has_permission(auth.uid(), company_id, 'create_vagas'::permission_key))
);