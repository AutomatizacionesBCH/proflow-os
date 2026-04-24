import { createClient } from '@/lib/supabase/server'
import { PageShell }    from '@/components/layout/PageShell'
import { MarketingView } from '@/components/marketing/MarketingView'
import { calculateAttributionMetrics } from './attribution-actions'
import type { Audience, Campaign, CampaignMessage, MarketingSpend } from '@/types'
import type { SavedMarketingProposal } from '@/types/agent.types'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

const MARKETING_CHANNELS = ['Meta', 'TikTok', 'LinkedIn', 'Twitter/X', 'referido', 'otro']

export default async function MarketingPage() {
  const supabase = await createClient()

  const [
    spendRes,
    audienciasRes,
    campanasRes,
    mensajesRes,
    leadsRes,
    opsRes,
    clientsRes,
    attributionRes,
    proposalsRes,
  ] = await Promise.all([
    supabase.from('marketing_spend').select('*').order('date', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('audiences').select('*').order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('campaigns').select('*').order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('campaign_messages').select('*').order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('leads').select('id, full_name, source_channel, converted_to_client_id, phone').limit(10000),
    supabase.from('operations').select('client_id').limit(10000),
    supabase.from('clients').select('id, full_name, phone, email').limit(5000),
    calculateAttributionMetrics(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('marketing_proposals').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
  ])

  // ── Analytics: leads y conversiones por canal ─────────────────────────
  const leadsPerChannel:       Record<string, number> = {}
  const conversionsPerChannel: Record<string, number> = {}
  const clientChannelMap:      Record<string, string> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const lead of (leadsRes.data as any[]) ?? []) {
    const ch = lead.source_channel
    if (!ch || !MARKETING_CHANNELS.includes(ch)) continue
    leadsPerChannel[ch] = (leadsPerChannel[ch] ?? 0) + 1
    if (lead.converted_to_client_id) {
      conversionsPerChannel[ch] = (conversionsPerChannel[ch] ?? 0) + 1
      clientChannelMap[lead.converted_to_client_id] = ch
    }
  }

  // ── Analytics: operaciones atribuidas por canal ───────────────────────
  const opsPerChannel: Record<string, number> = {}
  for (const op of opsRes.data ?? []) {
    const ch = clientChannelMap[op.client_id]
    if (ch) opsPerChannel[ch] = (opsPerChannel[ch] ?? 0) + 1
  }

  // ── Analytics: gasto por canal ────────────────────────────────────────
  const spendPerChannel: Record<string, number> = {}
  for (const s of spendRes.data ?? []) {
    spendPerChannel[s.channel] = (spendPerChannel[s.channel] ?? 0) + s.amount_clp
  }

  // ── Maps para resolución de nombres en Mensajes ───────────────────────
  const leadsMap: Record<string, { full_name: string; phone: string | null }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (leadsRes.data as any[]) ?? []) {
    leadsMap[l.id] = { full_name: l.full_name, phone: l.phone ?? null }
  }

  const clientsMap: Record<string, { full_name: string; phone: string | null; email: string | null }> = {}
  for (const c of clientsRes.data ?? []) {
    clientsMap[c.id] = { full_name: c.full_name, phone: c.phone ?? null, email: c.email ?? null }
  }

  // ── Map de audiencias para Campañas ───────────────────────────────────
  const audienciasMap: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const a of (audienciasRes.data as any[]) ?? []) {
    audienciasMap[a.id] = a.name
  }

  // ── Conteo de mensajes por campaña ────────────────────────────────────
  const messageCounts: Record<string, number> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const m of (mensajesRes.data as any[]) ?? []) {
    messageCounts[m.campaign_id] = (messageCounts[m.campaign_id] ?? 0) + 1
  }

  return (
    <PageShell title="Marketing" description="Audiencias, campañas, mensajes y analítica">
      <MarketingView
        initialSpends={     (spendRes.data      ?? []) as MarketingSpend[]}
        initialAudiencias={ (audienciasRes.data  ?? []) as Audience[]}
        initialCampanas={   (campanasRes.data    ?? []) as Campaign[]}
        initialMensajes={   (mensajesRes.data    ?? []) as CampaignMessage[]}
        initialProposals={  (proposalsRes.data   ?? []) as SavedMarketingProposal[]}
        audienciasMap={audienciasMap}
        messageCounts={messageCounts}
        leadsMap={leadsMap}
        clientsMap={clientsMap}
        analyticsData={{
          leadsPerChannel,
          conversionsPerChannel,
          opsPerChannel,
          spendPerChannel,
        }}
        attributionMetrics={
          attributionRes.success
            ? attributionRes.data
            : { byChannel: [], byCampaign: [], totals: { total_clients: 0, total_operations: 0, total_profit_clp: 0, avg_conversion_days: 0 } }
        }
      />
    </PageShell>
  )
}
