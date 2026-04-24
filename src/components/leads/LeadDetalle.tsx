'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Pencil, Phone, Mail, MessageCircle,
  Globe, AtSign, Flame, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types'
import { STAGE_LABELS } from '@/types'
import { LeadStatusBadge } from './LeadStatusBadge'
import { LeadChannelBadge } from './LeadChannelBadge'
import { LeadForm } from './LeadForm'
import { BehaviorSignals } from './BehaviorSignals'
import type { BehaviorSignal } from '@/types/behavior.types'
import type { LeadChannel } from '@/types'

type Props = {
  lead:           Lead
  initialSignals: BehaviorSignal[]
}

export function LeadDetalle({ lead, initialSignals }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)

  function handleSuccess() {
    setShowForm(false)
    startTransition(() => router.refresh())
  }

  const priorityCls =
    lead.priority_label === 'hot'       ? 'text-orange-400' :
    lead.priority_label === 'warm'      ? 'text-amber-400'  :
    lead.priority_label === 'follow_up' ? 'text-blue-400'   : 'text-slate-400'

  return (
    <>
      {showForm && (
        <LeadForm
          onClose={() => setShowForm(false)}
          onSuccess={handleSuccess}
          editing={lead}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/leads')}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-base font-semibold text-slate-200">
                {lead.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-100">{lead.full_name}</h1>
                <LeadStatusBadge status={lead.stage} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('text-xs font-mono font-medium flex items-center gap-1', priorityCls)}>
                  {lead.heat_score >= 60 && <Flame className="w-3 h-3" />}
                  {lead.heat_score}
                </span>
                {lead.priority_label && (
                  <span className={cn('text-xs', priorityCls)}>
                    {lead.priority_label === 'hot'       ? '🔥 Caliente' :
                     lead.priority_label === 'warm'      ? '🟡 Tibio'    :
                     lead.priority_label === 'follow_up' ? '🔁 Seguimiento' : '🧊 Frío'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-slate-100 rounded-md transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Editar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda: datos del lead */}
        <div className="space-y-4">

          {/* Contacto */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Contacto</h2>
            <InfoRow icon={Phone}         label="Teléfono"   value={lead.phone} />
            <InfoRow icon={MessageCircle} label="WhatsApp"   value={lead.whatsapp} />
            <InfoRow icon={Mail}          label="Email"      value={lead.email} />
            <InfoRow icon={Globe}         label="LinkedIn"   value={lead.linkedin_profile} />
            <InfoRow icon={AtSign}        label="X / Twitter" value={lead.x_handle} />
          </div>

          {/* Origen */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Origen</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-20">Canal</span>
              <LeadChannelBadge channel={lead.source_channel as LeadChannel | null} />
            </div>
            {lead.campaign_name && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-slate-500 w-20 flex-shrink-0">Campaña</span>
                <span className="text-xs text-slate-300">{lead.campaign_name}</span>
              </div>
            )}
            {lead.source_platform && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-20">Plataforma</span>
                <span className="text-xs text-slate-400 capitalize">{lead.source_platform}</span>
              </div>
            )}
          </div>

          {/* Gestión */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Gestión</h2>
            {lead.assigned_to && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-24 flex-shrink-0">Responsable</span>
                <span className="text-xs text-slate-300 px-2 py-0.5 bg-slate-800 rounded-md border border-slate-700">
                  {lead.assigned_to}
                </span>
              </div>
            )}
            {lead.assigned_to_recommendation && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-24 flex-shrink-0">Recomendado</span>
                <span className="text-xs text-blue-400">{lead.assigned_to_recommendation}</span>
              </div>
            )}
            {lead.next_action && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Próxima acción</p>
                <p className="text-xs text-slate-300 leading-relaxed">{lead.next_action}</p>
                {lead.next_action_due_at && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(lead.next_action_due_at).toLocaleDateString('es-CL')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notas */}
          {lead.notes && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Notas</h2>
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          <p className="text-xs text-slate-600 px-1">
            Registrado el{' '}
            {new Date(lead.created_at).toLocaleDateString('es-CL', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {/* Columna derecha: señales de comportamiento */}
        <div className="lg:col-span-2">
          <BehaviorSignals
            leadId={lead.id}
            initialSignals={initialSignals}
          />
        </div>
      </div>
    </>
  )
}

function InfoRow({
  icon: Icon, label, value,
}: {
  icon: React.ElementType
  label: string
  value?: string | null
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs text-slate-600 mb-0.5">{label}</p>
        <p className="text-sm text-slate-300 break-all">{value || '—'}</p>
      </div>
    </div>
  )
}
