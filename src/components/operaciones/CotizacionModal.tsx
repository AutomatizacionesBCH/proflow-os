'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Calculator, Copy, Check, Sparkles, Download, ImageIcon } from 'lucide-react'
import { cn, formatCLP, suggestPayoutPct } from '@/lib/utils'

const inputCls =
  'w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors'
const labelCls = 'block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5'

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function fechaCotizacion(d = new Date()) {
  return `${String(d.getDate()).padStart(2,'0')}-${MESES[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`
}
function horaEmision(d = new Date()) {
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2,'0')).join(':')
}

type Props = { onClose: () => void }

export function CotizacionModal({ onClose }: Props) {
  const [cliente, setCliente]   = useState('')
  const [usd, setUsd]           = useState('')
  const [fx, setFx]             = useState('')
  const [pct, setPct]           = useState('')
  const [pctManual, setPctManual] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied]     = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const usdN = parseFloat(usd) || 0
  const fxN  = parseFloat(fx)  || 0
  const pctN = parseFloat(pct) || 0

  // Auto-sugerir % (mismo criterio que OperacionForm)
  useEffect(() => {
    if (pctManual) return
    if (usdN > 0) setPct(String(suggestPayoutPct(usdN)))
  }, [usdN, pctManual])

  // Si cambian los inputs después de generar, forzar re-generación
  useEffect(() => { setImageUrl(null) }, [cliente, usd, fx, pct])

  const clpN = useMemo(() => Math.round(usdN * fxN * (pctN / 100)), [usdN, fxN, pctN])
  const ready = usdN > 0 && fxN > 0 && pctN > 0

  const fecha = useMemo(() => fechaCotizacion(), [])

  async function generateImage() {
    if (!cardRef.current || !ready) return
    setGenerating(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      })
      setImageUrl(canvas.toDataURL('image/png'))
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    if (!imageUrl) return
    try {
      const res  = await fetch(imageUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // fallback silencioso — algunos browsers requieren HTTPS o bloquean clipboard
    }
  }

  const clpDisplay = formatCLP(clpN)
  const usdDisplay = usdN.toLocaleString('es-CL', { maximumFractionDigits: 2 })
  const hora       = horaEmision()

  return (
    <>
      {/* ── Modal UI ── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-lg bg-slate-900 rounded-xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Generar Cotización</h3>
                <p className="text-xs text-slate-500 mt-0.5">Genera una imagen lista para compartir</p>
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
          <div className="px-5 py-5 overflow-y-auto space-y-4">
            {/* Inputs */}
            <div>
              <label className={labelCls}>Nombre Cliente</label>
              <input
                type="text"
                placeholder="Nombre del cliente (opcional)"
                className={inputCls}
                value={cliente}
                onChange={e => setCliente(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Monto USD</label>
                <input
                  type="number" step="0.01" min="0" placeholder="2000"
                  className={inputCls} value={usd}
                  onChange={e => setUsd(e.target.value)} autoFocus
                />
              </div>
              <div>
                <label className={labelCls}>Tipo de Cambio</label>
                <input
                  type="number" step="0.01" min="0" placeholder="930.00"
                  className={inputCls} value={fx}
                  onChange={e => setFx(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>% Pago al Cliente</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number" step="0.01" min="0" max="100" placeholder="79"
                    className={cn(inputCls, 'pr-9')} value={pct}
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

            {/* Botón generar */}
            <button
              onClick={generateImage}
              disabled={!ready || generating}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors',
                ready && !generating
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              )}
            >
              {generating ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generando imagen...</>
              ) : (
                <><ImageIcon className="w-4 h-4" />Generar imagen</>
              )}
            </button>

            {/* Preview de imagen */}
            {imageUrl && (
              <div className="space-y-3">
                <img
                  src={imageUrl}
                  alt="Cotización generada"
                  className="w-full rounded-lg border border-slate-700 shadow"
                />
                <div className="flex items-center gap-2">
                  <a
                    href={imageUrl}
                    download={`cotizacion_${usdDisplay}_usd.png`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar
                  </a>
                  <button
                    onClick={handleCopy}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
                      copied
                        ? 'text-green-400 border-green-500/30 bg-green-500/10'
                        : 'text-slate-200 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                    )}
                  >
                    {copied
                      ? <><Check className="w-3.5 h-3.5" />Copiado</>
                      : <><Copy className="w-3.5 h-3.5" />Copiar imagen</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-5 py-3 border-t border-slate-800 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-md hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* ── Card oculta capturada por html2canvas ── */}
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '700px',
          height: '280px',
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          overflow: 'hidden',
          borderRadius: '8px',
        }}
      >
        {/* Ícono de exchange (derecha, decorativo) */}
        <div style={{ position: 'absolute', right: 0, top: 0, width: '220px', height: '100%' }}>
          {/* Rectángulo teal (arriba-derecha) */}
          <div style={{
            position: 'absolute', top: '30px', right: '25px',
            width: '110px', height: '110px',
            backgroundColor: '#009688', borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <line x1="12" y1="40" x2="40" y2="12" stroke="white" strokeWidth="5" strokeLinecap="round"/>
              <polyline points="26,12 40,12 40,26" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {/* Rectángulo navy (abajo-izquierda, encima) */}
          <div style={{
            position: 'absolute', top: '90px', right: '80px',
            width: '110px', height: '110px',
            backgroundColor: '#1a237e', borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <line x1="40" y1="12" x2="12" y2="40" stroke="white" strokeWidth="5" strokeLinecap="round"/>
              <polyline points="26,40 12,40 12,26" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 28px 14px',
          borderBottom: '1px solid #eeeeee',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', backgroundColor: '#2e7d32',
              borderRadius: '8px', display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="2" width="14" height="16" rx="2" fill="none" stroke="white" strokeWidth="1.8"/>
                <polyline points="6,10 9,13 14,7" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="6" y="1" width="8" height="3" rx="1.5" fill="white"/>
              </svg>
            </div>
            <div>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a1a1a' }}>Caja</span>
              <span style={{ fontSize: '16px', color: '#555', marginLeft: '5px' }}>Chica</span>
            </div>
          </div>
          {/* Emisión */}
          <div style={{ fontSize: '12px', color: '#333', letterSpacing: '0.5px' }}>
            <span style={{ fontWeight: 'bold' }}>EMISIÓN:</span>
            <span style={{ marginLeft: '10px', fontFamily: 'Courier New, monospace', fontWeight: 'bold' }}>{hora}</span>
          </div>
        </div>

        {/* Cuerpo — campos */}
        <div style={{ padding: '18px 28px 0' }}>
          {/* NOMBRE CLIENTE */}
          {cliente && (
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#757575', width: '190px', letterSpacing: '0.3px' }}>
                NOMBRE CLIENTE:
              </span>
              <span style={{ fontSize: '12px', color: '#212121', borderBottom: '1px solid #bbb', minWidth: '180px', paddingBottom: '1px' }}>
                {cliente}
              </span>
            </div>
          )}
          {/* FECHA COTIZACIÓN */}
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#757575', width: '190px', letterSpacing: '0.3px' }}>
              FECHA COTIZACIÓN:
            </span>
            <span style={{ fontSize: '12px', color: '#212121', borderBottom: '1px solid #bbb', minWidth: '120px', paddingBottom: '1px' }}>
              {fecha}
            </span>
          </div>
          {/* TIPO OPERACIÓN */}
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '18px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#757575', width: '190px', letterSpacing: '0.3px' }}>
              TIPO OPERACIÓN:
            </span>
            <span style={{ fontSize: '12px', color: '#212121', borderBottom: '1px solid #bbb', minWidth: '180px', paddingBottom: '1px' }}>
              DÓLARES A PESOS (CLP)
            </span>
          </div>
          {/* DÓLARES A OPERAR */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#757575', width: '190px', letterSpacing: '0.3px' }}>
              DÓLARES A OPERAR:
            </span>
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#212121', fontFamily: 'Arial, sans-serif' }}>
              {usdDisplay}
            </span>
          </div>
          {/* MONTO LIQUIDO */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#757575', width: '190px', letterSpacing: '0.3px' }}>
              MONTO LIQUIDO
            </span>
            <div style={{
              backgroundColor: '#c8e6c9', padding: '5px 18px',
              borderRadius: '4px', minWidth: '130px', textAlign: 'center',
            }}>
              <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1b5e20' }}>
                {clpDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: '14px', right: '28px',
          fontSize: '10px', color: '#9e9e9e', fontStyle: 'italic',
        }}>
          Smart Global Advisory LLC
        </div>
      </div>
    </>
  )
}
