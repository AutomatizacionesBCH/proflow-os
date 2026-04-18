import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { OperacionesView } from '@/components/operaciones/OperacionesView'
import type { Operation } from '@/types'

export default async function OperacionesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('operations')
    .select('*')
    .order('operation_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    // La tabla puede no existir aún — mostrar instrucción de setup
    if (error.code === '42P01') {
      return (
        <PageShell title="Operaciones" description="Gestión de flujos y transacciones">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-amber-400 mb-2">
              Tabla de operaciones no encontrada
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Ejecuta el siguiente SQL en tu Supabase Dashboard → SQL Editor para crear la tabla:
            </p>
            <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 overflow-auto">
              {`-- Archivo: supabase/migrations/001_create_operations.sql
-- Cópialo y ejecútalo en Supabase Dashboard → SQL Editor`}
            </pre>
            <p className="text-xs text-slate-500 mt-3">
              El archivo completo está en{' '}
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                supabase/migrations/001_create_operations.sql
              </code>
            </p>
          </div>
        </PageShell>
      )
    }

    return (
      <PageShell title="Operaciones" description="Gestión de flujos y transacciones">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <p className="text-sm font-semibold text-red-400 mb-1">Error al conectar con Supabase</p>
          <p className="text-xs text-slate-500 font-mono">{error.message}</p>
        </div>
      </PageShell>
    )
  }

  const operations: Operation[] = (data ?? []) as Operation[]

  return (
    <PageShell
      title="Operaciones"
      description="Gestión de flujos y transacciones"
    >
      <OperacionesView initialOperations={operations} />
    </PageShell>
  )
}
