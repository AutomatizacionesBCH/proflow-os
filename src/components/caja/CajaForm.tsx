'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CashPosition } from '@/types'
import { createCashPosition, updateCashPosition, type CashPositionInput } from '@/app/caja/actions'

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

type Props = {
  onClose: () => void
  onSuccess: () => void
  editing?: CashPosition
}

type FormValues = {
  date: string
  available_clp: string
  notes: string
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function initialValues(editing?: CashPosition): FormValues {
  if (editing) {
    return {
      date:          editing.date,
      available_clp: String(editing.available_clp),
      notes:         editing.notes ?? '',
    }
  }
  return { date: todayISO(), available_clp: '', notes: '' }
}

export function CajaForm({ onClose, onSuccess, editing }: Props) {
  const [form, setForm]   = useState<FormValues>(() => initialValues(editing))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date) { setError('La fecha es obligatoria.'); return }
    const clp = parseFloat(form.available_clp)
    if (!form.available_clp || isNaN(clp) || clp < 0) {
      setError('Ingresa un monto válido en CLP.')
      return
    }
    setError(null)

    const input: CashPositionInput = {
      date:          form.date,
      available_clp: clp,
      notes:         form.notes.trim(),
    }

    startTransition(async () => {
      const result = editing
        ? await updateCashPosition(editing.id, input)
        : await createCashPosition(input)
      if (!result.success) { setError(result.error); return }
      onSuccess()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative ml-auto w-full max-w-md bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              {editing ? 'Editar registro' : 'Nuevo registro de caja'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editing ? `Modificar posición del ${new Date(editing.date + 'T12:00:00').toLocaleDateString('es-CL')}` : 'Registrar posición de caja disponible'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <Field title="Fecha *">
            <input
              type="date"
              className={cn(inputCls, 'text-slate-300')}
              value={form.date}
              onChange={e => set('date', e.target.value)}
            />
          </Field>

          <Field title="Caja disponible (CLP) *" hint="Monto total disponible en caja al cierre del día">
            <input
              type="number"
              min="0"
              step="1"
              className={inputCls}
              placeholder="Ej: 15000000"
              value={form.available_clp}
              onChange={e => set('available_clp', e.target.value)}
            />
          </Field>

          <Field title="Notas">
            <textarea
              className={cn(inputCls, 'resize-none h-28')}
              placeholder="Observaciones, movimientos importantes del día..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </Field>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
