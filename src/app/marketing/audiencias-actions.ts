/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AudienciaInput = {
  name:         string
  description:  string
  member_count: number
}

export type AudienciaMember = {
  id:    string
  name:  string
  phone: string | null
  type:  'lead' | 'client'
}

type ActionResult = { success: true } | { success: false; error: string }

export async function createAudiencia(input: AudienciaInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('audiences').insert({
    name:         input.name,
    description:  input.description || null,
    member_count: input.member_count,
    status:       'active',
    rules_json:   null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

export async function updateAudiencia(id: string, input: AudienciaInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('audiences').update({
    name:         input.name,
    description:  input.description || null,
    member_count: input.member_count,
  }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

export async function deleteAudiencia(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('audiences').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

const DEFAULT_AUDIENCES = [
  { name: 'VIP activos',               description: 'Clientes con tag VIP con operación en los últimos 30 días',  rules_json: { type: 'vip_active' } },
  { name: 'VIP dormidos',              description: 'Clientes con tag VIP sin operación en más de 60 días',       rules_json: { type: 'vip_dormant' } },
  { name: 'Spot',                       description: 'Clientes con tag frecuente',                                 rules_json: { type: 'spot' } },
  { name: 'Nuevos sin operación',       description: 'Leads con stage new o contacted sin conversión',            rules_json: { type: 'new_no_op' } },
  { name: 'Leads calientes sin cierre', description: 'Leads con prioridad hot o warm sin conversión',            rules_json: { type: 'hot_warm_no_close' } },
  { name: 'Leads con objeción',         description: 'Leads con notas que indican desconfianza o dudas',         rules_json: { type: 'objection' } },
  { name: 'Dormidos reactivables',      description: 'Leads en stage dormant',                                    rules_json: { type: 'dormant_reactivable' } },
]

export async function seedDefaultAudiencias(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: existing } = await (supabase as any).from('audiences').select('name')
  const existingNames = new Set(((existing as any[]) ?? []).map((a: any) => a.name))

  const toInsert = DEFAULT_AUDIENCES.filter(a => !existingNames.has(a.name))
  if (toInsert.length === 0) { revalidatePath('/marketing'); return { success: true } }

  const { error } = await (supabase as any).from('audiences').insert(
    toInsert.map(a => ({ ...a, status: 'active', member_count: 0 }))
  )
  if (error) return { success: false, error: error.message }
  revalidatePath('/marketing')
  return { success: true }
}

export async function syncAudienceCounts(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: audiences } = await (supabase as any).from('audiences').select('id, rules_json')
  if (!(audiences as any[])?.length) return { success: true }

  const ruleAudiences = (audiences as any[]).filter(
    (a: any) => a.rules_json && (a.rules_json as Record<string, string>).type
  )

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const sixtyDaysAgo  = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [vipRes, frecuenteRes, ops30Res, ops60Res, leadsRes] = await Promise.all([
    supabase.from('clients').select('id').contains('tags', ['VIP']),
    supabase.from('clients').select('id').contains('tags', ['frecuente']),
    supabase.from('operations').select('client_id').gte('operation_date', thirtyDaysAgo),
    supabase.from('operations').select('client_id').gte('operation_date', sixtyDaysAgo),
    (supabase as any).from('leads').select('id, stage, priority_label, converted_to_client_id, notes').limit(10000),
  ])

  const vipIds        = new Set((vipRes.data       ?? []).map((c: any) => c.id))
  const frecuenteCount = (frecuenteRes.data ?? []).length
  const recentOps30   = new Set((ops30Res.data     ?? []).map((o: any) => o.client_id))
  const recentOps60   = new Set((ops60Res.data     ?? []).map((o: any) => o.client_id))
  const leads         = (leadsRes.data as any[]) ?? []

  const countMap: Record<string, number> = {}

  for (const aud of ruleAudiences) {
    const ruleType = (aud.rules_json as Record<string, string>).type
    switch (ruleType) {
      case 'vip_active':
        countMap[aud.id] = [...vipIds].filter(id => recentOps30.has(id)).length; break
      case 'vip_dormant':
        countMap[aud.id] = [...vipIds].filter(id => !recentOps60.has(id)).length; break
      case 'spot':
        countMap[aud.id] = frecuenteCount; break
      case 'new_no_op':
        countMap[aud.id] = leads.filter((l: any) =>
          (l.stage === 'new' || l.stage === 'contacted') && !l.converted_to_client_id
        ).length; break
      case 'hot_warm_no_close':
        countMap[aud.id] = leads.filter((l: any) =>
          (l.priority_label === 'hot' || l.priority_label === 'warm') && !l.converted_to_client_id
        ).length; break
      case 'objection':
        countMap[aud.id] = leads.filter((l: any) =>
          l.notes && (
            l.notes.toLowerCase().includes('desconfía') ||
            l.notes.toLowerCase().includes('no confía') ||
            l.notes.toLowerCase().includes('dudas')
          )
        ).length; break
      case 'dormant_reactivable':
        countMap[aud.id] = leads.filter((l: any) => l.stage === 'dormant').length; break
    }
  }

  await Promise.all(
    Object.entries(countMap).map(([id, count]) =>
      (supabase as any).from('audiences').update({ member_count: count }).eq('id', id)
    )
  )

  revalidatePath('/marketing')
  return { success: true }
}

export async function getAudienciaMembers(
  audienceId: string
): Promise<{ success: true; members: AudienciaMember[] } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: audience, error: audErr } = await (supabase as any)
    .from('audiences').select('rules_json').eq('id', audienceId).single()
  if (audErr) return { success: false, error: audErr.message }
  if (!(audience as any)?.rules_json) return { success: true, members: [] }

  const ruleType   = ((audience as any).rules_json as Record<string, string>).type
  const thirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const sixtyDays  = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  switch (ruleType) {
    case 'vip_active': {
      const [vipRes, opsRes] = await Promise.all([
        supabase.from('clients').select('id, full_name, phone').contains('tags', ['VIP']),
        supabase.from('operations').select('client_id').gte('operation_date', thirtyDays),
      ])
      const recentIds = new Set((opsRes.data ?? []).map((o: any) => o.client_id))
      return {
        success: true,
        members: (vipRes.data ?? []).filter((c: any) => recentIds.has(c.id))
          .map((c: any) => ({ id: c.id, name: c.full_name, phone: c.phone ?? null, type: 'client' as const })),
      }
    }
    case 'vip_dormant': {
      const [vipRes, opsRes] = await Promise.all([
        supabase.from('clients').select('id, full_name, phone').contains('tags', ['VIP']),
        supabase.from('operations').select('client_id').gte('operation_date', sixtyDays),
      ])
      const recentIds = new Set((opsRes.data ?? []).map((o: any) => o.client_id))
      return {
        success: true,
        members: (vipRes.data ?? []).filter((c: any) => !recentIds.has(c.id))
          .map((c: any) => ({ id: c.id, name: c.full_name, phone: c.phone ?? null, type: 'client' as const })),
      }
    }
    case 'spot': {
      const { data } = await supabase.from('clients').select('id, full_name, phone').contains('tags', ['frecuente'])
      return {
        success: true,
        members: (data ?? []).map((c: any) => ({ id: c.id, name: c.full_name, phone: c.phone ?? null, type: 'client' as const })),
      }
    }
    case 'new_no_op': {
      const { data } = await (supabase as any).from('leads').select('id, full_name, phone')
        .in('stage', ['new', 'contacted']).is('converted_to_client_id', null).limit(500)
      return {
        success: true,
        members: ((data as any[]) ?? []).map((l: any) => ({ id: l.id, name: l.full_name, phone: l.phone ?? null, type: 'lead' as const })),
      }
    }
    case 'hot_warm_no_close': {
      const { data } = await (supabase as any).from('leads').select('id, full_name, phone')
        .in('priority_label', ['hot', 'warm']).is('converted_to_client_id', null).limit(500)
      return {
        success: true,
        members: ((data as any[]) ?? []).map((l: any) => ({ id: l.id, name: l.full_name, phone: l.phone ?? null, type: 'lead' as const })),
      }
    }
    case 'objection': {
      const { data } = await (supabase as any).from('leads').select('id, full_name, phone, notes')
        .not('notes', 'is', null).limit(5000)
      const filtered = ((data as any[]) ?? []).filter((l: any) =>
        l.notes && (
          l.notes.toLowerCase().includes('desconfía') ||
          l.notes.toLowerCase().includes('no confía') ||
          l.notes.toLowerCase().includes('dudas')
        )
      )
      return {
        success: true,
        members: filtered.map((l: any) => ({ id: l.id, name: l.full_name, phone: l.phone ?? null, type: 'lead' as const })),
      }
    }
    case 'dormant_reactivable': {
      const { data } = await (supabase as any).from('leads').select('id, full_name, phone').eq('stage', 'dormant').limit(500)
      return {
        success: true,
        members: ((data as any[]) ?? []).map((l: any) => ({ id: l.id, name: l.full_name, phone: l.phone ?? null, type: 'lead' as const })),
      }
    }
    default:
      return { success: true, members: [] }
  }
}
