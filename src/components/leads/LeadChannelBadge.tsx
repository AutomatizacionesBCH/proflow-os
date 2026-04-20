import { cn } from '@/lib/utils'
import type { LeadChannel } from '@/types'

const styles: Record<LeadChannel, string> = {
  'Meta':      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'TikTok':    'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'LinkedIn':  'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Twitter/X': 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  'referido':  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'otro':      'bg-slate-700/40 text-slate-400 border-slate-600/30',
}

type Props = { channel: LeadChannel | null }

export function LeadChannelBadge({ channel }: Props) {
  if (!channel) return <span className="text-slate-600 text-xs">—</span>
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
      styles[channel]
    )}>
      {channel}
    </span>
  )
}
