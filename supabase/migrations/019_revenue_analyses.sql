-- Revenue Agent: tabla para almacenar análisis estratégicos del negocio
create table if not exists revenue_analyses (
  id            uuid        primary key default gen_random_uuid(),
  analysis_data jsonb       not null,
  created_at    timestamptz not null default now()
);

create index if not exists revenue_analyses_created_at_idx on revenue_analyses (created_at desc);

alter table revenue_analyses enable row level security;
create policy "Allow all" on revenue_analyses for all using (true) with check (true);
