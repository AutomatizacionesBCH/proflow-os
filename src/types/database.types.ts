export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      operations: {
        Row: {
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
          status: 'pendiente' | 'en_proceso' | 'completada' | 'anulada'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          company_id?: string | null
          processor_id?: string | null
          operation_date?: string
          amount_usd: number
          client_payout_pct: number
          fx_rate_used: number
          fx_source?: string | null
          amount_clp_paid?: number | null
          processor_fee_pct?: number
          loan_fee_pct?: number
          payout_fee_pct?: number
          wire_fee_usd?: number
          receive_fee_usd?: number
          gross_clp?: number | null
          profit_clp?: number | null
          status?: 'pendiente' | 'en_proceso' | 'completada' | 'anulada'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          company_id?: string | null
          processor_id?: string | null
          operation_date?: string
          amount_usd?: number
          client_payout_pct?: number
          fx_rate_used?: number
          fx_source?: string | null
          amount_clp_paid?: number | null
          processor_fee_pct?: number
          loan_fee_pct?: number
          payout_fee_pct?: number
          wire_fee_usd?: number
          receive_fee_usd?: number
          gross_clp?: number | null
          profit_clp?: number | null
          status?: 'pendiente' | 'en_proceso' | 'completada' | 'anulada'
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          full_name: string
          document_id: string | null
          email: string | null
          phone: string | null
          assigned_company_id: string | null
          assigned_processor_id: string | null
          tags: string[]
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          document_id?: string | null
          email?: string | null
          phone?: string | null
          assigned_company_id?: string | null
          assigned_processor_id?: string | null
          tags?: string[]
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          document_id?: string | null
          email?: string | null
          phone?: string | null
          assigned_company_id?: string | null
          assigned_processor_id?: string | null
          tags?: string[]
          notes?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      processors: {
        Row: {
          id: string
          name: string
          type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
