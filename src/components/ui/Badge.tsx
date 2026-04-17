import { cn } from '@/lib/utils'

type BadgeVariant = 'active' | 'inactive' | 'pending' | 'warning' | 'info'

const variantStyles: Record<BadgeVariant, string> = {
  active:   'bg-green-500/10 text-green-400 border-green-500/20',
  inactive: 'bg-slate-700/50 text-slate-400 border-slate-600/30',
  pending:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  warning:  'bg-red-500/10 text-red-400 border-red-500/20',
  info:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

const dotStyles: Record<BadgeVariant, string> = {
  active:   'bg-green-400',
  inactive: 'bg-slate-400',
  pending:  'bg-amber-400',
  warning:  'bg-red-400',
  info:     'bg-blue-400',
}

const defaultLabels: Record<BadgeVariant, string> = {
  active:   'Activo',
  inactive: 'Inactivo',
  pending:  'Pendiente',
  warning:  'Alerta',
  info:     'Info',
}

type BadgeProps = {
  variant: BadgeVariant
  label?: string
}

export function Badge({ variant, label }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border',
        variantStyles[variant]
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotStyles[variant])} />
      {label ?? defaultLabels[variant]}
    </span>
  )
}
