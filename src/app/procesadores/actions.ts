'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProcessorStatus } from '@/types'

export type ProcesadorInput = {
  name: string
  company_id: string | null
  type: string
  status: ProcessorStatus
  daily_limit_usd: number | null
  notes: string
}

type ActionResult = { success: true } | { success: false; error: string }

export async function createProcesador(input: ProcesadorInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('processors').insert({
    name: input.name,
    company_id: input.company_id || null,
    type: input.type || null,
    status: input.status,
    daily_limit_usd: input.daily_limit_usd,
    notes: input.notes || null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/procesadores')
  return { success: true }
}

export async function updateProcesador(id: string, input: ProcesadorInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('processors').update({
    name: input.name,
    company_id: input.company_id || null,
    type: input.type || null,
    status: input.status,
    daily_limit_usd: input.daily_limit_usd,
    notes: input.notes || null,
  }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/procesadores')
  return { success: true }
}
