import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { OperacionesView } from '@/components/operaciones/OperacionesView'
import type { Operation } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OperacionesPage() {
  const supabase = await createClient()

  const [opsRes, clientsRes, companiesRes, processorsRes] = await Promise.all([
    supabase
      .from('operations')
      .select('*')
      .order('operation_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10000),
    supabase.from('clients').select('id, full_name').limit(10000),
    supabase.from('companies').select('id, name'),
    supabase.from('processors').select('id, name'),
  ])

  if (opsRes.error) {
    return (
      <PageShell title="Operaciones" description="Gestión de flujos y transacciones">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <p className="text-sm font-semibold text-red-400 mb-1">Error de conexión</p>
          <p className="text-xs text-slate-500 font-mono">[{opsRes.error.code}] {opsRes.error.message}</p>
        </div>
      </PageShell>
    )
  }

  const operations: Operation[] = (opsRes.data ?? []) as Operation[]

  const clientMap:    Record<string, string> = Object.fromEntries((clientsRes.data    ?? []).map(c => [c.id, c.full_name]))
  const companyMap:   Record<string, string> = Object.fromEntries((companiesRes.data  ?? []).map(c => [c.id, c.name]))
  const processorMap: Record<string, string> = Object.fromEntries((processorsRes.data ?? []).map(p => [p.id, p.name]))

  return (
    <PageShell title="Operaciones" description="Gestión de flujos y transacciones">
      <OperacionesView
        initialOperations={operations}
        clientMap={clientMap}
        companyMap={companyMap}
        processorMap={processorMap}
      />
    </PageShell>
  )
}
