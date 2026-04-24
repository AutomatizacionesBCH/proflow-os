import { createClient }          from '@/lib/supabase/server'
import { PageShell }              from '@/components/layout/PageShell'
import { RecomendacionesView }    from '@/components/recomendaciones/RecomendacionesView'
import type { UnifiedRecommendation, AgentSource, RecStatus, RecPriority } from '@/components/recomendaciones/RecomendacionesView'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

const PRIORITY_ORDER: Record<RecPriority, number> = { alta: 0, media: 1, baja: 2 }

export default async function RecomendacionesPage() {
  const supabase = await createClient()
  const db = supabase as any

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  const [leadRecsRes, salesRes, proposalsRes, revenueRes] = await Promise.all([
    db.from('marketing_recommendations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
    db.from('sales_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('marketing_proposals')
      .select('*')
      .neq('status', 'created')  // excluir propuestas ya convertidas en campaña
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('revenue_analyses')
      .select('id, analysis_data, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const recs: UnifiedRecommendation[] = []

  // ── Lead Intelligence Agent (marketing_recommendations) ───────────────────
  for (const r of (leadRecsRes.data ?? [])) {
    const status: RecStatus =
      r.status === 'aprobada'   ? 'aprobada'   :
      r.status === 'descartada' ? 'descartada' :
      'pendiente'

    const priority: RecPriority =
      r.urgency === 'alta' ? 'alta' :
      r.urgency === 'baja' ? 'baja' :
      r.priority === 'alta' ? 'alta' :
      r.priority === 'baja' ? 'baja' :
      'media'

    recs.push({
      id:               r.id,
      source:           'lead_intelligence' as AgentSource,
      title:            r.next_best_action ?? r.title ?? 'Acción recomendada',
      description:      r.reasoning ?? r.explanation ?? '',
      suggested_action: r.next_best_action ?? r.suggested_action ?? '',
      expected_impact:  r.heat_score != null
        ? `Heat score: ${r.heat_score}/100 — ${r.priority_label ?? ''}`
        : (r.expected_impact ?? ''),
      priority,
      status,
      created_at:       r.created_at,
      lead_id:          r.lead_id ?? null,
      lead_name:        r.lead_name ?? null,
      suggested_message: r.suggested_message ?? null,
      reasoning:        r.reasoning ?? null,
    })
  }

  // ── Sales Agent (sales_analyses) ──────────────────────────────────────────
  for (const sa of (salesRes.data ?? [])) {
    const status: RecStatus =
      sa.status === 'aprobada'   ? 'aprobada'   :
      sa.status === 'descartada' ? 'descartada' :
      'pendiente'

    const priority: RecPriority =
      sa.confidence_score >= 70 ? 'alta' :
      sa.confidence_score >= 40 ? 'media' :
      'baja'

    recs.push({
      id:               sa.id,
      source:           'sales_agent' as AgentSource,
      title:            `Estrategia de cierre — ${sa.lead_name ?? 'Lead'}`,
      description:      sa.closing_strategy ?? '',
      suggested_action: sa.urgency_reason ?? '',
      expected_impact:  `Confianza: ${sa.confidence_score ?? 0}% · Canal: ${sa.best_channel ?? '?'} · Momento: ${sa.best_time ?? '?'}`,
      priority,
      status,
      created_at:       sa.created_at,
      lead_id:          sa.lead_id ?? null,
      lead_name:        sa.lead_name ?? null,
      suggested_message: sa.suggested_message ?? null,
      reasoning:        sa.closing_strategy ?? null,
      metadata: {
        'Objeción principal':  sa.main_objection,
        'Respuesta objeción':  sa.objection_response,
        'Mejor canal':         sa.best_channel,
        'Mejor momento':       sa.best_time,
        'Confianza':           `${sa.confidence_score}%`,
        'Asignado a':          sa.assigned_to,
      },
    })
  }

  // ── Marketing Intelligence Agent (marketing_proposals) ───────────────────
  for (const mp of (proposalsRes.data ?? [])) {
    const status: RecStatus =
      mp.status === 'discarded' ? 'descartada' :
      mp.status === 'created'   ? 'aprobada'   :
      'pendiente'

    recs.push({
      id:               mp.id,
      source:           'marketing_agent' as AgentSource,
      title:            mp.audience_name ?? 'Propuesta de campaña',
      description:      mp.campaign_objective ?? '',
      suggested_action: `Enviar ${mp.suggested_channel === 'whatsapp' ? 'WhatsApp' : mp.suggested_channel} a ~${mp.estimated_size ?? 0} contactos`,
      expected_impact:  mp.expected_impact ?? '',
      priority:         (mp.priority ?? 'media') as RecPriority,
      status,
      created_at:       mp.created_at,
      suggested_message: mp.suggested_copy ?? null,
      reasoning:        mp.reasoning ?? null,
      metadata: {
        'Canal':          mp.suggested_channel,
        'Tamaño audiencia': mp.estimated_size,
        'Descripción':    mp.audience_description,
      },
    })
  }

  // ── Revenue Agent (extraer recommendations[] del último análisis) ─────────
  if (revenueRes.data?.analysis_data?.recommendations) {
    const analysis = revenueRes.data
    const revRecs  = analysis.analysis_data.recommendations as {
      title: string; description: string; expected_impact: string
      action_required: string; priority: RecPriority; category: string
    }[]

    for (let i = 0; i < revRecs.length; i++) {
      const rec = revRecs[i]
      recs.push({
        id:               `rev_${analysis.id}_${i}`,
        source:           'revenue_agent' as AgentSource,
        title:            rec.title ?? 'Recomendación estratégica',
        description:      rec.description ?? '',
        suggested_action: rec.action_required ?? '',
        expected_impact:  rec.expected_impact ?? '',
        priority:         rec.priority ?? 'media',
        status:           'pendiente',   // sin estado individual persistente
        created_at:       analysis.created_at,
        metadata:         { 'Categoría': rec.category },
      })
    }
  }

  // ── Ordenar: por prioridad, luego por fecha desc ──────────────────────────
  recs.sort((a, b) => {
    const pd = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
    if (pd !== 0) return pd
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // ── KPI de hoy ────────────────────────────────────────────────────────────
  const stats = {
    totalPending:   recs.filter(r => r.status === 'pendiente').length,
    totalUrgent:    recs.filter(r => r.status === 'pendiente' && r.priority === 'alta').length,
    approvedToday:  recs.filter(r => r.status === 'aprobada'   && r.created_at >= todayISO).length,
    dismissedToday: recs.filter(r => r.status === 'descartada' && r.created_at >= todayISO).length,
  }

  // ── Último análisis por agente ────────────────────────────────────────────
  const agentLastRun: Record<string, string | null> = {
    lead_intelligence: (leadRecsRes.data ?? [])[0]?.created_at ?? null,
    sales_agent:       (salesRes.data    ?? [])[0]?.created_at ?? null,
    marketing_agent:   (proposalsRes.data ?? [])[0]?.created_at ?? null,
    revenue_agent:     revenueRes.data?.created_at ?? null,
  }

  return (
    <PageShell
      title="Centro de Recomendaciones"
      description="Todas las recomendaciones de los agentes IA en un solo lugar"
    >
      <RecomendacionesView
        initialRecs={recs}
        stats={stats}
        agentLastRun={agentLastRun}
      />
    </PageShell>
  )
}
