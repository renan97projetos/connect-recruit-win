-- Adiciona campos para fluxo de cancelamento de vagas
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS cancellation_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_requested_by uuid,
  ADD COLUMN IF NOT EXISTS cancellation_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_decided_by uuid,
  ADD COLUMN IF NOT EXISTS cancellation_rejection_reason text;

-- Restringe valores válidos para cancellation_status via trigger (evita CHECK rígido)
CREATE OR REPLACE FUNCTION public.validate_job_cancellation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cancellation_status NOT IN ('none', 'pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid cancellation_status: %', NEW.cancellation_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_job_cancellation_status ON public.jobs;
CREATE TRIGGER trg_validate_job_cancellation_status
  BEFORE INSERT OR UPDATE OF cancellation_status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_job_cancellation_status();