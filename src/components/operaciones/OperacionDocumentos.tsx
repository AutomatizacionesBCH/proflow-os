'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Download, FileText, X, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'documentos-operaciones'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE = 10 * 1024 * 1024

type FileItem = {
  name: string
  url: string
  isImage: boolean
}

type Props = {
  operacionId: string
  onClose: () => void
}

export function OperacionDocumentos({ operacionId, onClose }: Props) {
  const supabase = createClient()
  const folder   = `operaciones/${operacionId}`
  const fileRef  = useRef<HTMLInputElement>(null)

  const [files,     setFiles]     = useState<FileItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [preview,   setPreview]   = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error: listErr } = await supabase.storage.from(BUCKET).list(folder)
    if (listErr) { setError(listErr.message); setLoading(false); return }
    const items = (data ?? [])
      .filter(f => f.name !== '.emptyFolderPlaceholder')
      .map(f => {
        const { data: u } = supabase.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`)
        return { name: f.name, url: u.publicUrl, isImage: /\.(jpg|jpeg|png)$/i.test(f.name) }
      })
    setFiles(items)
    setLoading(false)
  }

  useEffect(() => { load() }, [operacionId]) // eslint-disable-line

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (file.size > MAX_SIZE)               { setError('El archivo no puede superar los 10 MB.'); return }
    if (!ALLOWED_TYPES.includes(file.type)) { setError('Formato no permitido. Solo JPG, PNG, PDF o Word.'); return }

    const ext  = file.name.split('.').pop()
    const name = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40)}.${ext}`

    setUploading(true)
    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(`${folder}/${name}`, file, { upsert: false })
    setUploading(false)

    if (upErr) { setError(upErr.message); return }
    if (fileRef.current) fileRef.current.value = ''
    await load()
  }

  async function handleDelete(name: string) {
    const { error: delErr } = await supabase.storage.from(BUCKET).remove([`${folder}/${name}`])
    if (delErr) { setError(delErr.message); return }
    setFiles(f => f.filter(x => x.name !== name))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Preview */}
        {preview && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
            <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
              <button className="absolute -top-8 right-0 text-slate-400 hover:text-white" onClick={() => setPreview(null)}>
                <X className="w-5 h-5" />
              </button>
              <img src={preview} alt="Vista previa" className="w-full rounded-xl border border-slate-700 object-contain max-h-[80vh]" />
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Documentos de la operación</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{operacionId.slice(0, 8)}…</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload */}
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-end">
          <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${uploading ? 'bg-slate-700 text-slate-400' : 'text-white bg-blue-600 hover:bg-blue-700'}`}>
            {uploading
              ? <><span className="w-3 h-3 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" />Subiendo...</>
              : <><Upload className="w-3 h-3" />Subir documento</>
            }
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {error && (
          <div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-10 flex justify-center">
              <span className="w-5 h-5 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center px-5">
              <FileText className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Sin documentos adjuntos.</p>
              <p className="text-xs text-slate-600 mt-1">Sube archivos JPG, PNG, PDF o Word.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {files.map(f => (
                <div key={f.name} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/20 transition-colors">
                  {f.isImage ? (
                    <button onClick={() => setPreview(f.url)} className="flex-shrink-0">
                      <img src={f.url} alt="" className="w-9 h-9 object-cover rounded border border-slate-700 hover:border-slate-500 transition-colors" />
                    </button>
                  ) : (
                    <div className="w-9 h-9 bg-slate-800 rounded border border-slate-700 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                  <p className="text-xs text-slate-300 truncate flex-1 min-w-0">{f.name}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a href={f.url} target="_blank" rel="noreferrer" download
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors" title="Descargar">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => handleDelete(f.name)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
