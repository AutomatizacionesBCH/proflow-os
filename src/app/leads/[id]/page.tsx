import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { LeadDetalle } from '@/components/leads/LeadDetalle'
import { getSignalsByLead } from '@/app/leads/behavior-actions'
import { getActivePlaybooksFor, getAllPlaybooks } from '@/app/playbooks/actions'
import type { Lead } from '@/types'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{ id: string }>
}

export default async function LeadDetallePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [leadRes, signals, assignments, playbooks] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('leads').select('*').eq('id', id).single(),
    getSignalsByLead(id),
    getActivePlaybooksFor({ leadId: id }),
    getAllPlaybooks(),
  ])

  if (leadRes.error || !leadRes.data) notFound()

  const lead = leadRes.data as Lead

  return (
    <PageShell title="" description="">
      <LeadDetalle
        lead={lead}
        initialSignals={signals}
        initialAssignments={assignments}
        allPlaybooks={playbooks}
      />
    </PageShell>
  )
}
