-- ============================================================
-- ProFlow OS — Tabla de Operaciones
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists public.operations (
  id              uuid        default gen_random_uuid() primary key,
  client_id       text        not null,
  company_id      text,
  processor_id    text,
  operation_date  date        not null default current_date,

  -- Montos
  amount_usd      numeric(14, 2) not null,
  fx_rate_used    numeric(12, 4) not null,
  fx_source       text,

  -- Pago cliente
  client_payout_pct  numeric(6, 2) not null,       -- ej: 79.00
  amount_clp_paid    numeric(18, 2),               -- calculado

  -- Comisiones (en porcentaje sobre gross_clp, excepto wire/receive que son USD)
  processor_fee_pct  numeric(6, 4) not null default 0,
  loan_fee_pct       numeric(6, 4) not null default 0,
  payout_fee_pct     numeric(6, 4) not null default 0,
  wire_fee_usd       numeric(10, 2) not null default 0,
  receive_fee_usd    numeric(10, 2) not null default 0,

  -- Calculados y almacenados para queries de agregación
  gross_clp       numeric(18, 2),
  profit_clp      numeric(18, 2),

  -- Estado y notas
  status  text not null default 'pendiente'
    constraint operations_status_check
    check (status in ('pendiente', 'en_proceso', 'completada', 'anulada')),
  notes   text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Row Level Security (habilitar — política abierta hasta agregar auth)
alter table public.operations enable row level security;

create policy "operations_all_access"
  on public.operations for all
  using (true)
  with check (true);

-- Trigger para updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger operations_set_updated_at
  before update on public.operations
  for each row execute function public.set_updated_at();

-- Índices para filtros frecuentes
create index if not exists operations_status_idx   on public.operations (status);
create index if not exists operations_date_idx     on public.operations (operation_date desc);
create index if not exists operations_created_idx  on public.operations (created_at desc);
create index if not exists operations_client_idx   on public.operations (client_id);
