-- ============================================================
-- Migración 011: Módulo de Marketing completo
-- Crea tablas audiences, campaigns, campaign_messages
-- con RLS abierto, índices y triggers de updated_at
-- ============================================================

-- Tabla audiencias
CREATE TABLE IF NOT EXISTS public.audiences (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  description text,
  rules_json  jsonb,
  member_count integer    DEFAULT 0,
  status      text        DEFAULT 'active',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Tabla campañas
CREATE TABLE IF NOT EXISTS public.campaigns (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text        NOT NULL,
  objective    text,
  audience_id  uuid        REFERENCES public.audiences(id) ON DELETE SET NULL,
  channel      text,
  copy_version text,
  status       text        DEFAULT 'draft',
  launched_at  timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Tabla mensajes de campaña
CREATE TABLE IF NOT EXISTS public.campaign_messages (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id       uuid        REFERENCES public.campaigns(id) ON DELETE CASCADE,
  lead_id           uuid        REFERENCES public.leads(id)    ON DELETE SET NULL,
  client_id         uuid        REFERENCES public.clients(id)  ON DELETE SET NULL,
  message_body      text,
  channel           text,
  status            text        DEFAULT 'pending',
  approved_by       text,
  sent_at           timestamptz,
  conversion_result text,
  created_at        timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.audiences        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audiences' AND policyname = 'audiences_all_access'
  ) THEN
    CREATE POLICY "audiences_all_access" ON public.audiences
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'campaigns_all_access'
  ) THEN
    CREATE POLICY "campaigns_all_access" ON public.campaigns
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaign_messages' AND policyname = 'campaign_messages_all_access'
  ) THEN
    CREATE POLICY "campaign_messages_all_access" ON public.campaign_messages
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS campaigns_status_idx          ON public.campaigns        (status);
CREATE INDEX IF NOT EXISTS campaigns_channel_idx         ON public.campaigns        (channel);
CREATE INDEX IF NOT EXISTS campaign_messages_status_idx  ON public.campaign_messages (status);
CREATE INDEX IF NOT EXISTS campaign_messages_campaign_idx ON public.campaign_messages (campaign_id);
CREATE INDEX IF NOT EXISTS audiences_status_idx          ON public.audiences        (status);

-- Función updated_at (idempotente)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers updated_at
DROP TRIGGER IF EXISTS audiences_set_updated_at ON public.audiences;
CREATE TRIGGER audiences_set_updated_at
  BEFORE UPDATE ON public.audiences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS campaigns_set_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
