type PlaceholderChartProps = {
  height?: number
  label?: string
}

export function PlaceholderChart({ height = 180, label = 'Gráfico' }: PlaceholderChartProps) {
  return (
    <div
      className="w-full rounded-lg bg-slate-900/50 border border-slate-800/60 flex items-center justify-center text-slate-600 text-xs font-medium tracking-wide"
      style={{ height }}
    >
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-2 rounded-md bg-slate-800 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-slate-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 18l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {label}
      </div>
    </div>
  )
}
