CREATE TABLE IF NOT EXISTS public.job_offers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id uuid NOT NULL,
  company_id uuid NOT NULL,
  offered_salary numeric,
  benefits_offered text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_offers_application ON public.job_offers(application_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_job ON public.job_offers(job_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_company ON public.job_offers(company_id);

ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company can manage own offers"
  ON public.job_offers FOR ALL
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Candidate can view own offers"
  ON public.job_offers FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = job_offers.application_id AND a.candidate_id = auth.uid()
  ));

CREATE POLICY "Admins can view all offers"
  ON public.job_offers FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_job_offers_updated_at
  BEFORE UPDATE ON public.job_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();