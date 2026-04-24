'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Brain, Loader2, Copy, CheckCheck, Trash2, Plus,
  Sparkles, AlertTriangle, X, Users, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SavedMarketingProposal } from '@/types/agent.types'
import type { CampaignChannel } from '@/types'
import { runMarketingAgentAction, discardProposalAction, markProposalCreatedAction } from '@/app/marketing/agent-actions'
import { CampanaForm } from './CampanaForm'

// ── Badges ────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<string, string> = {
  alta:  'bg-red-500/15 text-red-400 border-red-500/30',
  media: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  baja:  'bg-slate-700/50 text-slate-400 border-slate-600/30',
}
const CHANNEL_STYLES: Record<string, string> = {
  whatsapp: 'bg-green-500/15 text-green-400 border-green-500/25',
  email:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  sms:      'bg-purple-500/15 text-purple-400 border-purple-500/25',
}
const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS',
}

type Props = {
  initialProposals: SavedMarketingProposal[]
  audiencias:       { id: string; name: string }[]
}

export function PropuestasView({ initialProposals, audiencias }: Props) {
  const router                   = useRouter()
  const [, startTransition]      = useTransition()

  const [proposals, setProposals] = useState<SavedMarketingProposal[]>(initialProposals)
  const [running,   setRunning]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [copied,    setCopied]    = useState<string | null>(null)
  const [discarding, setDiscarding] = useState<string | null>(null)

  // Estado del form de campaña (para pre-rellenar)
  const [showCampanaForm,    setShowCampanaForm]    = useState(false)
  const [campanaInitial,     setCampanaInitial]     = useState<Record<string, string> | null>(null)
  const [proposalToCreate,   setProposalToCreate]   = useState<string | null>(null)

  function refresh() { startTransition(() => router.refresh()) }

  async function handleRunAgent() {
    setRunning(true)
    setError(null)
    const result = await runMarketingAgentAction()
    setRunning(false)
    if (result.success && result.proposals?.length) {
      setProposals(prev => [...(result.proposals ?? []), ...prev])
    } else if (result.success && !result.proposals?.length) {
      setError('El agente no generó propuestas nuevas. Vuelve a intentarlo más tarde.')
    } else {
      setError(result.error ?? 'Error al ejecutar el agente')
    }
  }

  async function handleDiscard(id: string) {
    setDiscarding(id)
    await discardProposalAction(id)
    setProposals(prev => prev.filter(p => p.id !== id))
    setDiscarding(null)
  }

  async function handleCopyMessage(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(prev => prev === id ? null : prev), 2000)
    } catch {
      // Clipboard no disponible
    }
  }

  function handleOpenCampanaForm(proposal: SavedMarketingProposal) {
    setCampanaInitial({
      name:         proposal.audience_name,
      objective:    proposal.campaign_objective,
      channel:      proposal.suggested_channel,
      copy_version: proposal.suggested_copy,
    })
    setProposalToCreate(proposal.id)
    setShowCampanaForm(true)
  }

  async function handleCampanaSuccess() {
    setShowCampanaForm(false)
    if (proposalToCreate) {
      await markProposalCreatedAction(proposalToCreate)
      setProposals(prev => prev.filter(p => p.id !== proposalToCreate))
      setProposalToCreate(null)
    }
    refresh()
  }

  const pending = proposals.filter(p => p.status === 'pending')

  return (
    <>
      {showCampanaForm && campanaInitial && (
        <CampanaForm
          onClose={() => { setShowCampanaForm(false); setProposalToCreate(null) }}
          onSuccess={handleCampanaSuccess}
          audiencias={audiencias}
          initialValues={{
            name:         campanaInitial.name,
            objective:    campanaInitial.objective,
            channel:      campanaInitial.channel as CampaignChannel,
            copy_version: campanaInitial.copy_version,
          }}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            {pending.length > 0
              ? `${pending.length} propuesta${pending.length !== 1 ? 's' : ''} pendiente${pending.length !== 1 ? 's' : ''} de revisión`
              : 'Sin propuestas pendientes'}
          </p>
        </div>
        <button
          onClick={handleRunAgent}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-300 bg-violet-900/30 hover:bg-violet-900/50 border border-violet-700/40 hover:border-violet-600/60 rounded-lg transition-colors disabled:opacity-50"
        >
          {running
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Sparkles className="w-4 h-4" />
          }
          {running ? 'Analizando negocio…' : 'Generar propuestas con IA'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Lista de propuestas ── */}
      {pending.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-16 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
            <Brain className="w-5 h-5 text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-400 font-medium">Sin propuestas pendientes</p>
            <p className="text-xs text-slate-600 mt-1">Haz clic en "Generar propuestas con IA" para analizar el negocio.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(proposal => (
            <div
              key={proposal.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
            >
              {/* Cabecera de la propuesta */}
              <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-violet-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Users className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-100">{proposal.audience_name}</h3>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border uppercase tracking-wide',
                        PRIORITY_STYLES[proposal.priority] ?? PRIORITY_STYLES.baja
                      )}>
                        {proposal.priority}
                      </span>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                        CHANNEL_STYLES[proposal.suggested_channel] ?? 'bg-slate-700 text-slate-400 border-slate-600'
                      )}>
                        {CHANNEL_LABELS[proposal.suggested_channel] ?? proposal.suggested_channel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{proposal.audience_description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-600 font-mono whitespace-nowrap">
                    ~{proposal.estimated_size} personas
                  </span>
                  <span className="text-xs text-slate-600 whitespace-nowrap">
                    {new Date(proposal.created_at).toLocaleDateString('es-CL')}
                  </span>
                </div>
              </div>

              {/* Cuerpo */}
              <div className="px-5 py-4 space-y-3">
                {/* Objetivo */}
                <div className="bg-violet-900/20 border border-violet-800/30 rounded-lg px-4 py-3">
                  <p className="text-xs text-violet-400 mb-1">Objetivo de campaña</p>
                  <p className="text-sm text-slate-200">{proposal.campaign_objective}</p>
                </div>

                {/* Mensaje sugerido */}
                <div className="bg-slate-800/50 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      <p className="text-xs text-slate-500">Mensaje sugerido</p>
                    </div>
                    <button
                      onClick={() => handleCopyMessage(proposal.id, proposal.suggested_copy)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {copied === proposal.id
                        ? <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                        : <Copy className="w-3.5 h-3.5" />
                      }
                      {copied === proposal.id ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p className="text-sm text-slate-300 italic leading-relaxed whitespace-pre-wrap">
                    "{proposal.suggested_copy}"
                  </p>
                </div>

                {/* Impacto esperado */}
                <div className="bg-green-900/10 border border-green-800/20 rounded-lg px-4 py-3">
                  <p className="text-xs text-green-400 mb-1">Impacto esperado</p>
                  <p className="text-xs text-slate-300">{proposal.expected_impact}</p>
                </div>

                {/* Razonamiento */}
                <p className="text-xs text-slate-500 leading-relaxed px-1">{proposal.reasoning}</p>

                {/* Acciones */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleOpenCampanaForm(proposal)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Crear campaña
                  </button>
                  <button
                    onClick={() => handleDiscard(proposal.id)}
                    disabled={discarding === proposal.id}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 hover:bg-red-500/5 rounded-md transition-colors disabled:opacity-50"
                  >
                    {discarding === proposal.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
