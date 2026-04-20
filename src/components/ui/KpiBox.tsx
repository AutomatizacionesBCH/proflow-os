import { cn } from '@/lib/utils'

type Props = {
  label:     string
  value:     string
  sub?:      string
  positive?: boolean
  warn?:     boolean
  danger?:   boolean
  highlight?: boolean
}

export function KpiBox({ label, value, sub, positive, warn, danger, highlight }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{label}</p>
      <p className={cn(
        'text-2xl font-bold font-mono leading-none',
        highlight ? 'text-purple-400' :
        danger    ? 'text-red-400'    :
        warn      ? 'text-amber-400'  :
        positive  ? 'text-green-400'  :
        'text-slate-100'
      )}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 font-mono mt-2">{sub}</p>}
    </div>
  )
}
