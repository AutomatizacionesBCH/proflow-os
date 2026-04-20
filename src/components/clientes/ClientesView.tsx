'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Cliente, ClientTag, Company, Processor } from '@/types'
import { ClienteTagBadge } from './ClienteTagBadge'
import { ClienteForm } from './ClienteForm'

const ALL_TAGS: (ClientTag | 'todos')[] = ['todos', 'VIP', 'frecuente', 'nuevo', 'riesgo', 'pausado']

type Props = {
  initialClientes: Cliente[]
  companies: Company[]
  processors: Processor[]
}

export function ClientesView({ initialClientes, companies, processors }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Cliente | undefined>(undefined)
  const [search, setSearch]         = useState('')
  const [tagFilter, setTagFilter]   = useState<ClientTag | 'todos'>('todos')

  const companyMap = useMemo(
    () => Object.fromEntries(companies.map(c => [c.id, c.name])),
    [companies]
  )
  const processorMap = useMemo(
    () => Object.fromEntries(processors.map(p => [p.id, p.name])),
    [processors]
  )

  const filtered = useMemo(() => {
    return initialClientes.filter(c => {
      if (tagFilter !== 'todos' && !c.tags.includes(tagFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !c.full_name.toLowerCase().includes(q) &&
          !(c.email?.toLowerCase().includes(q)) &&
          !(c.document_id?.toLowerCase().includes(q)) &&
          !(c.phone?.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
  }, [initialClientes, tagFilter, search])

  const stats = useMemo(() => ({
    total:     initialClientes.length,
    vip:       initialClientes.filter(c => c.tags.includes('VIP')).length,
    nuevos:    initialClientes.filter(c => c.tags.includes('nuevo')).length,
    riesgo:    initialClientes.filter(c => c.tags.includes('riesgo')).length,
  }), [initialClientes])

  function handleSuccess() {
    setShowForm(false)
    setEditing(undefined)
    startTransition(() => router.refresh())
  }

  function openEdit(c: Cliente, e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(c)
    setShowForm(true)
  }

  function openCreate() {
    setEditing(undefined)
    setShowForm(true)
  }

  return (
    <>
      {showForm && (
        <ClienteForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSuccess={handleSuccess}
          companies={companies}
          processors={processors}
          editing={editing}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatBox label="Total clientes" value={String(stats.total)} />
        <StatBox label="VIP" value={String(stats.vip)} highlight />
        <StatBox label="Nuevos" value={String(stats.nuevos)} positive />
        <StatBox label="En riesgo" value={String(stats.riesgo)} warn={stats.riesgo > 0} />
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 focus-within:border-slate-600 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por nombre, email, RUT, teléfono..."
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
            Nuevo cliente
          </button>
        </div>

        {/* Filtros por tag */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <Filter className="w-3 h-3 text-slate-600 mr-1" />
          {ALL_TAGS.map(t => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={cn(
                'px-3 py-1 text-xs rounded-md border transition-colors',
                tagFilter === t
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                  : 'text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
              )}
            >
              {t === 'todos' ? 'Todos' : t}
              {t !== 'todos' && (
                <span className="ml-1.5 text-slate-500">
                  ({initialClientes.filter(c => c.tags.includes(t as ClientTag)).length})
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
                {['Cliente', 'Documento', 'Email', 'Teléfono', 'Empresa', 'Procesador', 'Etiquetas', 'Acciones'].map(h => (
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
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {initialClientes.length === 0
                          ? 'No hay clientes aún. Crea el primero.'
                          : 'Ningún cliente coincide con los filtros.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/clientes/${c.id}`)}
                    className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-slate-300">
                            {c.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-slate-200">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                      {c.document_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{c.email || '—'}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">{c.phone || '—'}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {c.assigned_company_id ? (companyMap[c.assigned_company_id] ?? c.assigned_company_id) : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {c.assigned_processor_id ? (processorMap[c.assigned_processor_id] ?? c.assigned_processor_id) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.length > 0
                          ? c.tags.map(tag => <ClienteTagBadge key={tag} tag={tag} />)
                          : <span className="text-slate-600 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={e => openEdit(c, e)}
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
              {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} mostrados
              {filtered.length !== initialClientes.length && ` de ${initialClientes.length}`}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

function StatBox({
  label, value, highlight, positive, warn,
}: {
  label: string; value: string; highlight?: boolean; positive?: boolean; warn?: boolean
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={cn(
        'text-xl font-bold font-mono',
        highlight  ? 'text-purple-400' :
        positive   ? 'text-green-400'  :
        warn       ? 'text-amber-400'  :
        'text-slate-100'
      )}>
        {value}
      </p>
    </div>
  )
}
