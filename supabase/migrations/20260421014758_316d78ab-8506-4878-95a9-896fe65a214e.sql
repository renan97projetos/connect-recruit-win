CREATE TABLE IF NOT EXISTS public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  cnpj text,
  vacancy_count integer,
  message text,
  source text NOT NULL DEFAULT 'contact_form',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a lead (public contact form)
CREATE POLICY "Anyone can create leads"
  ON public.leads
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only super admins can view leads
CREATE POLICY "Super admins can view leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Only super admins can update leads
CREATE POLICY "Super admins can update leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Only super admins can delete leads
CREATE POLICY "Super admins can delete leads"
  ON public.leads
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();