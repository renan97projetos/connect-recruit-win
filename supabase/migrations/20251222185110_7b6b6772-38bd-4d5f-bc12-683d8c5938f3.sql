-- Políticas para super admins gerenciarem vagas
CREATE POLICY "Super admins podem ver todas as vagas" 
ON public.jobs 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem criar vagas" 
ON public.jobs 
FOR INSERT 
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem atualizar vagas" 
ON public.jobs 
FOR UPDATE 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem deletar vagas" 
ON public.jobs 
FOR DELETE 
USING (is_super_admin(auth.uid()));