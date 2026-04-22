'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import {
  OPS, formatOut, formatRate, parseMonto, computeNet, formatFechaCL,
  type OperationKey,
} from './rates'

export interface CotizacionData {
  cliente: string
  fecha: string
  emision: string
  operation: OperationKey
  monto: number
  rate: number
  spread: number
  montoLiquido: number
}

interface Props {
  defaultCliente?: string
  defaultOperation?: OperationKey
  defaultMonto?: number
  defaultRate?: number
  defaultSpread?: number
  onChange?: (data: CotizacionData) => void
  logoWordmark?: string
  logoIcon?: string
  footer?: string
}

export function Cotizacion({
  defaultCliente = '',
  defaultOperation = 'USD_CLP',
  defaultMonto = 1000,
  defaultRate,
  defaultSpread = 0.25,
  onChange,
  logoWordmark = '/cotizacion/logo-wordmark.png',
  logoIcon = '/cotizacion/logo-icon.png',
  footer = 'Smart Global Advisory LLC',
}: Props) {
  const [cliente, setCliente] = useState(defaultCliente)
  const [fecha, setFecha] = useState(formatFechaCL(new Date()))
  const [operation, setOperation] = useState<OperationKey>(defaultOperation)
  const [monto, setMonto] = useState(defaultMonto)
  const [rate, setRate] = useState(defaultRate ?? OPS[defaultOperation].defRate)
  const [spread, setSpread] = useState(defaultSpread)
  const [emision, setEmision] = useState('')
  const [copied, setCopied] = useState(false)

  const montoRef = useRef<HTMLSpanElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const op = OPS[operation]
  const montoLiquido = computeNet(monto, rate, spread)

  // Live clock
  useEffect(() => {
    const tick = () => setEmision(new Date().toLocaleTimeString('es-CL', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Reset rate when operation changes and sync monto display format
  useEffect(() => {
    setRate(OPS[operation].defRate)
    if (montoRef.current) {
      montoRef.current.textContent = formatOut(monto, OPS[operation].fmtIn)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation])

  // onChange callback (uses ref to stay stable)
  useEffect(() => {
    onChangeRef.current?.({ cliente, fecha, emision, operation, monto, rate, spread, montoLiquido })
  }, [cliente, fecha, emision, operation, monto, rate, spread, montoLiquido])

  function handleEditRate() {
    const val = prompt(`Tipo de cambio (1 ${op.from} = ? ${op.to}):`, String(rate))
    if (val !== null) {
      const n = parseMonto(val)
      if (!isNaN(n) && n > 0) setRate(n)
    }
  }

  function handleEditSpread() {
    const val = prompt('Spread (%):', String(spread))
    if (val !== null) {
      const n = parseFloat(val.replace(',', '.'))
      if (!isNaN(n) && n >= 0) setSpread(n)
    }
  }

  async function handleCopy() {
    const lines = [
      `Cliente:          ${cliente || '—'}`,
      `Fecha:            ${fecha}`,
      `Emisión:          ${emision}`,
      `Operación:        ${op.tipoLabel}`,
      `${op.fromLabel.padEnd(18)}: ${formatOut(monto, op.fmtIn)}`,
      `Monto líquido:    ${formatOut(montoLiquido, op.fmtOut)}`,
      `TC aplicado:      1 ${op.from} = ${formatRate(rate)} ${op.to}`,
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const tcLabel = `TC: 1 ${op.from} = ${formatRate(rate)} ${op.to}`
  const spreadLabel = `Spread: ${spread.toLocaleString('es-CL', { maximumFractionDigits: 2 })}%`

  return (
    <>
      <style>{`
        @media print {
          .cot-toolbar, .cot-pills { display: none !important; }
          body { background: white !important; }
          .cot-paper { box-shadow: none !important; }
        }
        .cot-editable { transition: background 0.1s; }
        .cot-editable:hover { background: #fffae6; }
        .cot-editable:focus { background: #fff8d5; outline: none; }
        .cot-pill { transition: background 0.1s; }
        .cot-pill:hover { background: #e4e7e4 !important; }
      `}</style>

      {/* Toolbar */}
      <div className="cot-toolbar flex items-center justify-between mb-5 px-1">
        <span className="text-sm" style={{ color: '#94a3b8' }}>Click en cualquier campo para editar</span>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-1.5 text-sm rounded-lg border transition-colors"
            style={{ borderColor: '#475569', color: '#cbd5e1', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e293b')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {copied ? '✓ Copiado' : 'Copiar resumen'}
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 text-sm rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#0F4F3F' }}
          >
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Paper */}
      <div
        className="cot-paper mx-auto bg-white relative overflow-hidden"
        style={{
          maxWidth: 860,
          color: '#111',
          fontFamily: 'var(--font-geist-sans), Inter, system-ui, sans-serif',
          boxShadow: '0 4px 40px rgba(0,0,0,0.28)',
          borderRadius: 4,
        }}
      >
        {/* Red corner triangle */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 0, height: 0,
          borderStyle: 'solid', borderWidth: '0 48px 48px 0',
          borderColor: 'transparent #d5322f transparent transparent',
        }} />

        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '20px 36px 16px', borderBottom: '1.5px solid #d9ddd9' }}
        >
          <Image
            src={logoWordmark}
            alt="Caja Chica"
            width={200}
            height={48}
            style={{ height: 38, width: 'auto', objectFit: 'contain' }}
          />
          <div className="flex items-center gap-2">
            <span style={{ fontWeight: 700, color: '#0F4F3F', fontSize: 13, letterSpacing: '0.05em' }}>
              EMISIÓN:
            </span>
            <span
              className="font-mono tabular-nums"
              style={{ fontSize: 13, color: '#0F4F3F', letterSpacing: '0.06em' }}
            >
              {emision}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '32px 48px 24px' }}>
          <div className="flex gap-8 items-start">

            {/* Fields */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Cliente */}
              <FieldRow label="NOMBRE CLIENTE">
                <span
                  className="cot-editable tabular-nums"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={e => setCliente(e.currentTarget.textContent?.trim() ?? '')}
                  style={fieldValueStyle}
                >
                  {defaultCliente || ''}
                </span>
              </FieldRow>

              {/* Fecha */}
              <FieldRow label="FECHA COTIZACIÓN">
                <span
                  className="cot-editable tabular-nums"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={e => setFecha(e.currentTarget.textContent?.trim() ?? '')}
                  style={fieldValueStyle}
                >
                  {fecha}
                </span>
              </FieldRow>

              {/* Tipo operación */}
              <FieldRow label="TIPO OPERACIÓN">
                <select
                  value={operation}
                  onChange={e => setOperation(e.target.value as OperationKey)}
                  style={{
                    background: 'transparent', border: 'none',
                    fontWeight: 600, fontSize: 14, color: '#0F4F3F',
                    cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
                    padding: '2px 0',
                  }}
                >
                  {(Object.keys(OPS) as OperationKey[]).map(k => (
                    <option key={k} value={k}>{OPS[k].tipoLabel}</option>
                  ))}
                </select>
              </FieldRow>

              {/* Spacer */}
              <div style={{ height: 14 }} />

              {/* Monto a operar */}
              <FieldRow label={op.fromLabel}>
                <span
                  ref={montoRef}
                  className="cot-editable tabular-nums font-mono"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={e => {
                    const n = parseMonto(e.currentTarget.textContent ?? '')
                    if (!isNaN(n) && n > 0) {
                      setMonto(n)
                      e.currentTarget.textContent = formatOut(n, op.fmtIn)
                    } else {
                      e.currentTarget.textContent = formatOut(monto, op.fmtIn)
                    }
                  }}
                  style={{ ...fieldValueStyle, fontSize: 14 }}
                >
                  {formatOut(defaultMonto, op.fmtIn)}
                </span>
              </FieldRow>

              {/* Monto líquido */}
              <FieldRow label="MONTO LÍQUIDO">
                <span
                  className="tabular-nums font-mono"
                  style={{
                    display: 'inline-block',
                    background: '#C6F0D2',
                    border: '1.5px solid #6bc77e',
                    borderRadius: 6,
                    padding: '4px 18px',
                    fontWeight: 700,
                    minWidth: 200,
                    textAlign: 'center',
                    fontSize: 17,
                    color: '#0F4F3F',
                  }}
                >
                  {formatOut(montoLiquido, op.fmtOut)}
                </span>
              </FieldRow>
            </div>

            {/* Icon */}
            <div style={{ flexShrink: 0, paddingTop: 4 }}>
              <Image
                src={logoIcon}
                alt=""
                width={170}
                height={170}
                style={{ width: 170, height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* TC / Spread pills */}
          <div
            className="cot-pills flex items-center gap-3 flex-wrap"
            style={{ marginTop: 26, paddingTop: 16, borderTop: '1.5px dashed #d9ddd9' }}
          >
            <button
              onClick={handleEditRate}
              className="cot-pill tabular-nums"
              style={{
                background: '#f0f2f0', border: '1px solid #d9ddd9',
                borderRadius: 999, padding: '5px 16px',
                fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
                color: '#333', fontWeight: 500,
              }}
            >
              {tcLabel}
            </button>
            <button
              onClick={handleEditSpread}
              className="cot-pill"
              style={{
                background: '#f0f2f0', border: '1px solid #d9ddd9',
                borderRadius: 999, padding: '5px 16px',
                fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
                color: '#333', fontWeight: 500,
              }}
            >
              {spreadLabel}
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7a75' }}>
              Ref. mercado interbancario
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 48px 16px',
          textAlign: 'right', fontSize: 12, color: '#6b7a75',
          borderTop: '1px solid #f0f2f0',
        }}>
          {footer}
        </div>
      </div>
    </>
  )
}

/* ─── helpers ─── */

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center" style={{ marginBottom: 16 }}>
      <span style={{
        width: 180, flexShrink: 0,
        fontSize: 12.5, fontWeight: 700,
        textTransform: 'uppercase', color: '#6b7a75',
        letterSpacing: '0.04em',
      }}>
        {label}
      </span>
      {children}
    </div>
  )
}

const fieldValueStyle: React.CSSProperties = {
  display: 'inline-block',
  minWidth: 140,
  borderBottom: '1.5px solid #111',
  padding: '2px 6px',
  cursor: 'text',
  fontSize: 14,
  lineHeight: '1.5',
  borderRadius: '2px 2px 0 0',
}
