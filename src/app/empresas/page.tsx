import { PageShell } from '@/components/layout/PageShell'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Building2 } from 'lucide-react'
import type { Status } from '@/types'

type EmpresaRow = {
  razon: string
  rfc: string
  sector: string
  representante: string
  estado: Status
}

const empresas: EmpresaRow[] = [
  { razon: 'Tech Solutions SA de CV', rfc: 'TES210415ABC', sector: 'Tecnología', representante: 'Carlos Méndez', estado: 'active' },
  { razon: 'Distribuidora Norte SA', rfc: 'DNO190820XYZ', sector: 'Distribución', representante: 'Ana Rodríguez', estado: 'active' },
  { razon: 'Importadora Global SRL', rfc: 'IGL180312DEF', sector: 'Importación', representante: 'Luis Pérez', estado: 'pending' },
  { razon: 'RetailCo Express SA', rfc: 'RCE220601GHI', sector: 'Retail', representante: 'Diana Soto', estado: 'active' },
  { razon: 'FinTech MX SAPI', rfc: 'FMX230115JKL', sector: 'Finanzas', representante: 'Marco Torres', estado: 'pending' },
]

export default function EmpresasPage() {
  return (
    <PageShell
      title="Empresas"
      description="Entidades legales registradas"
      action={<Button icon={Building2} size="sm">Nueva empresa</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Empresas registradas" value="18" />
        <StatCard label="Verificadas" value="14" delta="+2" deltaDirection="up" />
        <StatCard label="Pendientes" value="4" />
        <StatCard label="Sectores" value="7" />
      </div>

      <Card noPadding>
        <div className="p-5 border-b border-slate-800">
          <SectionTitle
            title="Directorio de empresas"
            subtitle="Todas las entidades registradas"
          />
        </div>
        <DataTable<Record<string, unknown>>
          columns={[
            { key: 'razon', header: 'Razón Social' },
            { key: 'rfc', header: 'RFC' },
            { key: 'sector', header: 'Sector' },
            { key: 'representante', header: 'Representante' },
            {
              key: 'estado',
              header: 'Estado',
              render: (row) => <Badge variant={row.estado as Status} />,
            },
          ]}
          data={empresas as unknown as Record<string, unknown>[]}
        />
      </Card>
    </PageShell>
  )
}
