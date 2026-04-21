
DROP POLICY IF EXISTS "Authenticated users can view screening questions" ON public.screening_questions;

-- Empresa dona da vaga vê suas próprias perguntas
CREATE POLICY "Company owns screening questions of own jobs"
ON public.screening_questions
FOR SELECT
TO authenticated
USING (company_id = auth.uid());

-- Candidato logado vê perguntas das vagas que estão ativas (necessário para o fluxo de candidatura)
CREATE POLICY "Candidates can view screening questions of active jobs"
ON public.screening_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = screening_questions.job_id
      AND j.is_active = true
  )
);
