alter table public.companies
  add column if not exists legal_name text,
  add column if not exists status     text not null default 'activo'
    constraint companies_status_check
    check (status in ('activo','pausado','en_riesgo')),
  add column if not exists notes      text;
