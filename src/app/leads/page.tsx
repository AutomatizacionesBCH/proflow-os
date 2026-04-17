import { PageShell } from '@/components/layout/PageShell'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

type LeadCard = {
  nombre: string
  empresa: string
  valor: string
}

type PipelineStage = {
  label: string
  color: string
  leads: LeadCard[]
}

const pipeline: PipelineStage[] = [
  {
    label: 'Nuevo',
    color: 'border-slate-600',
    leads: [
      { nombre: 'Carlos M.', empresa: 'LogiMax SA', valor: '$18,000' },
      { nombre: 'Sofia R.', empresa: 'DataMX', valor: '$9,500' },
    ],
  },
  {
    label: 'Contactado',
    color: 'border-blue-500/40',
    leads: [
      { nombre: 'Ana R.', empresa: 'FinTech MX', valor: '$45,000' },
      { nombre: 'Luis P.', empresa: 'Cargo Norte', valor: '$12,000' },
    ],
  },
  {
    label: 'Propuesta',
    color: 'border-amber-500/40',
    leads: [
      { nombre: 'Diana S.', empresa: 'RetailCo', valor: '$28,000' },
    ],
  },
  {
    label: 'Cerrado',
    color: 'border-green-500/40',
    leads: [
      { nombre: 'Marco T.', empresa: 'TradeCorp', valor: '$60,000' },
      { nombre: 'Emilio V.', empresa: 'PagaMX', valor: '$34,000' },
    ],
  },
]

export default function LeadsPage() {
  return (
    <PageShell
      title="Leads"
      description="Pipeline de prospectos comerciales"
      action={<Button icon={Plus} size="sm">Nuevo lead</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total leads"
          value="67"
          delta="+22.5%"
          deltaDirection="up"
        />
        <StatCard label="En propuesta" value="12" />
        <StatCard
          label="Tasa de cierre"
          value="34%"
          delta="+5pt"
          deltaDirection="up"
        />
        <StatCard label="Valor pipeline" value="$348,000" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {pipeline.map((stage) => (
          <Card key={stage.label} className="min-h-64">
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">{stage.label}</h3>
                <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-md">
                  {stage.leads.length}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {stage.leads.map((lead, i) => (
                <div
                  key={i}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg p-3 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-medium text-slate-200">{lead.nombre}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{lead.empresa}</p>
                  <p className="text-xs font-mono text-blue-400 mt-1.5">{lead.valor}</p>
                </div>
              ))}
              <button className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-600 hover:text-slate-400 border border-dashed border-slate-800 hover:border-slate-700 rounded-lg transition-colors">
                <Plus className="w-3 h-3" />
                Agregar
              </button>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
