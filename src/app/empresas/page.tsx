import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { EmpresasView } from '@/components/empresas/EmpresasView'
import type { Company } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EmpresasPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name')

  if (error) {
    return (
      <PageShell title="Empresas" description="Entidades legales registradas">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <p className="text-sm font-semibold text-red-400 mb-1">Error de conexión</p>
          <p className="text-xs text-slate-500 font-mono">[{error.code}] {error.message}</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Empresas" description="Entidades legales registradas">
      <EmpresasView initialEmpresas={(data ?? []) as Company[]} />
    </PageShell>
  )
}
