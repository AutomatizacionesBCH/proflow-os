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

            {/* Preview CLP antes de generar */}
            {ready && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
                <p className="text-xs text-green-400/70 uppercase tracking-wide font-medium mb-1">El cliente recibirá</p>
                <p className="text-2xl font-bold text-green-400 font-mono tabular-nums">{clpDisplay}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {usdDisplay} USD × {fxN.toLocaleString('es-CL')} × {pctN}%
                </p>
              </div>
            )}

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
          width: '860px',
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          overflow: 'hidden',
          paddingBottom: '20px',
        }}
      >
        {/* Triángulo rojo esquina */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 0, height: 0,
          borderStyle: 'solid', borderWidth: '0 52px 52px 0',
          borderColor: 'transparent #d5322f transparent transparent',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 36px 16px',
          borderBottom: '1.5px solid #d9ddd9',
        }}>
          {/* Logo wordmark */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cotizacion/logo-wordmark.jpg" alt="Caja Chica" style={{ height: '38px', width: 'auto' }} crossOrigin="anonymous" />
          {/* Emisión */}
          <div style={{ fontSize: '13px', color: '#0F4F3F', letterSpacing: '0.5px' }}>
            <span style={{ fontWeight: 'bold' }}>EMISIÓN:</span>
            <span style={{ marginLeft: '10px', fontFamily: 'Courier New, monospace', fontWeight: 'bold', letterSpacing: '0.06em' }}>{hora}</span>
          </div>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: '28px 48px 0', display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
          {/* Campos */}
          <div style={{ flex: 1 }}>
            {/* NOMBRE CLIENTE */}
            {cliente && (
              <CardRow label="NOMBRE CLIENTE" value={cliente} />
            )}
            {/* FECHA COTIZACIÓN */}
            <CardRow label="FECHA COTIZACIÓN" value={fecha} />
            {/* TIPO OPERACIÓN */}
            <CardRow label="TIPO OPERACIÓN" value="DÓLARES A PESOS (CLP)" bold color="#0F4F3F" />

            <div style={{ height: 14 }} />

            {/* DÓLARES A OPERAR */}
            <CardRow label="DÓLARES A OPERAR" value={`US$${usdDisplay}`} mono />

            {/* MONTO LÍQUIDO */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7a75', width: '190px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Monto Líquido
              </span>
              <div style={{
                backgroundColor: '#C6F0D2', border: '1.5px solid #6bc77e',
                borderRadius: '6px', padding: '5px 20px',
                minWidth: '200px', textAlign: 'center',
              }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F4F3F', fontFamily: 'Courier New, monospace' }}>
                  {clpDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Logo ícono derecha */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cotizacion/logo-icon.jpg" alt="" style={{ width: '150px', height: 'auto', flexShrink: 0, paddingTop: '4px' }} crossOrigin="anonymous" />
        </div>

        {/* Pills TC */}
        <div style={{
          margin: '20px 48px 0',
          paddingTop: '14px',
          borderTop: '1.5px dashed #d9ddd9',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{
            background: '#f0f2f0', border: '1px solid #d9ddd9',
            borderRadius: '999px', padding: '4px 14px',
            fontSize: '12px', color: '#333', fontWeight: 500,
          }}>
            TC: 1 USD = ${fxN.toLocaleString('es-CL')} CLP
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6b7a75' }}>
            Ref. mercado interbancario
          </span>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'right', fontSize: '11px', color: '#6b7a75',
          padding: '12px 48px 0',
        }}>
          Smart Global Advisory LLC
        </div>
      </div>
    </>
  )
}

function CardRow({
  label, value, bold, color, mono,
}: {
  label: string; value: string; bold?: boolean; color?: string; mono?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '12px' }}>
      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7a75', width: '190px', flexShrink: 0, letterSpacing: '0.04em', textTransform: 'uppercase', paddingBottom: '6px' }}>
        {label}
      </span>
      <span style={{
        display: 'inline-block',
        fontSize: '13px',
        color: color ?? '#111111',
        borderBottom: '1.5px solid #555',
        minWidth: '180px',
        paddingBottom: '5px',
        fontWeight: bold ? 700 : 600,
        fontFamily: mono ? 'Courier New, monospace' : 'inherit',
      }}>
        {value}
      </span>
    </div>
  )
}
