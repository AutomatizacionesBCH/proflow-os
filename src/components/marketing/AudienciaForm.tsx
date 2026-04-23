'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Audience } from '@/types'
import {
  createAudiencia,
  updateAudiencia,
  type AudienciaInput,
} from '@/app/marketing/audiencias-actions'

const inputCls = 'w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors'
const labelCls = 'block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5'

function Field({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className={labelCls}>{title}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  )
}

type FormValues = { name: string; description: string; member_count: string }

function init(editing?: Audience): FormValues {
  if (editing) return { name: editing.name, description: editing.description ?? '', member_count: String(editing.member_count) }
  return { name: '', description: '', member_count: '0' }
}

type Props = { onClose: () => void; onSuccess: () => void; editing?: Audience }

export function AudienciaForm({ onClose, onSuccess, editing }: Props) {
  const [form, setForm]   = useState<FormValues>(() => init(editing))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isPredefined = !!(editing?.rules_json)

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    const count = parseInt(form.member_count) || 0
    setError(null)

    const input: AudienciaInput = {
      name:         form.name.trim(),
      description:  form.description.trim(),
      member_count: count,
    }

    startTransition(async () => {
      const result = editing
        ? await updateAudiencia(editing.id, input)
        : await createAudiencia(input)
      if (!result.success) { setError(result.error ?? 'Error desconocido'); return }
      onSuccess()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              {editing ? 'Editar audiencia' : 'Nueva audiencia'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editing ? 'Modificar datos de la audiencia' : 'Crear segmento de contactos'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {isPredefined && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2.5">
              <p className="text-xs text-blue-400">Audiencia predefinida — el conteo se actualiza automáticamente con "Actualizar conteos".</p>
            </div>
          )}

          <Field title="Nombre *">
            <input
              type="text"
              className={inputCls}
              placeholder="Ej: Clientes VIP inactivos"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </Field>

          <Field title="Descripción">
            <textarea
              className={cn(inputCls, 'resize-none h-20')}
              placeholder="Describe el criterio de segmentación..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </Field>

          {!isPredefined && (
            <Field title="Miembros" hint="Cantidad estimada de contactos en esta audiencia">
              <input
                type="number"
                min="0"
                className={inputCls}
                value={form.member_count}
                onChange={e => set('member_count', e.target.value)}
              />
            </Field>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 flex-shrink-0">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50">
            {isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear audiencia'}
          </button>
        </div>
      </div>
    </div>
  )
}
