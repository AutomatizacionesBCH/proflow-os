'use client'

import { useState, useEffect, useTransition } from 'react'
import { X, Sparkles, TrendingUp, TrendingDown, AlertCircle, FileText, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, calcOperation, suggestPayoutPct, formatCLP, formatUSD, formatPct } from '@/lib/utils'
import type { OperationStatus } from '@/types'
import { createOperation, updateOperation, type CreateOperationInput } from '@/app/operaciones/actions'
import { generateContract } from '@/app/operaciones/contractActions'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Operation } from '@/types'

// ─── Estilos de inputs reutilizables ───────────────────────────────────────
const input = 'w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors'
const label = 'block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5'

function Field({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={label}>{title}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Tipos ─────────────────────────────────────────────────────────────────
type FormValues = {
  client_id: string
  company_id: string
  processor_id: string
  operation_date: string
  amount_usd: string
  fx_rate_used: string
  fx_source: string
  client_payout_pct: string
  processor_fee_pct: string
  loan_fee_pct: string
  payout_fee_pct: string
  wire_fee_usd: string
  receive_fee_usd: string
  status: OperationStatus
  notes: string
}

type ContractFields = {
  cliente_nombre: string
  cliente_rut: string
  ciudad: string
  direccion: string
  tarjeta_credito: string
}

const INITIAL: FormValues = {
  client_id: '',
  company_id: '',
  processor_id: '',
  operation_date: new Date().toISOString().split('T')[0],
  amount_usd: '',
  fx_rate_used: '',
  fx_source: '',
  client_payout_pct: '',
  processor_fee_pct: '0',
  loan_fee_pct: '0',
  payout_fee_pct: '0',
  wire_fee_usd: '0',
  receive_fee_usd: '0',
  status: 'pendiente',
  notes: '',
}

const INITIAL_CONTRACT: ContractFields = {
  cliente_nombre: '',
  cliente_rut: '',
  ciudad: '',
  direccion: '',
  tarjeta_credito: '',
}

// ─── Props ─────────────────────────────────────────────────────────────────
type Props = {
  onClose: () => void
  onSuccess: () => void
  editing?: Operation
}

// ─── Componente ────────────────────────────────────────────────────────────
export function OperacionForm({ onClose, onSuccess, editing }: Props) {
  const router = useRouter()
  const [, startRefresh] = useTransition()

  const [form, setForm] = useState<FormValues>(() =>
    editing
      ? {
          client_id:         editing.client_id,
          company_id:        editing.company_id ?? '',
          processor_id:      editing.processor_id ?? '',
          operation_date:    editing.operation_date,
          amount_usd:        String(editing.amount_usd),
          fx_rate_used:      String(editing.fx_rate_used),
          fx_source:         '',
          client_payout_pct: String(editing.client_payout_pct),
          processor_fee_pct: String(editing.processor_fee_pct ?? 0),
          loan_fee_pct:      String(editing.loan_fee_pct ?? 0),
          payout_fee_pct:    String(editing.payout_fee_pct ?? 0),
          wire_fee_usd:      String(editing.wire_fee_usd ?? 0),
          receive_fee_usd:   String(editing.receive_fee_usd ?? 0),
          status:            editing.status,
          notes:             editing.notes ?? '',
        }
      : INITIAL
  )
  const [contract, setContract]           = useState<ContractFields>(INITIAL_CONTRACT)
  const [contractOpen, setContractOpen]   = useState(false)
  const [payoutManual, setPayoutManual]   = useState(!!editing)
  const [error, setError]                 = useState<string | null>(null)
  const [isPending, startTransition]      = useTransition()

  // After successful save
  const [savedOpId,    setSavedOpId]      = useState<string | null>(editing?.id ?? null)
  const [savedOk,      setSavedOk]        = useState(false)
  const [contractBusy, setContractBusy]   = useState(false)
  const [contractDone, setContractDone]   = useState<{ docxUrl: string; pdfUrl: string } | null>(null)

  const n = (v: string) => parseFloat(v) || 0

  useEffect(() => {
    if (payoutManual) return
    const amt = n(form.amount_usd)
    if (amt > 0) {
      setForm(f => ({ ...f, client_payout_pct: String(suggestPayoutPct(amt)) }))
    }
  }, [form.amount_usd, payoutManual])

  const calc = calcOperation({
    amount_usd:        n(form.amount_usd),
    fx_rate_used:      n(form.fx_rate_used),
    client_payout_pct: n(form.client_payout_pct),
    processor_fee_pct: n(form.processor_fee_pct),
    loan_fee_pct:      n(form.loan_fee_pct),
    payout_fee_pct:    n(form.payout_fee_pct),
    wire_fee_usd:      n(form.wire_fee_usd),
    receive_fee_usd:   n(form.receive_fee_usd),
  })

  const hasData = n(form.amount_usd) > 0 && n(form.fx_rate_used) > 0

  function set(key: keyof FormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }))
      if (key === 'client_payout_pct') setPayoutManual(true)
    }
  }

  function setC(key: keyof ContractFields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setContract(f => ({ ...f, [key]: e.target.value }))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.client_id.trim()) { setError('El ID de cliente es obligatorio.'); return }
    if (!form.operation_date)   { setError('La fecha es obligatoria.'); return }
    if (!n(form.amount_usd))    { setError('El monto USD es obligatorio.'); return }
    if (!n(form.fx_rate_used))  { setError('El tipo de cambio es obligatorio.'); return }

    const payload: CreateOperationInput = {
      client_id:         form.client_id.trim(),
      company_id:        form.company_id.trim(),
      processor_id:      form.processor_id.trim(),
      operation_date:    form.operation_date,
      amount_usd:        n(form.amount_usd),
      client_payout_pct: n(form.client_payout_pct),
      fx_rate_used:      n(form.fx_rate_used),
      fx_source:         form.fx_source.trim(),
      processor_fee_pct: n(form.processor_fee_pct),
      loan_fee_pct:      n(form.loan_fee_pct),
      payout_fee_pct:    n(form.payout_fee_pct),
      wire_fee_usd:      n(form.wire_fee_usd),
      receive_fee_usd:   n(form.receive_fee_usd),
      status:            form.status,
      notes:             form.notes.trim(),
    }

    startTransition(async () => {
      const result = editing
        ? await updateOperation(editing.id, payload)
        : await createOperation(payload)

      if (result.success) {
        setSavedOpId(result.id)
        setSavedOk(true)
        setContractOpen(true)
        startRefresh(() => router.refresh())
      } else {
        setError(result.error)
      }
    })
  }

  async function handleGenerateContract() {
    if (!savedOpId) return
    if (!contract.cliente_nombre.trim() || !contract.cliente_rut.trim()) {
      setError('Nombre y RUT del cliente son requeridos para generar el contrato.')
      return
    }
    setError(null)
    setContractBusy(true)

    try {
      // 1. Servidor genera DOCX y lo sube a Storage
      const result = await generateContract({ operation_id: savedOpId, ...contract })
      if (!result.success) { setError(result.error); setContractBusy(false); return }

      // 2. Cliente genera PDF con jsPDF (sin dependencias de fuentes del servidor)
      const { default: jsPDF } = await import('jspdf')
      const now      = new Date()
      const fechaChi = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const mm       = String(now.getMonth() + 1).padStart(2, '0')
      const dd       = String(now.getDate()).padStart(2, '0')
      const fechaUsa = `${mm}/${dd}/${now.getFullYear()}`

      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('CONTRATO DE CAMBIO DE DIVISAS', 105, 20, { align: 'center' })

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80)
      doc.text(`Fecha (CL): ${fechaChi}     Fecha (USA): ${fechaUsa}`, 105, 28, { align: 'center' })

      doc.setTextColor(0)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('DATOS DEL CLIENTE', 15, 45)
      doc.setDrawColor(200)
      doc.line(15, 47, 195, 47)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Nombre completo:  ${contract.cliente_nombre}`, 15, 55)
      doc.text(`RUT:              ${contract.cliente_rut}`, 15, 62)
      doc.text(`Ciudad:           ${contract.ciudad}`, 15, 69)
      doc.text(`Dirección:        ${contract.direccion}`, 15, 76)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('DATOS DE LA OPERACIÓN', 15, 92)
      doc.line(15, 94, 195, 94)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const montoStr = parseFloat(form.amount_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      doc.text(`Monto USD:        $${montoStr}`, 15, 102)
      doc.text(`Tarjeta crédito:  ${contract.tarjeta_credito}`, 15, 109)

      doc.text('_______________________________', 15, 140)
      doc.text('Firma del cliente', 15, 147)

      const pdfBlob = doc.output('blob')

      // 3. Cliente sube PDF a Supabase Storage
      const supabase   = createClient()
      const pdfPath    = `${result.folder}/${result.fileName}.pdf`
      const { error: pdfUpErr } = await supabase.storage
        .from('contratos')
        .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true })

      if (pdfUpErr) { setError(`Error subiendo PDF: ${pdfUpErr.message}`); setContractBusy(false); return }

      const { data: pdfData } = supabase.storage.from('contratos').getPublicUrl(pdfPath)

      setContractDone({ docxUrl: result.docxUrl, pdfUrl: pdfData.publicUrl })
    } catch (e: unknown) {
      setError(`Error inesperado: ${e instanceof Error ? e.message : String(e)}`)
    }

    setContractBusy(false)
  }

  function handleClose() {
    if (savedOk) onSuccess()
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel principal */}
      <div className="w-full max-w-5xl flex flex-col bg-slate-950 border-l border-slate-800 shadow-2xl h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-100">{editing ? 'Editar Operación' : 'Nueva Operación'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Ingresa los datos y revisa la calculadora antes de guardar</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: form + calculadora */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">

          {/* ── FORMULARIO ── */}
          <form id="op-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-7">

            {savedOk && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <p className="text-sm text-green-400 font-medium">Operación guardada correctamente.</p>
              </div>
            )}

            {/* ── Identificación ── */}
            <Section title="Identificación">
              <div className="grid grid-cols-2 gap-4">
                <Field title="Fecha de operación">
                  <input type="date" className={input} value={form.operation_date} onChange={set('operation_date')} required disabled={savedOk} />
                </Field>
                <Field title="Estado">
                  <select className={cn(input, 'cursor-pointer')} value={form.status} onChange={set('status')} disabled={savedOk}>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="completada">Completada</option>
                    <option value="anulada">Anulada</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field title="ID Cliente" hint="Referencia al cliente">
                  <input type="text" className={input} placeholder="CLI-001" value={form.client_id} onChange={set('client_id')} required disabled={savedOk} />
                </Field>
                <Field title="ID Empresa" hint="Opcional">
                  <input type="text" className={input} placeholder="EMP-001" value={form.company_id} onChange={set('company_id')} disabled={savedOk} />
                </Field>
                <Field title="ID Procesador" hint="Opcional">
                  <input type="text" className={input} placeholder="PROC-001" value={form.processor_id} onChange={set('processor_id')} disabled={savedOk} />
                </Field>
              </div>
            </Section>

            {/* ── Monto y Tipo de Cambio ── */}
            <Section title="Monto y Tipo de Cambio">
              <div className="grid grid-cols-2 gap-4">
                <Field title="Monto USD" hint="Importe de la operación en dólares">
                  <input type="number" step="0.01" min="0" className={input} placeholder="10000.00" value={form.amount_usd} onChange={set('amount_usd')} required disabled={savedOk} />
                </Field>
                <Field title="Tipo de Cambio (USD → CLP)" hint="Tasa usada para convertir">
                  <input type="number" step="0.0001" min="0" className={input} placeholder="930.0000" value={form.fx_rate_used} onChange={set('fx_rate_used')} required disabled={savedOk} />
                </Field>
              </div>
              <Field title="Fuente del Tipo de Cambio" hint="Ej: Bloomberg, Valor Nominal, SII">
                <input type="text" className={input} placeholder="Bloomberg" value={form.fx_source} onChange={set('fx_source')} disabled={savedOk} />
              </Field>
            </Section>

            {/* ── Pago al Cliente ── */}
            <Section title="Pago al Cliente">
              <div className="grid grid-cols-2 gap-4 items-end">
                <Field title="% Pago al Cliente" hint={payoutManual ? 'Valor editado manualmente' : 'Sugerido automáticamente según monto'}>
                  <div className="relative">
                    <input type="number" step="0.01" min="0" max="100" className={cn(input, 'pr-16')} placeholder="79.00" value={form.client_payout_pct} onChange={set('client_payout_pct')} required disabled={savedOk} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">%</span>
                  </div>
                </Field>
                <div className="pb-0.5">
                  {!payoutManual && n(form.amount_usd) > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md px-3 py-2">
                      <Sparkles className="w-3 h-3 flex-shrink-0" />
                      <span>Sugerido: <strong>{suggestPayoutPct(n(form.amount_usd))}%</strong> para ${n(form.amount_usd).toLocaleString()}</span>
                    </div>
                  )}
                  {payoutManual && !savedOk && (
                    <button type="button" className="text-xs text-slate-500 hover:text-blue-400 underline transition-colors"
                      onClick={() => { setPayoutManual(false); setForm(f => ({ ...f, client_payout_pct: String(suggestPayoutPct(n(f.amount_usd))) })) }}>
                      Restablecer sugerencia automática
                    </button>
                  )}
                </div>
              </div>
            </Section>

            {/* ── Comisiones ── */}
            <Section title="Comisiones y Cargos">
              <div className="grid grid-cols-3 gap-4">
                <Field title="Fee Procesador (%)" hint="Sobre el monto bruto CLP">
                  <div className="relative">
                    <input type="number" step="0.0001" min="0" className={cn(input, 'pr-8')} placeholder="2.5000" value={form.processor_fee_pct} onChange={set('processor_fee_pct')} disabled={savedOk} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
                  </div>
                </Field>
                <Field title="Fee Préstamo (%)" hint="Sobre el monto bruto CLP">
                  <div className="relative">
                    <input type="number" step="0.0001" min="0" className={cn(input, 'pr-8')} placeholder="0.0000" value={form.loan_fee_pct} onChange={set('loan_fee_pct')} disabled={savedOk} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
                  </div>
                </Field>
                <Field title="Fee Payout (%)" hint="Sobre el monto bruto CLP">
                  <div className="relative">
                    <input type="number" step="0.0001" min="0" className={cn(input, 'pr-8')} placeholder="0.0000" value={form.payout_fee_pct} onChange={set('payout_fee_pct')} disabled={savedOk} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
                  </div>
                </Field>
                <Field title="Wire Fee (USD)" hint="Cargo fijo en dólares">
                  <div className="relative">
                    <input type="number" step="0.01" min="0" className={cn(input, 'pl-7')} placeholder="0.00" value={form.wire_fee_usd} onChange={set('wire_fee_usd')} disabled={savedOk} />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">$</span>
                  </div>
                </Field>
                <Field title="Receive Fee (USD)" hint="Cargo fijo en dólares">
                  <div className="relative">
                    <input type="number" step="0.01" min="0" className={cn(input, 'pl-7')} placeholder="0.00" value={form.receive_fee_usd} onChange={set('receive_fee_usd')} disabled={savedOk} />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">$</span>
                  </div>
                </Field>
              </div>
            </Section>

            {/* ── Notas ── */}
            <Section title="Notas">
              <textarea rows={3} className={cn(input, 'resize-none')} placeholder="Observaciones internas..." value={form.notes} onChange={set('notes')} disabled={savedOk} />
            </Section>

            {/* ── Datos para el contrato ── */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setContractOpen(v => !v)}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 hover:text-slate-400 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Datos para el contrato {savedOk && <span className="text-green-400 normal-case font-normal">(requerido para generar)</span>}
                </span>
                {contractOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {contractOpen && (
                <div className="space-y-4 pl-1">
                  <div className="grid grid-cols-2 gap-4">
                    <Field title="Nombre completo del cliente">
                      <input type="text" className={input} placeholder="Juan Pérez González" value={contract.cliente_nombre} onChange={setC('cliente_nombre')} />
                    </Field>
                    <Field title="RUT del cliente">
                      <input type="text" className={input} placeholder="12.345.678-9" value={contract.cliente_rut} onChange={setC('cliente_rut')} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field title="Ciudad">
                      <input type="text" className={input} placeholder="Santiago" value={contract.ciudad} onChange={setC('ciudad')} />
                    </Field>
                    <Field title="Dirección">
                      <input type="text" className={input} placeholder="Av. Providencia 123" value={contract.direccion} onChange={setC('direccion')} />
                    </Field>
                  </div>
                  <Field title="Tarjeta de crédito" hint="No se guarda en la base de datos — solo aparece en el contrato">
                    <input type="text" className={input} placeholder="4111 1111 1111 1111" value={contract.tarjeta_credito} onChange={setC('tarjeta_credito')} autoComplete="off" />
                  </Field>

                  {contractDone && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
                      <p className="text-xs font-medium text-green-400">Contrato generado y guardado en Supabase Storage.</p>
                      <div className="flex items-center gap-3">
                        <a href={contractDone.docxUrl} target="_blank" rel="noreferrer" download
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline">
                          <Download className="w-3 h-3" /> Descargar Word
                        </a>
                        <a href={contractDone.pdfUrl} target="_blank" rel="noreferrer" download
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline">
                          <Download className="w-3 h-3" /> Descargar PDF
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>

          {/* ── CALCULADORA ── */}
          <div className="sm:w-72 flex-shrink-0 border-t sm:border-t-0 sm:border-l border-slate-800 bg-slate-900/50 flex flex-col max-h-64 sm:max-h-none">
            <div className="px-5 pt-5 pb-3 border-b border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Calculadora</p>
              <p className="text-xs text-slate-600 mt-0.5">Actualiza en tiempo real</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {!hasData ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-600">Ingresa el monto USD<br />y el tipo de cambio</p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-800/60 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Monto Bruto CLP</p>
                    <p className="text-lg font-mono font-bold text-slate-100">{formatCLP(calc.gross_clp)}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{formatUSD(n(form.amount_usd))} × {n(form.fx_rate_used).toLocaleString('es-CL')}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Egresos</p>
                    <CalcLine label={`Pago cliente (${formatPct(n(form.client_payout_pct), 1)})`} value={calc.amount_clp_paid} color="text-red-400" />
                    {calc.fee_processor > 0 && <CalcLine label={`Fee procesador (${formatPct(n(form.processor_fee_pct))})`} value={calc.fee_processor} color="text-slate-400" />}
                    {calc.fee_loan > 0     && <CalcLine label={`Fee préstamo (${formatPct(n(form.loan_fee_pct))})`}      value={calc.fee_loan}      color="text-slate-400" />}
                    {calc.fee_payout > 0   && <CalcLine label={`Fee payout (${formatPct(n(form.payout_fee_pct))})`}      value={calc.fee_payout}    color="text-slate-400" />}
                    {calc.fee_wire > 0     && <CalcLine label={`Wire (${formatUSD(n(form.wire_fee_usd))})`}              value={calc.fee_wire}      color="text-slate-400" />}
                    {calc.fee_receive > 0  && <CalcLine label={`Recepción (${formatUSD(n(form.receive_fee_usd))})`}      value={calc.fee_receive}   color="text-slate-400" />}
                  </div>
                  <div className={cn('rounded-xl p-4 border', calc.profit_clp >= 0 ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/8 border-red-500/20')}>
                    <div className="flex items-center gap-1.5 mb-2">
                      {calc.profit_clp >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Utilidad Neta</span>
                    </div>
                    <p className={cn('text-2xl font-mono font-bold', calc.profit_clp >= 0 ? 'text-green-400' : 'text-red-400')}>{formatCLP(calc.profit_clp)}</p>
                    <p className={cn('text-sm font-mono mt-1', calc.profit_clp >= 0 ? 'text-green-500' : 'text-red-500')}>{formatPct(calc.profit_margin)} del bruto</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 flex-shrink-0 bg-slate-950">
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
          {!error && <div />}

          <div className="flex items-center gap-3">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-md hover:bg-slate-800 transition-colors">
              {savedOk ? 'Cerrar' : 'Cancelar'}
            </button>

            {/* Generar Contrato — visible cuando hay savedOpId */}
            {savedOpId && !contractDone && (
              <button
                type="button"
                onClick={handleGenerateContract}
                disabled={contractBusy}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {contractBusy ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generando...</>
                ) : (
                  <><FileText className="w-3.5 h-3.5" />Generar Contrato</>
                )}
              </button>
            )}

            {/* Guardar — oculto después de guardar exitosamente */}
            {!savedOk && (
              <button type="submit" form="op-form" disabled={isPending}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isPending ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                ) : (
                  editing ? 'Guardar Cambios' : 'Crear Operación'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function CalcLine({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 truncate mr-2">− {label}</span>
      <span className={cn('font-mono flex-shrink-0', color)}>{formatCLP(value)}</span>
    </div>
  )
}
