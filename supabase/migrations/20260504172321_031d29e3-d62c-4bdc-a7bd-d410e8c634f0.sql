
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
        updated_at = now()
    WHERE id = NEW.job_id
      AND COALESCE(is_archived, false) = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activate_job_on_manual_publish ON public.manual_publication_requests;
CREATE TRIGGER trg_activate_job_on_manual_publish
AFTER UPDATE ON public.manual_publication_requests
FOR EACH ROW
EXECUTE FUNCTION public.activate_job_on_manual_publish();
