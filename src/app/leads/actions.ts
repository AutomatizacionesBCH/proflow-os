'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { LeadStage, LeadChannel } from '@/types'

export type LeadInput = {
  full_name:          string
  phone:              string
  email:              string
  source_channel:     LeadChannel | null
  campaign_name:      string
  stage:              LeadStage
  assigned_to:        string | null
  heat_score:         number
  next_action:        string | null
  next_action_due_at: string | null
  notes:              string
}

type ActionResult = { success: true } | { success: false; error: string }

export async function createLead(input: LeadInput): Promise<ActionResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('leads').insert({
    full_name:          input.full_name,
    phone:              input.phone || null,
    email:              input.email || null,
    source_channel:     input.source_channel,
    campaign_name:      input.campaign_name || null,
    stage:              input.stage,
    assigned_to:        input.assigned_to || null,
    heat_score:         input.heat_score,
    next_action:        input.next_action || null,
    next_action_due_at: input.next_action_due_at || null,
    notes:              input.notes || null,
    source_platform:    'manual',
  } as any)
  if (error) return { success: false, error: error.message }
  revalidatePath('/leads')
  return { success: true }
}

export async function updateLead(id: string, input: LeadInput): Promise<ActionResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('leads').update({
    full_name:          input.full_name,
    phone:              input.phone || null,
    email:              input.email || null,
    source_channel:     input.source_channel,
    campaign_name:      input.campaign_name || null,
    stage:              input.stage,
    assigned_to:        input.assigned_to || null,
    heat_score:         input.heat_score,
    next_action:        input.next_action || null,
    next_action_due_at: input.next_action_due_at || null,
    notes:              input.notes || null,
  } as any).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/leads')
  return { success: true }
}

export async function convertLead(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('leads').update({ stage: 'operated' } as any).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/leads')
  return { success: true }
}
