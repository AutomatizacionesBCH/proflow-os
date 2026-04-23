'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw, Sparkles, Users, X, Loader2, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Audience } from '@/types'
import {
  deleteAudiencia,
  seedDefaultAudiencias,
  syncAudienceCounts,
  getAudienciaMembers,
  type AudienciaMember,
} from '@/app/marketing/audiencias-actions'
import { AudienciaForm } from './AudienciaForm'

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-green-500/10 text-green-400 border-green-500/20',
  archived: 'bg-slate-700/40 text-slate-500 border-slate-600/20',
}
const STATUS_LABELS: Record<string, string> = { active: 'Activa', archived: 'Archivada' }

type Props = { initialAudiencias: Audience[] }

export function AudienciasView({ initialAudiencias }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Audience | undefined>()
  const [syncing, setSyncing]     = useState(false)
  const [seeding, setSeeding]     = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [members, setMembers]     = useState<AudienciaMember[] | null>(null)
  const [membersTitle, setMembersTitle] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)

  function refresh() { startTransition(() => router.refresh()) }

  function handleSuccess() {
    setShowForm(false)
    setEditing(undefined)
    refresh()
  }

  async function handleSeed() {
    setSeeding(true)
    await seedDefaultAudiencias()
    setSeeding(false)
    refresh()
  }

  async function handleSync() {
    setSyncing(true)
    await syncAudienceCounts()
    setSyncing(false)
    refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta audiencia?')) return
    setDeleting(id)
    await deleteAudiencia(id)
    setDeleting(null)
    refresh()
  }

  async function handleViewMembers(aud: Audience) {
    setMembersTitle(aud.name)
    setLoadingMembers(true)
    setMembers([])
    const result = await getAudienciaMembers(aud.id)
    setLoadingMembers(false)
    if (result.success) setMembers(result.members)
    else setMembers([])
  }

  return (
    <>
      {showForm && (
        <AudienciaForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSuccess={handleSuccess}
          editing={editing}
        />
      )}

      {/* Modal miembros */}
      {members !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMembers(null)} />
          <div className="relative w-full max-w-lg bg-slate-900 rounded-xl border border-slate-800 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
              <div>
                <p className="text-sm font-semibold text-slate-100">{membersTitle}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {loadingMembers ? 'Cargando…' : `${members.length} miembro${members.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button onClick={() => setMembers(null)} className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <Users className="w-6 h-6 text-slate-600" />
                  <p className="text-sm text-slate-500">Sin miembros en esta audiencia</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {members.map((m, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-slate-400">{m.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm text-slate-200">{m.name}</p>
                          <p className="text-xs text-slate-500">{m.phone ?? 'Sin teléfono'}</p>
                        </div>
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-md border',
                        m.type === 'client' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      )}>
                        {m.type === 'client' ? 'Cliente' : 'Lead'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-amber-400 border border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 rounded-md transition-colors disabled:opacity-50"
        >
          {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Crear predefinidas
        </button>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-200 rounded-md transition-colors disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Actualizar conteos
        </button>
        <div className="flex-1" />
        <button
          onClick={() => { setEditing(undefined); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva audiencia
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <p className="text-sm font-semibold text-slate-100">Audiencias</p>
          <p className="text-xs text-slate-500 mt-0.5">{initialAudiencias.length} segmento{initialAudiencias.length !== 1 ? 's' : ''} definido{initialAudiencias.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Nombre', 'Descripción', 'Miembros', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialAudiencias.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-8 h-8 text-slate-700" />
                      <p className="text-sm text-slate-500">Sin audiencias. Crea las predefinidas o añade una nueva.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                initialAudiencias.map(aud => (
                  <tr key={aud.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">{aud.name}</span>
                        {aud.rules_json && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Auto</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-[220px]">
                      <span className="line-clamp-2">{aud.description ?? '—'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-sm font-mono text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {aud.member_count.toLocaleString('es-CL')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                        STATUS_STYLES[aud.status] ?? STATUS_STYLES.active
                      )}>
                        {STATUS_LABELS[aud.status] ?? aud.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewMembers(aud)}
                          className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md px-2 py-1 transition-colors whitespace-nowrap"
                        >
                          Ver miembros
                        </button>
                        <button
                          onClick={() => { setEditing(aud); setShowForm(true) }}
                          className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-md transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(aud.id)}
                          disabled={deleting === aud.id}
                          className="p-1.5 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
                        >
                          {deleting === aud.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
