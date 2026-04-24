-- ProFlow OS — Migración 014: Behavior Tracking
-- Registra señales de comportamiento de leads y clientes para el Lead Agent

CREATE TABLE IF NOT EXISTS user_behavior_signals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid,                   -- referencia al lead (nullable si es solo cliente)
  client_id       uuid,                   -- referencia al cliente (nullable si aún es lead)
  signal_type     text        NOT NULL,   -- tipo de señal (ver lista en behavior.types.ts)
  signal_source   text,                   -- origen: manual, vambe, whatsapp, email, etc.
  signal_channel  text,                   -- canal de comunicación
  signal_time     timestamptz NOT NULL DEFAULT now(),
  intensity_score integer     NOT NULL DEFAULT 50
                  CHECK (intensity_score >= 0 AND intensity_score <= 100),
  sentiment       text        CHECK (sentiment IN ('positive', 'neutral', 'doubtful', 'negative')),
  intent_level    text        CHECK (intent_level IN ('low', 'medium', 'high', 'very_high')),
  description     text,
  metadata_json   jsonb,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_ubsignals_lead_id       ON user_behavior_signals (lead_id);
CREATE INDEX IF NOT EXISTS idx_ubsignals_client_id     ON user_behavior_signals (client_id);
CREATE INDEX IF NOT EXISTS idx_ubsignals_signal_type   ON user_behavior_signals (signal_type);
CREATE INDEX IF NOT EXISTS idx_ubsignals_signal_time   ON user_behavior_signals (signal_time DESC);
CREATE INDEX IF NOT EXISTS idx_ubsignals_sentiment     ON user_behavior_signals (sentiment);
CREATE INDEX IF NOT EXISTS idx_ubsignals_intent_level  ON user_behavior_signals (intent_level);

-- RLS: habilitar seguridad a nivel de fila
ALTER TABLE user_behavior_signals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_behavior_signals'
      AND policyname = 'allow_all_behavior_signals'
  ) THEN
    CREATE POLICY allow_all_behavior_signals
      ON user_behavior_signals
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
