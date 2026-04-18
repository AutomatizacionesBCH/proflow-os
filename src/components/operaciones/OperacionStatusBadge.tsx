import { cn } from '@/lib/utils'
import type { OperationStatus } from '@/types'

const styles: Record<OperationStatus, string> = {
  pendiente:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  en_proceso:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completada:  'bg-green-500/10 text-green-400 border-green-500/20',
  anulada:     'bg-slate-700/50 text-slate-400 border-slate-600/30',
}

const dots: Record<OperationStatus, string> = {
  pendiente:  'bg-amber-400',
  en_proceso: 'bg-blue-400',
  completada: 'bg-green-400',
  anulada:    'bg-slate-500',
}

const labels: Record<OperationStatus, string> = {
  pendiente:  'Pendiente',
  en_proceso: 'En Proceso',
  completada: 'Completada',
  anulada:    'Anulada',
}

export function OperacionStatusBadge({ status }: { status: OperationStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap',
        styles[status]
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dots[status])} />
      {labels[status]}
    </span>
  )
}
