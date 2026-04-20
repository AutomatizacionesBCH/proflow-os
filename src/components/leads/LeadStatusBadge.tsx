import { cn } from '@/lib/utils'
import type { LeadStatus } from '@/types'

const styles: Record<LeadStatus, string> = {
  nuevo:          'bg-slate-500/10 text-slate-300 border-slate-500/20',
  contactado:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  en_seguimiento: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  convertido:     'bg-green-500/10 text-green-400 border-green-500/20',
  perdido:        'bg-red-500/10 text-red-400 border-red-500/20',
}

const dots: Record<LeadStatus, string> = {
  nuevo:          'bg-slate-400',
  contactado:     'bg-blue-400',
  en_seguimiento: 'bg-amber-400',
  convertido:     'bg-green-400',
  perdido:        'bg-red-400',
}

const labels: Record<LeadStatus, string> = {
  nuevo:          'Nuevo',
  contactado:     'Contactado',
  en_seguimiento: 'En seguimiento',
  convertido:     'Convertido',
  perdido:        'Perdido',
}

type Props = { status: LeadStatus }

export function LeadStatusBadge({ status }: Props) {
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
