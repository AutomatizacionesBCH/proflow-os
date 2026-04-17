import { PageShell } from '@/components/layout/PageShell'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import type { Status } from '@/types'

type Operacion = {
  id: string
  cliente: string
  monto: string
  estado: Status
  fecha: string
}

const sampleOps: Operacion[] = [
  { id: 'OP-0091', cliente: 'Tech Solutions SA', monto: '$12,400', estado: 'active', fecha: '17/04/2026' },
  { id: 'OP-0090', cliente: 'Distribuidora Norte', monto: '$8,750', estado: 'pending', fecha: '16/04/2026' },
  { id: 'OP-0089', cliente: 'Importadora Global', monto: '$31,200', estado: 'active', fecha: '15/04/2026' },
  { id: 'OP-0088', cliente: 'RetailCo Express', monto: '$5,600', estado: 'inactive', fecha: '14/04/2026' },
  { id: 'OP-0087', cliente: 'TradeCorp MX', monto: '$22,900', estado: 'active', fecha: '13/04/2026' },
]

export default function OperacionesPage() {
  return (
    <PageShell
      title="Operaciones"
      description="Gestión de flujos y transacciones"
      action={<Button icon={Plus} size="sm">Nueva operación</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Procesadas hoy" value="47" />
        <StatCard
          label="Monto del día"
          value="$284,100"
          delta="+6.1%"
          deltaDirection="up"
          sublabel="vs ayer"
        />
        <StatCard
          label="Pendientes"
          value="12"
          delta="3 urgentes"
          deltaDirection="down"
        />
      </div>

      <Card noPadding>
        <div className="p-5 border-b border-slate-800">
          <SectionTitle
            title="Registro de operaciones"
            subtitle="Todas las transacciones"
          />
        </div>
        <DataTable<Record<string, unknown>>
          columns={[
            { key: 'id', header: 'ID', width: '110px' },
            { key: 'cliente', header: 'Cliente' },
            { key: 'monto', header: 'Monto' },
            { key: 'fecha', header: 'Fecha' },
            {
              key: 'estado',
              header: 'Estado',
              render: (row) => <Badge variant={row.estado as Status} />,
            },
          ]}
          data={sampleOps as unknown as Record<string, unknown>[]}
        />
      </Card>
    </PageShell>
  )
}
