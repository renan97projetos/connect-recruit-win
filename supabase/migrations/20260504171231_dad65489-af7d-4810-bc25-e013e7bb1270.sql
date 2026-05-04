CREATE TABLE public.manual_publication_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  published_channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  handled_by UUID,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_manual_pub_status ON public.manual_publication_requests(status);
CREATE INDEX idx_manual_pub_created ON public.manual_publication_requests(created_at DESC);

ALTER TABLE public.manual_publication_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view manual publication requests"
  ON public.manual_publication_requests FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert manual publication requests"
  ON public.manual_publication_requests FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update manual publication requests"
  ON public.manual_publication_requests FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete manual publication requests"
  ON public.manual_publication_requests FOR DELETE
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_manual_pub_updated_at
  BEFORE UPDATE ON public.manual_publication_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();