ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'aberta';

CREATE INDEX IF NOT EXISTS idx_jobs_pipeline_stage
ON public.jobs (company_id, pipeline_stage);