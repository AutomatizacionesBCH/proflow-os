import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { LeadsView } from '@/components/leads/LeadsView'
import type { Lead } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <PageShell title="Leads" description="Pipeline de prospectos comerciales">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <p className="text-sm font-semibold text-red-400 mb-1">Error de conexión</p>
          <p className="text-xs text-slate-500 font-mono">[{error.code}] {error.message}</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Leads" description="Pipeline de prospectos comerciales">
      <LeadsView initialLeads={(data ?? []) as unknown as Lead[]} />
    </PageShell>
  )
}
