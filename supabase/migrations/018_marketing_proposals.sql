-- Marketing Intelligence Agent: tabla de propuestas de campaña
create table if not exists marketing_proposals (
  id                   uuid        primary key default gen_random_uuid(),
  audience_name        text        not null,
  audience_description text        not null,
  estimated_size       integer     not null default 0,
  campaign_objective   text        not null,
  suggested_channel    text        not null,
  suggested_copy       text        not null,
  expected_impact      text        not null,
  priority             text        not null,
  reasoning            text        not null,
  status               text        not null default 'pending',
  created_at           timestamptz not null default now()
);

create index if not exists marketing_proposals_status_idx     on marketing_proposals (status);
create index if not exists marketing_proposals_created_at_idx on marketing_proposals (created_at desc);

alter table marketing_proposals enable row level security;
create policy "Allow all" on marketing_proposals for all using (true) with check (true);
