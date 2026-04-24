-- 016_marketing_recommendations.sql
-- Tabla para guardar recomendaciones del Lead Intelligence Agent (IA)

CREATE TABLE IF NOT EXISTS marketing_recommendations (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                    UUID,                   -- sin FK para compatibilidad con database.types.ts desactualizado
  lead_name                  TEXT,
  heat_score                 INT         CHECK (heat_score BETWEEN 0 AND 100),
  priority_label             TEXT        CHECK (priority_label IN ('hot','warm','follow_up','cold')),
  lead_type                  TEXT        CHECK (lead_type IN ('vip','spot','new','dormant','high_potential','trust_issue','unclear')),
  assigned_to_recommendation TEXT,
  next_best_action           TEXT,
  reasoning                  TEXT,
  urgency                    TEXT        CHECK (urgency IN ('alta','media','baja')),
  suggested_message          TEXT,
  viewed_at                  TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mktg_recs_lead_id    ON marketing_recommendations(lead_id);
CREATE INDEX IF NOT EXISTS idx_mktg_recs_created_at ON marketing_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mktg_recs_viewed_at  ON marketing_recommendations(viewed_at);

-- RLS abierto (misma política que el resto del sistema)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'marketing_recommendations'
    AND   policyname = 'allow_all_marketing_recommendations'
  ) THEN
    ALTER TABLE marketing_recommendations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_marketing_recommendations
      ON marketing_recommendations FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
