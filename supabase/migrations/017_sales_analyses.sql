-- Sales Agent: tabla para almacenar análisis de cierre comercial
create table if not exists sales_analyses (
  id                 uuid        primary key default gen_random_uuid(),
  lead_id            uuid        not null references leads(id) on delete cascade,
  lead_name          text        not null,
  closing_strategy   text        not null,
  main_objection     text        not null,
  objection_response text        not null,
  suggested_message  text        not null,
  best_channel       text        not null,
  best_time          text        not null,
  confidence_score   integer     not null check (confidence_score >= 0 and confidence_score <= 100),
  urgency_reason     text        not null,
  assigned_to        text        not null,
  created_at         timestamptz not null default now()
);

create index if not exists sales_analyses_lead_id_idx    on sales_analyses (lead_id);
create index if not exists sales_analyses_created_at_idx on sales_analyses (created_at desc);
create index if not exists sales_analyses_confidence_idx on sales_analyses (confidence_score desc);

alter table sales_analyses enable row level security;
create policy "Allow all" on sales_analyses for all using (true) with check (true);
