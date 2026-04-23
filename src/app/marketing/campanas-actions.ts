/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CampaignChannel, CampaignStatus } from '@/types'
import { getAudienciaMembers } from './audiencias-actions'

export type CampanaInput = {
  name:         string
  objective:    string
  audience_id:  string | null
  channel:      CampaignChannel | null
  copy_version: string
  status:       CampaignStatus
  launched_at:  string | null
}

type ActionResult = { success: true } | { success: false; error: string }

export async function createCampana(input: CampanaInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('campaigns').insert({
    name:         input.name,
    objective:    input.objective || null,
    audience_id:  input.audience_id || null,
    channel:      input.channel,
    copy_version: input.copy_version || null,
    status:       input.status,
    launched_at:  input.launched_at || null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

export async function updateCampana(id: string, input: CampanaInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('campaigns').update({
    name:         input.name,
    objective:    input.objective || null,
    audience_id:  input.audience_id || null,
    channel:      input.channel,
    copy_version: input.copy_version || null,
    status:       input.status,
    launched_at:  input.launched_at || null,
  }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

export async function deleteCampana(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('campaigns').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

export async function generateMessages(campaignId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: campaign, error: campErr } = await (supabase as any).from('campaigns')
    .select('audience_id, copy_version, channel').eq('id', campaignId).single()
  if (campErr) return { success: false, error: campErr.message }

  const camp = campaign as any
  if (!camp?.audience_id)  return { success: false, error: 'La campaña no tiene audiencia asignada' }
  if (!camp.copy_version)  return { success: false, error: 'La campaña no tiene texto de mensaje' }

  const membersResult = await getAudienciaMembers(camp.audience_id)
  if (!membersResult.success) return { success: false, error: membersResult.error }
  if (membersResult.members.length === 0) return { success: false, error: 'La audiencia no tiene miembros' }

  const { data: existing } = await (supabase as any).from('campaign_messages')
    .select('lead_id, client_id').eq('campaign_id', campaignId)
  const existingLeads   = new Set(((existing as any[]) ?? []).map((m: any) => m.lead_id).filter(Boolean))
  const existingClients = new Set(((existing as any[]) ?? []).map((m: any) => m.client_id).filter(Boolean))

  const toCreate = membersResult.members.filter(m =>
    m.type === 'lead' ? !existingLeads.has(m.id) : !existingClients.has(m.id)
  )
  if (toCreate.length === 0) { revalidatePath('/marketing'); return { success: true } }

  const messages = toCreate.map(m => ({
    campaign_id:  campaignId,
    lead_id:      m.type === 'lead'   ? m.id : null,
    client_id:    m.type === 'client' ? m.id : null,
    message_body: (camp.copy_version as string).replace(/\{\{nombre\}\}/gi, m.name),
    channel:      camp.channel,
    status:       'pending',
  }))

  for (let i = 0; i < messages.length; i += 100) {
    const { error } = await (supabase as any).from('campaign_messages').insert(messages.slice(i, i + 100))
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/marketing')
  return { success: true }
}
