import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { MarketingView } from '@/components/marketing/MarketingView'
import type { MarketingSpend } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MarketingPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketing_spend')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    return (
      <PageShell title="Marketing" description="Gasto publicitario por canal">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <p className="text-sm font-semibold text-red-400 mb-1">Error de conexión</p>
          <p className="text-xs text-slate-500 font-mono">[{error.code}] {error.message}</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Marketing" description="Gasto publicitario por canal">
      <MarketingView initialSpends={(data ?? []) as MarketingSpend[]} />
    </PageShell>
  )
}
