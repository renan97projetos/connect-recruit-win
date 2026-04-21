CREATE TABLE IF NOT EXISTS public.approval_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_request_id uuid NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  approver_name text,
  action text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage approvals" ON public.approval_actions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_requests jr
      WHERE jr.id = job_request_id AND jr.company_id = auth.uid()
    ) OR approver_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_requests jr
      WHERE jr.id = job_request_id AND jr.company_id = auth.uid()
    ) OR approver_id = auth.uid()
  );

CREATE INDEX IF NOT EXISTS idx_approval_actions_job_request ON public.approval_actions(job_request_id);