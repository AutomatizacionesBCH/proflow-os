import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { OperacionesView } from '@/components/operaciones/OperacionesView'
import type { Operation } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MIGRATION_SQL = `create table if not exists public.operations (
  id              uuid          default gen_random_uuid() primary key,
  client_id       text          not null,
  company_id      text,
  processor_id    text,
  operation_date  date          not null default current_date,
  amount_usd      numeric(14,2) not null,
  fx_rate_used    numeric(12,4) not null,
  fx_source       text,
  client_payout_pct  numeric(6,2) not null,
  amount_clp_paid    numeric(18,2),
  processor_fee_pct  numeric(6,4) not null default 0,
  loan_fee_pct       numeric(6,4) not null default 0,
  payout_fee_pct     numeric(6,4) not null default 0,
  wire_fee_usd       numeric(10,2) not null default 0,
  receive_fee_usd    numeric(10,2) not null default 0,
  gross_clp       numeric(18,2),
  profit_clp      numeric(18,2),
  status  text not null default 'pendiente'
    constraint operations_status_check
    check (status in ('pendiente','en_proceso','completada','anulada')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.operations enable row level security;

create policy "operations_all_access" on public.operations
  for all using (true) with check (true);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger operations_set_updated_at
  before update on public.operations
  for each row execute function public.set_updated_at();

create index if not exists operations_status_idx  on public.operations (status);
create index if not exists operations_date_idx    on public.operations (operation_date desc);
create index if not exists operations_created_idx on public.operations (created_at desc);`

function isTableMissingError(msg: string) {
  return (
    msg.includes('schema cache') ||
    msg.includes('operations') ||
    msg.includes('42P01') ||
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    msg.includes('PGRST')
  )
}

export default async function OperacionesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('operations')
    .select('*')
    .order('operation_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <PageShell title="Operaciones" description="Gestión de flujos y transacciones">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <p className="text-sm font-semibold text-red-400 mb-1">Error de conexión</p>
          <p className="text-xs text-slate-500 font-mono">[{error.code}] {error.message}</p>
        </div>
      </PageShell>
    )
  }

  const operations: Operation[] = (data ?? []) as Operation[]

  return (
    <PageShell title="Operaciones" description="Gestión de flujos y transacciones">
      <OperacionesView initialOperations={operations} />
    </PageShell>
  )
}
