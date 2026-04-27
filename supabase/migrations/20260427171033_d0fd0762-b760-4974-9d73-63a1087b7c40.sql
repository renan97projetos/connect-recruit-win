-- Remove auto-generated location screening questions already created
DELETE FROM public.screening_questions
WHERE is_auto_generated = true AND source_key = 'location';

-- Recreate function without the location auto-question
CREATE OR REPLACE FUNCTION public.generate_screening_questions(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
  v_skill text;
  v_pos int := 0;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = _job_id;
  IF NOT FOUND OR v_job.company_id IS NULL THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.screening_questions WHERE job_id = _job_id AND is_auto_generated = true) THEN
    RETURN;
  END IF;

  IF v_job.required_skills IS NOT NULL THEN
    FOREACH v_skill IN ARRAY v_job.required_skills LOOP
      IF v_pos >= 8 THEN EXIT; END IF;
      INSERT INTO public.screening_questions
        (company_id, job_id, question, question_type, required, order_position, is_auto_generated, source_key)
      VALUES
        (v_job.company_id, _job_id,
         'Você tem experiência prática com ' || v_skill || '?',
         'yes_no', true, v_pos, true, 'skill:' || lower(v_skill));
      v_pos := v_pos + 1;
    END LOOP;
  END IF;

  IF v_job.min_experience_years IS NOT NULL AND v_job.min_experience_years > 0 THEN
    INSERT INTO public.screening_questions
      (company_id, job_id, question, question_type, required, order_position, is_auto_generated, source_key, options)
    VALUES
      (v_job.company_id, _job_id,
       'Quantos anos de experiência você tem em ' || COALESCE(NULLIF(v_job.job_area, ''), 'na área da vaga') || '?',
       'multiple_choice', true, v_pos, true, 'experience',
       jsonb_build_array('Menos de 1 ano','1 a 2 anos','3 a 5 anos','Mais de 5 anos'));
    v_pos := v_pos + 1;
  END IF;

  IF v_job.required_education_level IS NOT NULL AND v_job.required_education_level <> '' THEN
    INSERT INTO public.screening_questions
      (company_id, job_id, question, question_type, required, order_position, is_auto_generated, source_key, options)
    VALUES
      (v_job.company_id, _job_id,
       'Qual seu nível de formação em ' || COALESCE(NULLIF(v_job.required_education_area, ''), 'área relacionada') || '?',
       'multiple_choice', true, v_pos, true, 'education',
       jsonb_build_array('Não tenho','Cursando','Concluído','Pós-graduação'));
    v_pos := v_pos + 1;
  END IF;
END;
$$;