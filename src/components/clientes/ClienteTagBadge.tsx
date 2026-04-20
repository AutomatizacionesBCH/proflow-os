import { cn } from '@/lib/utils'
import type { ClientTag } from '@/types'

const tagStyles: Record<ClientTag, string> = {
  VIP:       'bg-purple-500/10 text-purple-400 border-purple-500/20',
  frecuente: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  nuevo:     'bg-green-500/10 text-green-400 border-green-500/20',
  riesgo:    'bg-red-500/10 text-red-400 border-red-500/20',
  pausado:   'bg-slate-700/50 text-slate-400 border-slate-600/30',
}

const tagDots: Record<ClientTag, string> = {
  VIP:       'bg-purple-400',
  frecuente: 'bg-blue-400',
  nuevo:     'bg-green-400',
  riesgo:    'bg-red-400',
  pausado:   'bg-slate-400',
}

type Props = { tag: ClientTag }

export function ClienteTagBadge({ tag }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border',
        tagStyles[tag]
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', tagDots[tag])} />
      {tag}
    </span>
  )
}
