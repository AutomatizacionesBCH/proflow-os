type Column<T> = {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  width?: string
}

type DataTableProps<T> = {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = 'Sin registros',
}: DataTableProps<T>) {
  return (
    <div className="table-scroll">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-slate-500 text-xs"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="py-3 px-4 text-slate-300">
                    {col.render
                      ? col.render(row)
                      : String(row[col.key as keyof T] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
