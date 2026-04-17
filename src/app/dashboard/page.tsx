import { PageShell } from '@/components/layout/PageShell'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { PlaceholderChart } from '@/components/charts/PlaceholderChart'
import { DollarSign, Users, Workflow, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  return (
    <PageShell title="Dashboard" description="Resumen ejecutivo del sistema">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Volumen Total"
          value="$1,248,500"
          delta="+8.2%"
          deltaDirection="up"
          icon={DollarSign}
          sublabel="vs mes anterior"
        />
        <StatCard
          label="Clientes Activos"
          value="342"
          delta="+14"
          deltaDirection="up"
          icon={Users}
          iconColor="text-indigo-400"
          sublabel="este mes"
        />
        <StatCard
          label="Operaciones"
          value="1,089"
          delta="-3.1%"
          deltaDirection="down"
          icon={Workflow}
          iconColor="text-amber-400"
          sublabel="últimos 30 días"
        />
        <StatCard
          label="Leads Nuevos"
          value="67"
          delta="+22.5%"
          deltaDirection="up"
          icon={TrendingUp}
          iconColor="text-green-400"
          sublabel="esta semana"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionTitle title="Volumen por día" subtitle="Últimos 30 días" />
          <PlaceholderChart height={200} label="Gráfico de barras" />
        </Card>
        <Card>
          <SectionTitle title="Distribución" subtitle="Por procesador" />
          <PlaceholderChart height={200} label="Gráfico circular" />
        </Card>
      </div>

      {/* Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle title="Últimas operaciones" />
          <PlaceholderChart height={140} label="Tabla de actividad reciente" />
        </Card>
        <Card>
          <SectionTitle title="Alertas del sistema" />
          <div className="space-y-3">
            {[
              'Procesador sin actividad 48h',
              'Lead sin seguimiento 7 días',
              'Empresa pendiente de verificación',
            ].map((msg, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">{msg}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
