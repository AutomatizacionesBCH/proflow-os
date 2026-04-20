'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { cn, formatRutForStorage } from '@/lib/utils'
import type { Cliente, ClientTag, Company, Processor } from '@/types'
import { createCliente, updateCliente, type ClienteInput } from '@/app/clientes/actions'
import { ClienteTagBadge } from './ClienteTagBadge'

const ALL_TAGS: ClientTag[] = ['VIP', 'frecuente', 'nuevo', 'riesgo', 'pausado']

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

type Props = {
  onClose: () => void
  onSuccess: () => void
  companies: Company[]
  processors: Processor[]
  editing?: Cliente
}

type FormValues = {
  full_name: string
  document_id: string
  email: string
  phone: string
  assigned_company_id: string
  assigned_processor_id: string
  tags: ClientTag[]
  notes: string
}

function initialValues(editing?: Cliente): FormValues {
  if (editing) {
    return {
      full_name:             editing.full_name,
      document_id:           editing.document_id ?? '',
      email:                 editing.email ?? '',
      phone:                 editing.phone ?? '',
      assigned_company_id:   editing.assigned_company_id ?? '',
      assigned_processor_id: editing.assigned_processor_id ?? '',
      tags:                  editing.tags,
      notes:                 editing.notes ?? '',
    }
  }
  return {
    full_name: '', document_id: '', email: '', phone: '',
    assigned_company_id: '', assigned_processor_id: '',
    tags: [], notes: '',
  }
}

export function ClienteForm({ onClose, onSuccess, companies, processors, editing }: Props) {
  const [form, setForm] = useState<FormValues>(() => initialValues(editing))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function set(key: keyof FormValues, value: FormValues[keyof FormValues]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleTag(tag: ClientTag) {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('El nombre es obligatorio.'); return }
    setError(null)

    const input: ClienteInput = {
      ...form,
      document_id: form.document_id ? formatRutForStorage(form.document_id) : form.document_id,
    }

    startTransition(async () => {
      const result = editing
        ? await updateCliente(editing.id, input)
        : await createCliente(input)

      if (!result.success) { setError(result.error); return }
      onSuccess()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-lg bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              {editing ? 'Editar cliente' : 'Nuevo cliente'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editing ? `Modificar datos de ${editing.full_name}` : 'Completar información del cliente'}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <Section title="Información personal">
            <Field title="Nombre completo *">
              <input
                className={inputCls}
                placeholder="Ej: Juan Pérez García"
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field title="RUT / Documento">
                <input
                  className={inputCls}
                  placeholder="12.345.678-9"
                  value={form.document_id}
                  onChange={e => set('document_id', e.target.value)}
                />
              </Field>
              <Field title="Teléfono">
                <input
                  className={inputCls}
                  placeholder="+56 9 1234 5678"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                />
              </Field>
            </div>
            <Field title="Email">
              <input
                type="email"
                className={inputCls}
                placeholder="cliente@empresa.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Asignaciones">
            <Field title="Empresa">
              <select
                className={cn(inputCls, 'cursor-pointer')}
                value={form.assigned_company_id}
                onChange={e => set('assigned_company_id', e.target.value)}
              >
                <option value="">— Sin empresa —</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field title="Procesador">
              <select
                className={cn(inputCls, 'cursor-pointer')}
                value={form.assigned_processor_id}
                onChange={e => set('assigned_processor_id', e.target.value)}
              >
                <option value="">— Sin procesador —</option>
                {processors.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title="Etiquetas">
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'transition-all rounded-md border px-1 py-0.5',
                    form.tags.includes(tag)
                      ? 'ring-2 ring-blue-500/40 opacity-100'
                      : 'opacity-50 hover:opacity-75'
                  )}
                >
                  <ClienteTagBadge tag={tag} />
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-1">Selecciona una o más etiquetas.</p>
          </Section>

          <Section title="Notas">
            <textarea
              className={cn(inputCls, 'resize-none h-24')}
              placeholder="Información adicional, observaciones..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </Section>

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
            form="cliente-form"
            disabled={isPending}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear cliente')}
          </button>
        </div>
      </div>
    </div>
  )
}
