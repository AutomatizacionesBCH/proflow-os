-- ============================================================
-- MIGRACIÓN 009 — Leads & Marketing Extension
-- ProFlow OS — La Caja Chica
-- ============================================================
-- Reemplaza la tabla leads básica por una estructura completa
-- de CRM comercial. Agrega: lead_events, audiences, campaigns,
-- campaign_messages, integrations.
-- NO modifica: companies, processors, clients, operations,
--              cash_positions, marketing_spend, upload_tokens
-- ============================================================


-- ── Función reutilizable para updated_at ──────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ══════════════════════════════════════════════════════════════
-- 1. TABLA: leads (reemplaza la básica)
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS leads CASCADE;

CREATE TABLE leads (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Origen
  external_source_id     text,
  source_platform        text,          -- vambe | linkedin | x | manual
  source_channel         text,
  campaign_name          text,

  -- Contacto
  full_name              text NOT NULL,
  phone                  text,
  whatsapp               text,
  email                  text,
  linkedin_profile       text,
  x_handle               text,

  -- Clasificación comercial
  stage                  text NOT NULL DEFAULT 'new',
    -- new | contacted | qualified | docs_pending | ready_to_schedule
    -- ready_to_operate | operated | dormant | lost
  heat_score             integer NOT NULL DEFAULT 0,
  priority_label         text,          -- hot | warm | follow_up | cold
  lead_type              text,          -- vip | spot | new | dormant | high_potential | trust_issue | unclear
  lead_status_reason     text,

  -- Gestión
  assigned_to            text,
  last_interaction_at    timestamptz,
  next_action            text,
  next_action_due_at     timestamptz,

  -- Conversión
  converted_to_client_id uuid REFERENCES clients(id) ON DELETE SET NULL,

  -- Extras
  notes                  text,
  raw_payload            jsonb,

  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices
CREATE INDEX idx_leads_source_platform        ON leads(source_platform);
CREATE INDEX idx_leads_stage                  ON leads(stage);
CREATE INDEX idx_leads_heat_score             ON leads(heat_score DESC);
CREATE INDEX idx_leads_phone                  ON leads(phone);
CREATE INDEX idx_leads_email                  ON leads(email);
CREATE INDEX idx_leads_assigned_to            ON leads(assigned_to);
CREATE INDEX idx_leads_converted_to_client_id ON leads(converted_to_client_id);
CREATE INDEX idx_leads_priority_label         ON leads(priority_label);

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_open" ON leads FOR ALL USING (true) WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- 2. TABLA: lead_events
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS lead_events CASCADE;

CREATE TABLE lead_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type   text NOT NULL,
    -- mensaje_recibido | intencion_detectada | reunion_agendada
    -- docs_solicitados | docs_recibidos | contrato_firmado
    -- sin_respuesta | convertido | reactivado
  description  text,
  payload      jsonb,
  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_events_lead_id    ON lead_events(lead_id);
CREATE INDEX idx_lead_events_event_type ON lead_events(event_type);
CREATE INDEX idx_lead_events_created_at ON lead_events(created_at DESC);

ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_events_open" ON lead_events FOR ALL USING (true) WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- 3. TABLA: audiences
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS audiences CASCADE;

CREATE TABLE audiences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  rules_json   jsonb,
  member_count integer NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'active',  -- active | archived
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER audiences_updated_at
  BEFORE UPDATE ON audiences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audiences_open" ON audiences FOR ALL USING (true) WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- 4. TABLA: campaigns
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS campaigns CASCADE;

CREATE TABLE campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  objective    text,
  audience_id  uuid REFERENCES audiences(id) ON DELETE SET NULL,
  channel      text,          -- email | whatsapp | sms
  copy_version text,
  status       text NOT NULL DEFAULT 'draft',  -- draft | active | paused | finished
  launched_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_campaigns_audience_id ON campaigns(audience_id);
CREATE INDEX idx_campaigns_status      ON campaigns(status);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_open" ON campaigns FOR ALL USING (true) WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- 5. TABLA: campaign_messages
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS campaign_messages CASCADE;

CREATE TABLE campaign_messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id           uuid REFERENCES leads(id) ON DELETE SET NULL,
  client_id         uuid REFERENCES clients(id) ON DELETE SET NULL,
  message_body      text,
  channel           text,
  status            text NOT NULL DEFAULT 'pending',
    -- pending | approved | sent | rejected
  approved_by       text,
  sent_at           timestamptz,
  conversion_result text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_messages_campaign_id ON campaign_messages(campaign_id);
CREATE INDEX idx_campaign_messages_lead_id     ON campaign_messages(lead_id);
CREATE INDEX idx_campaign_messages_client_id   ON campaign_messages(client_id);
CREATE INDEX idx_campaign_messages_status      ON campaign_messages(status);

ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_messages_open" ON campaign_messages FOR ALL USING (true) WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- 6. TABLA: integrations
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS integrations CASCADE;

CREATE TABLE integrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,  -- vambe | linkedin | x | meta | tiktok
  status        text NOT NULL DEFAULT 'inactive',  -- active | inactive | error
  config_json   jsonb,
  last_sync_at  timestamptz,
  webhook_url   text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX idx_integrations_name ON integrations(name);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_open" ON integrations FOR ALL USING (true) WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- Seed: registrar integraciones conocidas
-- ══════════════════════════════════════════════════════════════
INSERT INTO integrations (name, status, notes) VALUES
  ('vambe',    'active',   'Webhook configurado. Recibe stage.changed.'),
  ('meta',     'inactive', 'Instagram + Facebook Ads'),
  ('tiktok',   'inactive', 'TikTok Ads'),
  ('linkedin', 'inactive', 'LinkedIn Outreach'),
  ('x',        'inactive', 'X / Twitter Outreach')
ON CONFLICT (name) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- RESUMEN
-- ══════════════════════════════════════════════════════════════
-- Tablas creadas / reemplazadas:
--   ✓ leads              — CRM comercial completo (reemplaza tabla básica)
--   ✓ lead_events        — Historial de eventos por lead
--   ✓ audiences          — Segmentos de audiencia con reglas
--   ✓ campaigns          — Campañas de salida por canal
--   ✓ campaign_messages  — Mensajes individuales por campaña
--   ✓ integrations       — Registro de integraciones externas
--
-- Tablas intactas:
--   • companies, processors, clients, operations
--   • cash_positions, marketing_spend, upload_tokens
-- ══════════════════════════════════════════════════════════════
