import { PageShell } from '@/components/layout/PageShell'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { PlaceholderChart } from '@/components/charts/PlaceholderChart'
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react'

type Movimiento = {
  tipo: 'ingreso' | 'egreso'
  descripcion: string
  monto: string
  hora: string
}

const movimientos: Movimiento[] = [
  { tipo: 'ingreso', descripcion: 'Cobro cliente OP-0091', monto: '+$12,400', hora: '09:14' },
  { tipo: 'egreso', descripcion: 'Pago proveedor #44', monto: '-$3,200', hora: '11:02' },
  { tipo: 'ingreso', descripcion: 'Cobro cliente OP-0089', monto: '+$31,200', hora: '13:45' },
  { tipo: 'egreso', descripcion: 'Comisión procesador', monto: '-$890', hora: '15:30' },
  { tipo: 'ingreso', descripcion: 'Cobro cliente OP-0086', monto: '+$8,750', hora: '16:18' },
]

export default function CajaPage() {
  return (
    <PageShell
      title="Caja"
      description="Control de flujo de efectivo y saldos"
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Saldo disponible" value="$284,310" />
        <StatCard
          label="Entradas hoy"
          value="$43,600"
          delta="+18.4%"
          deltaDirection="up"
        />
        <StatCard label="Salidas hoy" value="$4,090" />
        <StatCard
          label="Flujo neto"
          value="$39,510"
          delta="Positivo"
          deltaDirection="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionTitle title="Flujo semanal" subtitle="Entradas vs Salidas" />
          <PlaceholderChart height={180} label="Gráfico de línea" />
        </Card>

        <Card>
          <SectionTitle title="Movimientos recientes" />
          <div className="space-y-1">
            {movimientos.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                      m.tipo === 'ingreso'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {m.tipo === 'ingreso' ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-300">{m.descripcion}</p>
                    <p className="text-xs text-slate-600">{m.hora}</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-mono font-medium ${
                    m.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {m.monto}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle title="Saldo por cuenta" subtitle="Distribución de fondos" />
          <PlaceholderChart height={140} label="Gráfico de distribución" />
        </Card>
        <Card>
          <SectionTitle title="Proyección mensual" subtitle="Estimado de cierre" />
          <PlaceholderChart height={140} label="Proyección de flujo" />
        </Card>
      </div>
    </PageShell>
  )
}
