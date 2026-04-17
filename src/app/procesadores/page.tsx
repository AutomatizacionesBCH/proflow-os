import { PageShell } from '@/components/layout/PageShell'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Plus, Activity } from 'lucide-react'
import type { Status } from '@/types'

type ProcesadorCard = {
  nombre: string
  tipo: string
  fee: string
  estado: Status
  volumen: string
  transacciones: string
}

const procesadores: ProcesadorCard[] = [
  { nombre: 'Stripe', tipo: 'Tarjetas internacionales', fee: '2.9% + $0.30', estado: 'active', volumen: '$420,000', transacciones: '342' },
  { nombre: 'PayPal', tipo: 'Billetera digital', fee: '3.5%', estado: 'active', volumen: '$218,500', transacciones: '198' },
  { nombre: 'Conekta', tipo: 'Local México', fee: '2.4%', estado: 'pending', volumen: '$94,200', transacciones: '87' },
  { nombre: 'OpenPay', tipo: 'Local México', fee: '2.1%', estado: 'inactive', volumen: '$12,000', transacciones: '11' },
]

export default function ProcesadoresPage() {
  return (
    <PageShell
      title="Procesadores"
      description="Procesadores de pago configurados"
      action={<Button icon={Plus} size="sm">Añadir procesador</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Procesadores activos" value="3" />
        <StatCard label="Fee promedio" value="2.97%" />
        <StatCard
          label="Volumen total"
          value="$744,700"
          delta="+11.3%"
          deltaDirection="up"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {procesadores.map((p) => (
          <Card key={p.nombre}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm">{p.nombre}</h3>
                    <span className="text-xs text-slate-500">{p.tipo}</span>
                  </div>
                </div>
              </div>
              <Badge variant={p.estado} />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800">
              <div>
                <p className="text-xs text-slate-500 mb-1">Fee</p>
                <p className="text-sm font-mono text-slate-200">{p.fee}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Vol. mensual</p>
                <p className="text-sm font-mono text-slate-200">{p.volumen}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Transac.</p>
                <p className="text-sm font-mono text-slate-200">{p.transacciones}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <SectionTitle title="Configuración de integración" subtitle="Conecta nuevos procesadores a través de la API" />
    </PageShell>
  )
}
