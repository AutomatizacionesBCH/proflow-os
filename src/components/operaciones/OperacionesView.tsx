'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Filter, Search, ChevronDown } from 'lucide-react'
import { cn, formatCLP, formatUSD, formatPct } from '@/lib/utils'
import type { Operation, OperationStatus } from '@/types'
import { OperacionStatusBadge } from './OperacionStatusBadge'
import { OperacionForm } from './OperacionForm'
import { updateOperationStatus } from '@/app/operaciones/actions'
import { KpiBox } from '@/components/ui/KpiBox'

const ALL_STATUSES: { value: OperationStatus | 'all'; label: string }[] = [
  { value: 'all',        label: 'Todas' },
  { value: 'pendiente',  label: 'Pendiente' },
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'completada', label: 'Completada' },
  { value: 'anulada',    label: 'Anulada' },
]

type Props = {
  initialOperations: Operation[]
}

export function OperacionesView({ initialOperations }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<OperationStatus | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const filtered = useMemo(() => {
    return initialOperations.filter(op => {
      if (statusFilter !== 'all' && op.status !== statusFilter) return false
      if (dateFrom && op.operation_date < dateFrom) return false
      if (dateTo   && op.operation_date > dateTo)   return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !op.client_id.toLowerCase().includes(q) &&
          !(op.company_id?.toLowerCase().includes(q)) &&
          !(op.processor_id?.toLowerCase().includes(q)) &&
          !(op.notes?.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
  }, [initialOperations, statusFilter, dateFrom, dateTo, search])

  // Stats calculadas del subconjunto filtrado
  const stats = useMemo(() => ({
    total:       filtered.length,
    amountUsd:   filtered.reduce((s, op) => s + op.amount_usd, 0),
    profitClp:   filtered.reduce((s, op) => s + (op.profit_clp ?? 0), 0),
    pendientes:  filtered.filter(op => op.status === 'pendiente').length,
  }), [filtered])

  function handleSuccess() {
    setShowForm(false)
    startTransition(() => router.refresh())
  }

  return (
    <>
      {/* Formulario (slide-over) */}
      {showForm && (
        <OperacionForm
          onClose={() => setShowForm(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiBox label="Total operaciones" value={String(stats.total)} />
        <KpiBox label="Volumen USD"       value={formatUSD(stats.amountUsd)} />
        <KpiBox label="Utilidad CLP"      value={formatCLP(stats.profitClp)} positive={stats.profitClp >= 0} danger={stats.profitClp < 0} />
        <KpiBox label="Pendientes"        value={String(stats.pendientes)} warn={stats.pendientes > 0} />
      </div>

      {/* ── Filtros ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Búsqueda */}
          <div className="flex items-center gap-2 flex-1 bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 focus-within:border-slate-600 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por cliente, empresa, procesador..."
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Fechas */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-300 outline-none focus:border-slate-600 transition-colors"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
            <span className="text-slate-600 text-xs">→</span>
            <input
              type="date"
              className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-300 outline-none focus:border-slate-600 transition-colors"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>

          {/* Botón nueva operación */}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nueva operación
          </button>
        </div>

        {/* Filtros de estado */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <Filter className="w-3 h-3 text-slate-600 mr-1" />
          {ALL_STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                'px-3 py-1 text-xs rounded-md border transition-colors',
                statusFilter === s.value
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                  : 'text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
              )}
            >
              {s.label}
              {s.value !== 'all' && (
                <span className="ml-1.5 text-slate-500">
                  ({initialOperations.filter(op => op.status === s.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Fecha', 'Cliente', 'Empresa', 'Procesador', 'Monto USD', 'TC', 'Payout%', 'Bruto CLP', 'Utilidad CLP', 'Margen', 'Estado', 'Acciones'].map(h => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                        <Filter className="w-4 h-4 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {initialOperations.length === 0
                          ? 'No hay operaciones aún. Crea la primera.'
                          : 'Ninguna operación coincide con los filtros.'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(op => (
                  <OperacionRow
                    key={op.id}
                    op={op}
                    onStatusChange={(id, status) => {
                      startTransition(async () => {
                        await updateOperationStatus(id, status)
                        router.refresh()
                      })
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {filtered.length} operación{filtered.length !== 1 ? 'es' : ''} mostradas
              {filtered.length !== initialOperations.length && ` de ${initialOperations.length}`}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
              <span>Total: <span className="text-slate-300">{formatUSD(stats.amountUsd)}</span></span>
              <span>Utilidad: <span className={stats.profitClp >= 0 ? 'text-green-400' : 'text-red-400'}>{formatCLP(stats.profitClp)}</span></span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Fila de operación con cambio de estado inline ──────────────────────────
function OperacionRow({
  op,
  onStatusChange,
}: {
  op: Operation
  onStatusChange: (id: string, status: OperationStatus) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const margin = op.gross_clp && op.gross_clp > 0 && op.profit_clp != null
    ? (op.profit_clp / op.gross_clp) * 100
    : null

  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
      <td className="py-3 px-4 text-slate-400 font-mono text-xs whitespace-nowrap">
        {new Date(op.operation_date + 'T00:00:00').toLocaleDateString('es-CL')}
      </td>
      <td className="py-3 px-4 text-slate-200 font-medium">{op.client_id}</td>
      <td className="py-3 px-4 text-slate-400">{op.company_id || '—'}</td>
      <td className="py-3 px-4 text-slate-400">{op.processor_id || '—'}</td>
      <td className="py-3 px-4 font-mono text-slate-200 whitespace-nowrap">{formatUSD(op.amount_usd)}</td>
      <td className="py-3 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">
        {op.fx_rate_used.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="py-3 px-4 font-mono text-slate-400 text-xs">{formatPct(op.client_payout_pct, 1)}</td>
      <td className="py-3 px-4 font-mono text-slate-300 text-xs whitespace-nowrap">{formatCLP(op.gross_clp)}</td>
      <td className="py-3 px-4 font-mono whitespace-nowrap">
        {op.profit_clp != null ? (
          <span className={op.profit_clp >= 0 ? 'text-green-400' : 'text-red-400'}>
            {formatCLP(op.profit_clp)}
          </span>
        ) : '—'}
      </td>
      <td className="py-3 px-4 font-mono text-xs">
        {margin != null ? (
          <span className={margin >= 0 ? 'text-green-500' : 'text-red-500'}>
            {formatPct(margin)}
          </span>
        ) : '—'}
      </td>
      <td className="py-3 px-4">
        <OperacionStatusBadge status={op.status} />
      </td>
      <td className="py-3 px-4">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md px-2 py-1 transition-colors"
          >
            Estado <ChevronDown className="w-3 h-3" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-10 bg-slate-800 border border-slate-700 rounded-md shadow-xl min-w-36 py-1">
              {(['pendiente', 'en_proceso', 'completada', 'anulada'] as OperationStatus[]).map(s => (
                <button
                  key={s}
                  disabled={op.status === s}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-xs transition-colors',
                    op.status === s
                      ? 'text-slate-500 cursor-default'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  )}
                  onClick={() => {
                    setMenuOpen(false)
                    if (op.status !== s) onStatusChange(op.id, s)
                  }}
                >
                  {{ pendiente: 'Pendiente', en_proceso: 'En Proceso', completada: 'Completada', anulada: 'Anulada' }[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

