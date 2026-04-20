type PageShellProps = {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function PageShell({ title, description, action, children }: PageShellProps) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-start justify-between gap-3 pb-4 sm:pb-5 border-b border-slate-800">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100 truncate">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5 sm:mt-1">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}
