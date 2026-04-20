import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { ProcesadoresView } from '@/components/procesadores/ProcesadoresView'
import type { Processor, Company } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProcesadoresPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [processorsRes, companiesRes, todayOpsRes] = await Promise.all([
    supabase.from('processors').select('*').order('name'),
    supabase.from('companies').select('id, name').order('name'),
    supabase
      .from('operations')
      .select('processor_id, amount_usd')
      .gte('operation_date', today)
      .neq('status', 'anulada'),
  ])

  if (processorsRes.error) {
    return (
      <PageShell title="Procesadores" description="Procesadores de pago configurados">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <p className="text-sm font-semibold text-red-400 mb-1">Error de conexión</p>
          <p className="text-xs text-slate-500 font-mono">
            [{processorsRes.error.code}] {processorsRes.error.message}
          </p>
        </div>
      </PageShell>
    )
  }

  const dailyUsage: Record<string, number> = {}
  for (const op of todayOpsRes.data ?? []) {
    if (op.processor_id) {
      dailyUsage[op.processor_id] = (dailyUsage[op.processor_id] ?? 0) + (op.amount_usd ?? 0)
    }
  }

  return (
    <PageShell title="Procesadores" description="Procesadores de pago configurados">
      <ProcesadoresView
        initialProcesadores={(processorsRes.data ?? []) as Processor[]}
        companies={(companiesRes.data ?? []) as Pick<Company, 'id' | 'name'>[]}
        dailyUsage={dailyUsage}
      />
    </PageShell>
  )
}
