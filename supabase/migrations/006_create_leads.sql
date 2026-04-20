create table if not exists public.leads (
  id                  uuid         default gen_random_uuid() primary key,
  full_name           text         not null,
  phone               text,
  source_channel      text         check (source_channel in ('Meta','TikTok','LinkedIn','Twitter/X','referido','otro')),
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
