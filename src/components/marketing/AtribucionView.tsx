'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, TrendingUp, Users, Zap, Clock, Trophy, DatabaseZap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { calculateAttributionMetrics } from '@/app/marketing/attribution-actions'
import { backfillLeadAttributions } from '@/app/marketing/attribution-backfill'
import type { AttributionMetrics } from '@/app/marketing/attribution-actions'

type Props = {
  initialMetrics: AttributionMetrics
}

function fmtCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`
}

const CHANNEL_COLORS: Record<string, string> = {
  'Meta':       'bg-blue-500',
  'TikTok':     'bg-pink-500',
  'LinkedIn':   'bg-sky-600',
  'Twitter/X':  'bg-slate-400',
  'referido':   'bg-emerald-500',
  'otro':       'bg-slate-500',
  'Sin canal':  'bg-slate-600',
}

function ChannelDot({ channel }: { channel: string }) {
  const cls = CHANNEL_COLORS[channel] ?? 'bg-slate-500'
  return <span className={cn('inline-block w-2 h-2 rounded-full mr-2 flex-shrink-0', cls)} />
}

export function AtribucionView({ initialMetrics }: Props) {
  const [metrics, setMetrics]        = useState<AttributionMetrics>(initialMetrics)
  const [isPending, startTransition] = useTransition()
  const [error, setError]            = useState<string | null>(null)
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null)
  const router = useRouter()

  function refresh() {
    startTransition(async () => {
      setError(null)
      const res = await calculateAttributionMetrics()
      if (!res.success) { setError(res.error); return }
      setMetrics(res.data)
      router.refresh()
    })
  }

  function runBackfill() {
    startTransition(async () => {
      setError(null)
      setBackfillMsg(null)
      const res = await backfillLeadAttributions()
      if (!res.success && res.errors.length > 0) {
        setError(res.errors[0])
        return
      }
      setBackfillMsg(
        `Backfill completo: ${res.leads_processed} leads + ${res.operations_processed} operaciones procesadas. ` +
        `(${res.leads_skipped} leads y ${res.operations_skipped} ops ya existían)`
      )
      const updated = await calculateAttributionMetrics()
      if (updated.success) setMetrics(updated.data)
      router.refresh()
    })
  }

  const { totals, byChannel, byCampaign } = metrics
  const maxProfit = Math.max(...byChannel.map(c => c.profit_clp), 1)

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Atribución Real</h2>
          <p className="text-sm text-slate-400">Canal → Lead → Cliente → Operación → Utilidad</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runBackfill}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 rounded-lg text-sm transition-colors disabled:opacity-50"
            title="Poblar datos históricos desde leads y operaciones existentes"
          >
            <DatabaseZap className={cn('w-4 h-4', isPending && 'animate-spin')} />
            Backfill histórico
          </button>
          <button
            onClick={refresh}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isPending && 'animate-spin')} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg text-red-400 text-sm">{error}</div>
      )}
      {backfillMsg && (
        <div className="p-3 bg-green-950/40 border border-green-800 rounded-lg text-green-400 text-sm">{backfillMsg}</div>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Utilidad total</span>
          </div>
          <p className="text-2xl font-mono font-bold text-green-400">{fmtCLP(totals.total_profit_clp)}</p>
          <p className="text-xs text-slate-500 mt-1">atribuida a canales</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Clientes convertidos</span>
          </div>
          <p className="text-2xl font-mono font-bold text-slate-100">{totals.total_clients}</p>
          <p className="text-xs text-slate-500 mt-1">con atribución registrada</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Operaciones</span>
          </div>
          <p className="text-2xl font-mono font-bold text-slate-100">{totals.total_operations}</p>
          <p className="text-xs text-slate-500 mt-1">con origen conocido</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Tiempo conversión</span>
          </div>
          <p className="text-2xl font-mono font-bold text-slate-100">{totals.avg_conversion_days}<span className="text-sm font-normal text-slate-400 ml-1">días</span></p>
          <p className="text-xs text-slate-500 mt-1">promedio lead → cliente</p>
        </div>
      </div>

      {/* Tabla por canal */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">Rendimiento por canal</h3>
        </div>

        {byChannel.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Sin datos de atribución aún. Los registros se crean al convertir leads en clientes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Canal</th>
                  <th className="text-right px-4 py-3">Leads</th>
                  <th className="text-right px-4 py-3">Clientes</th>
                  <th className="text-right px-4 py-3">Ops.</th>
                  <th className="text-right px-4 py-3">Conversión</th>
                  <th className="text-right px-4 py-3">Días prom.</th>
                  <th className="text-right px-5 py-3">Utilidad</th>
                </tr>
              </thead>
              <tbody>
                {byChannel.map((row, i) => (
                  <tr key={row.channel} className={cn('border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors', i === 0 && 'bg-green-950/10')}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <ChannelDot channel={row.channel} />
                        <span className="text-slate-200 font-medium">{row.channel}</span>
                        {i === 0 && <span className="text-[10px] bg-green-900/60 text-green-400 px-1.5 py-0.5 rounded font-medium">top</span>}
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 text-slate-400 font-mono">{row.leads}</td>
                    <td className="text-right px-4 py-3 text-slate-200 font-mono font-medium">{row.clients}</td>
                    <td className="text-right px-4 py-3 text-slate-400 font-mono">{row.operations}</td>
                    <td className="text-right px-4 py-3">
                      <span className={cn(
                        'font-mono text-xs px-2 py-0.5 rounded',
                        row.conversion_rate >= 10 ? 'bg-green-900/40 text-green-400' :
                        row.conversion_rate >= 5  ? 'bg-amber-900/40 text-amber-400' :
                                                    'bg-slate-800 text-slate-400'
                      )}>
                        {fmtPct(row.conversion_rate)}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3 text-slate-400 font-mono">
                      {row.avg_conversion_days > 0 ? `${row.avg_conversion_days}d` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.round((row.profit_clp / maxProfit) * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-green-400 text-xs w-24 text-right">
                          {fmtCLP(row.profit_clp)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ranking de campañas */}
      {byCampaign.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">Top campañas por utilidad</h3>
          </div>
          <div className="divide-y divide-slate-800/50">
            {byCampaign.map((c, i) => (
              <div key={c.campaign} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    i === 0 ? 'bg-amber-500/20 text-amber-400' :
                    i === 1 ? 'bg-slate-400/20 text-slate-400' :
                    i === 2 ? 'bg-orange-700/20 text-orange-500' :
                              'bg-slate-800 text-slate-500'
                  )}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm text-slate-200 font-medium">{c.campaign}</p>
                    <div className="flex items-center gap-1">
                      <ChannelDot channel={c.channel} />
                      <span className="text-xs text-slate-500">{c.channel}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-green-400 font-medium">{fmtCLP(c.profit_clp)}</p>
                  <p className="text-xs text-slate-500">{c.clients} cliente{c.clients !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nota informativa si no hay datos */}
      {byChannel.length === 0 && byCampaign.length === 0 && (
        <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl p-8 text-center space-y-2">
          <p className="text-slate-400 text-sm">Los datos de atribución se generan automáticamente</p>
          <p className="text-slate-500 text-xs">cuando un lead se convierte en cliente y luego realiza una operación.</p>
        </div>
      )}
    </div>
  )
}
