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

export type ClientTag = 'VIP' | 'frecuente' | 'nuevo' | 'riesgo' | 'pausado'

export type Cliente = {
  id: string
  full_name: string
  document_id: string | null
  email: string | null
  phone: string | null
  assigned_company_id: string | null
  assigned_processor_id: string | null
  tags: ClientTag[]
  notes: string | null
  created_at: string
}

export type EmpresaStatus = 'activo' | 'pausado' | 'en_riesgo'

export type Company = {
  id: string
  name: string
  legal_name: string | null
  status: EmpresaStatus | null
  notes: string | null
  created_at: string
}

export type ProcessorStatus = 'activo' | 'pausado' | 'en_riesgo'

export type Processor = {
  id: string
  name: string
  company_id: string | null
  type: string | null
  status: ProcessorStatus | null
  daily_limit_usd: number | null
  notes: string | null
  created_at: string
}

export type CashPosition = {
  id: string
  date: string
  available_clp: number
  notes: string | null
  created_at: string
}

export type Lead = BaseEntity & {
  nombre: string
  empresa: string
  valor_estimado: number
  etapa: 'nuevo' | 'contactado' | 'propuesta' | 'cerrado'
}
