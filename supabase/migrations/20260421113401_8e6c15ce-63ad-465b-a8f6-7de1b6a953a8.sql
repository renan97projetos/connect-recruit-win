
CREATE TABLE IF NOT EXISTS public.screening_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  question text NOT NULL,
  question_type text NOT NULL DEFAULT 'text',
  options jsonb DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT true,
  order_position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_screening_questions_job ON public.screening_questions(job_id);

CREATE TABLE IF NOT EXISTS public.screening_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.screening_questions(id) ON DELETE CASCADE,
  answer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_screening_answers_application ON public.screening_answers(application_id);

ALTER TABLE public.screening_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_answers ENABLE ROW LEVEL SECURITY;

-- screening_questions policies
CREATE POLICY "Anyone can view screening questions"
  ON public.screening_questions FOR SELECT
  USING (true);

CREATE POLICY "Company owners can insert screening questions"
  ON public.screening_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.company_id = auth.uid())
  );

CREATE POLICY "Company owners can update screening questions"
  ON public.screening_questions FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Company owners can delete screening questions"
  ON public.screening_questions FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

-- screening_answers policies
CREATE POLICY "Candidates insert own answers"
  ON public.screening_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id AND a.candidate_id = auth.uid()
    )
  );

CREATE POLICY "Candidate or job owner can view answers"
  ON public.screening_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = application_id
        AND (a.candidate_id = auth.uid() OR j.company_id = auth.uid())
    )
  );
