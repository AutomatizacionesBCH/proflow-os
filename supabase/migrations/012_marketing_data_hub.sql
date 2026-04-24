-- ============================================================
-- ProFlow OS — Migración 012: Marketing Data Hub
-- Capa centralizada de datos de marketing para agentes y análisis
-- ============================================================

-- ── 1. marketing_accounts — cuentas publicitarias conectadas ─────────────────

CREATE TABLE IF NOT EXISTS marketing_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform              TEXT NOT NULL,        -- meta, tiktok, linkedin, google, x, vambe, manual
  account_name          TEXT NOT NULL,
  account_external_id   TEXT,                 -- ID de la cuenta en la plataforma externa
  status                TEXT NOT NULL DEFAULT 'active', -- active, paused, disconnected, error
  currency              TEXT NOT NULL DEFAULT 'CLP',
  config_json           JSONB,                -- tokens, credenciales, configuración de integración
  last_sync_at          TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. ad_campaigns — campañas normalizadas desde plataformas externas ────────

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_account_id  UUID REFERENCES marketing_accounts(id) ON DELETE SET NULL,
  platform              TEXT NOT NULL,        -- meta, tiktok, linkedin, google, x, manual
  external_campaign_id  TEXT,                 -- ID original de la plataforma
  campaign_name         TEXT NOT NULL,
  objective             TEXT,                 -- awareness, traffic, leads, conversions, etc.
  status                TEXT NOT NULL DEFAULT 'active', -- active, paused, finished, archived
  start_date            DATE,
  end_date              DATE,
  raw_payload           JSONB,               -- respuesta cruda de la API
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. ad_adsets — conjuntos de anuncios / grupos de ad ──────────────────────

CREATE TABLE IF NOT EXISTS ad_adsets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_campaign_id        UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  platform              TEXT NOT NULL,
  external_adset_id     TEXT,
  adset_name            TEXT NOT NULL,
  targeting_summary     TEXT,                 -- resumen legible del targeting (ej: "Hombres 25-45, Santiago")
  status                TEXT NOT NULL DEFAULT 'active',
  raw_payload           JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. ad_ads — anuncios individuales ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ad_ads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_adset_id           UUID REFERENCES ad_adsets(id) ON DELETE CASCADE,
  platform              TEXT NOT NULL,
  external_ad_id        TEXT,
  ad_name               TEXT NOT NULL,
  creative_summary      TEXT,                 -- descripción del creativo (copy, formato, CTA)
  status                TEXT NOT NULL DEFAULT 'active',
  raw_payload           JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. daily_channel_metrics — métricas diarias normalizadas ─────────────────
-- Tabla principal de análisis: una fila por día + plataforma + campaña

CREATE TABLE IF NOT EXISTS daily_channel_metrics (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                              DATE NOT NULL,
  platform                          TEXT NOT NULL,        -- meta, tiktok, linkedin, google, x, vambe, manual
  marketing_account_id              UUID REFERENCES marketing_accounts(id) ON DELETE SET NULL,
  ad_campaign_id                    UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  campaign_name                     TEXT,                 -- nombre denormalizado para consultas rápidas
  -- Inversión
  spend_clp                         NUMERIC(14,2) NOT NULL DEFAULT 0,
  spend_original                    NUMERIC(14,2),        -- monto en moneda original
  currency                          TEXT DEFAULT 'CLP',
  -- Métricas de alcance
  impressions                       INTEGER DEFAULT 0,
  clicks                            INTEGER DEFAULT 0,
  -- Métricas de conversión en el funnel
  leads                             INTEGER DEFAULT 0,    -- total leads del día por esta campaña
  qualified_leads                   INTEGER DEFAULT 0,    -- leads calificados
  hot_leads                         INTEGER DEFAULT 0,    -- leads con priority hot
  converted_clients                 INTEGER DEFAULT 0,    -- leads que se convirtieron en clientes
  operations_count                  INTEGER DEFAULT 0,    -- operaciones generadas
  -- Métricas económicas
  revenue_clp                       NUMERIC(14,2) DEFAULT 0,  -- ingresos brutos atribuidos
  profit_clp                        NUMERIC(14,2) DEFAULT 0,  -- utilidad atribuida
  -- Métricas calculadas (se pueden dejar NULL y calcular en app)
  cost_per_lead                     NUMERIC(14,2),
  cost_per_qualified_lead           NUMERIC(14,2),
  cost_per_client                   NUMERIC(14,2),
  conversion_rate_lead_to_client    NUMERIC(8,4),         -- ej: 0.1250 = 12.50%
  conversion_rate_client_to_operation NUMERIC(8,4),
  roas                              NUMERIC(10,4),        -- revenue / spend
  -- Extras
  notes                             TEXT,
  raw_payload                       JSONB,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. attribution_events — conexión entre marketing y ventas reales ──────────
-- Registro atómico de cada evento de atribución (lead creado, cliente convertido, operación generada)

CREATE TABLE IF NOT EXISTS attribution_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Referencias al funnel (todas opcionales, se llenan según el evento)
  lead_id           UUID,                     -- FK lógica a leads (sin constraint por tipos stale)
  client_id         UUID,                     -- FK lógica a clients
  operation_id      UUID,                     -- FK lógica a operations
  -- Origen publicitario
  platform          TEXT,                     -- meta, tiktok, linkedin, etc.
  campaign_id       UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  campaign_name     TEXT,
  source_channel    TEXT,                     -- Meta, TikTok, LinkedIn, referido, etc.
  -- Evento
  event_type        TEXT NOT NULL,            -- lead_created, lead_qualified, lead_converted, operation_created
  event_time        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value_clp         NUMERIC(14,2),            -- valor económico del evento
  metadata_json     JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. marketing_recommendations — recomendaciones de agentes ────────────────

CREATE TABLE IF NOT EXISTS marketing_recommendations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name          TEXT NOT NULL,          -- ej: 'MarketingAgent', 'RevenueAgent'
  recommendation_type TEXT NOT NULL,          -- budget_shift, pause_campaign, launch_campaign, audience_expand, etc.
  priority            TEXT NOT NULL DEFAULT 'medium', -- high, medium, low
  title               TEXT NOT NULL,
  explanation         TEXT,                   -- por qué el agente hace esta recomendación
  expected_impact     TEXT,                   -- impacto esperado en leads, conversiones o gasto
  suggested_action    TEXT,                   -- acción concreta recomendada
  status              TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, dismissed
  approved_by         TEXT,
  approved_at         TIMESTAMPTZ,
  dismissed_reason    TEXT,
  metadata_json       JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- ÍNDICES
-- ══════════════════════════════════════════════════════════════

-- marketing_accounts
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_platform ON marketing_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_status   ON marketing_accounts(status);

-- ad_campaigns
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_account   ON ad_campaigns(marketing_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_platform  ON ad_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status    ON ad_campaigns(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_campaigns_external
  ON ad_campaigns(platform, external_campaign_id)
  WHERE external_campaign_id IS NOT NULL;

-- ad_adsets
CREATE INDEX IF NOT EXISTS idx_ad_adsets_campaign ON ad_adsets(ad_campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_adsets_platform  ON ad_adsets(platform);

-- ad_ads
CREATE INDEX IF NOT EXISTS idx_ad_ads_adset    ON ad_ads(ad_adset_id);
CREATE INDEX IF NOT EXISTS idx_ad_ads_platform ON ad_ads(platform);

-- daily_channel_metrics (las más consultadas)
CREATE INDEX IF NOT EXISTS idx_dcm_date          ON daily_channel_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_dcm_platform      ON daily_channel_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_dcm_account       ON daily_channel_metrics(marketing_account_id);
CREATE INDEX IF NOT EXISTS idx_dcm_campaign      ON daily_channel_metrics(ad_campaign_id);
CREATE INDEX IF NOT EXISTS idx_dcm_date_platform ON daily_channel_metrics(date DESC, platform);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dcm_unique_day
  ON daily_channel_metrics(date, platform, COALESCE(ad_campaign_id::text, ''))
  WHERE ad_campaign_id IS NOT NULL;

-- attribution_events
CREATE INDEX IF NOT EXISTS idx_attr_lead_id      ON attribution_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_attr_client_id    ON attribution_events(client_id);
CREATE INDEX IF NOT EXISTS idx_attr_operation_id ON attribution_events(operation_id);
CREATE INDEX IF NOT EXISTS idx_attr_platform     ON attribution_events(platform);
CREATE INDEX IF NOT EXISTS idx_attr_campaign_id  ON attribution_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_attr_event_type   ON attribution_events(event_type);
CREATE INDEX IF NOT EXISTS idx_attr_event_time   ON attribution_events(event_time DESC);

-- marketing_recommendations
CREATE INDEX IF NOT EXISTS idx_mrec_status    ON marketing_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_mrec_priority  ON marketing_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_mrec_agent     ON marketing_recommendations(agent_name);
CREATE INDEX IF NOT EXISTS idx_mrec_created   ON marketing_recommendations(created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- TRIGGERS updated_at
-- ══════════════════════════════════════════════════════════════

-- Reutiliza set_updated_at() si ya existe (creada en migración 011)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_accounts_updated_at ON marketing_accounts;
CREATE TRIGGER trg_marketing_accounts_updated_at
  BEFORE UPDATE ON marketing_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ad_campaigns_updated_at ON ad_campaigns;
CREATE TRIGGER trg_ad_campaigns_updated_at
  BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ad_adsets_updated_at ON ad_adsets;
CREATE TRIGGER trg_ad_adsets_updated_at
  BEFORE UPDATE ON ad_adsets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ad_ads_updated_at ON ad_ads;
CREATE TRIGGER trg_ad_ads_updated_at
  BEFORE UPDATE ON ad_ads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_channel_metrics_updated_at ON daily_channel_metrics;
CREATE TRIGGER trg_daily_channel_metrics_updated_at
  BEFORE UPDATE ON daily_channel_metrics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_marketing_recommendations_updated_at ON marketing_recommendations;
CREATE TRIGGER trg_marketing_recommendations_updated_at
  BEFORE UPDATE ON marketing_recommendations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

ALTER TABLE marketing_accounts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_adsets                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_ads                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_channel_metrics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_recommendations    ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso abierto (ajustar cuando se implemente auth)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marketing_accounts' AND policyname = 'allow_all_marketing_accounts') THEN
    CREATE POLICY allow_all_marketing_accounts ON marketing_accounts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ad_campaigns' AND policyname = 'allow_all_ad_campaigns') THEN
    CREATE POLICY allow_all_ad_campaigns ON ad_campaigns FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ad_adsets' AND policyname = 'allow_all_ad_adsets') THEN
    CREATE POLICY allow_all_ad_adsets ON ad_adsets FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ad_ads' AND policyname = 'allow_all_ad_ads') THEN
    CREATE POLICY allow_all_ad_ads ON ad_ads FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_channel_metrics' AND policyname = 'allow_all_daily_channel_metrics') THEN
    CREATE POLICY allow_all_daily_channel_metrics ON daily_channel_metrics FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attribution_events' AND policyname = 'allow_all_attribution_events') THEN
    CREATE POLICY allow_all_attribution_events ON attribution_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marketing_recommendations' AND policyname = 'allow_all_marketing_recommendations') THEN
    CREATE POLICY allow_all_marketing_recommendations ON marketing_recommendations FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
