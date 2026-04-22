'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Calculator, Copy, Check, Sparkles } from 'lucide-react'
import { cn, formatCLP, suggestPayoutPct } from '@/lib/utils'

const inputCls =
  'w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors'
const labelCls = 'block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5'

type Props = { onClose: () => void }

export function CotizacionModal({ onClose }: Props) {
  const [usd, setUsd]       = useState('')
  const [fx, setFx]         = useState('')
  const [pct, setPct]       = useState('')
  const [pctManual, setPctManual] = useState(false)
  const [copied, setCopied] = useState(false)

  const usdN = parseFloat(usd) || 0
  const fxN  = parseFloat(fx)  || 0
  const pctN = parseFloat(pct) || 0

  // Auto-sugerir % cuando cambia el monto (mismo criterio que OperacionForm)
  useEffect(() => {
    if (pctManual) return
    if (usdN > 0) setPct(String(suggestPayoutPct(usdN)))
  }, [usdN, pctManual])

  const clpN = useMemo(() => Math.round(usdN * fxN * (pctN / 100)), [usdN, fxN, pctN])

  const fechaLarga = useMemo(
    () => new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
    [],
  )

  const ready = usdN > 0 && fxN > 0 && pctN > 0

  const mensaje = ready
    ? `💰 Cotización válida por hoy (${fechaLarga})

Por los ${usdN.toLocaleString('es-CL', { maximumFractionDigits: 0 })} USD que estás solicitando, recibirás un total de ${formatCLP(clpN)} CLP 🇨🇱

✨ ¿Te gustaría continuar con el proceso? Estoy atenta para ayudarte 👍`
    : ''

  async function handleCopy() {
    if (!mensaje) return
    try {
      await navigator.clipboard.writeText(mensaje)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // fallback silencioso
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-slate-900 rounded-xl border border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Calculator className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Generar Cotización</h3>
              <p className="text-xs text-slate-500 mt-0.5">Mensaje listo para enviar al cliente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 overflow-y-auto space-y-5">
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Monto USD</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="2000"
                className={inputCls}
                value={usd}
                onChange={e => setUsd(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls}>Tipo de Cambio</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="930.00"
                className={inputCls}
                value={fx}
                onChange={e => setFx(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>% Pago al Cliente</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="79"
                  className={cn(inputCls, 'pr-9')}
                  value={pct}
                  onChange={e => { setPct(e.target.value); setPctManual(true) }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">%</span>
              </div>
              {pctManual && usdN > 0 && (
                <button
                  type="button"
                  onClick={() => { setPctManual(false); setPct(String(suggestPayoutPct(usdN))) }}
                  className="text-xs text-slate-500 hover:text-blue-400 underline whitespace-nowrap"
                >
                  Restablecer
                </button>
              )}
            </div>
            {!pctManual && usdN > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md px-3 py-1.5">
                <Sparkles className="w-3 h-3 flex-shrink-0" />
                <span>Sugerido: <strong>{suggestPayoutPct(usdN)}%</strong> para ${usdN.toLocaleString('es-CL')}</span>
              </div>
            )}
          </div>

          {/* CLP preview */}
          {ready && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">El cliente recibe</p>
              <p className="text-2xl font-mono font-bold text-slate-100">{formatCLP(clpN)}</p>
              <p className="text-xs text-slate-600 mt-1 font-mono">
                {usdN.toLocaleString('es-CL')} USD × {fxN.toLocaleString('es-CL')} × {pctN}%
              </p>
            </div>
          )}

          {/* Mensaje + copiar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={cn(labelCls, 'mb-0')}>Mensaje generado</label>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!ready}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors',
                  !ready
                    ? 'text-slate-600 border-slate-800 cursor-not-allowed'
                    : copied
                      ? 'text-green-400 border-green-500/30 bg-green-500/10'
                      : 'text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-800',
                )}
              >
                {copied ? (
                  <><Check className="w-3 h-3" />Copiado</>
                ) : (
                  <><Copy className="w-3 h-3" />Copiar</>
                )}
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 min-h-[140px]">
              {ready ? (
                <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                  {mensaje}
                </p>
              ) : (
                <p className="text-xs text-slate-600 italic">
                  Ingresa monto USD, tipo de cambio y % para generar el mensaje.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-md hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
