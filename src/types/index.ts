export type Status = 'active' | 'inactive' | 'pending' | 'warning' | 'info'

export type DeltaDirection = 'up' | 'down' | 'neutral'

export type OperationStatus = 'pendiente' | 'en_proceso' | 'completada' | 'anulada'

export type BaseEntity = {
  id: string
  created_at: string
  updated_at: string
}

export type Operation = {
  id: string
  client_id: string
  company_id: string | null
  processor_id: string | null
  operation_date: string
  amount_usd: number
  client_payout_pct: number
  fx_rate_used: number
  fx_source: string | null
  amount_clp_paid: number | null
  processor_fee_pct: number
  loan_fee_pct: number
  payout_fee_pct: number
  wire_fee_usd: number
  receive_fee_usd: number
  gross_clp: number | null
  profit_clp: number | null
  status: OperationStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type Cliente = BaseEntity & {
  nombre: string
  email: string
  status: Status
}

export type Lead = BaseEntity & {
  nombre: string
  empresa: string
  valor_estimado: number
  etapa: 'nuevo' | 'contactado' | 'propuesta' | 'cerrado'
}

export type Procesador = BaseEntity & {
  nombre: string
  tipo: string
  fee: number
  estado: Status
}

export type Empresa = BaseEntity & {
  razon_social: string
  rfc: string
  sector: string
  estado: Status
}
