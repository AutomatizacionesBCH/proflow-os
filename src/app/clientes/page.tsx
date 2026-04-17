import { PageShell } from '@/components/layout/PageShell'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { UserPlus } from 'lucide-react'
import type { Status } from '@/types'

type ClienteRow = {
  nombre: string
  email: string
  volumen: string
  operaciones: string
  estado: Status
}

const sampleClientes: ClienteRow[] = [
  { nombre: 'Tech Solutions SA', email: 'ops@techsolutions.com', volumen: '$48,200', operaciones: '34', estado: 'active' },
  { nombre: 'Distribuidora Norte', email: 'admin@distnorte.mx', volumen: '$22,750', operaciones: '18', estado: 'active' },
  { nombre: 'Comercio Express', email: 'finanzas@comexp.com', volumen: '$8,100', operaciones: '7', estado: 'inactive' },
  { nombre: 'LogiMax SA', email: 'ceo@logimax.com', volumen: '$34,900', operaciones: '22', estado: 'active' },
  { nombre: 'FinTech MX', email: 'ops@fintechmx.io', volumen: '$91,400', operaciones: '67', estado: 'active' },
]

export default function ClientesPage() {
  return (
    <PageShell
      title="Clientes"
      description="Base de clientes registrados"
      action={<Button icon={UserPlus} size="sm">Agregar cliente</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total clientes" value="342" />
        <StatCard
          label="Activos este mes"
          value="289"
          delta="+14"
          deltaDirection="up"
        />
        <StatCard label="Volumen promedio" value="$14,800" />
      </div>

      <Card noPadding>
        <div className="p-5 border-b border-slate-800">
          <SectionTitle title="Directorio de clientes" />
        </div>
        <DataTable<Record<string, unknown>>
          columns={[
            { key: 'nombre', header: 'Nombre' },
            { key: 'email', header: 'Email' },
            { key: 'volumen', header: 'Volumen total' },
            { key: 'operaciones', header: 'Operaciones' },
            {
              key: 'estado',
              header: 'Estado',
              render: (row) => <Badge variant={row.estado as Status} />,
            },
          ]}
          data={sampleClientes as unknown as Record<string, unknown>[]}
        />
      </Card>
    </PageShell>
  )
}
