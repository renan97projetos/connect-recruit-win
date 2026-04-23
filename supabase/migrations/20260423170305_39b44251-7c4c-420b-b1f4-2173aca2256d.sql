-- Reformula apply_screening_answers_to_score para SOBRESCREVER o detalhamento por categoria
-- com base nas respostas do screening (quando existirem), em vez de só somar bônus.
CREATE OR REPLACE FUNCTION public.apply_screening_answers_to_score(_application_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_app public.applications%ROWTYPE;
  v_job public.jobs%ROWTYPE;
  v_weights jsonb;
  v_w_skills numeric;
  v_w_exp numeric;
  v_w_edu numeric;
  v_w_loc numeric;
  v_breakdown jsonb;
  v_skills_cat jsonb;
  v_exp_cat jsonb;
  v_edu_cat jsonb;
  v_loc_cat jsonb;
  v_skills_total int := 0;
  v_skills_yes int := 0;
  v_skills_pts numeric;
  v_exp_pts numeric;
  v_edu_pts numeric;
  v_loc_pts numeric;
  v_has_screening boolean := false;
  v_has_exp_answer boolean := false;
  v_has_edu_answer boolean := false;
  v_has_loc_answer boolean := false;
  v_ans record;
  v_old_score int;
  v_new_score int;
  v_total_pts numeric;
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

  -- Começa do breakdown atual (calculado pelo perfil)
  v_breakdown := COALESCE(v_app.score_breakdown, '{}'::jsonb);
  v_skills_cat := COALESCE(v_breakdown->'skills', jsonb_build_object('earned', 0, 'max', v_w_skills, 'matched', 0, 'required', 0));
  v_exp_cat    := COALESCE(v_breakdown->'experience', jsonb_build_object('earned', 0, 'max', v_w_exp));
  v_edu_cat    := COALESCE(v_breakdown->'education', jsonb_build_object('earned', 0, 'max', v_w_edu));
  v_loc_cat    := COALESCE(v_breakdown->'location', jsonb_build_object('earned', 0, 'max', v_w_loc));

  v_skills_pts := COALESCE((v_skills_cat->>'earned')::numeric, 0);
  v_exp_pts    := COALESCE((v_exp_cat->>'earned')::numeric, 0);
  v_edu_pts    := COALESCE((v_edu_cat->>'earned')::numeric, 0);
  v_loc_pts    := COALESCE((v_loc_cat->>'earned')::numeric, 0);

  -- Itera respostas do screening
  FOR v_ans IN
    SELECT sq.source_key, sa.answer, sq.question_type
    FROM public.screening_answers sa
    JOIN public.screening_questions sq ON sq.id = sa.question_id
    WHERE sa.application_id = _application_id
      AND sq.is_auto_generated = true
  LOOP
    v_has_screening := true;
    -- Skills (sim/não por skill)
    IF v_ans.source_key LIKE 'skill:%' THEN
      v_skills_total := v_skills_total + 1;
      IF lower(coalesce(v_ans.answer,'')) = 'sim' THEN
        v_skills_yes := v_skills_yes + 1;
      END IF;

    -- Experiência (multiple choice)
    ELSIF v_ans.source_key = 'experience' THEN
      v_has_exp_answer := true;
      IF v_ans.answer = 'Mais de 5 anos' THEN
        v_exp_pts := v_w_exp;
      ELSIF v_ans.answer = '3 a 5 anos' THEN
        v_exp_pts := v_w_exp * CASE WHEN COALESCE(v_job.min_experience_years, 0) <= 5 THEN 1.0 ELSE 0.7 END;
      ELSIF v_ans.answer = '1 a 2 anos' THEN
        v_exp_pts := v_w_exp * CASE WHEN COALESCE(v_job.min_experience_years, 0) <= 2 THEN 1.0 ELSE 0.4 END;
      ELSIF v_ans.answer = 'Menos de 1 ano' THEN
        v_exp_pts := v_w_exp * CASE WHEN COALESCE(v_job.min_experience_years, 0) < 1 THEN 0.7 ELSE 0.1 END;
      END IF;

    -- Formação
    ELSIF v_ans.source_key = 'education' THEN
      v_has_edu_answer := true;
      IF v_ans.answer = 'Pós-graduação' THEN
        v_edu_pts := v_w_edu;
      ELSIF v_ans.answer = 'Concluído' THEN
        v_edu_pts := v_w_edu;
      ELSIF v_ans.answer = 'Cursando' THEN
        v_edu_pts := v_w_edu * 0.5;
      ELSIF v_ans.answer = 'Não tenho' THEN
        v_edu_pts := 0;
      END IF;

    -- Localização
    ELSIF v_ans.source_key = 'location' THEN
      v_has_loc_answer := true;
      IF lower(coalesce(v_ans.answer,'')) = 'sim' THEN
        v_loc_pts := v_w_loc;
      ELSE
        v_loc_pts := 0;
      END IF;
    END IF;
  END LOOP;

  -- Se respondeu skills no screening, sobrescreve a categoria de skills
  IF v_skills_total > 0 THEN
    v_skills_pts := (v_skills_yes::numeric / v_skills_total::numeric) * v_w_skills;
    v_skills_cat := jsonb_build_object(
      'earned', ROUND(v_skills_pts),
      'max', v_w_skills,
      'matched', v_skills_yes,
      'required', v_skills_total
    );
  END IF;

  IF v_has_exp_answer THEN
    v_exp_cat := jsonb_set(v_exp_cat, '{earned}', to_jsonb(ROUND(v_exp_pts)));
  END IF;
  IF v_has_edu_answer THEN
    v_edu_cat := jsonb_set(v_edu_cat, '{earned}', to_jsonb(ROUND(v_edu_pts)));
  END IF;
  IF v_has_loc_answer THEN
    v_loc_cat := jsonb_set(v_loc_cat, '{earned}', to_jsonb(ROUND(v_loc_pts)));
  END IF;

  IF NOT v_has_screening THEN
    RETURN;
  END IF;

  v_total_pts := v_skills_pts + v_exp_pts + v_edu_pts + v_loc_pts;
  v_new_score := LEAST(GREATEST(ROUND(v_total_pts), 0), 100);
  v_old_score := COALESCE(v_app.adherence_score, v_app.score, 0);

  v_breakdown := jsonb_build_object(
    'skills', v_skills_cat,
    'experience', v_exp_cat,
    'education', v_edu_cat,
    'location', v_loc_cat,
    'screening', jsonb_build_object(
      'applied', true,
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
$function$;

-- Recalcula tudo
DO $$
DECLARE
  app_rec record;
BEGIN
  FOR app_rec IN SELECT id FROM public.applications LOOP
    PERFORM public.calculate_application_score(app_rec.id);
    PERFORM public.apply_screening_answers_to_score(app_rec.id);
  END LOOP;
END $$;