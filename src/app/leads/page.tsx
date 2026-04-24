import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { LeadsView } from '@/components/leads/LeadsView'
import type { Lead } from '@/types'
import type { SavedRecommendation } from '@/types/agent.types'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

export default async function LeadsPage() {
  const supabase = await createClient()
  const db = supabase as any

  const [leadsRes, recsRes] = await Promise.all([
    db.from('leads').select('*').order('created_at', { ascending: false }),
    db
      .from('marketing_recommendations')
      .select('*')
      .is('viewed_at', null)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (leadsRes.error) {
    return (
      <PageShell title="Leads" description="Pipeline de prospectos comerciales">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <p className="text-sm font-semibold text-red-400 mb-1">Error de conexión</p>
          <p className="text-xs text-slate-500 font-mono">[{leadsRes.error.code}] {leadsRes.error.message}</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Leads" description="Pipeline de prospectos comerciales">
      <LeadsView
        initialLeads={(leadsRes.data ?? []) as unknown as Lead[]}
        initialRecommendations={(recsRes.data ?? []) as SavedRecommendation[]}
      />
    </PageShell>
  )
}
