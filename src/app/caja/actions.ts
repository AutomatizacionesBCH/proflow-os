'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type CashPositionInput = {
  date: string
  available_clp: number
  notes: string
}

type ActionResult = { success: true } | { success: false; error: string }

export async function createCashPosition(input: CashPositionInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('cash_positions').insert({
    date:          input.date,
    available_clp: input.available_clp,
    notes:         input.notes || null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/caja')
  return { success: true }
}

export async function updateCashPosition(id: string, input: CashPositionInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('cash_positions').update({
    date:          input.date,
    available_clp: input.available_clp,
    notes:         input.notes || null,
  }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/caja')
  return { success: true }
}
