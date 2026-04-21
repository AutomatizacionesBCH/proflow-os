'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Wallet, TrendingUp, Calculator, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCLP, formatUSD } from '@/lib/utils'
import type { CashPosition } from '@/types'
import { CajaForm } from './CajaForm'

// TC promedio estimado para el cálculo de capacidad operativa
const AVG_TC = 950

type Props = { initialPositions: CashPosition[] }

export function CajaView({ initialPositions }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<CashPosition | undefined>(undefined)

  const latest   = initialPositions[0] ?? null
  const previous = initialPositions[1] ?? null

  const delta = latest && previous
    ? latest.available_clp - previous.available_clp
    : null

  const capacidadUSD = latest
    ? Math.floor(latest.available_clp / AVG_TC)
    : null

  function handleSuccess() {
    setShowForm(false)
    setEditing(undefined)
    startTransition(() => router.refresh())
  }

  function openEdit(pos: CashPosition, ev: React.MouseEvent) {
    ev.stopPropagation()
    setEditing(pos)
    setShowForm(true)
  }

  function openCreate() {
    setEditing(undefined)
    setShowForm(true)
  }

  return (
    <>
      {showForm && (
        <CajaForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSuccess={handleSuccess}
          editing={editing}
        />
      )}

      {/* Caja actual */}
      {latest ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Caja actual</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Registrada el {new Date(latest.date + 'T12:00:00').toLocaleDateString('es-CL', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={ev => openEdit(latest, ev)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 rounded-md px-2.5 py-1.5 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Editar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Monto disponible */}
            <div className="sm:col-span-1">
              <p className="text-3xl font-bold font-mono text-slate-100">
                {formatCLP(latest.available_clp)}
              </p>
              {delta !== null && (
                <p className={cn(
                  'text-xs font-mono mt-1 flex items-center gap-1',
                  delta >= 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  <TrendingUp className="w-3 h-3" />
                  {delta >= 0 ? '+' : ''}{formatCLP(delta)} vs registro anterior
                </p>
              )}
              {latest.notes && (
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">{latest.notes}</p>
              )}
            </div>

            {/* Capacidad operativa */}
            <div className="sm:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Capacidad operativa estimada
                </p>
              </div>
              <p className="text-2xl font-bold font-mono text-blue-400">
                ≈ {formatUSD(capacidadUSD)}
              </p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Estimado asumiendo TC promedio de ${AVG_TC.toLocaleString('es-CL')} CLP/USD.
                Con la caja actual puedes operar aproximadamente {formatUSD(capacidadUSD)} en operaciones.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <p className="text-slate-600 mb-0.5">Al 50% de caja</p>
                  <p className="text-slate-300">{formatUSD(Math.floor((latest.available_clp * 0.5) / AVG_TC))}</p>
                </div>
                <div>
                  <p className="text-slate-600 mb-0.5">Al 80% de caja</p>
                  <p className="text-slate-300">{formatUSD(Math.floor((latest.available_clp * 0.8) / AVG_TC))}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-5 h-5 text-slate-600" />
          </div>
          <p className="text-sm text-slate-400 mb-1">Sin registros de caja</p>
          <p className="text-xs text-slate-600">Registra la primera posición para ver el saldo actual.</p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
          Historial de posiciones
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo registro
        </button>
      </div>

      {/* Tabla histórica */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Fecha', 'Caja disponible (CLP)', 'Capacidad ≈ USD', 'Variación', 'Notas', 'Acciones'].map(h => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialPositions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <p className="text-sm text-slate-500">No hay registros aún.</p>
                  </td>
                </tr>
              ) : (
                initialPositions.map((pos, idx) => {
                  const prev = initialPositions[idx + 1]
                  const diff = prev ? pos.available_clp - prev.available_clp : null
                  const capUSD = Math.floor(pos.available_clp / AVG_TC)
                  const isLatest = idx === 0

                  return (
                    <tr
                      key={pos.id}
                      className={cn(
                        'border-b border-slate-800/60 transition-colors',
                        isLatest ? 'bg-blue-600/5 hover:bg-blue-600/10' : 'hover:bg-slate-800/20'
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200 font-medium">
                            {new Date(pos.date + 'T12:00:00').toLocaleDateString('es-CL')}
                          </span>
                          {isLatest && (
                            <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded px-1.5 py-0.5">
                              actual
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-200">
                        {formatCLP(pos.available_clp)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-xs">
                        ≈ {formatUSD(capUSD)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {diff !== null ? (
                          <span className={diff >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {diff >= 0 ? '+' : ''}{formatCLP(diff)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs max-w-xs">
                        <span className="line-clamp-1">{pos.notes || '—'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={ev => openEdit(pos, ev)}
                          className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md px-2 py-1 transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {initialPositions.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              {initialPositions.length} registro{initialPositions.length !== 1 ? 's' : ''} en historial
            </p>
          </div>
        )}
      </div>
    </>
  )
}
