import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { ClienteDetalle } from '@/components/clientes/ClienteDetalle'
import { getSignalsByClient } from '@/app/leads/behavior-actions'
import type { Cliente, Company, Operation, Processor } from '@/types'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{ id: string }>
}

export default async function ClienteDetallePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [clienteRes, opsRes, companiesRes, processorsRes, signals] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase
      .from('operations')
      .select('*')
      .eq('client_id', id)
      .order('operation_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('companies').select('id, name, created_at').order('name'),
    supabase.from('processors').select('id, name, type, created_at').order('name'),
    getSignalsByClient(id),
  ])

  if (clienteRes.error || !clienteRes.data) notFound()

  const cliente    = clienteRes.data as Cliente
  const operations = (opsRes.data ?? []) as Operation[]
  const companies  = (companiesRes.data ?? []) as Company[]
  const processors = (processorsRes.data ?? []) as Processor[]

  return (
    <PageShell title="" description="">
      <ClienteDetalle
        cliente={cliente}
        operations={operations}
        companies={companies}
        processors={processors}
        initialSignals={signals}
      />
    </PageShell>
  )
}
