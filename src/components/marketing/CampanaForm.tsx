'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Campaign, CampaignChannel, CampaignStatus, Audience } from '@/types'
import { createCampana, updateCampana, type CampanaInput } from '@/app/marketing/campanas-actions'

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

const CHANNELS: { value: CampaignChannel; label: string; color: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp', color: 'green' },
  { value: 'email',    label: 'Email',    color: 'blue' },
  { value: 'sms',      label: 'SMS',      color: 'purple' },
]

const STATUSES: { value: CampaignStatus; label: string }[] = [
  { value: 'draft',    label: 'Borrador' },
  { value: 'active',   label: 'Activa' },
  { value: 'paused',   label: 'Pausada' },
  { value: 'finished', label: 'Finalizada' },
]

type FormValues = {
  name:         string
  objective:    string
  audience_id:  string
  channel:      CampaignChannel | null
  copy_version: string
  status:       CampaignStatus
  launched_at:  string
}

function init(editing?: Campaign): FormValues {
  if (editing) return {
    name:         editing.name,
    objective:    editing.objective ?? '',
    audience_id:  editing.audience_id ?? '',
    channel:      editing.channel as CampaignChannel | null,
    copy_version: editing.copy_version ?? '',
    status:       editing.status as CampaignStatus,
    launched_at:  editing.launched_at ? editing.launched_at.slice(0, 10) : '',
  }
  return { name: '', objective: '', audience_id: '', channel: null, copy_version: '', status: 'draft', launched_at: '' }
}

type Props = {
  onClose:    () => void
  onSuccess:  () => void
  editing?:   Campaign
  audiencias: { id: string; name: string }[]
}

export function CampanaForm({ onClose, onSuccess, editing, audiencias }: Props) {
  const [form, setForm]   = useState<FormValues>(() => init(editing))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    setError(null)

    const input: CampanaInput = {
      name:         form.name.trim(),
      objective:    form.objective.trim(),
      audience_id:  form.audience_id || null,
      channel:      form.channel,
      copy_version: form.copy_version.trim(),
      status:       form.status,
      launched_at:  form.launched_at || null,
    }

    startTransition(async () => {
      const result = editing
        ? await updateCampana(editing.id, input)
        : await createCampana(input)
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
            <h2 className="text-base font-semibold text-slate-100">{editing ? 'Editar campaña' : 'Nueva campaña'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{editing ? 'Modificar datos' : 'Crear campaña de comunicación'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <Field title="Nombre *">
            <input type="text" className={inputCls} placeholder="Ej: Reactivación VIP Junio" value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>

          <Field title="Objetivo">
            <input type="text" className={inputCls} placeholder="Ej: Recuperar clientes dormidos" value={form.objective} onChange={e => set('objective', e.target.value)} />
          </Field>

          <Field title="Audiencia">
            <select
              className={cn(inputCls, 'appearance-none')}
              value={form.audience_id}
              onChange={e => set('audience_id', e.target.value)}
            >
              <option value="">Sin audiencia asignada</option>
              {audiencias.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>

          <Field title="Canal">
            <div className="flex gap-2">
              {CHANNELS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('channel', form.channel === c.value ? null : c.value)}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium rounded-md border transition-colors',
                    form.channel === c.value
                      ? c.value === 'whatsapp' ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : c.value === 'email'   ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      : 'text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          <Field title="Estado">
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set('status', s.value)}
                  className={cn(
                    'py-2 text-xs font-medium rounded-md border transition-colors',
                    form.status === s.value
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                      : 'text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          <Field title="Texto del mensaje" hint="Usa {{nombre}} para personalizar con el nombre del destinatario">
            <textarea
              className={cn(inputCls, 'resize-none h-32')}
              placeholder="Hola {{nombre}}, te contactamos porque..."
              value={form.copy_version}
              onChange={e => set('copy_version', e.target.value)}
            />
          </Field>

          <Field title="Fecha de lanzamiento">
            <input type="date" className={inputCls} value={form.launched_at} onChange={e => set('launched_at', e.target.value)} />
          </Field>

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
            {isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear campaña'}
          </button>
        </div>
      </div>
    </div>
  )
}
