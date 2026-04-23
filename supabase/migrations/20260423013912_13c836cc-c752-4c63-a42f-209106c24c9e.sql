-- Trigger: ao inserir uma application, mover a vaga para 'triagem' se ainda estiver em 'aberta'
CREATE OR REPLACE FUNCTION public.move_job_to_triagem_on_first_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.jobs
  SET pipeline_stage = 'triagem',
      updated_at = now()
  WHERE id = NEW.job_id
    AND COALESCE(pipeline_stage, 'aberta') = 'aberta';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_move_job_to_triagem ON public.applications;
CREATE TRIGGER trg_move_job_to_triagem
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.move_job_to_triagem_on_first_application();

-- Backfill: vagas que já têm candidatos mas ainda estão em 'aberta' devem ir para 'triagem'
UPDATE public.jobs j
SET pipeline_stage = 'triagem',
    updated_at = now()
WHERE COALESCE(j.pipeline_stage, 'aberta') = 'aberta'
  AND EXISTS (SELECT 1 FROM public.applications a WHERE a.job_id = j.id);
