/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CampaignChannel } from '@/types'

type ActionResult = { success: true } | { success: false; error: string }

export async function approveMessage(id: string, approvedBy = 'admin'): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('campaign_messages').update({
    status:      'approved',
    approved_by: approvedBy,
  }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

export async function rejectMessage(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('campaign_messages').update({ status: 'rejected' }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

export async function markMessageSent(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('campaign_messages').update({
    status:  'sent',
    sent_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

export async function deleteMensaje(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('campaign_messages').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

export type MensajeInput = {
  campaign_id:  string
  lead_id:      string | null
  client_id:    string | null
  message_body: string
  channel:      CampaignChannel | null
}

export async function createMensaje(input: MensajeInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('campaign_messages').insert({
    campaign_id:  input.campaign_id,
    lead_id:      input.lead_id   || null,
    client_id:    input.client_id || null,
    message_body: input.message_body || null,
    channel:      input.channel,
    status:       'pending',
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}
