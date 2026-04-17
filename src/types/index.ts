export type Status = 'active' | 'inactive' | 'pending' | 'warning' | 'info'

export type DeltaDirection = 'up' | 'down' | 'neutral'

export type BaseEntity = {
  id: string
  created_at: string
  updated_at: string
}

export type Cliente = BaseEntity & {
  nombre: string
  email: string
  status: Status
}

export type Operacion = BaseEntity & {
  cliente_id: string
  monto: number
  procesador_id: string
  estado: Status
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
