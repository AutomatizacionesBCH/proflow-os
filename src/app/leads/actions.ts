'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Lead, LeadStage, LeadChannel } from '@/types'
import { calculateLeadScore } from '@/lib/lead-agent'

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

const RECALC_BATCH = 100

export async function recalculateAllLeads(): Promise<ActionResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leads, error: fetchError } = await supabase.from('leads').select('*') as any
  if (fetchError) return { success: false, error: fetchError.message }

  const rows = (leads as Lead[]).map(lead => {
    const result = calculateLeadScore(lead)
    return { id: lead.id, ...result }
  })

  for (let i = 0; i < rows.length; i += RECALC_BATCH) {
    const batch = rows.slice(i, i + RECALC_BATCH)
    await Promise.all(
      batch.map(r =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase.from('leads').update({
          heat_score:                 r.heat_score,
          priority_label:             r.priority_label,
          assigned_to_recommendation: r.assigned_to_recommendation,
          next_action:                r.next_action,
        } as any).eq('id', r.id)
      )
    )
  }

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
