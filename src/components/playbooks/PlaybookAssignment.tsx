'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, X, CheckCircle2, Pause, XCircle, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { assignPlaybook, completeStep, updateAssignmentStatus } from '@/app/playbooks/actions'
import type { Playbook, AssignmentWithContext } from '@/types/playbook.types'
import {
  CATEGORY_LABELS, CATEGORY_COLORS,
  ACTION_TYPE_LABELS, ASSIGNMENT_STATUS_LABELS,
} from '@/types/playbook.types'

type Props = {
  leadId?:             string
  clientId?:           string
  initialAssignments:  AssignmentWithContext[]
  allPlaybooks:        Playbook[]
}

export function PlaybookAssignment({ leadId, clientId, initialAssignments, allPlaybooks }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [assignments, setAssignments] = useState<AssignmentWithContext[]>(initialAssignments)
  const [showModal, setShowModal]     = useState(false)
  const [selectedPb, setSelectedPb]  = useState('')
  const [assignedTo, setAssignedTo]  = useState('')
  const [notes, setNotes]            = useState('')
  const [error, setError]            = useState<string | null>(null)

  function handleAssign() {
    if (!selectedPb) { setError('Selecciona un playbook'); return }
    startTransition(async () => {
      setError(null)
      const res = await assignPlaybook({
        playbook_id: selectedPb,
        lead_id:     leadId,
        client_id:   clientId,
        assigned_to: assignedTo.trim() || undefined,
        notes:       notes.trim()      || undefined,
      })
      if (!res.success) { setError(res.error); return }

      const pb = allPlaybooks.find(p => p.id === selectedPb)
      if (pb) {
        const newAssignment: AssignmentWithContext = {
          ...res.data,
          playbook:          pb,
          total_steps:       0,
          current_step_data: null,
        }
        setAssignments(prev => [newAssignment, ...prev])
      }
      setShowModal(false)
      setSelectedPb('')
      setAssignedTo('')
      setNotes('')
      router.refresh()
    })
  }

  async function handleCompleteStep(assignmentId: string) {
    startTransition(async () => {
      await completeStep(assignmentId)
      router.refresh()
      // Actualizar local: incrementar o completar
      setAssignments(prev => prev.map(a => {
        if (a.id !== assignmentId) return a
        const isLast = a.current_step >= a.total_steps
        return isLast
          ? { ...a, status: 'completed' as const }
          : { ...a, current_step: a.current_step + 1 }
      }))
    })
  }

  async function handleStatus(assignmentId: string, status: 'paused' | 'cancelled' | 'in_progress') {
    startTransition(async () => {
      await updateAssignmentStatus(assignmentId, status)
      setAssignments(prev => prev.map(a =>
        a.id === assignmentId ? { ...a, status } : a
      ))
      router.refresh()
    })
  }

  const activeAssignments = assignments.filter(a => a.status !== 'cancelled')

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200">Playbooks asignados</h2>
          {activeAssignments.length > 0 && (
            <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-md">
              {activeAssignments.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-slate-100 rounded-md transition-colors"
        >
          <Plus className="w-3 h-3" />
          Asignar playbook
        </button>
      </div>

      {activeAssignments.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm">
          Sin playbooks asignados.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {activeAssignments.map(a => {
            const pct = a.total_steps > 0
              ? Math.round(((a.current_step - 1) / a.total_steps) * 100)
              : 0

            return (
              <div key={a.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Nombre + categoría */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">{a.playbook?.name ?? '—'}</span>
                      {a.playbook?.category && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', CATEGORY_COLORS[a.playbook.category as keyof typeof CATEGORY_COLORS])}>
                          {CATEGORY_LABELS[a.playbook.category as keyof typeof CATEGORY_LABELS]}
                        </span>
                      )}
                      <StatusBadge status={a.status} />
                    </div>

                    {/* Paso actual */}
                    <p className="text-xs text-slate-500 mt-1">
                      Paso {a.current_step} de {a.total_steps}
                      {a.current_step_data?.action_type && (
                        <span className="ml-1 text-slate-400">
                          · {ACTION_TYPE_LABELS[a.current_step_data.action_type]}
                        </span>
                      )}
                    </p>

                    {/* Timing del paso actual */}
                    {a.current_step_data?.timing_description && (
                      <p className="text-[10px] text-amber-400/70 mt-0.5">
                        ⏱ {a.current_step_data.timing_description}
                      </p>
                    )}

                    {/* Barra de progreso */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all',
                            a.status === 'completed' ? 'bg-green-500' :
                            a.status === 'paused'    ? 'bg-amber-500' : 'bg-blue-500'
                          )}
                          style={{ width: `${a.status === 'completed' ? 100 : pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono">{pct}%</span>
                    </div>

                    {/* Mensaje plantilla del paso actual */}
                    {a.current_step_data?.message_template && a.status === 'in_progress' && (
                      <p className="text-[10px] text-slate-500 mt-2 bg-slate-800/50 rounded px-2 py-1.5 leading-relaxed line-clamp-2 italic">
                        &ldquo;{a.current_step_data.message_template}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Botones de acción */}
                {a.status !== 'completed' && a.status !== 'cancelled' && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {a.status === 'in_progress' && (
                      <button
                        onClick={() => handleCompleteStep(a.id)}
                        disabled={isPending}
                        className="flex items-center gap-1 text-xs text-green-400 border border-green-500/30 hover:border-green-500/50 rounded-md px-2.5 py-1 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Completar paso {a.current_step}
                      </button>
                    )}
                    {a.status === 'in_progress' && (
                      <button
                        onClick={() => handleStatus(a.id, 'paused')}
                        disabled={isPending}
                        className="flex items-center gap-1 text-xs text-amber-400 border border-amber-500/30 hover:border-amber-500/50 rounded-md px-2.5 py-1 transition-colors disabled:opacity-50"
                      >
                        <Pause className="w-3 h-3" />
                        Pausar
                      </button>
                    )}
                    {a.status === 'paused' && (
                      <button
                        onClick={() => handleStatus(a.id, 'in_progress')}
                        disabled={isPending}
                        className="flex items-center gap-1 text-xs text-blue-400 border border-blue-500/30 hover:border-blue-500/50 rounded-md px-2.5 py-1 transition-colors disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        Reanudar
                      </button>
                    )}
                    <button
                      onClick={() => handleStatus(a.id, 'cancelled')}
                      disabled={isPending}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-md px-2.5 py-1 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3 h-3" />
                      Cancelar
                    </button>
                  </div>
                )}

                {a.status === 'completed' && (
                  <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Playbook completado
                    {a.completed_at && ` · ${new Date(a.completed_at).toLocaleDateString('es-CL')}`}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de asignación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); setError(null) }} />
          <div className="relative w-full max-w-md bg-slate-900 rounded-xl border border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200">Asignar playbook</h3>
              <button onClick={() => { setShowModal(false); setError(null) }} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{error}</p>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-2">Seleccionar playbook</label>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {allPlaybooks.filter(p => p.status === 'active').map(pb => (
                    <button
                      key={pb.id}
                      onClick={() => setSelectedPb(pb.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-colors',
                        selectedPb === pb.id
                          ? 'border-blue-500/40 bg-blue-500/5'
                          : 'border-slate-700 hover:border-slate-600'
                      )}
                    >
                      <p className="text-sm text-slate-200 font-medium">{pb.name}</p>
                      {pb.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{pb.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Asignar a</label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  placeholder="Magda, Alberto..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Notas (opcional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Contexto adicional..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-800">
              <button
                onClick={() => { setShowModal(false); setError(null) }}
                className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-md hover:border-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssign}
                disabled={isPending || !selectedPb}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
              >
                {isPending ? 'Asignando…' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'in_progress' ? 'bg-blue-900/40 text-blue-400' :
    status === 'completed'   ? 'bg-green-900/40 text-green-400' :
    status === 'paused'      ? 'bg-amber-900/40 text-amber-400' :
                               'bg-slate-800 text-slate-500'
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', cls)}>
      {ASSIGNMENT_STATUS_LABELS[status as keyof typeof ASSIGNMENT_STATUS_LABELS] ?? status}
    </span>
  )
}
