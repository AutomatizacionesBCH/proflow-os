import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { LeadChannel } from '@/types'

// Solo capturamos cambios de etapa hacia las 4 categorías de interés
const TARGET_STAGES: Record<string, { label: string; status: 'nuevo' | 'en_seguimiento' | 'convertido' }> = {
  '5b79a21f-1b1c-4989-ad87-0d1703f3a528': { label: 'Interesado',        status: 'nuevo'          },
  '9426035f-54fe-411d-a2fd-5ec5cf26e53c': { label: 'Ganados',           status: 'convertido'     },
  'ef629e7e-059a-489a-bfd4-5a899581c314': { label: 'Sobrecupos',        status: 'en_seguimiento' },
  '8bef9ace-fd76-4629-b638-94aa2dae2db7': { label: 'Clientes +5000 USD', status: 'convertido'    },
}

const PLATFORM_CHANNEL: Record<string, LeadChannel> = {
  instagram: 'Meta', facebook: 'Meta', meta: 'Meta',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
}

function mapChannel(platform?: string): LeadChannel {
  return PLATFORM_CHANNEL[(platform ?? '').toLowerCase()] ?? 'otro'
}

export async function POST(req: NextRequest) {
  // 1. Validar token en query param (?token=...) — Vambe no envía headers de auth
  const token = req.nextUrl.searchParams.get('token')
  if (!process.env.VAMBE_WEBHOOK_SECRET || token !== process.env.VAMBE_WEBHOOK_SECRET) {
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

  // 3. Solo procesar stage.changed hacia etapas objetivo
  if (type !== 'stage.changed') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const newStageId = String(data?.new_stage_id ?? '')
  const stage = TARGET_STAGES[newStageId]
  if (!stage) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'stage_not_targeted' })
  }

  const name    = String(data?.contact_name ?? data?.name ?? '').trim()
  const phone   = String(data?.phone ?? '').trim()
  const platform = String(data?.platform ?? '')
  const channel = mapChannel(platform)

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
    `Importado desde Vambe`,
    `Etapa: ${stage.label}`,
    platform ? `Plataforma: ${platform}` : null,
    aiContactId ? `Vambe ID: ${aiContactId}` : null,
  ].filter(Boolean).join('\n')

  const { error } = await supabase.from('leads').insert({
    full_name:      name || 'Sin nombre',
    phone:          phone || null,
    source_channel: channel,
    campaign_name:  `${stage.label} (Vambe)`,
    status:         stage.status,
    notes,
  })

  if (error) {
    console.error('[vambe webhook] supabase error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
