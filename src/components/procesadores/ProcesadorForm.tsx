'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Processor, ProcessorStatus, Company } from '@/types'
import { createProcesador, updateProcesador, type ProcesadorInput } from '@/app/procesadores/actions'

const ALL_STATUSES: { value: ProcessorStatus; label: string }[] = [
  { value: 'activo',    label: 'Activo' },
  { value: 'pausado',   label: 'Pausado' },
  { value: 'en_riesgo', label: 'En riesgo' },
]

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
  editing?: Processor
  companies: Pick<Company, 'id' | 'name'>[]
}

type FormValues = {
  name: string
  company_id: string
  type: string
  status: ProcessorStatus
  daily_limit_usd: string
  notes: string
}

function initialValues(editing?: Processor): FormValues {
  if (editing) {
    return {
      name:            editing.name,
      company_id:      editing.company_id ?? '',
      type:            editing.type ?? '',
      status:          editing.status ?? 'activo',
      daily_limit_usd: editing.daily_limit_usd != null ? String(editing.daily_limit_usd) : '',
      notes:           editing.notes ?? '',
    }
  }
  return { name: '', company_id: '', type: '', status: 'activo', daily_limit_usd: '', notes: '' }
}

export function ProcesadorForm({ onClose, onSuccess, editing, companies }: Props) {
  const [form, setForm]   = useState<FormValues>(() => initialValues(editing))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre del procesador es obligatorio.'); return }
    setError(null)

    const limitVal = form.daily_limit_usd.trim()
    const daily_limit_usd = limitVal ? parseFloat(limitVal) : null
    if (limitVal && isNaN(daily_limit_usd!)) { setError('El límite diario debe ser un número válido.'); return }

    const input: ProcesadorInput = {
      name:            form.name.trim(),
      company_id:      form.company_id || null,
      type:            form.type.trim(),
      status:          form.status,
      daily_limit_usd: daily_limit_usd,
      notes:           form.notes.trim(),
    }

    startTransition(async () => {
      const result = editing
        ? await updateProcesador(editing.id, input)
        : await createProcesador(input)
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
              {editing ? 'Editar procesador' : 'Nuevo procesador'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editing ? `Modificar datos de ${editing.name}` : 'Registrar procesador de pago'}
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
          <Field title="Nombre *">
            <input
              className={inputCls}
              placeholder="Ej: Stripe, PayPal, Conekta"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </Field>

          <Field title="Empresa">
            <select
              className={cn(inputCls, 'appearance-none')}
              value={form.company_id}
              onChange={e => set('company_id', e.target.value)}
            >
              <option value="">— Sin empresa —</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field title="Tipo" hint="Ej: Tarjeta, Billetera digital, Cripto, Local">
            <input
              className={inputCls}
              placeholder="Ej: Tarjetas internacionales"
              value={form.type}
              onChange={e => set('type', e.target.value)}
            />
          </Field>

          <Field title="Estado">
            <div className="flex gap-2">
              {ALL_STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set('status', s.value)}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium rounded-md border transition-colors',
                    form.status === s.value
                      ? s.value === 'activo'
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : s.value === 'pausado'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          <Field title="Límite diario (USD)" hint="Dejar vacío si no hay límite">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              placeholder="Ej: 50000"
              value={form.daily_limit_usd}
              onChange={e => set('daily_limit_usd', e.target.value)}
            />
          </Field>

          <Field title="Notas">
            <textarea
              className={cn(inputCls, 'resize-none h-28')}
              placeholder="Comisiones, condiciones especiales, contacto..."
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
            {isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear procesador'}
          </button>
        </div>
      </div>
    </div>
  )
}
