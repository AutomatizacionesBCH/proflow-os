import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { formatCLP, formatUSD, cn } from '@/lib/utils'
import { OperacionStatusBadge } from '@/components/operaciones/OperacionStatusBadge'
import type { OperationStatus, MarketingChannel } from '@/types'
import type { RevenueAnalysis } from '@/types/agent.types'
import {
  DollarSign,
  TrendingUp,
  Workflow,
  BarChart3,
  Users,
  Zap,
  Building2,
} from 'lucide-react'
import { TableScroll } from '@/components/ui/TableScroll'
import { RevenueAgentView } from '@/components/dashboard/RevenueAgentView'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CHANNEL_COLORS: Record<string, { bar: string; text: string }> = {
  'Meta':      { bar: 'bg-blue-500',   text: 'text-blue-400' },
  'TikTok':    { bar: 'bg-pink-500',   text: 'text-pink-400' },
  'LinkedIn':  { bar: 'bg-sky-500',    text: 'text-sky-400' },
  'Twitter/X': { bar: 'bg-slate-400',  text: 'text-slate-300' },
  'referido':  { bar: 'bg-purple-500', text: 'text-purple-400' },
  'otro':      { bar: 'bg-slate-600',  text: 'text-slate-400' },
}

const PROCESSOR_STATUS_STYLES: Record<string, string> = {
  activo:    'bg-green-500/10 text-green-400 border-green-500/20',
  pausado:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  en_riesgo: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const db = supabase as any

  const [
    opsAllRes,
    opsRecentRes,
    clientsCountRes,
    clientsNamesRes,
    leadsAllRes,
    cashRes,
    processorsRes,
    revenueRes,
  ] = await Promise.all([
    supabase
      .from('operations')
      .select('operation_date, profit_clp, amount_usd, status')
      .neq('status', 'anulada')
      .limit(10000),
    supabase
      .from('operations')
      .select('id, client_id, operation_date, amount_usd, profit_clp, status')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('clients')
      .select('id, full_name')
      .limit(10000),
    supabase
      .from('leads')
      .select('source_channel, created_at'),
    supabase
      .from('cash_positions')
      .select('*')
      .order('date', { ascending: false })
      .limit(1),
    supabase
      .from('processors')
      .select('id, name, status')
      .order('name'),
    db
      .from('revenue_analyses')
      .select('id, analysis_data, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // KPI calculations
  const ops       = opsAllRes.data   ?? []
  const todayOps  = ops.filter(o => o.operation_date === today)
  const utilidadDia   = todayOps.reduce((s, o) => s + (o.profit_clp ?? 0), 0)
  const utilidadTotal = ops.reduce((s, o) => s + (o.profit_clp ?? 0), 0)
  const opsDia        = todayOps.length
  const ticketPromedio = ops.length > 0
    ? ops.reduce((s, o) => s + o.amount_usd, 0) / ops.length
    : 0

  const clientesActivos = clientsCountRes.count ?? 0
  const clientMap = Object.fromEntries((clientsNamesRes.data ?? []).map(c => [c.id, c.full_name]))

  const leads       = leadsAllRes.data ?? []
  const leadsDia    = leads.filter(l => l.created_at.slice(0, 10) === today).length
  const leadsByChannel = leads.reduce<Record<string, number>>((acc, l) => {
    const ch = l.source_channel ?? 'otro'
    acc[ch] = (acc[ch] ?? 0) + 1
    return acc
  }, {})
  const channelEntries = Object.entries(leadsByChannel).sort((a, b) => b[1] - a[1])
  const maxLeads = channelEntries[0]?.[1] ?? 1

  const caja        = cashRes.data?.[0] ?? null
  const processors  = processorsRes.data ?? []
  const recentOps   = opsRecentRes.data ?? []
  const latestRevenue = revenueRes.data ?? null

  return (
    <PageShell title="Dashboard" description="Resumen ejecutivo en tiempo real">

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Utilidad hoy"
          value={formatCLP(utilidadDia)}
          icon={TrendingUp}
          color="text-green-400"
          bg="bg-green-500/10"
        />
        <KpiCard
          label="Utilidad total"
          value={formatCLP(utilidadTotal)}
          icon={DollarSign}
          color="text-blue-400"
          bg="bg-blue-500/10"
        />
        <KpiCard
          label="Ops hoy"
          value={String(opsDia)}
          icon={Workflow}
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
        <KpiCard
          label="Ticket prom."
          value={formatUSD(ticketPromedio)}
          icon={BarChart3}
          color="text-purple-400"
          bg="bg-purple-500/10"
        />
        <KpiCard
          label="Clientes"
          value={String(clientesActivos)}
          icon={Users}
          color="text-sky-400"
          bg="bg-sky-500/10"
        />
        <KpiCard
          label="Leads hoy"
          value={String(leadsDia)}
          icon={Zap}
          color="text-pink-400"
          bg="bg-pink-500/10"
        />
      </div>

      {/* ── Fila principal ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Últimas operaciones */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <p className="text-sm font-semibold text-slate-100">Últimas operaciones</p>
            <p className="text-xs text-slate-500 mt-0.5">5 más recientes</p>
          </div>
          {recentOps.length === 0 ? (
            <EmptyState message="Sin operaciones registradas" />
          ) : (
            <TableScroll>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Fecha', 'Cliente', 'USD', 'Utilidad', 'Estado'].map(h => (
                      <th key={h} className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOps.map(op => (
                    <tr key={op.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {new Date(op.operation_date + 'T12:00:00').toLocaleDateString('es-CL')}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300 max-w-[160px]">
                        <span className="line-clamp-1">{clientMap[op.client_id] ?? op.client_id}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-slate-200 whitespace-nowrap">
                        {formatUSD(op.amount_usd)}
                      </td>
                      <td className={cn(
                        'py-3 px-4 font-mono text-sm whitespace-nowrap',
                        (op.profit_clp ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {formatCLP(op.profit_clp)}
                      </td>
                      <td className="py-3 px-4">
                        <OperacionStatusBadge status={op.status as OperationStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </div>

        {/* Columna derecha: caja + procesadores */}
        <div className="flex flex-col gap-4">

          {/* Caja actual */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-green-400" />
              </div>
              <p className="text-sm font-semibold text-slate-100">Caja actual</p>
            </div>
            {caja ? (
              <>
                <p className="text-2xl font-bold font-mono text-green-400">
                  {formatCLP(caja.available_clp)}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  Actualizado {new Date(caja.date + 'T12:00:00').toLocaleDateString('es-CL')}
                </p>
                {caja.notes && (
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2">{caja.notes}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">Sin registro de caja</p>
            )}
          </div>

          {/* Procesadores */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex-1">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-sm font-semibold text-slate-100">Procesadores</p>
            </div>
            {processors.length === 0 ? (
              <EmptyState message="Sin procesadores registrados" />
            ) : (
              <div className="divide-y divide-slate-800">
                {processors.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <p className="text-sm text-slate-300 truncate mr-3">{p.name}</p>
                    <span className={cn(
                      'inline-flex px-2 py-0.5 rounded-md text-xs font-medium border flex-shrink-0',
                      PROCESSOR_STATUS_STYLES[p.status ?? 'activo'] ?? PROCESSOR_STATUS_STYLES.activo
                    )}>
                      {p.status ?? 'activo'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Leads por canal ──────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="mb-5">
          <p className="text-sm font-semibold text-slate-100">Leads por canal</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} totales
          </p>
        </div>
        {channelEntries.length === 0 ? (
          <p className="text-sm text-slate-500">Sin leads registrados</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
            {channelEntries.map(([channel, count]) => {
              const colors = CHANNEL_COLORS[channel] ?? CHANNEL_COLORS['otro']
              const pct = leads.length > 0 ? (count / leads.length) * 100 : 0
              const barPct = maxLeads > 0 ? (count / maxLeads) * 100 : 0
              return (
                <div key={channel}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn('text-xs font-medium', colors.text)}>{channel}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                      <span className="text-xs font-mono text-slate-300">{count}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', colors.bar)}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Análisis Estratégico (Revenue Agent) ─────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <RevenueAgentView
          initialAnalysis={latestRevenue?.analysis_data as RevenueAnalysis ?? null}
          lastAnalyzedAt={latestRevenue?.created_at ?? null}
        />
      </div>

    </PageShell>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, color, bg,
}: {
  label: string
  value: string
  icon: React.ElementType
  color: string
  bg: string
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-7 h-7 rounded-md flex items-center justify-center', bg)}>
          <Icon className={cn('w-3.5 h-3.5', color)} />
        </div>
        <p className="text-xs text-slate-400 uppercase tracking-wider leading-tight">{label}</p>
      </div>
      <p className="text-xl font-bold font-mono text-slate-100 leading-none">{value}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 flex items-center justify-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}
