import { PageShell } from '@/components/layout/PageShell'
import { PlaybooksView } from '@/components/playbooks/PlaybooksView'
import { getAllPlaybooks, getAllAssignmentsWithContext } from './actions'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

export default async function PlaybooksPage() {
  const [playbooks, assignments] = await Promise.all([
    getAllPlaybooks(),
    getAllAssignmentsWithContext(),
  ])

  return (
    <PageShell
      title="Playbooks"
      description="Estrategias repetibles para leads y clientes"
    >
      <PlaybooksView
        initialPlaybooks={playbooks}
        initialAssignments={assignments}
      />
    </PageShell>
  )
}
