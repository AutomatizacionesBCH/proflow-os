-- ─── Companies ───────────────────────────────────────────────────────────────
create table if not exists public.companies (
  id         uuid         default gen_random_uuid() primary key,
  name       text         not null,
  created_at timestamptz  not null default now()
);

alter table public.companies enable row level security;

create policy "companies_all_access" on public.companies
  for all using (true) with check (true);

create index if not exists companies_name_idx on public.companies (name);

-- ─── Processors ──────────────────────────────────────────────────────────────
create table if not exists public.processors (
  id         uuid         default gen_random_uuid() primary key,
  name       text         not null,
  type       text,
  created_at timestamptz  not null default now()
);

alter table public.processors enable row level security;

create policy "processors_all_access" on public.processors
  for all using (true) with check (true);

create index if not exists processors_name_idx on public.processors (name);

-- ─── Clients ─────────────────────────────────────────────────────────────────
-- Si la tabla ya existe, esta migración sólo agrega RLS y el índice.
-- Si aún no existe, la crea completa.
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
create index if not exists clients_created_idx   on public.clients (created_at desc);
