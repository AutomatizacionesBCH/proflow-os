/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/lib/supabase/server'
import { updateAttributionOnLeadConversion, updateAttributionOnOperation } from './attribution-actions'

export type BackfillResult = {
  success: boolean
  leads_processed:      number
  leads_skipped:        number
  operations_processed: number
  operations_skipped:   number
  errors:               string[]
}

// ── Backfill de leads ya convertidos ────────────────────────────────────────
// Busca leads con converted_to_client_id ya seteado y crea sus registros
// en attribution_truth si aún no existen.
export async function backfillLeadAttributions(): Promise<BackfillResult> {
  const supabase = await createClient()
  const errors: string[] = []
  let leads_processed = 0
  let leads_skipped   = 0

  // 1. Leads con conversión ya registrada
  const { data: leads, error: leadsErr } = await (supabase as any)
    .from('leads')
    .select('id, converted_to_client_id')
    .not('converted_to_client_id', 'is', null)
    .limit(5000)

  if (leadsErr) return { success: false, leads_processed: 0, leads_skipped: 0, operations_processed: 0, operations_skipped: 0, errors: [leadsErr.message] }

  // 2. Registros que ya existen en attribution_truth
  const { data: existing } = await (supabase as any)
    .from('attribution_truth')
    .select('lead_id')
    .not('lead_id', 'is', null)
    .limit(10000)

  const existingLeadIds = new Set(((existing as any[]) ?? []).map((r: any) => r.lead_id))

  // 3. Procesar solo los que no tienen registro aún
  for (const lead of (leads as any[]) ?? []) {
    if (existingLeadIds.has(lead.id)) { leads_skipped++; continue }

    const res = await updateAttributionOnLeadConversion(lead.id, lead.converted_to_client_id)
    if (res.success) {
      leads_processed++
    } else {
      errors.push(`lead ${lead.id}: ${res.error}`)
    }
  }

  // ── Backfill de operaciones sin atribución ───────────────────────────────
  let operations_processed = 0
  let operations_skipped   = 0

  const { data: ops, error: opsErr } = await supabase
    .from('operations')
    .select('id, client_id')
    .limit(5000)

  if (opsErr) {
    errors.push(`ops fetch: ${opsErr.message}`)
    return { success: errors.length === 0, leads_processed, leads_skipped, operations_processed, operations_skipped, errors }
  }

  const { data: existingOps } = await (supabase as any)
    .from('attribution_truth')
    .select('operation_id')
    .not('operation_id', 'is', null)
    .limit(10000)

  const existingOpIds = new Set(((existingOps as any[]) ?? []).map((r: any) => r.operation_id))

  for (const op of ops ?? []) {
    if (existingOpIds.has(op.id)) { operations_skipped++; continue }

    const res = await updateAttributionOnOperation(op.client_id, op.id)
    if (res.success) {
      operations_processed++
    } else {
      errors.push(`op ${op.id}: ${res.error}`)
    }
  }

  return {
    success: errors.length === 0,
    leads_processed,
    leads_skipped,
    operations_processed,
    operations_skipped,
    errors,
  }
}
