'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { LeadStatus, LeadChannel } from '@/types'

export type LeadInput = {
  full_name: string
  phone: string
  source_channel: LeadChannel | null
  campaign_name: string
  status: LeadStatus
  notes: string
}

type ActionResult = { success: true } | { success: false; error: string }

export async function createLead(input: LeadInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('leads').insert({
    full_name:      input.full_name,
    phone:          input.phone || null,
    source_channel: input.source_channel,
    campaign_name:  input.campaign_name || null,
    status:         input.status,
    notes:          input.notes || null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/leads')
  return { success: true }
}

export async function updateLead(id: string, input: LeadInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('leads').update({
    full_name:      input.full_name,
    phone:          input.phone || null,
    source_channel: input.source_channel,
    campaign_name:  input.campaign_name || null,
    status:         input.status,
    notes:          input.notes || null,
  }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/leads')
  return { success: true }
}

export async function convertLead(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('leads').update({
    status:              'convertido',
    converted_to_client: true,
  }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/leads')
  return { success: true }
}
