import { PageShell } from '@/components/layout/PageShell'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { PlaceholderChart } from '@/components/charts/PlaceholderChart'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import type { Status } from '@/types'

type Campana = {
  nombre: string
  canal: string
  alcance: string
  conversion: string
  leads: string
  estado: Status
}

const campanas: Campana[] = [
  { nombre: 'Email Q2 2026', canal: 'Email', alcance: '4,200', conversion: '3.8%', leads: '159', estado: 'active' },
  { nombre: 'LinkedIn Ads Abril', canal: 'LinkedIn', alcance: '18,500', conversion: '1.2%', leads: '222', estado: 'active' },
  { nombre: 'WhatsApp Reactivación', canal: 'WhatsApp', alcance: '890', conversion: '12.4%', leads: '110', estado: 'pending' },
  { nombre: 'Google Search B2B', canal: 'Google', alcance: '32,000', conversion: '0.9%', leads: '288', estado: 'active' },
]

export default function MarketingPage() {
  return (
    <PageShell
      title="Marketing"
      description="Campañas y canales de adquisición"
      action={<Button icon={Plus} size="sm">Nueva campaña</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Campañas activas" value="6" />
        <StatCard
          label="Alcance total"
          value="55,590"
          delta="+31%"
          deltaDirection="up"
        />
        <StatCard
          label="Leads generados"
          value="779"
          delta="+18%"
          deltaDirection="up"
        />
        <StatCard
          label="Costo por lead"
          value="$12.40"
          delta="-8%"
          deltaDirection="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle
            title="Rendimiento por canal"
            subtitle="Conversiones esta semana"
          />
          <PlaceholderChart height={200} label="Gráfico de barras por canal" />
        </Card>
        <Card>
          <SectionTitle title="Tendencia de leads" subtitle="Últimos 30 días" />
          <PlaceholderChart height={200} label="Gráfico de línea" />
        </Card>
      </div>

      <Card noPadding>
        <div className="p-5 border-b border-slate-800">
          <SectionTitle title="Campañas activas" subtitle="Estado y rendimiento" />
        </div>
        <div className="divide-y divide-slate-800">
          {campanas.map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{c.nombre}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.canal} · {c.alcance} alcance
                </p>
              </div>
              <div className="flex items-center gap-6 ml-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-500">Conversión</p>
                  <p className="text-sm font-mono text-green-400">{c.conversion}</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-xs text-slate-500">Leads</p>
                  <p className="text-sm font-mono text-slate-200">{c.leads}</p>
                </div>
                <Badge variant={c.estado} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  )
}
