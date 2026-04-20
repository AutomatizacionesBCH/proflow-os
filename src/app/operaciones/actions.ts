'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcOperation } from '@/lib/utils'
import type { OperationStatus } from '@/types'

export type CreateOperationInput = {
  client_id: string
  company_id: string
  processor_id: string
  operation_date: string
  amount_usd: number
  client_payout_pct: number
  fx_rate_used: number
  fx_source: string
  processor_fee_pct: number
  loan_fee_pct: number
  payout_fee_pct: number
  wire_fee_usd: number
  receive_fee_usd: number
  status: OperationStatus
  notes: string
}

export type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string }

export async function createOperation(input: CreateOperationInput): Promise<ActionResult> {
  const supabase = await createClient()

  const calc = calcOperation({
    amount_usd:        input.amount_usd,
    fx_rate_used:      input.fx_rate_used,
    client_payout_pct: input.client_payout_pct,
    processor_fee_pct: input.processor_fee_pct,
    loan_fee_pct:      input.loan_fee_pct,
    payout_fee_pct:    input.payout_fee_pct,
    wire_fee_usd:      input.wire_fee_usd,
    receive_fee_usd:   input.receive_fee_usd,
  })

  const { data, error } = await supabase
    .from('operations')
    .insert({
      client_id:         input.client_id,
      company_id:        input.company_id || null,
      processor_id:      input.processor_id || null,
      operation_date:    input.operation_date,
      amount_usd:        input.amount_usd,
      client_payout_pct: input.client_payout_pct,
      fx_rate_used:      input.fx_rate_used,
      fx_source:         input.fx_source || null,
      amount_clp_paid:   calc.amount_clp_paid,
      processor_fee_pct: input.processor_fee_pct,
      loan_fee_pct:      input.loan_fee_pct,
      payout_fee_pct:    input.payout_fee_pct,
      wire_fee_usd:      input.wire_fee_usd,
      receive_fee_usd:   input.receive_fee_usd,
      gross_clp:         calc.gross_clp,
      profit_clp:        calc.profit_clp,
      status:            input.status,
      notes:             input.notes || null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/operaciones')
  return { success: true, id: data.id }
}

export async function updateOperationStatus(
  id: string,
  status: OperationStatus
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('operations')
    .update({ status })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/operaciones')
  return { success: true, id }
}

export async function updateOperation(id: string, input: CreateOperationInput): Promise<ActionResult> {
  const supabase = await createClient()

  const calc = calcOperation({
    amount_usd:        input.amount_usd,
    fx_rate_used:      input.fx_rate_used,
    client_payout_pct: input.client_payout_pct,
    processor_fee_pct: input.processor_fee_pct,
    loan_fee_pct:      input.loan_fee_pct,
    payout_fee_pct:    input.payout_fee_pct,
    wire_fee_usd:      input.wire_fee_usd,
    receive_fee_usd:   input.receive_fee_usd,
  })

  const { error } = await supabase
    .from('operations')
    .update({
      client_id:         input.client_id,
      company_id:        input.company_id || null,
      processor_id:      input.processor_id || null,
      operation_date:    input.operation_date,
      amount_usd:        input.amount_usd,
      client_payout_pct: input.client_payout_pct,
      fx_rate_used:      input.fx_rate_used,
      fx_source:         input.fx_source || null,
      amount_clp_paid:   calc.amount_clp_paid,
      processor_fee_pct: input.processor_fee_pct,
      loan_fee_pct:      input.loan_fee_pct,
      payout_fee_pct:    input.payout_fee_pct,
      wire_fee_usd:      input.wire_fee_usd,
      receive_fee_usd:   input.receive_fee_usd,
      gross_clp:         calc.gross_clp,
      profit_clp:        calc.profit_clp,
      status:            input.status,
      notes:             input.notes || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/operaciones')
  return { success: true, id }
}

export async function deleteOperation(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('operations')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/operaciones')
  return { success: true, id }
}
