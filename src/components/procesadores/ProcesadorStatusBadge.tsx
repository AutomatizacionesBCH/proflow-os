import { cn } from '@/lib/utils'
import type { ProcessorStatus } from '@/types'

const styles: Record<ProcessorStatus, string> = {
  activo:    'bg-green-500/10 text-green-400 border-green-500/20',
  pausado:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  en_riesgo: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const dots: Record<ProcessorStatus, string> = {
  activo:    'bg-green-400',
  pausado:   'bg-amber-400',
  en_riesgo: 'bg-red-400',
}

const labels: Record<ProcessorStatus, string> = {
  activo:    'Activo',
  pausado:   'Pausado',
  en_riesgo: 'En riesgo',
}

type Props = { status: ProcessorStatus | null }

export function ProcesadorStatusBadge({ status }: Props) {
  if (!status) return <span className="text-slate-600 text-xs">—</span>
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border',
      styles[status]
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dots[status])} />
      {labels[status]}
    </span>
  )
}
