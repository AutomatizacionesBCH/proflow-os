'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Plus, Trash2, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  updatePlaybook, deletePlaybook,
  createPlaybookStep, updatePlaybookStep, deletePlaybookStep,
} from '@/app/playbooks/actions'
import { PlaybookForm } from './PlaybookForm'
import type {
  Playbook, PlaybookStep, AssignmentWithContext,
  PlaybookStepActionType,
} from '@/types/playbook.types'
import {
  CATEGORY_LABELS, CATEGORY_COLORS,
  SEGMENT_LABELS, ACTION_TYPE_LABELS, ACTION_TYPE_COLORS,
  ASSIGNMENT_STATUS_LABELS, ALL_ACTION_TYPES,
} from '@/types/playbook.types'

type Props = {
  playbook:    Playbook & { steps: PlaybookStep[] }
  assignments: AssignmentWithContext[]
}

// Paso en blanco por defecto
const EMPTY_STEP = {
  action_type:        '' as PlaybookStepActionType | '',
  channel:            '',
  timing_description: '',
  message_template:   '',
  expected_result:    '',
}

export function PlaybookDetail({ playbook: initialPb, assignments }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [pb, setPb]         = useState(initialPb)
  const [steps, setSteps]   = useState<PlaybookStep[]>(initialPb.steps)
  const [showEdit, setShowEdit]   = useState(false)
  const [showAddStep, setShowAddStep] = useState(false)
  const [editingStep, setEditingStep] = useState<PlaybookStep | null>(null)
  const [stepForm, setStepForm] = useState(EMPTY_STEP)
  const [stepError, setStepError] = useState<string | null>(null)
  const [isPending, startStepTransition] = useTransition()

  function openAddStep() {
    setEditingStep(null)
    setStepForm(EMPTY_STEP)
    setShowAddStep(true)
  }

  function openEditStep(step: PlaybookStep) {
    setEditingStep(step)
    setStepForm({
      action_type:        step.action_type ?? '',
      channel:            step.channel ?? '',
      timing_description: step.timing_description ?? '',
      message_template:   step.message_template ?? '',
      expected_result:    step.expected_result ?? '',
    })
    setShowAddStep(true)
  }

  function handleSaveStep() {
    startStepTransition(async () => {
      setStepError(null)
      if (!stepForm.action_type) { setStepError('Selecciona el tipo de acción'); return }

      const payload = {
        playbook_id:        pb.id,
        step_order:         editingStep?.step_order ?? (steps.length + 1),
        action_type:        (stepForm.action_type || null) as PlaybookStepActionType | null,
        channel:            stepForm.channel.trim()            || null,
        timing_description: stepForm.timing_description.trim() || null,
        message_template:   stepForm.message_template.trim()   || null,
        expected_result:    stepForm.expected_result.trim()     || null,
      }

      if (editingStep) {
        const res = await updatePlaybookStep(editingStep.id, payload)
        if (!res.success) { setStepError(res.error); return }
        setSteps(prev => prev.map(s => s.id === editingStep.id ? res.data : s))
      } else {
        const res = await createPlaybookStep(payload)
        if (!res.success) { setStepError(res.error); return }
        setSteps(prev => [...prev, res.data])
      }
      setShowAddStep(false)
      startTransition(() => router.refresh())
    })
  }

  async function handleDeleteStep(step: PlaybookStep) {
    if (!confirm(`¿Eliminar el paso ${step.step_order}?`)) return
    await deletePlaybookStep(step.id, pb.id)
    setSteps(prev => prev.filter(s => s.id !== step.id))
  }

  async function handleDeletePlaybook() {
    if (!confirm('¿Eliminar este playbook y todos sus pasos? Esta acción no se puede deshacer.')) return
    await deletePlaybook(pb.id)
    router.push('/playbooks')
  }

  return (
    <>
      {showEdit && (
        <PlaybookForm
          editing={pb}
          onClose={() => setShowEdit(false)}
          onSuccess={updated => {
            setPb(prev => ({ ...prev, ...updated }))
            setShowEdit(false)
            startTransition(() => router.refresh())
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/playbooks')}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-100">{pb.name}</h1>
              {pb.category && CATEGORY_LABELS[pb.category as keyof typeof CATEGORY_LABELS] && (
                <span className={cn('text-xs px-2 py-0.5 rounded-md border font-medium', CATEGORY_COLORS[pb.category as keyof typeof CATEGORY_COLORS])}>
                  {CATEGORY_LABELS[pb.category as keyof typeof CATEGORY_LABELS]}
                </span>
              )}
              {pb.target_segment && SEGMENT_LABELS[pb.target_segment as keyof typeof SEGMENT_LABELS] && (
                <span className="text-xs px-2 py-0.5 rounded-md border border-slate-700 text-slate-400">
                  {SEGMENT_LABELS[pb.target_segment as keyof typeof SEGMENT_LABELS]}
                </span>
              )}
            </div>
            {pb.trigger_condition && (
              <p className="text-xs text-slate-600 mt-0.5 italic">Cuando: {pb.trigger_condition}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDeletePlaybook}
            className="p-1.5 text-slate-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 border border-slate-700 hover:border-slate-600 rounded-md transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Editar
          </button>
        </div>
      </div>

      {/* Descripción */}
      {pb.description && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400 leading-relaxed">{pb.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda: pasos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">
                Pasos
                <span className="ml-2 text-xs text-slate-500 font-normal">({steps.length})</span>
              </h2>
              <button
                onClick={openAddStep}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md px-2.5 py-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Agregar paso
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Sin pasos aún. Agrega el primero.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {steps
                  .slice()
                  .sort((a, b) => a.step_order - b.step_order)
                  .map(step => (
                    <div key={step.id} className="px-5 py-4 group hover:bg-slate-800/20 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Número */}
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-400">
                          {step.step_order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {step.action_type && (
                              <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium', ACTION_TYPE_COLORS[step.action_type])}>
                                {ACTION_TYPE_LABELS[step.action_type]}
                              </span>
                            )}
                            {step.channel && (
                              <span className="text-[10px] text-slate-500">via {step.channel}</span>
                            )}
                          </div>
                          {step.timing_description && (
                            <p className="text-xs text-amber-400/80 mt-1">⏱ {step.timing_description}</p>
                          )}
                          {step.message_template && (
                            <p className="text-xs text-slate-400 mt-1.5 bg-slate-800/50 rounded-md px-3 py-2 leading-relaxed line-clamp-3 italic">
                              &ldquo;{step.message_template}&rdquo;
                            </p>
                          )}
                          {step.expected_result && (
                            <p className="text-xs text-slate-500 mt-1.5 flex items-start gap-1">
                              <ChevronRight className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                              {step.expected_result}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditStep(step)}
                            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteStep(step)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: asignaciones */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-200">
                Asignaciones
                <span className="ml-2 text-xs text-slate-500 font-normal">({assignments.length})</span>
              </h2>
            </div>
            {assignments.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">Sin asignaciones activas</div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {assignments.map(a => (
                  <div key={a.id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">
                        {a.assigned_to ?? (a.lead_id ? 'Lead' : 'Cliente')}
                      </span>
                      <AssignmentBadge status={a.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full',
                            a.status === 'completed' ? 'bg-green-500' :
                            a.status === 'paused'    ? 'bg-amber-500' : 'bg-blue-500'
                          )}
                          style={{ width: `${a.total_steps > 0 ? Math.round(((a.current_step - 1) / a.total_steps) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono whitespace-nowrap">
                        {a.current_step}/{a.total_steps}
                      </span>
                    </div>
                    {a.current_step_data?.action_type && (
                      <p className="text-[10px] text-slate-600 mt-1">
                        Siguiente: {ACTION_TYPE_LABELS[a.current_step_data.action_type]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal agregar/editar paso */}
      {showAddStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddStep(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 rounded-xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200">
                {editingStep ? `Editar paso ${editingStep.step_order}` : 'Agregar paso'}
              </h3>
              <button onClick={() => setShowAddStep(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {stepError && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{stepError}</p>
              )}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Tipo de acción <span className="text-red-400">*</span></label>
                <select
                  value={stepForm.action_type}
                  onChange={e => setStepForm(f => ({ ...f, action_type: e.target.value as PlaybookStepActionType }))}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="">Selecciona...</option>
                  {ALL_ACTION_TYPES.map(t => (
                    <option key={t} value={t}>{ACTION_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Canal</label>
                <input
                  type="text"
                  value={stepForm.channel}
                  onChange={e => setStepForm(f => ({ ...f, channel: e.target.value }))}
                  placeholder="Ej: WhatsApp, Email, Teléfono..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Timing / Cuándo ejecutar</label>
                <input
                  type="text"
                  value={stepForm.timing_description}
                  onChange={e => setStepForm(f => ({ ...f, timing_description: e.target.value }))}
                  placeholder="Ej: En menos de 2 horas, 48h después..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Plantilla de mensaje</label>
                <textarea
                  rows={3}
                  value={stepForm.message_template}
                  onChange={e => setStepForm(f => ({ ...f, message_template: e.target.value }))}
                  placeholder="Texto a enviar al lead/cliente..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Resultado esperado</label>
                <input
                  type="text"
                  value={stepForm.expected_result}
                  onChange={e => setStepForm(f => ({ ...f, expected_result: e.target.value }))}
                  placeholder="¿Qué debería pasar después de este paso?"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-800">
              <button
                onClick={() => setShowAddStep(false)}
                className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-md hover:border-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveStep}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
              >
                {isPending ? 'Guardando…' : editingStep ? 'Guardar cambios' : 'Agregar paso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function AssignmentBadge({ status }: { status: string }) {
  const cls =
    status === 'in_progress' ? 'bg-blue-900/40 text-blue-400' :
    status === 'completed'   ? 'bg-green-900/40 text-green-400' :
    status === 'paused'      ? 'bg-amber-900/40 text-amber-400' :
                               'bg-slate-800 text-slate-500'
  return (
    <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium', cls)}>
      {ASSIGNMENT_STATUS_LABELS[status as keyof typeof ASSIGNMENT_STATUS_LABELS] ?? status}
    </span>
  )
}
