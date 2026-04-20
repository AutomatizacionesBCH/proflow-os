create table if not exists public.marketing_spend (
  id          uuid         default gen_random_uuid() primary key,
  date        date         not null,
  channel     text         not null
    constraint marketing_spend_channel_check
    check (channel in ('Meta','TikTok','LinkedIn','Twitter/X','referido','otro')),
  amount_clp  numeric(16,0) not null,
  notes       text,
  created_at  timestamptz  not null default now()
);

alter table public.marketing_spend enable row level security;

create policy "marketing_spend_all_access" on public.marketing_spend
  for all using (true) with check (true);

create index if not exists marketing_spend_date_idx    on public.marketing_spend (date desc);
create index if not exists marketing_spend_channel_idx on public.marketing_spend (channel);
