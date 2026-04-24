import { notFound } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { PlaybookDetail } from '@/components/playbooks/PlaybookDetail'
import { getPlaybookWithSteps, getActivePlaybooksFor } from '../actions'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{ id: string }>
}

export default async function PlaybookDetailPage({ params }: Props) {
  const { id } = await params

  // Reutilizamos getActivePlaybooksFor pasando el playbook_id como filtro manual
  const [pb, allAssignments] = await Promise.all([
    getPlaybookWithSteps(id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('playbook_assignments')
        .select('*')
        .eq('playbook_id', id)
        .order('created_at', { ascending: false })
      return data ?? []
    })(),
  ])

  if (!pb) notFound()

  return (
    <PageShell title="" description="">
      <PlaybookDetail playbook={pb} assignments={allAssignments} />
    </PageShell>
  )
}
