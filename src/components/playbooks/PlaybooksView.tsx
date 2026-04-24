'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deletePlaybook } from '@/app/playbooks/actions'
import { PlaybookForm } from './PlaybookForm'
import type { Playbook, AssignmentWithContext, PlaybookCategory, PlaybookTargetSegment } from '@/types/playbook.types'
import {
  CATEGORY_LABELS, CATEGORY_COLORS,
  SEGMENT_LABELS, ALL_CATEGORIES,
} from '@/types/playbook.types'

type Props = {
  initialPlaybooks:   Playbook[]
  initialAssignments: AssignmentWithContext[]
}

export function PlaybooksView({ initialPlaybooks, initialAssignments }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [playbooks, setPlaybooks]     = useState<Playbook[]>(initialPlaybooks)
  const [showForm, setShowForm]       = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<PlaybookCategory | 'todos'>('todos')
  const [segmentFilter, setSegmentFilter]   = useState<PlaybookTargetSegment | 'todos'>('todos')

  // Conteo de asignaciones activas por playbook
  const activeCountMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const a of initialAssignments) {
      if (a.status === 'in_progress') {
        m[a.playbook_id] = (m[a.playbook_id] ?? 0) + 1
      }
    }
    return m
  }, [initialAssignments])

  const filtered = useMemo(() => playbooks.filter(pb => {
    if (categoryFilter !== 'todos' && pb.category !== categoryFilter) return false
    if (segmentFilter  !== 'todos' && pb.target_segment !== segmentFilter) return false
    return true
  }), [playbooks, categoryFilter, segmentFilter])

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este playbook? Esta acción no se puede deshacer.')) return
    await deletePlaybook(id)
    setPlaybooks(prev => prev.filter(p => p.id !== id))
    startTransition(() => router.refresh())
  }

  return (
    <>
      {showForm && (
        <PlaybookForm
          onClose={() => setShowForm(false)}
          onSuccess={pb => {
            setPlaybooks(prev => [pb, ...prev])
            setShowForm(false)
            startTransition(() => router.refresh())
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{playbooks.length} playbooks · {initialAssignments.filter(a => a.status === 'in_progress').length} asignaciones activas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo playbook
        </button>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ALL_CATEGORIES.slice(0, 4).map(cat => {
          const count = playbooks.filter(p => p.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(prev => prev === cat ? 'todos' : cat)}
              className={cn(
                'text-left p-3 rounded-xl border transition-all',
                categoryFilter === cat
                  ? 'border-blue-500/30 bg-blue-500/5'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700'
              )}
            >
              <p className="text-lg font-bold text-slate-100">{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{CATEGORY_LABELS[cat]}</p>
            </button>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-600">Categoría:</span>
        <button
          onClick={() => setCategoryFilter('todos')}
          className={cn('px-3 py-1 text-xs rounded-md border transition-colors',
            categoryFilter === 'todos'
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
              : 'text-slate-400 border-slate-700 hover:border-slate-600'
          )}
        >
          Todas
        </button>
        {ALL_CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategoryFilter(prev => prev === c ? 'todos' : c)}
            className={cn('px-3 py-1 text-xs rounded-md border transition-colors',
              categoryFilter === c
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                : 'text-slate-400 border-slate-700 hover:border-slate-600'
            )}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Grid de playbooks */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-12 text-center">
          <BookOpen className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hay playbooks con esos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(pb => {
            const activeCount = activeCountMap[pb.id] ?? 0
            return (
              <div
                key={pb.id}
                className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col gap-3 transition-colors"
              >
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {pb.category && (
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-md border font-medium', CATEGORY_COLORS[pb.category as PlaybookCategory])}>
                      {CATEGORY_LABELS[pb.category as PlaybookCategory]}
                    </span>
                  )}
                  {pb.target_segment && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md border border-slate-700 text-slate-400">
                      {SEGMENT_LABELS[pb.target_segment as PlaybookTargetSegment]}
                    </span>
                  )}
                </div>

                {/* Nombre */}
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-100">{pb.name}</h3>
                  {pb.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{pb.description}</p>
                  )}
                </div>

                {/* Trigger */}
                {pb.trigger_condition && (
                  <p className="text-[10px] text-slate-600 italic line-clamp-1">
                    Cuando: {pb.trigger_condition}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {activeCount > 0 && (
                      <span className="text-green-400 font-medium">{activeCount} activa{activeCount !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(pb.id)}
                      className="p-1 text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/playbooks/${pb.id}`}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Ver detalle
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Asignaciones recientes */}
      {initialAssignments.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200">Asignaciones recientes</h3>
          </div>
          <div className="divide-y divide-slate-800/50">
            {initialAssignments.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-slate-200 font-medium">{a.playbook?.name ?? '—'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Paso {a.current_step} de {a.total_steps}
                    {a.assigned_to && ` · ${a.assigned_to}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Barra de progreso */}
                  <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        a.status === 'completed' ? 'bg-green-500' :
                        a.status === 'paused'    ? 'bg-amber-500' : 'bg-blue-500'
                      )}
                      style={{ width: `${a.total_steps > 0 ? Math.round(((a.current_step - 1) / a.total_steps) * 100) : 0}%` }}
                    />
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'in_progress' ? 'bg-blue-900/40 text-blue-400' :
    status === 'completed'   ? 'bg-green-900/40 text-green-400' :
    status === 'paused'      ? 'bg-amber-900/40 text-amber-400' :
                               'bg-slate-800 text-slate-500'
  const labels: Record<string, string> = {
    in_progress: 'En progreso',
    completed:   'Completado',
    paused:      'Pausado',
    cancelled:   'Cancelado',
  }
  return <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium', cls)}>{labels[status] ?? status}</span>
}
