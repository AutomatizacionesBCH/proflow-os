'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Processor, ProcessorStatus, Company } from '@/types'
import { ProcesadorStatusBadge } from './ProcesadorStatusBadge'
import { ProcesadorForm } from './ProcesadorForm'
import { KpiBox } from '@/components/ui/KpiBox'

const STATUS_FILTERS: { value: ProcessorStatus | 'todos'; label: string }[] = [
  { value: 'todos',     label: 'Todos' },
  { value: 'activo',    label: 'Activo' },
  { value: 'pausado',   label: 'Pausado' },
  { value: 'en_riesgo', label: 'En riesgo' },
]

type Props = {
  initialProcesadores: Processor[]
  companies: Pick<Company, 'id' | 'name'>[]
  dailyUsage: Record<string, number>
}

export function ProcesadoresView({ initialProcesadores, companies, dailyUsage }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<Processor | undefined>(undefined)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<ProcessorStatus | 'todos'>('todos')

  const companyMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of companies) m[c.id] = c.name
    return m
  }, [companies])

  const filtered = useMemo(() => {
    return initialProcesadores.filter(p => {
      if (statusFilter !== 'todos' && p.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const empresa = p.company_id ? (companyMap[p.company_id] ?? '').toLowerCase() : ''
        if (
          !p.name.toLowerCase().includes(q) &&
          !(p.type?.toLowerCase().includes(q)) &&
          !empresa.includes(q)
        ) return false
      }
      return true
    })
  }, [initialProcesadores, statusFilter, search, companyMap])

  const stats = useMemo(() => ({
    total:    initialProcesadores.length,
    activos:  initialProcesadores.filter(p => p.status === 'activo').length,
    pausados: initialProcesadores.filter(p => p.status === 'pausado').length,
    riesgo:   initialProcesadores.filter(p => p.status === 'en_riesgo').length,
  }), [initialProcesadores])

  function handleSuccess() {
    setShowForm(false)
    setEditing(undefined)
    startTransition(() => router.refresh())
  }

  function openEdit(p: Processor, ev: React.MouseEvent) {
    ev.stopPropagation()
    setEditing(p)
    setShowForm(true)
  }

  function openCreate() {
    setEditing(undefined)
    setShowForm(true)
  }

  return (
    <>
      {showForm && (
        <ProcesadorForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSuccess={handleSuccess}
          editing={editing}
          companies={companies}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiBox label="Total procesadores" value={String(stats.total)} />
        <KpiBox label="Activos"            value={String(stats.activos)} positive={stats.activos > 0} />
        <KpiBox label="Pausados"           value={String(stats.pausados)} warn={stats.pausados > 0} />
        <KpiBox label="En riesgo"          value={String(stats.riesgo)} danger={stats.riesgo > 0} />
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 focus-within:border-slate-600 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por nombre, tipo o empresa..."
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nuevo procesador
          </button>
        </div>

        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <Filter className="w-3 h-3 text-slate-600 mr-1" />
          {STATUS_FILTERS.map(s => (
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
              {s.value !== 'todos' && (
                <span className="ml-1.5 text-slate-500">
                  ({initialProcesadores.filter(p => p.status === s.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Procesador', 'Empresa', 'Tipo', 'Estado', 'Límite diario / Uso hoy', 'Registrado', 'Acciones'].map(h => (
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
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {initialProcesadores.length === 0
                          ? 'No hay procesadores aún. Crea el primero.'
                          : 'Ningún procesador coincide con los filtros.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(proc => {
                  const used  = dailyUsage[proc.id] ?? 0
                  const limit = proc.daily_limit_usd
                  const pct   = limit && limit > 0 ? Math.min((used / limit) * 100, 100) : null

                  return (
                    <tr
                      key={proc.id}
                      className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <Activity className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                          <span className="font-medium text-slate-200">{proc.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {proc.company_id ? (companyMap[proc.company_id] ?? '—') : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {proc.type || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <ProcesadorStatusBadge status={proc.status} />
                      </td>
                      <td className="py-3 px-4 min-w-[180px]">
                        {limit != null ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className={cn(
                                pct !== null && pct >= 90 ? 'text-red-400' :
                                pct !== null && pct >= 70 ? 'text-amber-400' :
                                'text-slate-300'
                              )}>
                                ${used.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              </span>
                              <span className="text-slate-500">
                                / ${limit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  pct !== null && pct >= 90 ? 'bg-red-500' :
                                  pct !== null && pct >= 70 ? 'bg-amber-500' :
                                  'bg-blue-500'
                                )}
                                style={{ width: `${pct ?? 0}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">Sin límite</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                        {new Date(proc.created_at).toLocaleDateString('es-CL')}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={ev => openEdit(proc, ev)}
                          className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md px-2 py-1 transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              {filtered.length} procesador{filtered.length !== 1 ? 'es' : ''} mostrados
              {filtered.length !== initialProcesadores.length && ` de ${initialProcesadores.length}`}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

