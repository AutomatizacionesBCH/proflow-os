-- ============================================================
-- ProFlow OS — Migración 013: Attribution Truth
-- Tabla central de atribución real: canal → lead → cliente → operación → utilidad
-- ============================================================

CREATE TABLE IF NOT EXISTS attribution_truth (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencias al funnel
  lead_id                 UUID,
  client_id               UUID,
  operation_id            UUID,

  -- Primer toque (origen del lead)
  first_touch_platform    TEXT,          -- meta, tiktok, linkedin, vambe, manual, etc.
  first_touch_channel     TEXT,          -- Meta, TikTok, referido, etc.
  first_touch_campaign    TEXT,

  -- Último toque (contacto previo a conversión)
  last_touch_platform     TEXT,
  last_touch_channel      TEXT,
  last_touch_campaign     TEXT,

  -- Timeline del funnel
  first_contact_at        TIMESTAMPTZ,
  last_interaction_at     TIMESTAMPTZ,
  converted_to_client_at  TIMESTAMPTZ,
  operation_date          DATE,

  -- Velocidad de conversión
  conversion_days         INTEGER,       -- días entre first_contact_at y converted_to_client_at

  -- Valor económico
  amount_usd              NUMERIC(14,2),
  revenue_clp             NUMERIC(14,2),
  profit_clp              NUMERIC(14,2),

  -- Calidad del dato
  total_interactions      INTEGER DEFAULT 0,
  attribution_model       TEXT NOT NULL DEFAULT 'last_touch', -- last_touch, first_touch, linear (para futuro)
  confidence_score        NUMERIC(5,2) DEFAULT 0,             -- 0-100: qué tan completo es el dato

  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- ÍNDICES
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_attr_truth_lead_id        ON attribution_truth(lead_id);
CREATE INDEX IF NOT EXISTS idx_attr_truth_client_id      ON attribution_truth(client_id);
CREATE INDEX IF NOT EXISTS idx_attr_truth_operation_id   ON attribution_truth(operation_id);
CREATE INDEX IF NOT EXISTS idx_attr_truth_first_platform ON attribution_truth(first_touch_platform);
CREATE INDEX IF NOT EXISTS idx_attr_truth_last_platform  ON attribution_truth(last_touch_platform);
CREATE INDEX IF NOT EXISTS idx_attr_truth_operation_date ON attribution_truth(operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_attr_truth_channel        ON attribution_truth(last_touch_channel);
CREATE INDEX IF NOT EXISTS idx_attr_truth_created        ON attribution_truth(created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- TRIGGER updated_at
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attribution_truth_updated_at ON attribution_truth;
CREATE TRIGGER trg_attribution_truth_updated_at
  BEFORE UPDATE ON attribution_truth
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

ALTER TABLE attribution_truth ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'attribution_truth'
    AND policyname = 'allow_all_attribution_truth'
  ) THEN
    CREATE POLICY allow_all_attribution_truth
      ON attribution_truth FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
