'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, TrendingDown, Trash2 } from 'lucide-react'
import { cn, formatCLP } from '@/lib/utils'
import type { MarketingSpend, MarketingChannel } from '@/types'
import { deleteMarketingSpend } from '@/app/marketing/actions'
import { MarketingForm } from './MarketingForm'

const CHANNEL_COLORS: Record<MarketingChannel, { bar: string; text: string; border: string }> = {
  'Meta':      { bar: 'bg-blue-500',   text: 'text-blue-400',   border: 'border-blue-500/20' },
  'TikTok':    { bar: 'bg-pink-500',   text: 'text-pink-400',   border: 'border-pink-500/20' },
  'LinkedIn':  { bar: 'bg-sky-500',    text: 'text-sky-400',    border: 'border-sky-500/20' },
  'Twitter/X': { bar: 'bg-slate-400',  text: 'text-slate-300',  border: 'border-slate-500/20' },
  'referido':  { bar: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/20' },
  'otro':      { bar: 'bg-slate-600',  text: 'text-slate-400',  border: 'border-slate-600/20' },
}

const CHANNELS: MarketingChannel[] = ['Meta', 'TikTok', 'LinkedIn', 'Twitter/X', 'referido', 'otro']

type AnalyticsData = {
  leadsPerChannel:       Record<string, number>
  conversionsPerChannel: Record<string, number>
  opsPerChannel:         Record<string, number>
  spendPerChannel:       Record<string, number>
}

type Props = {
  initialSpends: MarketingSpend[]
  analyticsData: AnalyticsData
}

export function AnaliticaView({ initialSpends, analyticsData }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<MarketingSpend | undefined>()
  const [deleting, setDeleting] = useState<string | null>(null)

  function refresh() { startTransition(() => router.refresh()) }
  function handleSuccess() { setShowForm(false); setEditing(undefined); refresh() }

  async function handleDelete(id: string, ev: React.MouseEvent) {
    ev.stopPropagation()
    if (!confirm('¿Eliminar este registro?')) return
    setDeleting(id)
    await deleteMarketingSpend(id)
    setDeleting(null)
    refresh()
  }

  const channelStats = useMemo(() => {
    return CHANNELS.map(ch => {
      const leads       = analyticsData.leadsPerChannel[ch]       ?? 0
      const conversions = analyticsData.conversionsPerChannel[ch]  ?? 0
      const ops         = analyticsData.opsPerChannel[ch]          ?? 0
      const spend       = analyticsData.spendPerChannel[ch]        ?? 0
      const costPerLead = leads > 0 ? Math.round(spend / leads) : null
      const costPerConv = conversions > 0 ? Math.round(spend / conversions) : null
      return { ch, leads, conversions, ops, spend, costPerLead, costPerConv }
    }).filter(r => r.leads > 0 || r.spend > 0)
  }, [analyticsData])

  const spendStats = useMemo(() => {
    const total = initialSpends.reduce((s, r) => s + r.amount_clp, 0)
    const byChannel = CHANNELS.map(ch => ({
      channel: ch,
      total: initialSpends.filter(r => r.channel === ch).reduce((s, r) => s + r.amount_clp, 0),
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
    const now = new Date()
    const thisMonth = initialSpends
      .filter(r => { const d = new Date(r.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() })
      .reduce((s, r) => s + r.amount_clp, 0)
    return { total, byChannel, thisMonth }
  }, [initialSpends])

  const maxBar = spendStats.byChannel[0]?.total ?? 1

  return (
    <>
      {showForm && (
        <MarketingForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSuccess={handleSuccess}
          editing={editing}
        />
      )}

      {/* KPIs de gasto */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Gasto total',    value: formatCLP(spendStats.total) },
          { label: 'Este mes',       value: formatCLP(spendStats.thisMonth) },
          { label: 'Total leads',    value: String(Object.values(analyticsData.leadsPerChannel).reduce((s, v) => s + v, 0)) },
          { label: 'Conversiones',   value: String(Object.values(analyticsData.conversionsPerChannel).reduce((s, v) => s + v, 0)) },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className="text-xl font-semibold font-mono text-slate-100">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla de métricas por canal */}
      {channelStats.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <p className="text-sm font-semibold text-slate-100">Métricas por canal</p>
            <p className="text-xs text-slate-500 mt-0.5">Leads, conversiones, operaciones y costo estimado</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Canal', 'Leads', 'Conversiones', 'Operaciones', 'Gasto', 'Costo/Lead', 'Costo/Conversión'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {channelStats.map(({ ch, leads, conversions, ops, spend, costPerLead, costPerConv }) => {
                  const colors = CHANNEL_COLORS[ch]
                  return (
                    <tr key={ch} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className={cn('text-sm font-medium', colors.text)}>{ch}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{leads.toLocaleString('es-CL')}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{conversions.toLocaleString('es-CL')}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{ops.toLocaleString('es-CL')}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{spend > 0 ? formatCLP(spend) : '—'}</td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-xs">{costPerLead != null ? formatCLP(costPerLead) : '—'}</td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-xs">{costPerConv != null ? formatCLP(costPerConv) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Distribución de gasto por canal */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-semibold text-slate-100">Gasto por canal</p>
            <p className="text-xs text-slate-500 mt-0.5">Distribución acumulada histórica</p>
          </div>
          <button
            onClick={() => { setEditing(undefined); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo gasto
          </button>
        </div>

        {spendStats.byChannel.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <TrendingDown className="w-6 h-6 text-slate-700" />
            <p className="text-sm text-slate-500">No hay gastos registrados aún.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {spendStats.byChannel.map(({ channel, total }) => {
              const pct    = spendStats.total > 0 ? (total / spendStats.total) * 100 : 0
              const barPct = maxBar > 0 ? (total / maxBar) * 100 : 0
              const colors = CHANNEL_COLORS[channel]
              return (
                <div key={channel}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn('text-xs font-medium', colors.text)}>{channel}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                      <span className="text-xs font-mono text-slate-300">{formatCLP(total)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', colors.bar)} style={{ width: `${barPct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Historial de gastos */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <p className="text-sm font-semibold text-slate-100">Historial de gastos</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Fecha', 'Canal', 'Monto CLP', 'Notas', 'Acciones'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialSpends.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="text-sm text-slate-500">Sin registros de gasto.</p>
                  </td>
                </tr>
              ) : (
                initialSpends.map(spend => {
                  const colors = CHANNEL_COLORS[spend.channel]
                  return (
                    <tr key={spend.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-xs whitespace-nowrap">
                        {new Date(spend.date + 'T12:00:00').toLocaleDateString('es-CL')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', colors.text, colors.border)}>
                          {spend.channel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-slate-200 whitespace-nowrap">{formatCLP(spend.amount_clp)}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs max-w-[200px]">
                        <span className="line-clamp-1">{spend.notes || '—'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={ev => { setEditing(spend); setShowForm(true); ev.stopPropagation() }}
                            className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md px-2 py-1 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={ev => handleDelete(spend.id, ev)}
                            disabled={deleting === spend.id}
                            className="text-xs text-red-500/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-md px-2 py-1 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            {deleting === spend.id ? '…' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {initialSpends.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              {initialSpends.length} registro{initialSpends.length !== 1 ? 's' : ''} · Total:{' '}
              <span className="font-mono text-slate-400">{formatCLP(spendStats.total)}</span>
            </p>
          </div>
        )}
      </div>
    </>
  )
}
