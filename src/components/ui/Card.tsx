import { cn } from '@/lib/utils'

type CardProps = {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function Card({ children, className, noPadding }: CardProps) {
  return (
    <div
      className={cn(
        'bg-slate-900 border border-slate-800 rounded-xl',
        !noPadding && 'p-5',
        className
      )}
    >
      {children}
    </div>
  )
}
