-- ============================================================
-- Migration 010: Lead Agent columns
-- Adds scoring columns if they don't exist yet.
-- Safe to run on a database that already has these columns.
-- ============================================================

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS heat_score               integer     DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority_label           text        DEFAULT 'cold';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to_recommendation text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_action              text;

CREATE INDEX IF NOT EXISTS leads_priority_label_idx     ON public.leads (priority_label);
CREATE INDEX IF NOT EXISTS leads_heat_score_idx         ON public.leads (heat_score DESC);
CREATE INDEX IF NOT EXISTS leads_assigned_to_rec_idx    ON public.leads (assigned_to_recommendation);
