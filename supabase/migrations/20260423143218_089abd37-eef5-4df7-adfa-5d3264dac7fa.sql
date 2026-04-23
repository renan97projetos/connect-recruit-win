-- Permitir que candidatos deletem suas próprias candidaturas (retirar candidatura)
CREATE POLICY "Candidatos podem retirar suas próprias candidaturas"
ON public.applications
FOR DELETE
TO authenticated
USING (candidate_id = auth.uid());