import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { LeadChannel } from '@/types'

// Eventos que nos interesan — ignoramos el resto silenciosamente
const HANDLED_EVENTS = ['contact.created', 'message.received']

// Mapea el canal Vambe al tipo LeadChannel de ProFlow OS
function mapChannel(vambeChannel?: string): { channel: LeadChannel; campaign: string } {
  const raw = (vambeChannel ?? '').toLowerCase()
  if (raw.includes('instagram') || raw.includes('meta') || raw.includes('facebook')) {
    return { channel: 'Meta', campaign: 'Instagram (Vambe)' }
  }
  if (raw.includes('google')) {
    return { channel: 'otro', campaign: 'Google Ads (Vambe)' }
  }
  if (raw.includes('tiktok')) {
    return { channel: 'TikTok', campaign: 'TikTok (Vambe)' }
  }
  // Sin canal identificable — marcamos Meta por defecto (canal principal)
  return { channel: 'Meta', campaign: 'Vambe' }
}

export async function POST(req: NextRequest) {
  // 1. Validar API key
  const apiKey = req.headers.get('x-api-key')
  if (!process.env.VAMBE_WEBHOOK_SECRET || apiKey !== process.env.VAMBE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parsear payload
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, data, aiContactId } = body as {
    type: string
    aiContactId?: string
    data?: Record<string, unknown>
  }

  // 3. Ignorar eventos que no manejamos
  if (!HANDLED_EVENTS.includes(type)) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const name      = String(data?.name ?? '').trim()
  const phone     = String(data?.fromNumber ?? data?.phone ?? '').trim()
  const vambeCh   = String(data?.channel ?? data?.channelType ?? '')
  const { channel, campaign } = mapChannel(vambeCh)

  if (!name && !phone) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no_contact_info' })
  }

  const supabase = await createClient()

  // 4. Deduplicar por teléfono — no crear si ya existe un lead con ese número
  if (phone) {
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'duplicate_phone', id: existing.id })
    }
  }

  // 5. Crear lead
  const notes = [
    `Origen: Vambe (${type})`,
    aiContactId ? `Vambe ID: ${aiContactId}` : null,
    vambeCh ? `Canal Vambe: ${vambeCh}` : null,
  ].filter(Boolean).join('\n')

  const { error } = await supabase.from('leads').insert({
    full_name:      name || 'Sin nombre',
    phone:          phone || null,
    source_channel: channel,
    campaign_name:  campaign,
    status:         'nuevo',
    notes,
  })

  if (error) {
    console.error('[vambe webhook] supabase error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
