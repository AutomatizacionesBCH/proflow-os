'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Download, FileText, X, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DOC_TYPES = [
  { value: 'cedula_frente',      label: 'Cédula frente' },
  { value: 'cedula_reverso',     label: 'Cédula reverso' },
  { value: 'comprobante_saldo',  label: 'Comprobante de saldo' },
  { value: 'otro',               label: 'Otro' },
]

const BUCKET = 'documentos-clientes'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

type FileItem = {
  name: string
  url: string
  isImage: boolean
}

export function ClienteDocumentos({ clienteId }: { clienteId: string }) {
  const supabase    = createClient()
  const folder      = `clientes/${clienteId}`
  const fileRef     = useRef<HTMLInputElement>(null)

  const [files,     setFiles]     = useState<FileItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [docType,   setDocType]   = useState('cedula_frente')
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

  useEffect(() => { load() }, [clienteId]) // eslint-disable-line

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (file.size > MAX_SIZE)            { setError('El archivo no puede superar los 10 MB.'); return }
    if (!ALLOWED_TYPES.includes(file.type)) { setError('Formato no permitido. Solo JPG, PNG, PDF o Word.'); return }

    const ext  = file.name.split('.').pop()
    const name = `${docType}_${Date.now()}.${ext}`

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

  function typeLabel(name: string) {
    const match = DOC_TYPES.find(t => name.startsWith(t.value))
    return match?.label ?? 'Documento'
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button className="absolute -top-8 right-0 text-slate-400 hover:text-white" onClick={() => setPreview(null)}>
              <X className="w-5 h-5" />
            </button>
            <img src={preview} alt="Vista previa" className="w-full rounded-xl border border-slate-700 object-contain max-h-[80vh]" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-medium text-slate-300">
          Documentos {files.length > 0 && <span className="text-xs text-slate-500 ml-1">({files.length})</span>}
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-300 outline-none focus:border-slate-600"
          >
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${uploading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'text-white bg-blue-600 hover:bg-blue-700'}`}>
            {uploading
              ? <><span className="w-3 h-3 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" />Subiendo...</>
              : <><Upload className="w-3 h-3" />Subir documento</>
            }
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center">
          <span className="w-5 h-5 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-500">Sin documentos subidos para este cliente.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {files.map(f => (
            <div key={f.name} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/20 transition-colors">
              {f.isImage ? (
                <button onClick={() => setPreview(f.url)} className="flex-shrink-0 focus:outline-none">
                  <img src={f.url} alt="" className="w-9 h-9 object-cover rounded border border-slate-700 hover:border-slate-500 transition-colors" />
                </button>
              ) : (
                <div className="w-9 h-9 bg-slate-800 rounded border border-slate-700 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-slate-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-300 truncate">{typeLabel(f.name)}</p>
                <p className="text-xs text-slate-600 font-mono">{f.name.split('.').pop()?.toUpperCase()}</p>
              </div>
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
  )
}
