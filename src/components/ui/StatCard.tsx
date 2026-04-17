import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'

type StatCardProps = {
  label: string
  value: string
  delta?: string
  deltaDirection?: 'up' | 'down' | 'neutral'
  icon?: LucideIcon
  iconColor?: string
  sublabel?: string
}

export function StatCard({
  label,
  value,
  delta,
  deltaDirection = 'neutral',
  icon: Icon,
  iconColor = 'text-blue-400',
  sublabel,
}: StatCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center">
            <Icon className={cn('w-4 h-4', iconColor)} />
          </div>
        )}
      </div>

      <div className="mt-3">
        <span className="text-2xl font-bold text-slate-100 font-mono">{value}</span>
      </div>

      {(delta || sublabel) && (
        <div className="mt-2 flex items-center gap-1.5">
          {delta && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                deltaDirection === 'up' && 'text-green-400',
                deltaDirection === 'down' && 'text-red-400',
                deltaDirection === 'neutral' && 'text-slate-400'
              )}
            >
              {deltaDirection === 'up' && <TrendingUp className="w-3 h-3" />}
              {deltaDirection === 'down' && <TrendingDown className="w-3 h-3" />}
              {delta}
            </span>
          )}
          {sublabel && <span className="text-xs text-slate-500">{sublabel}</span>}
        </div>
      )}
    </div>
  )
}
