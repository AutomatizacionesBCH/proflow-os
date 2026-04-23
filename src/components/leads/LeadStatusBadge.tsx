import { cn } from '@/lib/utils'
import type { LeadStage } from '@/types'

const styles: Record<LeadStage, string> = {
  new:               'bg-slate-500/10 text-slate-300 border-slate-500/20',
  contacted:         'bg-blue-500/10 text-blue-400 border-blue-500/20',
  qualified:         'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  docs_pending:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ready_to_schedule: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  ready_to_operate:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  operated:          'bg-green-500/10 text-green-400 border-green-500/20',
  dormant:           'bg-slate-600/10 text-slate-500 border-slate-600/20',
  lost:              'bg-red-500/10 text-red-400 border-red-500/20',
}

const dots: Record<LeadStage, string> = {
  new:               'bg-slate-400',
  contacted:         'bg-blue-400',
  qualified:         'bg-cyan-400',
  docs_pending:      'bg-amber-400',
  ready_to_schedule: 'bg-violet-400',
  ready_to_operate:  'bg-indigo-400',
  operated:          'bg-green-400',
  dormant:           'bg-slate-500',
  lost:              'bg-red-400',
}

const labels: Record<LeadStage, string> = {
  new:               'Nuevo',
  contacted:         'Contactado',
  qualified:         'Calificado',
  docs_pending:      'Docs pendientes',
  ready_to_schedule: 'Listo agendar',
  ready_to_operate:  'Listo operar',
  operated:          'Operado',
  dormant:           'Dormido',
  lost:              'Perdido',
}

type Props = { status: LeadStage }

export function LeadStatusBadge({ status }: Props) {
  const safeStatus = status in styles ? status : 'new'
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border',
      styles[safeStatus]
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dots[safeStatus])} />
      {labels[safeStatus]}
    </span>
  )
}
