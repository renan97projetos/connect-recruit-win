CREATE TABLE IF NOT EXISTS public.interviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id uuid NOT NULL,
  company_id uuid NOT NULL,
  scheduled_at timestamptz,
  format text NOT NULL DEFAULT 'video',
  meeting_link text,
  location text,
  interviewer_name text,
  status text NOT NULL DEFAULT 'scheduled',
  feedback text,
  feedback_score integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company manages own interviews" ON public.interviews
  FOR ALL TO authenticated
  USING (company_id = auth.uid()) WITH CHECK (company_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_interviews_application ON public.interviews(application_id);