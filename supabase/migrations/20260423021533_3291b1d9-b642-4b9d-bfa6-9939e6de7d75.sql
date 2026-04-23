-- Approval status enum
DO $$ BEGIN
  CREATE TYPE public.job_approval_status AS ENUM ('not_required', 'draft', 'pending_approval', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add approval & pause columns to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS approval_status public.job_approval_status NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approver_id uuid,
  ADD COLUMN IF NOT EXISTS approval_deadline_days integer,
  ADD COLUMN IF NOT EXISTS approval_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_rejection_reason text,
  ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_reason text;

CREATE INDEX IF NOT EXISTS idx_jobs_approval_status ON public.jobs(approval_status);
CREATE INDEX IF NOT EXISTS idx_jobs_approver_id ON public.jobs(approver_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_paused ON public.jobs(is_paused);

-- Tenant-level defaults for approval
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS default_approver_id uuid,
  ADD COLUMN IF NOT EXISTS default_approval_deadline_days integer DEFAULT 3;

-- Allow approver (when set) to view & update the job they need to approve
DROP POLICY IF EXISTS "Approvers can view assigned jobs" ON public.jobs;
CREATE POLICY "Approvers can view assigned jobs"
ON public.jobs FOR SELECT TO authenticated
USING (approver_id = auth.uid());

DROP POLICY IF EXISTS "Approvers can update approval fields" ON public.jobs;
CREATE POLICY "Approvers can update approval fields"
ON public.jobs FOR UPDATE TO authenticated
USING (approver_id = auth.uid());