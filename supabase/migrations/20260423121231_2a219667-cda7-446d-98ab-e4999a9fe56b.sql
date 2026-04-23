-- 1) Novas colunas em jobs para cálculo de score
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS required_skills text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS job_area text,
  ADD COLUMN IF NOT EXISTS required_education_level text,
  ADD COLUMN IF NOT EXISTS required_education_area text,
  ADD COLUMN IF NOT EXISTS min_experience_years numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_remote boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS score_weights jsonb DEFAULT '{"skills":40,"experience":30,"education":20,"location":10}'::jsonb;

-- 2) Persistir score detalhado e completude na application
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS adherence_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_completeness integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_history jsonb DEFAULT '[]'::jsonb;

-- 3) Função de match aproximado de skills (case-insensitive + variações comuns)
CREATE OR REPLACE FUNCTION public.normalize_skill(_skill text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(
    translate(coalesce(_skill, ''),
      'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
    '\s+|js$|\.js$', '', 'g'
  ));
$$;

-- 4) Função principal: calcula score de aderência + completude
CREATE OR REPLACE FUNCTION public.calculate_application_score(_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app        public.applications%ROWTYPE;
  v_job        public.jobs%ROWTYPE;
  v_profile    public.profiles%ROWTYPE;
  v_weights    jsonb;
  v_w_skills   numeric;
  v_w_exp      numeric;
  v_w_edu      numeric;
  v_w_loc      numeric;
  v_skills_pts numeric := 0;
  v_exp_pts    numeric := 0;
  v_edu_pts    numeric := 0;
  v_loc_pts    numeric := 0;
  v_matched    int := 0;
  v_required   int := 0;
  v_skill      text;
  v_cand_skill text;
  v_match_found boolean;
  v_total_exp_years numeric := 0;
  v_has_area_exp boolean := false;
  v_has_related boolean := false;
  v_exp_item jsonb;
  v_edu_item jsonb;
  v_completeness int := 0;
  v_total      int;
  v_breakdown  jsonb;
  v_old_score  int;
BEGIN
  SELECT * INTO v_app FROM public.applications WHERE id = _application_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = v_app.job_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_app.candidate_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_weights := COALESCE(v_job.score_weights, '{"skills":40,"experience":30,"education":20,"location":10}'::jsonb);
  v_w_skills := COALESCE((v_weights->>'skills')::numeric, 40);
  v_w_exp    := COALESCE((v_weights->>'experience')::numeric, 30);
  v_w_edu    := COALESCE((v_weights->>'education')::numeric, 20);
  v_w_loc    := COALESCE((v_weights->>'location')::numeric, 10);

  -- 1) Match de skills
  IF v_job.required_skills IS NOT NULL AND array_length(v_job.required_skills, 1) > 0 THEN
    v_required := array_length(v_job.required_skills, 1);
    FOREACH v_skill IN ARRAY v_job.required_skills LOOP
      v_match_found := false;
      IF v_profile.skills IS NOT NULL THEN
        FOREACH v_cand_skill IN ARRAY v_profile.skills LOOP
          IF public.normalize_skill(v_skill) = public.normalize_skill(v_cand_skill)
             OR public.normalize_skill(v_cand_skill) LIKE '%' || public.normalize_skill(v_skill) || '%'
             OR public.normalize_skill(v_skill) LIKE '%' || public.normalize_skill(v_cand_skill) || '%'
          THEN
            v_match_found := true;
            EXIT;
          END IF;
        END LOOP;
      END IF;
      IF v_match_found THEN v_matched := v_matched + 1; END IF;
    END LOOP;
    v_skills_pts := (v_matched::numeric / v_required::numeric) * v_w_skills;
  ELSE
    v_skills_pts := v_w_skills * 0.5; -- vaga sem skills definidas: dá metade
  END IF;

  -- 2) Experiência: verifica área e tempo total
  IF v_profile.experiences IS NOT NULL THEN
    FOR v_exp_item IN SELECT * FROM jsonb_array_elements(v_profile.experiences) LOOP
      -- soma anos (campo opcional 'years' ou diff entre datas)
      IF v_exp_item ? 'years' THEN
        v_total_exp_years := v_total_exp_years + COALESCE((v_exp_item->>'years')::numeric, 0);
      END IF;
      -- match de área
      IF v_job.job_area IS NOT NULL AND v_job.job_area <> '' THEN
        IF lower(COALESCE(v_exp_item->>'role','')) LIKE '%' || lower(v_job.job_area) || '%'
           OR lower(COALESCE(v_exp_item->>'sector','')) LIKE '%' || lower(v_job.job_area) || '%'
           OR lower(COALESCE(v_exp_item->>'company','')) LIKE '%' || lower(v_job.job_area) || '%'
        THEN
          v_has_area_exp := true;
        ELSIF lower(COALESCE(v_exp_item->>'role','')) LIKE '%' || lower(split_part(v_job.job_area,' ',1)) || '%' THEN
          v_has_related := true;
        END IF;
      END IF;
    END LOOP;
  END IF;

  IF v_job.job_area IS NULL OR v_job.job_area = '' THEN
    v_exp_pts := v_w_exp * 0.5;
  ELSIF v_has_area_exp THEN
    v_exp_pts := v_w_exp;
  ELSIF v_has_related THEN
    v_exp_pts := v_w_exp * 0.5;
  ELSE
    v_exp_pts := 0;
  END IF;

  -- bônus/desconto por tempo (±5 pts proporcionais ao peso)
  IF v_job.min_experience_years IS NOT NULL AND v_job.min_experience_years > 0 THEN
    IF v_total_exp_years > v_job.min_experience_years THEN
      v_exp_pts := LEAST(v_exp_pts + (v_w_exp * 5.0/30.0), v_w_exp);
    ELSIF v_total_exp_years < v_job.min_experience_years THEN
      v_exp_pts := GREATEST(v_exp_pts - (v_w_exp * 5.0/30.0), 0);
    END IF;
  END IF;

  -- 3) Formação
  IF v_job.required_education_level IS NULL OR v_job.required_education_level = '' THEN
    v_edu_pts := v_w_edu * 0.5;
  ELSIF v_profile.educations IS NOT NULL AND jsonb_array_length(v_profile.educations) > 0 THEN
    v_edu_pts := 0;
    FOR v_edu_item IN SELECT * FROM jsonb_array_elements(v_profile.educations) LOOP
      IF lower(COALESCE(v_edu_item->>'level','')) = lower(v_job.required_education_level)
         AND (v_job.required_education_area IS NULL OR v_job.required_education_area = ''
              OR lower(COALESCE(v_edu_item->>'course','')) LIKE '%' || lower(v_job.required_education_area) || '%') THEN
        v_edu_pts := GREATEST(v_edu_pts, v_w_edu);
      ELSIF v_job.required_education_area IS NOT NULL
            AND lower(COALESCE(v_edu_item->>'course','')) LIKE '%' || lower(v_job.required_education_area) || '%' THEN
        v_edu_pts := GREATEST(v_edu_pts, v_w_edu * 0.5);
      ELSIF lower(COALESCE(v_edu_item->>'status','')) IN ('cursando','em andamento','in_progress') THEN
        v_edu_pts := GREATEST(v_edu_pts, v_w_edu * 0.25);
      END IF;
    END LOOP;
  END IF;

  -- 4) Localização
  IF v_job.is_remote = true THEN
    v_loc_pts := v_w_loc;
  ELSIF v_job.city IS NOT NULL AND v_profile.city IS NOT NULL
        AND lower(v_job.city) = lower(v_profile.city) THEN
    v_loc_pts := v_w_loc;
  ELSIF v_job.state IS NOT NULL AND v_profile.state IS NOT NULL
        AND lower(v_job.state) = lower(v_profile.state) THEN
    v_loc_pts := v_w_loc * 0.5;
  ELSE
    v_loc_pts := 0;
  END IF;

  -- 5) Completude do perfil (0-100)
  IF v_profile.name IS NOT NULL AND v_profile.name <> '' THEN v_completeness := v_completeness + 10; END IF;
  IF v_profile.phone IS NOT NULL AND v_profile.phone <> '' THEN v_completeness := v_completeness + 10; END IF;
  IF v_profile.city IS NOT NULL AND v_profile.state IS NOT NULL THEN v_completeness := v_completeness + 10; END IF;
  IF v_profile.summary IS NOT NULL AND v_profile.summary <> '' THEN v_completeness := v_completeness + 10; END IF;
  IF v_profile.experiences IS NOT NULL AND jsonb_array_length(v_profile.experiences) >= 1 THEN v_completeness := v_completeness + 20; END IF;
  IF v_profile.educations IS NOT NULL AND jsonb_array_length(v_profile.educations) >= 1 THEN v_completeness := v_completeness + 15; END IF;
  IF v_profile.skills IS NOT NULL AND array_length(v_profile.skills, 1) >= 3 THEN v_completeness := v_completeness + 15; END IF;
  IF v_profile.cv_url IS NOT NULL AND v_profile.cv_url <> '' THEN v_completeness := v_completeness + 10; END IF;

  v_total := ROUND(v_skills_pts + v_exp_pts + v_edu_pts + v_loc_pts);
  v_total := LEAST(GREATEST(v_total, 0), 100);

  v_breakdown := jsonb_build_object(
    'skills', jsonb_build_object('earned', ROUND(v_skills_pts), 'max', v_w_skills, 'matched', v_matched, 'required', v_required),
    'experience', jsonb_build_object('earned', ROUND(v_exp_pts), 'max', v_w_exp, 'years', v_total_exp_years, 'has_area', v_has_area_exp),
    'education', jsonb_build_object('earned', ROUND(v_edu_pts), 'max', v_w_edu),
    'location', jsonb_build_object('earned', ROUND(v_loc_pts), 'max', v_w_loc)
  );

  v_old_score := COALESCE(v_app.adherence_score, 0);

  UPDATE public.applications
  SET adherence_score = v_total,
      score = v_total,
      score_breakdown = v_breakdown,
      profile_completeness = v_completeness,
      score_history = COALESCE(score_history, '[]'::jsonb) || jsonb_build_object(
        'at', now(),
        'score', v_total,
        'previous', v_old_score
      ),
      updated_at = now()
  WHERE id = _application_id;
END;
$$;

-- 5) Trigger: recalcula ao criar candidatura
CREATE OR REPLACE FUNCTION public.trg_application_score_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.calculate_application_score(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS application_score_on_insert ON public.applications;
CREATE TRIGGER application_score_on_insert
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_application_score_on_insert();

-- 6) Trigger: recalcula todas as candidaturas do candidato quando perfil muda
CREATE OR REPLACE FUNCTION public.trg_recalc_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_rec record;
BEGIN
  FOR app_rec IN SELECT id FROM public.applications WHERE candidate_id = NEW.id LOOP
    PERFORM public.calculate_application_score(app_rec.id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recalc_score_on_profile_update ON public.profiles;
CREATE TRIGGER recalc_score_on_profile_update
  AFTER UPDATE OF skills, experiences, educations, city, state, name, phone, summary, cv_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_on_profile_update();

-- 7) Trigger: recalcula todas as candidaturas da vaga quando requisitos mudam
CREATE OR REPLACE FUNCTION public.trg_recalc_on_job_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_rec record;
BEGIN
  FOR app_rec IN SELECT id FROM public.applications WHERE job_id = NEW.id LOOP
    PERFORM public.calculate_application_score(app_rec.id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recalc_score_on_job_update ON public.jobs;
CREATE TRIGGER recalc_score_on_job_update
  AFTER UPDATE OF required_skills, job_area, required_education_level, required_education_area,
                  min_experience_years, is_remote, score_weights, city, state ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_on_job_update();