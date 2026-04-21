CREATE TABLE IF NOT EXISTS public.career_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  custom_title text,
  custom_description text,
  primary_color text DEFAULT '#7c3aed',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.career_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active pages" ON public.career_pages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Company manages own page" ON public.career_pages
  FOR ALL TO authenticated
  USING (company_id = auth.uid()) 
  WITH CHECK (company_id = auth.uid());