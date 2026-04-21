CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  stage_trigger text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company manages own templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());