'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lead, LeadStage, LeadChannel } from '@/types'
import { createLead, updateLead, type LeadInput } from '@/app/leads/actions'

const ALL_STAGES: { value: LeadStage; label: string }[] = [
  { value: 'new',               label: 'Nuevo' },
  { value: 'contacted',         label: 'Contactado' },
  { value: 'qualified',         label: 'Calificado' },
  { value: 'docs_pending',      label: 'Docs pendientes' },
  { value: 'ready_to_schedule', label: 'Listo para agendar' },
  { value: 'ready_to_operate',  label: 'Listo para operar' },
  { value: 'operated',          label: 'Operado' },
  { value: 'dormant',           label: 'Dormido' },
  { value: 'lost',              label: 'Perdido' },
]

const ALL_CHANNELS: { value: LeadChannel; label: string }[] = [
  { value: 'Meta',      label: 'Meta' },
  { value: 'TikTok',    label: 'TikTok' },
  { value: 'LinkedIn',  label: 'LinkedIn' },
  { value: 'Twitter/X', label: 'Twitter/X' },
  { value: 'referido',  label: 'Referido' },
  { value: 'otro',      label: 'Otro' },
]

const STAGE_COLORS: Record<LeadStage, string> = {
  new:               'bg-slate-500/20 text-slate-300 border-slate-500/40',
  contacted:         'bg-blue-500/20 text-blue-400 border-blue-500/40',
  qualified:         'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  docs_pending:      'bg-amber-500/20 text-amber-400 border-amber-500/40',
  ready_to_schedule: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
  ready_to_operate:  'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
  operated:          'bg-green-500/20 text-green-400 border-green-500/40',
  dormant:           'bg-slate-600/20 text-slate-500 border-slate-600/40',
  lost:              'bg-red-500/20 text-red-400 border-red-500/40',
}

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

type Props = { onClose: () => void; onSuccess: () => void; editing?: Lead }

type FormValues = {
  full_name:      string
  phone:          string
  email:          string
  source_channel: LeadChannel | null
  campaign_name:  string
  stage:          LeadStage
  notes:          string
}

function initialValues(editing?: Lead): FormValues {
  if (editing) {
    return {
      full_name:      editing.full_name,
      phone:          editing.phone ?? '',
      email:          editing.email ?? '',
      source_channel: (editing.source_channel as LeadChannel) ?? null,
      campaign_name:  editing.campaign_name ?? '',
      stage:          editing.stage,
      notes:          editing.notes ?? '',
    }
  }
  return { full_name: '', phone: '', email: '', source_channel: null, campaign_name: '', stage: 'new', notes: '' }
}

export function LeadForm({ onClose, onSuccess, editing }: Props) {
  const [form, setForm]   = useState<FormValues>(() => initialValues(editing))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('El nombre es obligatorio.'); return }
    setError(null)

    const input: LeadInput = {
      full_name:      form.full_name.trim(),
      phone:          form.phone.trim(),
      email:          form.email.trim(),
      source_channel: form.source_channel,
      campaign_name:  form.campaign_name.trim(),
      stage:          form.stage,
      notes:          form.notes.trim(),
    }

    startTransition(async () => {
      const result = editing ? await updateLead(editing.id, input) : await createLead(input)
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
              {editing ? 'Editar lead' : 'Nuevo lead'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editing ? `Modificar datos de ${editing.full_name}` : 'Registrar nuevo prospecto'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <Field title="Nombre completo *">
            <input className={inputCls} placeholder="Ej: Juan Pérez"
              value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field title="Teléfono">
              <input className={inputCls} placeholder="+56 9 1234 5678"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </Field>
            <Field title="Email">
              <input className={inputCls} placeholder="correo@ejemplo.com" type="email"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
          </div>

          <Field title="Canal de origen">
            <div className="grid grid-cols-3 gap-2">
              {ALL_CHANNELS.map(c => (
                <button key={c.value} type="button"
                  onClick={() => set('source_channel', form.source_channel === c.value ? null : c.value)}
                  className={cn(
                    'py-2 text-xs font-medium rounded-md border transition-colors',
                    form.source_channel === c.value
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                      : 'text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          <Field title="Campaña" hint="Nombre de la campaña o fuente específica">
            <input className={inputCls} placeholder="Ej: Instagram Abril 2025"
              value={form.campaign_name} onChange={e => set('campaign_name', e.target.value)} />
          </Field>

          <Field title="Etapa">
            <div className="flex flex-col gap-2">
              {ALL_STAGES.map(s => (
                <button key={s.value} type="button"
                  onClick={() => set('stage', s.value)}
                  className={cn(
                    'w-full py-2 text-xs font-medium rounded-md border transition-colors text-left px-3',
                    form.stage === s.value
                      ? STAGE_COLORS[s.value]
                      : 'text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          <Field title="Notas">
            <textarea className={cn(inputCls, 'resize-none h-24')}
              placeholder="Comentarios, contexto del contacto..."
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </Field>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 flex-shrink-0">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50">
            {isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
