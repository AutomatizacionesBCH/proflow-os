type PageShellProps = {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function PageShell({ title, description, action, children }: PageShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
          {description && (
            <p className="text-sm text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  )
}
