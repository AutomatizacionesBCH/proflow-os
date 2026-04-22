export type OperationKey = 'USD_CLP' | 'CLP_USD' | 'EUR_CLP' | 'CLP_EUR' | 'USD_EUR' | 'EUR_USD'
export type FormatKind = 'clp' | 'usd' | 'eur' | 'num'

export interface OpConfig {
  from: string
  to: string
  fromLabel: string
  tipoLabel: string
  fmtIn: FormatKind
  fmtOut: FormatKind
  defRate: number
}

export const OPS: Record<OperationKey, OpConfig> = {
  USD_CLP: {
    from: 'USD', to: 'CLP',
    fromLabel: 'Dólares a operar',
    tipoLabel: 'DÓLARES A PESOS (CLP)',
    fmtIn: 'usd', fmtOut: 'clp',
    defRate: 927.62,
  },
  CLP_USD: {
    from: 'CLP', to: 'USD',
    fromLabel: 'Pesos a operar',
    tipoLabel: 'PESOS (CLP) A DÓLARES',
    fmtIn: 'clp', fmtOut: 'usd',
    defRate: 1 / 927.62,
  },
  EUR_CLP: {
    from: 'EUR', to: 'CLP',
    fromLabel: 'Euros a operar',
    tipoLabel: 'EUROS A PESOS (CLP)',
    fmtIn: 'eur', fmtOut: 'clp',
    defRate: 1005.40,
  },
  CLP_EUR: {
    from: 'CLP', to: 'EUR',
    fromLabel: 'Pesos a operar',
    tipoLabel: 'PESOS (CLP) A EUROS',
    fmtIn: 'clp', fmtOut: 'eur',
    defRate: 1 / 1005.40,
  },
  USD_EUR: {
    from: 'USD', to: 'EUR',
    fromLabel: 'Dólares a operar',
    tipoLabel: 'DÓLARES A EUROS',
    fmtIn: 'usd', fmtOut: 'eur',
    defRate: 0.9225,
  },
  EUR_USD: {
    from: 'EUR', to: 'USD',
    fromLabel: 'Euros a operar',
    tipoLabel: 'EUROS A DÓLARES',
    fmtIn: 'eur', fmtOut: 'usd',
    defRate: 1.084,
  },
}

export function formatOut(n: number, kind: FormatKind): string {
  if (kind === 'clp') return '$' + Math.round(n).toLocaleString('es-CL')
  if (kind === 'usd') return 'US$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (kind === 'eur') return '€' + n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n.toLocaleString('es-CL', { maximumFractionDigits: 2 })
}

/** Smart rate formatter: shows enough decimals for both large (927) and small (0.00108) rates */
export function formatRate(n: number): string {
  if (n >= 100) return Math.round(n).toLocaleString('es-CL')
  if (n >= 1) return n.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  return n.toLocaleString('es-CL', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
}

/** Accepts both "1.234,56" (es-CL) and "1,234.56" (en-US) */
export function parseMonto(str: string): number {
  const cleaned = str.replace(/[^\d.,]/g, '')
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  if (lastComma > lastDot) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  return parseFloat(cleaned.replace(/,/g, ''))
}

export function computeNet(monto: number, rate: number, spreadPct: number): number {
  return monto * rate * (1 - spreadPct / 100)
}

export function formatFechaCL(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${day}-${months[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`
}
