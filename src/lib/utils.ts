import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCLP(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatUSD(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—'
  return `${value.toFixed(decimals)}%`
}

/** Sugiere el porcentaje de pago al cliente según monto USD */
export function suggestPayoutPct(amountUsd: number): number {
  if (amountUsd < 1000) return 78
  if (amountUsd < 2500) return 79
  if (amountUsd < 5000) return 80
  return 81
}

/** Calcula gross, pago y utilidad a partir de los campos de la operación */
export function calcOperation(params: {
  amount_usd: number
  fx_rate_used: number
  client_payout_pct: number
  processor_fee_pct: number
  loan_fee_pct: number
  payout_fee_pct: number
  wire_fee_usd: number
  receive_fee_usd: number
}) {
  const {
    amount_usd,
    fx_rate_used,
    client_payout_pct,
    processor_fee_pct,
    loan_fee_pct,
    payout_fee_pct,
    wire_fee_usd,
    receive_fee_usd,
  } = params

  const gross_clp       = amount_usd * fx_rate_used
  const amount_clp_paid = gross_clp * (client_payout_pct / 100)
  const fee_processor   = gross_clp * (processor_fee_pct / 100)
  const fee_loan        = gross_clp * (loan_fee_pct / 100)
  const fee_payout      = gross_clp * (payout_fee_pct / 100)
  const fee_wire        = wire_fee_usd * fx_rate_used
  const fee_receive     = receive_fee_usd * fx_rate_used

  const profit_clp = gross_clp - amount_clp_paid - fee_processor - fee_loan - fee_payout - fee_wire - fee_receive

  return {
    gross_clp,
    amount_clp_paid,
    profit_clp,
    fee_processor,
    fee_loan,
    fee_payout,
    fee_wire,
    fee_receive,
    profit_margin: gross_clp > 0 ? (profit_clp / gross_clp) * 100 : 0,
  }
}
