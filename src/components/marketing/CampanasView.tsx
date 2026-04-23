'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Megaphone, Pencil, Trash2, Loader2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Campaign, Audience } from '@/types'
import { deleteCampana, generateMessages } from '@/app/marketing/campanas-actions'
import { CampanaForm } from './CampanaForm'

const STATUS_STYLES: Record<string, string> = {
  draft:    'bg-slate-700/40 text-slate-400 border-slate-600/30',
  active:   'bg-green-500/10 text-green-400 border-green-500/20',
  paused:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  finished: 'bg-slate-600/20 text-slate-500 border-slate-600/20',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', active: 'Activa', paused: 'Pausada', finished: 'Finalizada',
}

const CHANNEL_STYLES: Record<string, string> = {
  whatsapp: 'bg-green-500/10 text-green-400 border-green-500/20',
  email:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  sms:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
}
const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS',
}

type Props = {
  initialCampanas: Campaign[]
  audiencias:      { id: string; name: string }[]
  messageCounts:   Record<string, number>
}

export function CampanasView({ initialCampanas, audiencias, messageCounts }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Campaign | undefined>()
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [genMsg, setGenMsg]         = useState<{ id: string; text: string } | null>(null)

  function refresh() { startTransition(() => router.refresh()) }

  function handleSuccess() {
    setShowForm(false)
    setEditing(undefined)
    refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta campaña? También se eliminarán sus mensajes.')) return
    setDeleting(id)
    await deleteCampana(id)
    setDeleting(null)
    refresh()
  }

  async function handleGenerate(id: string) {
    setGenerating(id)
    setGenMsg(null)
    const result = await generateMessages(id)
    setGenerating(null)
    if (!result.success) setGenMsg({ id, text: result.error })
    else { setGenMsg({ id, text: '✓ Mensajes generados' }); refresh() }
    setTimeout(() => setGenMsg(prev => prev?.id === id ? null : prev), 3000)
  }

  const audienciasMap: Record<string, string> = Object.fromEntries(audiencias.map(a => [a.id, a.name]))

  return (
    <>
      {showForm && (
        <CampanaForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSuccess={handleSuccess}
          editing={editing}
          audiencias={audiencias}
        />
      )}

      {/* Barra de acciones */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{initialCampanas.length} campaña{initialCampanas.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditing(undefined); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva campaña
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Nombre', 'Audiencia', 'Canal', 'Estado', 'Mensajes', 'Acciones'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialCampanas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Megaphone className="w-8 h-8 text-slate-700" />
                      <p className="text-sm text-slate-500">Sin campañas. Crea la primera.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                initialCampanas.map(camp => {
                  const msgs = messageCounts[camp.id] ?? 0
                  return (
                    <tr key={camp.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-slate-200">{camp.name}</p>
                        {camp.objective && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{camp.objective}</p>}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {camp.audience_id ? (audienciasMap[camp.audience_id] ?? '—') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {camp.channel ? (
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                            CHANNEL_STYLES[camp.channel] ?? 'bg-slate-700/40 text-slate-400 border-slate-600/30'
                          )}>
                            {CHANNEL_LABELS[camp.channel] ?? camp.channel}
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                          STATUS_STYLES[camp.status] ?? STATUS_STYLES.draft
                        )}>
                          {STATUS_LABELS[camp.status] ?? camp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-slate-300">{msgs}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleGenerate(camp.id)}
                            disabled={generating === camp.id || !camp.audience_id}
                            title={!camp.audience_id ? 'Asigna una audiencia primero' : 'Generar mensajes para la audiencia'}
                            className="flex items-center gap-1 text-xs text-emerald-400/80 hover:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-md px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {generating === camp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            Generar
                          </button>
                          {genMsg?.id === camp.id && (
                            <span className={cn('text-xs', genMsg.text.startsWith('✓') ? 'text-green-400' : 'text-red-400')}>
                              {genMsg.text}
                            </span>
                          )}
                          <button
                            onClick={() => { setEditing(camp); setShowForm(true) }}
                            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(camp.id)}
                            disabled={deleting === camp.id}
                            className="p-1.5 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
                          >
                            {deleting === camp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
