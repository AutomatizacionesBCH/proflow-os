'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Mail, Phone, FileText, Building2, Cpu } from 'lucide-react'
import { cn, formatUSD, formatCLP } from '@/lib/utils'
import type { Cliente, ClientTag, Company, Operation, Processor } from '@/types'
import { ClienteTagBadge } from './ClienteTagBadge'
import { ClienteForm } from './ClienteForm'
import { ClienteDocumentos } from './ClienteDocumentos'
import { OperacionStatusBadge } from '@/components/operaciones/OperacionStatusBadge'
import { TableScroll } from '@/components/ui/TableScroll'
import { BehaviorSignals } from '@/components/leads/BehaviorSignals'
import { PlaybookAssignment } from '@/components/playbooks/PlaybookAssignment'
import type { BehaviorSignal } from '@/types/behavior.types'
import type { AssignmentWithContext, Playbook } from '@/types/playbook.types'

type Props = {
  cliente:            Cliente
  operations:         Operation[]
  companies:          Company[]
  processors:         Processor[]
  initialSignals?:    BehaviorSignal[]
  initialAssignments?: AssignmentWithContext[]
  allPlaybooks?:      Playbook[]
}

export function ClienteDetalle({ cliente, operations, companies, processors, initialSignals = [], initialAssignments = [], allPlaybooks = [] }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)

  const companyName = companies.find(c => c.id === cliente.assigned_company_id)?.name
  const processorName = processors.find(p => p.id === cliente.assigned_processor_id)?.name

  const completadas = operations.filter(o => o.status === 'completada')
  const totalUsd    = operations.reduce((s, o) => s + o.amount_usd, 0)
  const totalProfit = operations.reduce((s, o) => s + (o.profit_clp ?? 0), 0)
  const lastOp      = operations[0]

  function handleSuccess() {
    setShowForm(false)
    startTransition(() => router.refresh())
  }

  return (
    <>
      {showForm && (
        <ClienteForm
          onClose={() => setShowForm(false)}
          onSuccess={handleSuccess}
          companies={companies}
          processors={processors}
          editing={cliente}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/clientes')}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-base font-semibold text-slate-200">
                {cliente.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-100">{cliente.full_name}</h1>
              {cliente.document_id && (
                <p className="text-xs text-slate-500 font-mono">{cliente.document_id}</p>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-slate-100 rounded-md transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Editar
        </button>
      </div>

      {/* Tags */}
      {cliente.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cliente.tags.map(tag => <ClienteTagBadge key={tag} tag={tag as ClientTag} />)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: datos */}
        <div className="space-y-4">
          {/* Datos de contacto */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Contacto
            </h2>
            <InfoRow icon={Mail} label="Email" value={cliente.email} />
            <InfoRow icon={Phone} label="Teléfono" value={cliente.phone} />
            <InfoRow icon={Building2} label="Empresa" value={companyName} />
            <InfoRow icon={Cpu} label="Procesador" value={processorName} />
            {cliente.document_id && (
              <InfoRow icon={FileText} label="Documento" value={cliente.document_id} mono />
            )}
          </div>

          {/* Notas */}
          {cliente.notes && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Notas
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                {cliente.notes}
              </p>
            </div>
          )}

          {/* Fecha de registro */}
          <p className="text-xs text-slate-600 px-1">
            Registrado el{' '}
            {new Date(cliente.created_at).toLocaleDateString('es-CL', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {/* Columna derecha: resumen + historial */}
        <div className="lg:col-span-2 space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Operaciones" value={String(operations.length)} />
            <SummaryCard label="Completadas" value={String(completadas.length)} positive />
            <SummaryCard label="Volumen USD" value={formatUSD(totalUsd)} highlight />
            <SummaryCard
              label="Utilidad CLP"
              value={formatCLP(totalProfit)}
              positive={totalProfit >= 0}
            />
          </div>

          {/* Última operación */}
          {lastOp && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Última operación</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono text-slate-200">{formatUSD(lastOp.amount_usd)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(lastOp.operation_date + 'T00:00:00').toLocaleDateString('es-CL')}
                  </p>
                </div>
                <OperacionStatusBadge status={lastOp.status} />
              </div>
            </div>
          )}

          {/* Documentos del cliente */}
          <ClienteDocumentos clienteId={cliente.id} operationIds={operations.map(o => o.id)} />

          {/* Playbooks asignados */}
          <PlaybookAssignment
            clientId={cliente.id}
            initialAssignments={initialAssignments}
            allPlaybooks={allPlaybooks}
          />

          {/* Señales de comportamiento */}
          <BehaviorSignals clientId={cliente.id} initialSignals={initialSignals} />

          {/* Historial de operaciones */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="text-sm font-medium text-slate-300">
                Historial de operaciones
                <span className="ml-2 text-xs text-slate-500">({operations.length})</span>
              </h2>
            </div>

            {operations.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-500">Sin operaciones registradas para este cliente.</p>
              </div>
            ) : (
              <TableScroll>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Fecha', 'Monto USD', 'TC', 'Payout%', 'Utilidad CLP', 'Estado'].map(h => (
                        <th
                          key={h}
                          className="text-left py-2.5 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map(op => (
                      <tr
                        key={op.id}
                        className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                      >
                        <td className="py-3 px-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                          {new Date(op.operation_date + 'T00:00:00').toLocaleDateString('es-CL')}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200 whitespace-nowrap text-xs">
                          {formatUSD(op.amount_usd)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">
                          {op.fx_rate_used.toLocaleString('es-CL', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-xs">
                          {op.client_payout_pct}%
                        </td>
                        <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                          {op.profit_clp != null ? (
                            <span className={op.profit_clp >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {formatCLP(op.profit_clp)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <OperacionStatusBadge status={op.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function InfoRow({
  icon: Icon, label, value, mono,
}: {
  icon: React.ElementType; label: string; value?: string | null; mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs text-slate-600 mb-0.5">{label}</p>
        <p className={cn('text-sm text-slate-300 break-all', mono && 'font-mono')}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

function SummaryCard({
  label, value, highlight, positive, warn,
}: {
  label: string; value: string; highlight?: boolean; positive?: boolean; warn?: boolean
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={cn(
        'text-lg font-bold font-mono',
        highlight  ? 'text-slate-100' :
        positive === true  ? 'text-green-400' :
        positive === false ? 'text-red-400'   :
        warn               ? 'text-amber-400' :
        'text-slate-100'
      )}>
        {value}
      </p>
    </div>
  )
}
