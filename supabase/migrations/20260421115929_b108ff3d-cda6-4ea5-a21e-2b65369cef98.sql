CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  test_url text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company manages own assessments" ON public.assessments
  FOR ALL TO authenticated
  USING (company_id = auth.uid()) 
  WITH CHECK (company_id = auth.uid());