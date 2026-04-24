-- ProFlow OS — Migración 015: Playbooks
-- Estrategias repetibles para leads y clientes

-- ── 1. Tabla playbooks ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS playbooks (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text        NOT NULL,
  category          text        CHECK (category IN (
                      'lead_followup', 'sales_closing', 'vip_reactivation',
                      'dormant_reactivation', 'trust_recovery', 'marketing_campaign'
                    )),
  target_segment    text        CHECK (target_segment IN (
                      'hot_lead', 'warm_lead', 'trust_issue',
                      'vip_active', 'vip_dormant', 'spot_client',
                      'dormant_client', 'high_potential'
                    )),
  trigger_condition text,
  description       text,
  status            text        NOT NULL DEFAULT 'active',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Tabla playbook_steps ───────────────────────────────────

CREATE TABLE IF NOT EXISTS playbook_steps (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id        uuid        NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  step_order         integer     NOT NULL,
  action_type        text        CHECK (action_type IN (
                       'call', 'whatsapp_message', 'email', 'sms',
                       'assign_to_magda', 'assign_to_alberto',
                       'request_docs', 'send_trust_explanation',
                       'create_campaign', 'wait'
                     )),
  channel            text,
  timing_description text,
  message_template   text,
  expected_result    text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Tabla playbook_assignments ─────────────────────────────

CREATE TABLE IF NOT EXISTS playbook_assignments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id  uuid        NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  lead_id      uuid,
  client_id    uuid,
  assigned_to  text,
  current_step integer     NOT NULL DEFAULT 1,
  status       text        NOT NULL DEFAULT 'in_progress'
               CHECK (status IN ('in_progress', 'completed', 'paused', 'cancelled')),
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Índices ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_playbooks_category       ON playbooks (category);
CREATE INDEX IF NOT EXISTS idx_playbooks_target_segment ON playbooks (target_segment);
CREATE INDEX IF NOT EXISTS idx_playbooks_status         ON playbooks (status);

CREATE INDEX IF NOT EXISTS idx_pb_steps_playbook_id     ON playbook_steps (playbook_id);
CREATE INDEX IF NOT EXISTS idx_pb_steps_order           ON playbook_steps (playbook_id, step_order);

CREATE INDEX IF NOT EXISTS idx_pb_assign_playbook_id    ON playbook_assignments (playbook_id);
CREATE INDEX IF NOT EXISTS idx_pb_assign_lead_id        ON playbook_assignments (lead_id);
CREATE INDEX IF NOT EXISTS idx_pb_assign_client_id      ON playbook_assignments (client_id);
CREATE INDEX IF NOT EXISTS idx_pb_assign_status         ON playbook_assignments (status);

-- ── Función updated_at (idempotente) ─────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_playbooks_updated_at            ON playbooks;
DROP TRIGGER IF EXISTS trg_playbook_steps_updated_at       ON playbook_steps;
DROP TRIGGER IF EXISTS trg_playbook_assignments_updated_at ON playbook_assignments;

CREATE TRIGGER trg_playbooks_updated_at
  BEFORE UPDATE ON playbooks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_playbook_steps_updated_at
  BEFORE UPDATE ON playbook_steps FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_playbook_assignments_updated_at
  BEFORE UPDATE ON playbook_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE playbooks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_steps       ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playbooks' AND policyname = 'allow_all_playbooks') THEN
    CREATE POLICY allow_all_playbooks ON playbooks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playbook_steps' AND policyname = 'allow_all_playbook_steps') THEN
    CREATE POLICY allow_all_playbook_steps ON playbook_steps FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playbook_assignments' AND policyname = 'allow_all_playbook_assignments') THEN
    CREATE POLICY allow_all_playbook_assignments ON playbook_assignments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- PLAYBOOKS INICIALES (5 estrategias base)
-- UUIDs fijos para poder referenciarlos en los pasos
-- ══════════════════════════════════════════════════════════════

INSERT INTO playbooks (id, name, category, target_segment, trigger_condition, description, status)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Lead Caliente',
    'sales_closing', 'hot_lead',
    'heat_score >= 80 o priority_label = hot',
    'Protocolo de cierre rápido para leads con alta temperatura. Actuar en las primeras 2 horas.',
    'active'
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'Lead con Desconfianza',
    'trust_recovery', 'trust_issue',
    'señal showed_fear registrada o lead_type = trust_issue',
    'Protocolo para recuperar la confianza en leads que muestran dudas sobre la seguridad del proceso.',
    'active'
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'VIP Dormido',
    'vip_reactivation', 'vip_dormant',
    'cliente con tag VIP sin operación en más de 30 días',
    'Protocolo de reactivación personalizada para clientes VIP que llevan tiempo sin operar.',
    'active'
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    'Cliente Spot',
    'dormant_reactivation', 'spot_client',
    'cliente spot sin operación en más de 15 días',
    'Protocolo de reactivación rápida para clientes spot cuando el tipo de cambio es favorable.',
    'active'
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    'Lead Sin Respuesta',
    'lead_followup', 'warm_lead',
    'señal no_response + más de 48 horas sin contacto',
    'Protocolo de seguimiento suave para leads tibios que no responden al primer contacto.',
    'active'
  )
ON CONFLICT (id) DO NOTHING;

-- Pasos: Playbook 1 — Lead Caliente
INSERT INTO playbook_steps (playbook_id, step_order, action_type, channel, timing_description, message_template, expected_result)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 1, 'call', 'Teléfono',
   'En menos de 2 horas desde que el lead llega a estado hot',
   NULL,
   'Contactar al lead y evaluar interés real. Si no responde, pasar al paso 2.'),
  ('a1000000-0000-0000-0000-000000000001', 2, 'whatsapp_message', 'WhatsApp',
   'Inmediatamente si no respondió la llamada',
   'Hola [nombre], soy de La Caja Chica. Te contacto porque tienes una oportunidad de cambio de dólares con una condición muy buena hoy. ¿Tienes 5 minutos?',
   'Lead responde y muestra interés en continuar.'),
  ('a1000000-0000-0000-0000-000000000001', 3, 'assign_to_alberto', NULL,
   'Dentro de las primeras 24 horas',
   NULL,
   'Reunión agendada con Alberto para cerrar la operación.')
ON CONFLICT DO NOTHING;

-- Pasos: Playbook 2 — Lead con Desconfianza
INSERT INTO playbook_steps (playbook_id, step_order, action_type, channel, timing_description, message_template, expected_result)
VALUES
  ('a1000000-0000-0000-0000-000000000002', 1, 'send_trust_explanation', 'WhatsApp',
   'Dentro de las primeras 4 horas de detectar la señal de miedo',
   'Hola [nombre], entiendo que cambiar dólares puede generar dudas. Aquí te explico cómo funciona nuestro proceso paso a paso y cómo protegemos tu dinero.',
   'Lead reduce su nivel de miedo y responde con preguntas o interés.'),
  ('a1000000-0000-0000-0000-000000000002', 2, 'whatsapp_message', 'WhatsApp',
   '24 horas después si no responde',
   'También puedo compartirte el testimonio de clientes que ya operaron con nosotros. ¿Te interesa verlo?',
   'Lead pide referencias o testimonios — señal de aumento de confianza.'),
  ('a1000000-0000-0000-0000-000000000002', 3, 'call', 'Videollamada / Teléfono',
   'Si aún muestra dudas después del paso 2',
   NULL,
   'Lead agenda una videollamada o llamada para resolver dudas finales.')
ON CONFLICT DO NOTHING;

-- Pasos: Playbook 3 — VIP Dormido
INSERT INTO playbook_steps (playbook_id, step_order, action_type, channel, timing_description, message_template, expected_result)
VALUES
  ('a1000000-0000-0000-0000-000000000003', 1, 'whatsapp_message', 'WhatsApp',
   'Primer contacto de reactivación',
   'Hola [nombre], espero que estés muy bien. Han pasado unos meses desde tu última operación y quería saludarte. Si tienes dólares disponibles, avísame y te doy una condición especial.',
   'Cliente responde o muestra señal de interés.'),
  ('a1000000-0000-0000-0000-000000000003', 2, 'whatsapp_message', 'WhatsApp',
   '48 horas después si no responde',
   'Hola [nombre], hoy tenemos un tipo de cambio muy bueno. Como cliente VIP puedo ofrecerte un payout preferencial. ¿Tienes dólares disponibles esta semana?',
   'Cliente confirma interés o disponibilidad para operar.'),
  ('a1000000-0000-0000-0000-000000000003', 3, 'call', 'Teléfono',
   '48 horas después si aún no responde al WhatsApp',
   NULL,
   'Cliente contesta y reactiva la relación comercial.')
ON CONFLICT DO NOTHING;

-- Pasos: Playbook 4 — Cliente Spot
INSERT INTO playbook_steps (playbook_id, step_order, action_type, channel, timing_description, message_template, expected_result)
VALUES
  ('a1000000-0000-0000-0000-000000000004', 1, 'whatsapp_message', 'WhatsApp',
   'Cuando el tipo de cambio esté favorable',
   'Hola [nombre]! Hoy el dólar está en un buen momento. ¿Tienes dólares disponibles para cambiar esta semana?',
   'Cliente responde con disponibilidad o fecha estimada.'),
  ('a1000000-0000-0000-0000-000000000004', 2, 'whatsapp_message', 'WhatsApp',
   '24 horas después si no responde',
   'El TC de hoy: [valor]. Si quieres aprovechar, podemos operar hoy mismo. El proceso es rápido.',
   'Cliente confirma intención de operar.'),
  ('a1000000-0000-0000-0000-000000000004', 3, 'assign_to_alberto', NULL,
   'Inmediatamente al confirmar intención',
   NULL,
   'Operación iniciada con Alberto.')
ON CONFLICT DO NOTHING;

-- Pasos: Playbook 5 — Lead Sin Respuesta
INSERT INTO playbook_steps (playbook_id, step_order, action_type, channel, timing_description, message_template, expected_result)
VALUES
  ('a1000000-0000-0000-0000-000000000005', 1, 'wait', NULL,
   'Esperar 48 horas desde el último contacto sin respuesta',
   NULL,
   'Período de espera para no presionar al lead.'),
  ('a1000000-0000-0000-0000-000000000005', 2, 'whatsapp_message', 'WhatsApp',
   '48 horas después del último mensaje sin respuesta',
   'Hola [nombre], solo quería saber si sigues interesado en cambiar tus dólares. Sin compromiso, con gusto te cuento más cuando estés listo.',
   'Lead responde y retoma el contacto.'),
  ('a1000000-0000-0000-0000-000000000005', 3, 'assign_to_magda', NULL,
   '72 horas después si aún no responde',
   NULL,
   'Lead marcado como dormido y asignado a Magda para seguimiento futuro.')
ON CONFLICT DO NOTHING;
