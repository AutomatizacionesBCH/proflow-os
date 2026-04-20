'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { MarketingChannel } from '@/types'

export type MarketingSpendInput = {
  date: string
  channel: MarketingChannel
  amount_clp: number
  notes: string
}

export async function createMarketingSpend(input: MarketingSpendInput) {
  const supabase = await createClient()
  const { error } = await supabase.from('marketing_spend').insert({
    date:       input.date,
    channel:    input.channel,
    amount_clp: input.amount_clp,
    notes:      input.notes || null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

export async function updateMarketingSpend(id: string, input: MarketingSpendInput) {
  const supabase = await createClient()
  const { error } = await supabase.from('marketing_spend').update({
    date:       input.date,
    channel:    input.channel,
    amount_clp: input.amount_clp,
    notes:      input.notes || null,
  }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

export async function deleteMarketingSpend(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('marketing_spend').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}
