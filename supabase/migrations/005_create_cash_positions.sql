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
