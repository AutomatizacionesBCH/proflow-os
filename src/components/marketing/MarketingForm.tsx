'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MarketingChannel, MarketingSpend } from '@/types'
import { createMarketingSpend, updateMarketingSpend, type MarketingSpendInput } from '@/app/marketing/actions'

const ALL_CHANNELS: { value: MarketingChannel; label: string }[] = [
  { value: 'Meta',      label: 'Meta' },
  { value: 'TikTok',    label: 'TikTok' },
  { value: 'LinkedIn',  label: 'LinkedIn' },
  { value: 'Twitter/X', label: 'Twitter/X' },
  { value: 'referido',  label: 'Referido' },
  { value: 'otro',      label: 'Otro' },
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

type FormValues = {
  date:       string
  channel:    MarketingChannel | null
  amount_clp: string
  notes:      string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function initialValues(editing?: MarketingSpend): FormValues {
  if (editing) {
    return {
      date:       editing.date,
      channel:    editing.channel,
      amount_clp: String(editing.amount_clp),
      notes:      editing.notes ?? '',
    }
  }
  return { date: today(), channel: null, amount_clp: '', notes: '' }
}

type Props = {
  onClose:   () => void
  onSuccess: () => void
  editing?:  MarketingSpend
}

export function MarketingForm({ onClose, onSuccess, editing }: Props) {
  const [form, setForm]   = useState<FormValues>(() => initialValues(editing))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.channel)          { setError('Selecciona un canal.'); return }
    const amount = parseFloat(form.amount_clp.replace(/\./g, '').replace(',', '.'))
    if (!form.amount_clp || isNaN(amount) || amount <= 0) { setError('Ingresa un monto válido.'); return }
    setError(null)

    const input: MarketingSpendInput = {
      date:       form.date,
      channel:    form.channel,
      amount_clp: Math.round(amount),
      notes:      form.notes.trim(),
    }

    startTransition(async () => {
      const result = editing
        ? await updateMarketingSpend(editing.id, input)
        : await createMarketingSpend(input)
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
              {editing ? 'Editar gasto' : 'Nuevo gasto'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editing ? 'Modificar registro de gasto' : 'Registrar gasto publicitario'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <Field title="Fecha">
            <input
              type="date"
              className={inputCls}
              value={form.date}
              onChange={e => set('date', e.target.value)}
            />
          </Field>

          <Field title="Canal *">
            <div className="grid grid-cols-3 gap-2">
              {ALL_CHANNELS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('channel', form.channel === c.value ? null : c.value as MarketingChannel)}
                  className={cn(
                    'py-2 text-xs font-medium rounded-md border transition-colors',
                    form.channel === c.value
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                      : 'text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          <Field title="Monto CLP *" hint="Gasto total en pesos chilenos">
            <input
              type="number"
              min="1"
              step="1"
              className={inputCls}
              placeholder="Ej: 150000"
              value={form.amount_clp}
              onChange={e => set('amount_clp', e.target.value)}
            />
          </Field>

          <Field title="Notas">
            <textarea
              className={cn(inputCls, 'resize-none h-24')}
              placeholder="Objetivo, resultados esperados..."
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
            {isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar gasto'}
          </button>
        </div>
      </div>
    </div>
  )
}
