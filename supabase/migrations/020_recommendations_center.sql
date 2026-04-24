-- 020_recommendations_center.sql
-- Extiende marketing_recommendations y sales_analyses para el Centro de Recomendaciones

-- 1. Ampliar marketing_recommendations con campos del Centro
ALTER TABLE public.marketing_recommendations
  ADD COLUMN IF NOT EXISTS agent_name          text        DEFAULT 'lead_intelligence',
  ADD COLUMN IF NOT EXISTS recommendation_type text,
  ADD COLUMN IF NOT EXISTS priority            text        DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS title               text,
  ADD COLUMN IF NOT EXISTS explanation         text,
  ADD COLUMN IF NOT EXISTS expected_impact     text,
  ADD COLUMN IF NOT EXISTS suggested_action    text,
  ADD COLUMN IF NOT EXISTS status              text        DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS approved_by         text,
  ADD COLUMN IF NOT EXISTS approved_at         timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_reason    text,
  ADD COLUMN IF NOT EXISTS metadata_json       jsonb;

-- Mapear urgency → priority en registros existentes del Lead Intelligence Agent
UPDATE public.marketing_recommendations
  SET priority = urgency
  WHERE urgency IS NOT NULL;

CREATE INDEX IF NOT EXISTS recommendations_agent_idx    ON public.marketing_recommendations (agent_name);
CREATE INDEX IF NOT EXISTS recommendations_status_idx   ON public.marketing_recommendations (status);
CREATE INDEX IF NOT EXISTS recommendations_priority_idx ON public.marketing_recommendations (priority);

-- 2. Agregar status a sales_analyses para aprobar/descartar en el Centro
ALTER TABLE public.sales_analyses
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendiente';

CREATE INDEX IF NOT EXISTS sales_analyses_status_idx ON public.sales_analyses (status);
