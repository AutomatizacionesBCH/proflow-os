'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPlaybook, updatePlaybook } from '@/app/playbooks/actions'
import type { Playbook, PlaybookCategory, PlaybookTargetSegment } from '@/types/playbook.types'
import {
  CATEGORY_LABELS, SEGMENT_LABELS,
  ALL_CATEGORIES, ALL_SEGMENTS,
} from '@/types/playbook.types'

type Props = {
  onClose:   () => void
  onSuccess: (pb: Playbook) => void
  editing?:  Playbook
}

export function PlaybookForm({ onClose, onSuccess, editing }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name,      setName]      = useState(editing?.name              ?? '')
  const [category,  setCategory]  = useState<PlaybookCategory | ''>(editing?.category  ?? '')
  const [segment,   setSegment]   = useState<PlaybookTargetSegment | ''>(editing?.target_segment ?? '')
  const [trigger,   setTrigger]   = useState(editing?.trigger_condition ?? '')
  const [desc,      setDesc]      = useState(editing?.description       ?? '')

  function handleSubmit() {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    startTransition(async () => {
      setError(null)
      const payload = {
        name:              name.trim(),
        category:          (category  || null) as PlaybookCategory | null,
        target_segment:    (segment   || null) as PlaybookTargetSegment | null,
        trigger_condition: trigger.trim() || null,
        description:       desc.trim()    || null,
        status:            editing?.status ?? 'active',
      }
      const res = editing
        ? await updatePlaybook(editing.id, payload)
        : await createPlaybook(payload)

      if (!res.success) { setError(res.error); return }
      onSuccess(res.data)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 rounded-xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">
            {editing ? 'Editar playbook' : 'Nuevo playbook'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Nombre <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Lead Caliente, VIP Dormido..."
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Categoría</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as PlaybookCategory | '')}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500"
              >
                <option value="">Sin categoría</option>
                {ALL_CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Segmento objetivo</label>
              <select
                value={segment}
                onChange={e => setSegment(e.target.value as PlaybookTargetSegment | '')}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500"
              >
                <option value="">Sin segmento</option>
                {ALL_SEGMENTS.map(s => (
                  <option key={s} value={s}>{SEGMENT_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Condición de activación</label>
            <input
              type="text"
              value={trigger}
              onChange={e => setTrigger(e.target.value)}
              placeholder="Ej: heat_score >= 80 o priority_label = hot"
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Descripción</label>
            <textarea
              rows={3}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Describe el objetivo de este playbook..."
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-md hover:border-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50',
              editing ? 'bg-slate-600 hover:bg-slate-500' : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear playbook'}
          </button>
        </div>
      </div>
    </div>
  )
}
