'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Company, EmpresaStatus } from '@/types'
import { EmpresaStatusBadge } from './EmpresaStatusBadge'
import { EmpresaForm } from './EmpresaForm'

const STATUS_FILTERS: { value: EmpresaStatus | 'todos'; label: string }[] = [
  { value: 'todos',     label: 'Todas' },
  { value: 'activo',    label: 'Activo' },
  { value: 'pausado',   label: 'Pausado' },
  { value: 'en_riesgo', label: 'En riesgo' },
]

type Props = { initialEmpresas: Company[] }

export function EmpresasView({ initialEmpresas }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<Company | undefined>(undefined)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<EmpresaStatus | 'todos'>('todos')

  const filtered = useMemo(() => {
    return initialEmpresas.filter(e => {
      if (statusFilter !== 'todos' && e.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !e.name.toLowerCase().includes(q) &&
          !(e.legal_name?.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
  }, [initialEmpresas, statusFilter, search])

  const stats = useMemo(() => ({
    total:    initialEmpresas.length,
    activas:  initialEmpresas.filter(e => e.status === 'activo').length,
    pausadas: initialEmpresas.filter(e => e.status === 'pausado').length,
    riesgo:   initialEmpresas.filter(e => e.status === 'en_riesgo').length,
  }), [initialEmpresas])

  function handleSuccess() {
    setShowForm(false)
    setEditing(undefined)
    startTransition(() => router.refresh())
  }

  function openEdit(e: Company, ev: React.MouseEvent) {
    ev.stopPropagation()
    setEditing(e)
    setShowForm(true)
  }

  function openCreate() {
    setEditing(undefined)
    setShowForm(true)
  }

  return (
    <>
      {showForm && (
        <EmpresaForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSuccess={handleSuccess}
          editing={editing}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatBox label="Total empresas"  value={String(stats.total)} />
        <StatBox label="Activas"         value={String(stats.activas)} positive />
        <StatBox label="Pausadas"        value={String(stats.pausadas)} warn={stats.pausadas > 0} />
        <StatBox label="En riesgo"       value={String(stats.riesgo)}  danger={stats.riesgo > 0} />
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 focus-within:border-slate-600 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por nombre comercial o razón social..."
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
            Nueva empresa
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
                  ({initialEmpresas.filter(e => e.status === s.value).length})
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
                {['Nombre comercial', 'Razón social', 'Estado', 'Notas', 'Registrada', 'Acciones'].map(h => (
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
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {initialEmpresas.length === 0
                          ? 'No hay empresas aún. Crea la primera.'
                          : 'Ninguna empresa coincide con los filtros.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(empresa => (
                  <tr
                    key={empresa.id}
                    className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="font-medium text-slate-200">{empresa.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {empresa.legal_name || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <EmpresaStatusBadge status={empresa.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs max-w-xs">
                      <span className="line-clamp-1">{empresa.notes || '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                      {new Date(empresa.created_at).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={ev => openEdit(empresa, ev)}
                        className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md px-2 py-1 transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              {filtered.length} empresa{filtered.length !== 1 ? 's' : ''} mostradas
              {filtered.length !== initialEmpresas.length && ` de ${initialEmpresas.length}`}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

function StatBox({
  label, value, positive, warn, danger,
}: {
  label: string; value: string; positive?: boolean; warn?: boolean; danger?: boolean
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={cn(
        'text-xl font-bold font-mono',
        positive ? 'text-green-400' :
        danger   ? 'text-red-400'   :
        warn     ? 'text-amber-400' :
        'text-slate-100'
      )}>
        {value}
      </p>
    </div>
  )
}
