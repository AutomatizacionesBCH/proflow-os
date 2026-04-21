'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Filter, Search, ChevronDown, Pencil, Trash2, AlertTriangle, Paperclip } from 'lucide-react'
import { cn, formatCLP, formatUSD, formatPct } from '@/lib/utils'
import type { Operation, OperationStatus } from '@/types'
import { OperacionStatusBadge } from './OperacionStatusBadge'
import { OperacionForm } from './OperacionForm'
import { OperacionDocumentos } from './OperacionDocumentos'
import { updateOperationStatus, deleteOperation } from '@/app/operaciones/actions'
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
  clientMap:    Record<string, string>
  companyMap:   Record<string, string>
  processorMap: Record<string, string>
}

export function OperacionesView({ initialOperations, clientMap, companyMap, processorMap }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Operation | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Operation | null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [docsTarget, setDocsTarget] = useState<string | null>(null)
  const [search, setSearch]       = useState('')
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
        const clientName    = clientMap[op.client_id]?.toLowerCase() ?? ''
        const companyName   = (op.company_id   ? companyMap[op.company_id]   : '') ?? ''
        const processorName = (op.processor_id ? processorMap[op.processor_id] : op.fx_source ?? '') ?? ''
        if (
          !clientName.includes(q) &&
          !companyName.includes(q) &&
          !processorName.includes(q) &&
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
    setEditing(undefined)
    startTransition(() => router.refresh())
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteOperation(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    startTransition(() => router.refresh())
  }

  return (
    <>
      {showForm && (
        <OperacionForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSuccess={handleSuccess}
          editing={editing}
        />
      )}

      {/* Modal documentos de operación */}
      {docsTarget && (
        <OperacionDocumentos operacionId={docsTarget} onClose={() => setDocsTarget(null)} />
      )}

      {/* Modal confirmación eliminar */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1">¿Eliminar operación?</h3>
                <p className="text-xs text-slate-400">
                  Esta acción no se puede deshacer. Se eliminará permanentemente la operación de{' '}
                  <span className="font-medium text-slate-200">{deleteTarget.client_id}</span>{' '}
                  por <span className="font-mono text-slate-200">{formatUSD(deleteTarget.amount_usd)}</span>.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-md hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
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
        <div className="flex flex-col gap-3">
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

            {/* Botón nueva operación */}
            <button
              onClick={() => { setEditing(undefined); setShowForm(true) }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nueva operación
            </button>
          </div>

          {/* Fechas */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="flex-1 min-w-0 bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-300 outline-none focus:border-slate-600 transition-colors"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
            <span className="text-slate-600 text-xs flex-shrink-0">→</span>
            <input
              type="date"
              className="flex-1 min-w-0 bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-300 outline-none focus:border-slate-600 transition-colors"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
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
                {['Fecha', 'Cliente', 'Empresa', 'Procesador', 'Monto USD', 'TC', 'Payout%', 'Bruto CLP', 'Pago Cliente', 'Utilidad CLP', 'Margen', 'Estado', 'Acciones'].map(h => (
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
                  <td colSpan={13} className="py-16 text-center">
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
                    clientMap={clientMap}
                    companyMap={companyMap}
                    processorMap={processorMap}
                    onStatusChange={(id, status) => {
                      startTransition(async () => {
                        await updateOperationStatus(id, status)
                        router.refresh()
                      })
                    }}
                    onEdit={op => { setEditing(op); setShowForm(true) }}
                    onDelete={op => setDeleteTarget(op)}
                    onDocs={id => setDocsTarget(id)}
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
  clientMap,
  companyMap,
  processorMap,
  onStatusChange,
  onEdit,
  onDelete,
  onDocs,
}: {
  op: Operation
  clientMap:    Record<string, string>
  companyMap:   Record<string, string>
  processorMap: Record<string, string>
  onStatusChange: (id: string, status: OperationStatus) => void
  onEdit: (op: Operation) => void
  onDelete: (op: Operation) => void
  onDocs: (id: string) => void
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
      <td className="py-3 px-4 text-slate-200 font-medium">{clientMap[op.client_id] ?? op.client_id}</td>
      <td className="py-3 px-4 text-slate-400">{op.company_id ? (companyMap[op.company_id] ?? op.company_id) : '—'}</td>
      <td className="py-3 px-4 text-slate-400">{op.processor_id ? (processorMap[op.processor_id] ?? op.fx_source ?? op.processor_id) : (op.fx_source ?? '—')}</td>
      <td className="py-3 px-4 font-mono text-slate-200 whitespace-nowrap">{formatUSD(op.amount_usd)}</td>
      <td className="py-3 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">
        {op.fx_rate_used.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="py-3 px-4 font-mono text-slate-400 text-xs">{formatPct(op.client_payout_pct, 1)}</td>
      <td className="py-3 px-4 font-mono text-slate-300 text-xs whitespace-nowrap">{formatCLP(op.gross_clp)}</td>
      <td className="py-3 px-4 font-mono text-slate-200 text-xs whitespace-nowrap">
        {op.amount_clp_paid != null ? formatCLP(op.amount_clp_paid) : '—'}
      </td>
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
        <div className="flex items-center gap-1.5">
          {/* Cambio de estado */}
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

          {/* Editar */}
          <button
            onClick={() => onEdit(op)}
            title="Editar operación"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md px-2 py-1 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Editar
          </button>

          {/* Documentos */}
          <button
            onClick={() => onDocs(op.id)}
            title="Documentos de la operación"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md px-2 py-1 transition-colors"
          >
            <Paperclip className="w-3 h-3" />
            Docs
          </button>

          {/* Eliminar */}
          <button
            onClick={() => onDelete(op)}
            title="Eliminar operación"
            className="flex items-center gap-1 text-xs text-red-500/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-md px-2 py-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  )
}

