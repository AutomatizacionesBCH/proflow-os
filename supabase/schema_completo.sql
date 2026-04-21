-- ============================================================
-- ProFlow OS — Esquema completo de base de datos
-- Consolidación de migraciones 001 → 008
--
-- Instrucciones para migrar a un nuevo Supabase:
--   1. Ir a Dashboard → SQL Editor
--   2. Pegar y ejecutar este archivo completo
--   3. Actualizar las variables NEXT_PUBLIC_SUPABASE_URL y
--      NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local y en EasyPanel
-- ============================================================


-- ─── Función updated_at ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─── Companies ───────────────────────────────────────────────────────────────
create table if not exists public.companies (
  id         uuid         default gen_random_uuid() primary key,
  name       text         not null,
  legal_name text,
  status     text         not null default 'activo'
    constraint companies_status_check
    check (status in ('activo','pausado','en_riesgo')),
  notes      text,
  created_at timestamptz  not null default now()
);

alter table public.companies enable row level security;

create policy "companies_all_access" on public.companies
  for all using (true) with check (true);

create index if not exists companies_name_idx on public.companies (name);


-- ─── Processors ──────────────────────────────────────────────────────────────
create table if not exists public.processors (
  id               uuid          default gen_random_uuid() primary key,
  name             text          not null,
  company_id       uuid          references public.companies(id) on delete set null,
  type             text,
  status           text          not null default 'activo'
    constraint processors_status_check
    check (status in ('activo','pausado','en_riesgo')),
  daily_limit_usd  numeric(14,2),
  notes            text,
  created_at       timestamptz   not null default now()
);

alter table public.processors enable row level security;

create policy "processors_all_access" on public.processors
  for all using (true) with check (true);

create index if not exists processors_name_idx on public.processors (name);


-- ─── Clients ─────────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id                    uuid         default gen_random_uuid() primary key,
  full_name             text         not null,
  document_id           text,
  email                 text,
  phone                 text,
  assigned_company_id   uuid         references public.companies(id) on delete set null,
  assigned_processor_id uuid         references public.processors(id) on delete set null,
  tags                  text[]       not null default '{}',
  notes                 text,
  created_at            timestamptz  not null default now()
);

alter table public.clients enable row level security;

create policy "clients_all_access" on public.clients
  for all using (true) with check (true);

create index if not exists clients_full_name_idx on public.clients (full_name);
create index if not exists clients_document_idx  on public.clients (document_id);
create index if not exists clients_created_idx   on public.clients (created_at desc);


-- ─── Operations ──────────────────────────────────────────────────────────────
create table if not exists public.operations (
  id              uuid        default gen_random_uuid() primary key,
  client_id       text        not null,
  company_id      text,
  processor_id    text,
  operation_date  date        not null default current_date,

  amount_usd         numeric(14, 2) not null,
  fx_rate_used       numeric(12, 4) not null,
  fx_source          text,

  client_payout_pct  numeric(6, 2)  not null,
  amount_clp_paid    numeric(18, 2),

  processor_fee_pct  numeric(6, 4) not null default 0,
  loan_fee_pct       numeric(6, 4) not null default 0,
  payout_fee_pct     numeric(6, 4) not null default 0,
  wire_fee_usd       numeric(10, 2) not null default 0,
  receive_fee_usd    numeric(10, 2) not null default 0,

  gross_clp       numeric(18, 2),
  profit_clp      numeric(18, 2),

  status  text not null default 'pendiente'
    constraint operations_status_check
    check (status in ('pendiente','en_proceso','completada','anulada')),

  contract_url  text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.operations enable row level security;

create policy "operations_all_access" on public.operations
  for all using (true) with check (true);

create or replace trigger operations_set_updated_at
  before update on public.operations
  for each row execute function public.set_updated_at();

create index if not exists operations_status_idx   on public.operations (status);
create index if not exists operations_date_idx     on public.operations (operation_date desc);
create index if not exists operations_created_idx  on public.operations (created_at desc);
create index if not exists operations_client_idx   on public.operations (client_id);


-- ─── Cash Positions ───────────────────────────────────────────────────────────
create table if not exists public.cash_positions (
  id            uuid          default gen_random_uuid() primary key,
  date          date          not null,
  available_clp numeric(16,0) not null,
  notes         text,
  created_at    timestamptz   not null default now()
);

alter table public.cash_positions enable row level security;

create policy "cash_positions_all_access" on public.cash_positions
  for all using (true) with check (true);

create index if not exists cash_positions_date_idx on public.cash_positions (date desc);


-- ─── Leads ───────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id                  uuid         default gen_random_uuid() primary key,
  full_name           text         not null,
  phone               text,
  source_channel      text
    check (source_channel in ('Meta','TikTok','LinkedIn','Twitter/X','referido','otro')),
  campaign_name       text,
  status              text         not null default 'nuevo'
    constraint leads_status_check
    check (status in ('nuevo','contactado','en_seguimiento','convertido','perdido')),
  converted_to_client boolean      not null default false,
  client_id           uuid         references public.clients(id) on delete set null,
  notes               text,
  created_at          timestamptz  not null default now()
);

alter table public.leads enable row level security;

create policy "leads_all_access" on public.leads
  for all using (true) with check (true);

create index if not exists leads_status_idx     on public.leads (status);
create index if not exists leads_created_at_idx on public.leads (created_at desc);


-- ─── Marketing Spend ─────────────────────────────────────────────────────────
create table if not exists public.marketing_spend (
  id          uuid          default gen_random_uuid() primary key,
  date        date          not null,
  channel     text          not null
    constraint marketing_spend_channel_check
    check (channel in ('Meta','TikTok','LinkedIn','Twitter/X','referido','otro')),
  amount_clp  numeric(16,0) not null,
  notes       text,
  created_at  timestamptz   not null default now()
);

alter table public.marketing_spend enable row level security;

create policy "marketing_spend_all_access" on public.marketing_spend
  for all using (true) with check (true);

create index if not exists marketing_spend_date_idx    on public.marketing_spend (date desc);
create index if not exists marketing_spend_channel_idx on public.marketing_spend (channel);


-- ─── Storage Buckets ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('contratos',              'contratos',              true),
  ('documentos-clientes',    'documentos-clientes',    true),
  ('documentos-operaciones', 'documentos-operaciones', true)
on conflict (id) do nothing;

drop policy if exists "Public access contratos"              on storage.objects;
drop policy if exists "Public access documentos-clientes"   on storage.objects;
drop policy if exists "Public access documentos-operaciones" on storage.objects;

create policy "Public access contratos"
  on storage.objects for all to public
  using (bucket_id = 'contratos')
  with check (bucket_id = 'contratos');

create policy "Public access documentos-clientes"
  on storage.objects for all to public
  using (bucket_id = 'documentos-clientes')
  with check (bucket_id = 'documentos-clientes');

create policy "Public access documentos-operaciones"
  on storage.objects for all to public
  using (bucket_id = 'documentos-operaciones')
  with check (bucket_id = 'documentos-operaciones');
