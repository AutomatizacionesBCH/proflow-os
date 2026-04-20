import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { ClientesView } from '@/components/clientes/ClientesView'
import type { Cliente, Company, Processor } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ClientesPage() {
  const supabase = await createClient()

  const [clientesRes, companiesRes, processorsRes] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('companies').select('id, name, created_at').order('name'),
    supabase.from('processors').select('id, name, type, created_at').order('name'),
  ])

  if (clientesRes.error) {
    return (
      <PageShell title="Clientes" description="Base de clientes registrados">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <p className="text-sm font-semibold text-red-400 mb-1">Error de conexión</p>
          <p className="text-xs text-slate-500 font-mono">
            [{clientesRes.error.code}] {clientesRes.error.message}
          </p>
        </div>
      </PageShell>
    )
  }

  const clientes  = (clientesRes.data  ?? []) as Cliente[]
  const companies = (companiesRes.data  ?? []) as Company[]
  const processors = (processorsRes.data ?? []) as Processor[]

  return (
    <PageShell title="Clientes" description="Base de clientes registrados">
      <ClientesView
        initialClientes={clientes}
        companies={companies}
        processors={processors}
      />
    </PageShell>
  )
}
