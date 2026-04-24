'use client'

import { useState } from 'react'
import { Users, Megaphone, MessageSquare, BarChart2, Target, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Audience, Campaign, CampaignMessage, MarketingSpend } from '@/types'
import type { AttributionMetrics } from '@/app/marketing/attribution-actions'
import type { SavedMarketingProposal } from '@/types/agent.types'
import { AudienciasView }  from './AudienciasView'
import { CampanasView }    from './CampanasView'
import { MensajesView }    from './MensajesView'
import { AnaliticaView }   from './AnaliticaView'
import { AtribucionView }  from './AtribucionView'
import { PropuestasView }  from './PropuestasView'

type AnalyticsData = {
  leadsPerChannel:       Record<string, number>
  conversionsPerChannel: Record<string, number>
  opsPerChannel:         Record<string, number>
  spendPerChannel:       Record<string, number>
}

type LeadInfo   = { full_name: string; phone: string | null }
type ClientInfo = { full_name: string; phone: string | null; email: string | null }

type Props = {
  initialSpends:       MarketingSpend[]
  initialAudiencias:   Audience[]
  initialCampanas:     Campaign[]
  initialMensajes:     CampaignMessage[]
  initialProposals:    SavedMarketingProposal[]
  audienciasMap:       Record<string, string>
  messageCounts:       Record<string, number>
  leadsMap:            Record<string, LeadInfo>
  clientsMap:          Record<string, ClientInfo>
  analyticsData:       AnalyticsData
  attributionMetrics:  AttributionMetrics
}

const TABS = [
  { id: 'propuestas',  label: 'Propuestas IA',   icon: Sparkles },
  { id: 'audiencias',  label: 'Audiencias',       icon: Users },
  { id: 'campanas',    label: 'Campañas',         icon: Megaphone },
  { id: 'mensajes',    label: 'Mensajes',         icon: MessageSquare },
  { id: 'analitica',   label: 'Analítica',        icon: BarChart2 },
  { id: 'atribucion',  label: 'Atribución Real',  icon: Target },
] as const

type TabId = typeof TABS[number]['id']

export function MarketingView({
  initialSpends,
  initialAudiencias,
  initialCampanas,
  initialMensajes,
  initialProposals,
  audienciasMap,
  messageCounts,
  leadsMap,
  clientsMap,
  analyticsData,
  attributionMetrics,
}: Props) {
  const [tab, setTab] = useState<TabId>('propuestas')

  const pendingCount    = initialMensajes.filter(m => m.status === 'pending').length
  const proposalsCount  = initialProposals.filter(p => p.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => {
          const Icon   = t.icon
          const active = tab === t.id
          const badge  =
            t.id === 'mensajes'  && pendingCount   > 0 ? pendingCount   :
            t.id === 'propuestas' && proposalsCount > 0 ? proposalsCount :
            null
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative',
                active
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50',
                t.id === 'atribucion'  && active && 'text-green-400',
                t.id === 'propuestas'  && active && 'text-violet-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {badge && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Contenido del tab activo */}
      <div className="space-y-6">
        {tab === 'propuestas' && (
          <PropuestasView
            initialProposals={initialProposals}
            audiencias={Object.entries(audienciasMap).map(([id, name]) => ({ id, name }))}
          />
        )}
        {tab === 'audiencias' && (
          <AudienciasView initialAudiencias={initialAudiencias} />
        )}
        {tab === 'campanas' && (
          <CampanasView
            initialCampanas={initialCampanas}
            audiencias={Object.entries(audienciasMap).map(([id, name]) => ({ id, name }))}
            messageCounts={messageCounts}
          />
        )}
        {tab === 'mensajes' && (
          <MensajesView
            initialMensajes={initialMensajes}
            campanas={initialCampanas.map(c => ({ id: c.id, name: c.name }))}
            leadsMap={leadsMap}
            clientsMap={clientsMap}
          />
        )}
        {tab === 'analitica' && (
          <AnaliticaView
            initialSpends={initialSpends}
            analyticsData={analyticsData}
          />
        )}
        {tab === 'atribucion' && (
          <AtribucionView initialMetrics={attributionMetrics} />
        )}
      </div>
    </div>
  )
}
