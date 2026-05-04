
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS pending_manual_publication boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.activate_job_on_manual_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    UPDATE public.jobs
    SET is_active = true,
        pending_manual_publication = false,
        updated_at = now()
    WHERE id = NEW.job_id
      AND COALESCE(is_archived, false) = false;
  END IF;
  RETURN NEW;
END;
$$;
