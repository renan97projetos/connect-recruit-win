-- 1) Coluna para diferenciar perguntas auto-geradas das manuais
ALTER TABLE public.screening_questions
  ADD COLUMN IF NOT EXISTS is_auto_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.screening_questions
  ADD COLUMN IF NOT EXISTS source_key text;
-- source_key ex: 'skill:react', 'experience', 'education', 'location'

-- 2) Função: gera perguntas de triagem automáticas a partir da config de score da vaga
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

  -- Se já existem perguntas auto-geradas, não duplicar
  IF EXISTS (SELECT 1 FROM public.screening_questions WHERE job_id = _job_id AND is_auto_generated = true) THEN
    RETURN;
  END IF;

  -- Skills exigidas: 1 pergunta sim/não para cada (até 8)
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

  -- Experiência mínima
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

  -- Formação requerida
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

  -- Localização (se não for remota)
  IF COALESCE(v_job.is_remote, false) = false AND v_job.city IS NOT NULL AND v_job.city <> '' THEN
    INSERT INTO public.screening_questions
      (company_id, job_id, question, question_type, required, order_position, is_auto_generated, source_key)
    VALUES
      (v_job.company_id, _job_id,
       'Você reside ou tem disponibilidade para trabalhar em ' || v_job.city || '?',
       'yes_no', true, v_pos, true, 'location');
    v_pos := v_pos + 1;
  END IF;
END;
$$;

-- 3) Função: aplica respostas no score (bônus/penalidade)
CREATE OR REPLACE FUNCTION public.apply_screening_answers_to_score(_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.applications%ROWTYPE;
  v_job public.jobs%ROWTYPE;
  v_weights jsonb;
  v_w_skills numeric;
  v_w_exp numeric;
  v_w_edu numeric;
  v_w_loc numeric;
  v_bonus numeric := 0;
  v_skills_total int := 0;
  v_skills_yes int := 0;
  v_ans record;
  v_breakdown jsonb;
  v_old_score int;
  v_new_score int;
BEGIN
  SELECT * INTO v_app FROM public.applications WHERE id = _application_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = v_app.job_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_weights := COALESCE(v_job.score_weights, '{"skills":40,"experience":30,"education":20,"location":10}'::jsonb);
  v_w_skills := COALESCE((v_weights->>'skills')::numeric, 40);
  v_w_exp    := COALESCE((v_weights->>'experience')::numeric, 30);
  v_w_edu    := COALESCE((v_weights->>'education')::numeric, 20);
  v_w_loc    := COALESCE((v_weights->>'location')::numeric, 10);

  -- Itera respostas auto-geradas e ajusta score
  FOR v_ans IN
    SELECT sq.source_key, sa.answer, sq.question_type
    FROM public.screening_answers sa
    JOIN public.screening_questions sq ON sq.id = sa.question_id
    WHERE sa.application_id = _application_id
      AND sq.is_auto_generated = true
  LOOP
    -- Skills
    IF v_ans.source_key LIKE 'skill:%' THEN
      v_skills_total := v_skills_total + 1;
      IF lower(coalesce(v_ans.answer,'')) = 'sim' THEN
        v_skills_yes := v_skills_yes + 1;
      END IF;

    -- Experiência
    ELSIF v_ans.source_key = 'experience' THEN
      IF v_job.min_experience_years IS NOT NULL THEN
        IF v_ans.answer = 'Mais de 5 anos' OR
           (v_ans.answer = '3 a 5 anos' AND v_job.min_experience_years <= 5) OR
           (v_ans.answer = '1 a 2 anos' AND v_job.min_experience_years <= 2) THEN
          v_bonus := v_bonus + (v_w_exp * 0.20);
        ELSIF v_ans.answer = 'Menos de 1 ano' AND v_job.min_experience_years >= 1 THEN
          v_bonus := v_bonus - (v_w_exp * 0.30);
        END IF;
      END IF;

    -- Formação
    ELSIF v_ans.source_key = 'education' THEN
      IF v_ans.answer = 'Concluído' OR v_ans.answer = 'Pós-graduação' THEN
        v_bonus := v_bonus + (v_w_edu * 0.25);
      ELSIF v_ans.answer = 'Cursando' THEN
        v_bonus := v_bonus + (v_w_edu * 0.10);
      ELSIF v_ans.answer = 'Não tenho' THEN
        v_bonus := v_bonus - (v_w_edu * 0.30);
      END IF;

    -- Localização
    ELSIF v_ans.source_key = 'location' THEN
      IF lower(coalesce(v_ans.answer,'')) = 'sim' THEN
        v_bonus := v_bonus + (v_w_loc * 0.30);
      ELSE
        v_bonus := v_bonus - (v_w_loc * 0.40);
      END IF;
    END IF;
  END LOOP;

  -- Bônus/penalidade total de skills (proporcional ao % de "sim")
  IF v_skills_total > 0 THEN
    v_bonus := v_bonus + (v_w_skills * ((v_skills_yes::numeric / v_skills_total::numeric) - 0.5) * 0.4);
  END IF;

  v_old_score := COALESCE(v_app.adherence_score, v_app.score, 0);
  v_new_score := LEAST(GREATEST(ROUND(v_old_score + v_bonus), 0), 100);

  v_breakdown := COALESCE(v_app.score_breakdown, '{}'::jsonb) ||
    jsonb_build_object(
      'screening', jsonb_build_object(
        'bonus', ROUND(v_bonus),
        'skills_yes', v_skills_yes,
        'skills_total', v_skills_total
      )
    );

  UPDATE public.applications
  SET adherence_score = v_new_score,
      score = v_new_score,
      score_breakdown = v_breakdown,
      score_history = COALESCE(score_history,'[]'::jsonb) || jsonb_build_object(
        'at', now(), 'score', v_new_score, 'previous', v_old_score, 'reason', 'screening_answers'
      ),
      updated_at = now()
  WHERE id = _application_id;
END;
$$;