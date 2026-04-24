'use client'

import { useState } from 'react'
import {
  BarChart3, Loader2, AlertTriangle, X,
  TrendingUp, ShieldAlert, Lightbulb, ArrowUp, ArrowDown, Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RevenueAnalysis, SavedRevenueAnalysis } from '@/types/agent.types'
import { runRevenueAgentAction } from '@/app/dashboard/revenue-agent-actions'
import { formatCLP } from '@/lib/utils'

// ── Badges ────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<string, string> = {
  alta:  'bg-red-500/15 text-red-400 border-red-500/30',
  media: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  baja:  'bg-slate-700/50 text-slate-400 border-slate-600/30',
}
const CATEGORY_STYLES: Record<string, string> = {
  marketing:    'bg-blue-500/15 text-blue-400',
  operaciones:  'bg-green-500/15 text-green-400',
  caja:         'bg-amber-500/15 text-amber-400',
  clientes:     'bg-purple-500/15 text-purple-400',
  procesadores: 'bg-slate-700 text-slate-400',
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn(
      'inline-flex px-2 py-0.5 rounded-md text-xs font-medium border uppercase tracking-wide',
      PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.baja
    )}>
      {priority}
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={cn(
      'inline-flex px-2 py-0.5 rounded-md text-xs font-medium capitalize',
      CATEGORY_STYLES[category] ?? CATEGORY_STYLES.operaciones
    )}>
      {category}
    </span>
  )
}

// ── Props ─────────────────────────────────────────────────────
type Props = {
  initialAnalysis?:   RevenueAnalysis | null
  lastAnalyzedAt?:    string | null
}

export function RevenueAgentView({ initialAnalysis = null, lastAnalyzedAt = null }: Props) {
  const [analysis,   setAnalysis]   = useState<RevenueAnalysis | null>(initialAnalysis)
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(lastAnalyzedAt)
  const [running,    setRunning]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleRun() {
    setRunning(true)
    setError(null)
    const result = await runRevenueAgentAction()
    setRunning(false)
    if (result.success && result.data) {
      setAnalysis(result.data.analysis_data)
      setAnalyzedAt(result.data.created_at)
    } else {
      setError(result.error ?? 'Error al ejecutar el análisis')
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Análisis Estratégico</h2>
          {analyzedAt ? (
            <p className="text-xs text-slate-500 mt-0.5">
              Último análisis: {new Date(analyzedAt).toLocaleString('es-CL', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          ) : (
            <p className="text-xs text-slate-600 mt-0.5">Sin análisis previo</p>
          )}
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-300 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-700/40 hover:border-emerald-600/60 rounded-lg transition-colors disabled:opacity-50"
        >
          {running
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <BarChart3 className="w-4 h-4" />
          }
          {running ? 'Analizando negocio…' : 'Analizar negocio con IA'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!analysis && !running && !error && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-400 font-medium">Sin análisis estratégico</p>
            <p className="text-xs text-slate-600 mt-1">Haz clic en "Analizar negocio con IA" para generar el primer análisis.</p>
          </div>
        </div>
      )}

      {/* ── Resultado ── */}
      {analysis && (
        <div className="space-y-5">

          {/* Resumen ejecutivo */}
          <div className="bg-blue-900/15 border border-blue-800/30 rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Resumen ejecutivo</p>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{analysis.business_summary}</p>
          </div>

          {/* Oportunidades + Riesgos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Oportunidades */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <p className="text-sm font-medium text-green-400">Top Oportunidades</p>
              </div>
              <div className="divide-y divide-slate-800">
                {analysis.top_opportunities.map((opp, i) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/15 text-green-400 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">{opp}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Riesgos */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <p className="text-sm font-medium text-red-400">Riesgos y Alertas</p>
              </div>
              <div className="divide-y divide-slate-800">
                {analysis.top_risks.map((risk, i) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/15 text-red-400 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">{risk}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recomendaciones */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-semibold text-slate-100">Recomendaciones accionables</p>
              <span className="text-xs text-slate-500">({analysis.recommendations.length})</span>
            </div>
            <div className="divide-y divide-slate-800">
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className="px-5 py-4 space-y-2">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-200 flex-1">{rec.title}</p>
                    <PriorityBadge priority={rec.priority} />
                    <CategoryBadge category={rec.category} />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{rec.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-slate-800/50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Impacto esperado</p>
                      <p className="text-xs text-green-400">{rec.expected_impact}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Acción requerida</p>
                      <p className="text-xs text-slate-300">{rec.action_required}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rendimiento por canal */}
          {analysis.channel_performance.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <p className="text-sm font-semibold text-slate-100">Rendimiento por canal</p>
                <p className="text-xs text-slate-500 mt-0.5">Basado en datos de los últimos 90 días</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Canal', 'Leads', 'Conv.', 'Revenue', 'Utilidad', 'Gasto', 'ROI', 'Acción'].map(h => (
                        <th key={h} className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.channel_performance.map((ch, i) => {
                      const rec = ch.recommendation
                      const recStyle =
                        rec === 'subir'    ? 'text-green-400' :
                        rec === 'bajar'    ? 'text-red-400' :
                                            'text-amber-400'
                      const RecIcon =
                        rec === 'subir'    ? ArrowUp :
                        rec === 'bajar'    ? ArrowDown :
                                            Minus
                      return (
                        <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-slate-200">{ch.channel_name}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-sm text-slate-300 whitespace-nowrap">
                            {ch.leads_generated}
                          </td>
                          <td className="py-3 px-4 font-mono text-sm text-slate-300 whitespace-nowrap">
                            {ch.conversion_rate.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 font-mono text-sm text-slate-300 whitespace-nowrap">
                            {formatCLP(ch.revenue_clp)}
                          </td>
                          <td className="py-3 px-4 font-mono text-sm text-green-400 whitespace-nowrap">
                            {formatCLP(ch.profit_clp)}
                          </td>
                          <td className="py-3 px-4 font-mono text-sm text-slate-400 whitespace-nowrap">
                            {formatCLP(ch.cost_clp)}
                          </td>
                          <td className="py-3 px-4 font-mono text-sm text-slate-300 whitespace-nowrap">
                            {ch.roi > 0 ? `${ch.roi.toFixed(1)}x` : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <div className={cn('flex items-center gap-1 text-xs font-medium capitalize', recStyle)}>
                              <RecIcon className="w-3.5 h-3.5" />
                              {rec}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
