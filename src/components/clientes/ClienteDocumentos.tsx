'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Download, FileText, X, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DOC_BUCKET      = 'documentos-clientes'
const CONTRACT_BUCKET = 'contratos'
const ALLOWED_TYPES   = [
  'image/jpeg', 'image/png', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE = 10 * 1024 * 1024

type FileRow = {
  key:     string
  name:    string
  url:     string
  size:    number | null
  date:    string | null
  isImage: boolean
  kind:    'documento' | 'contrato'
  storagePath: string
}

function formatBytes(bytes: number | null) {
  if (bytes == null || bytes === 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function displayName(raw: string) {
  // strip leading timestamp prefix (e.g. "1714000000000_file.pdf" → "file.pdf")
  return raw.replace(/^\d{10,}_/, '')
}

export function ClienteDocumentos({
  clienteId,
  operationIds = [],
}: {
  clienteId: string
  operationIds?: string[]
}) {
  const supabase  = createClient()
  const docFolder = `clientes/${clienteId}`
  const fileRef   = useRef<HTMLInputElement>(null)

  const [files,     setFiles]     = useState<FileRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [preview,   setPreview]   = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const rows: FileRow[] = []

    // ── Documentos generales ──────────────────────────────────────────────
    const { data: docData } = await supabase.storage.from(DOC_BUCKET).list(docFolder)
    for (const f of (docData ?? []).filter(f => f.name !== '.emptyFolderPlaceholder')) {
      const path = `${docFolder}/${f.name}`
      const { data: u } = supabase.storage.from(DOC_BUCKET).getPublicUrl(path)
      const meta = f.metadata as Record<string, unknown> | null
      rows.push({
        key:         `doc_${f.name}`,
        name:        f.name,
        url:         u.publicUrl,
        size:        typeof meta?.size === 'number' ? meta.size : null,
        date:        f.created_at ?? null,
        isImage:     /\.(jpg|jpeg|png)$/i.test(f.name),
        kind:        'documento',
        storagePath: path,
      })
    }

    // ── Contratos por operación ───────────────────────────────────────────
    if (operationIds.length > 0) {
      const results = await Promise.all(
        operationIds.map(opId =>
          supabase.storage.from(CONTRACT_BUCKET).list(`contratos/${opId}`)
        )
      )
      results.forEach(({ data }, i) => {
        const opId = operationIds[i]
        for (const f of (data ?? []).filter(f => f.name !== '.emptyFolderPlaceholder')) {
          const path = `contratos/${opId}/${f.name}`
          const { data: u } = supabase.storage.from(CONTRACT_BUCKET).getPublicUrl(path)
          const meta = f.metadata as Record<string, unknown> | null
          rows.push({
            key:         `ctr_${opId}_${f.name}`,
            name:        f.name,
            url:         u.publicUrl,
            size:        typeof meta?.size === 'number' ? meta.size : null,
            date:        f.created_at ?? null,
            isImage:     false,
            kind:        'contrato',
            storagePath: path,
          })
        }
      })
    }

    setFiles(rows)
    setLoading(false)
  }

  useEffect(() => { load() }, [clienteId]) // eslint-disable-line

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return
    setError(null)
    setUploading(true)

    for (const file of selected) {
      if (file.size > MAX_SIZE) {
        setError(`"${file.name}" supera los 10 MB.`)
        continue
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`"${file.name}": solo JPG, PNG, PDF o Word.`)
        continue
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_')
      const path     = `${docFolder}/${Date.now()}_${safeName}`
      const { error: upErr } = await supabase.storage.from(DOC_BUCKET).upload(path, file, { upsert: false })
      if (upErr) setError(upErr.message)
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    await load()
  }

  async function handleDelete(file: FileRow) {
    const { error: delErr } = await supabase.storage.from(DOC_BUCKET).remove([file.storagePath])
    if (delErr) { setError(delErr.message); return }
    setFiles(f => f.filter(x => x.key !== file.key))
  }

  const docs      = files.filter(f => f.kind === 'documento')
  const contracts = files.filter(f => f.kind === 'contrato')

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
          Documentos
          {files.length > 0 && <span className="text-xs text-slate-500 ml-1">({files.length})</span>}
        </h2>
        <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${uploading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'text-white bg-blue-600 hover:bg-blue-700'}`}>
          {uploading
            ? <><span className="w-3 h-3 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" />Subiendo...</>
            : <><Upload className="w-3 h-3" />Subir documento</>
          }
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf,.docx" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
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
          <p className="text-sm text-slate-500">Sin documentos para este cliente.</p>
          <p className="text-xs text-slate-600 mt-1">JPG, PNG, PDF, Word — máx. 10 MB</p>
        </div>
      ) : (
        <div>
          {docs.length > 0 && (
            <div>
              <p className="px-5 py-2 text-xs font-medium text-slate-600 uppercase tracking-widest bg-slate-900/80 border-b border-slate-800/50">
                Documentos generales ({docs.length})
              </p>
              {docs.map(f => (
                <FileItem
                  key={f.key}
                  file={f}
                  onPreview={f.isImage ? () => setPreview(f.url) : undefined}
                  onDelete={() => handleDelete(f)}
                />
              ))}
            </div>
          )}

          {contracts.length > 0 && (
            <div className={docs.length > 0 ? 'border-t border-slate-800/50' : ''}>
              <p className="px-5 py-2 text-xs font-medium text-slate-600 uppercase tracking-widest bg-slate-900/80 border-b border-slate-800/50">
                Contratos generados ({contracts.length})
              </p>
              {contracts.map(f => (
                <FileItem key={f.key} file={f} readonly />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── FileItem ─────────────────────────────────────────────────────────────────
function FileItem({
  file,
  onPreview,
  onDelete,
  readonly,
}: {
  file: FileRow
  onPreview?: () => void
  onDelete?: () => void
  readonly?: boolean
}) {
  const ext    = file.name.split('.').pop()?.toUpperCase() ?? ''
  const meta   = [ext, formatBytes(file.size), formatDate(file.date)].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/20 transition-colors">
      {file.isImage && onPreview ? (
        <button onClick={onPreview} className="flex-shrink-0 focus:outline-none">
          <img src={file.url} alt="" className="w-9 h-9 object-cover rounded border border-slate-700 hover:border-slate-500 transition-colors" />
        </button>
      ) : (
        <div className="w-9 h-9 bg-slate-800 rounded border border-slate-700 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-slate-500" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-300 truncate">{displayName(file.name)}</p>
        {meta && <p className="text-xs text-slate-600 font-mono mt-0.5">{meta}</p>}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <a href={file.url} target="_blank" rel="noreferrer" download
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors" title="Descargar">
          <Download className="w-3.5 h-3.5" />
        </a>
        {!readonly && onDelete && (
          <button onClick={onDelete}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
