-- Remove perguntas customizadas que são duplicatas das auto-geradas (mesmo job_id, mesma pergunta)
DELETE FROM public.screening_questions sq_custom
WHERE sq_custom.is_auto_generated = false
  AND EXISTS (
    SELECT 1 FROM public.screening_questions sq_auto
    WHERE sq_auto.job_id = sq_custom.job_id
      AND sq_auto.is_auto_generated = true
      AND lower(trim(sq_auto.question)) = lower(trim(sq_custom.question))
  );