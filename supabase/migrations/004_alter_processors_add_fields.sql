alter table public.processors
  add column if not exists company_id      uuid references public.companies(id) on delete set null,
  add column if not exists status          text not null default 'activo'
    constraint processors_status_check
    check (status in ('activo','pausado','en_riesgo')),
  add column if not exists daily_limit_usd numeric(14,2),
  add column if not exists notes           text;
