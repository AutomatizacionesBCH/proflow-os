'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import path from 'path'

export type ContractInput = {
  operation_id: string
  cliente_nombre: string
  cliente_rut: string
  ciudad: string
  direccion: string
  tarjeta_credito: string
}

export type ContractResult =
  | { success: true; docxUrl: string; folder: string; fileName: string }
  | { success: false; error: string }

export async function generateContract(input: ContractInput): Promise<ContractResult> {
  try {
    const supabase = await createClient()

    const { data: op, error: opError } = await supabase
      .from('operations')
      .select('amount_usd, operation_date')
      .eq('id', input.operation_id)
      .single()

    if (opError || !op) {
      return { success: false, error: `Operación no encontrada: ${opError?.message ?? 'sin datos'}` }
    }

    const now      = new Date()
    const fechaChi = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const mm       = String(now.getMonth() + 1).padStart(2, '0')
    const dd       = String(now.getDate()).padStart(2, '0')
    const fechaUsa = `${mm}/${dd}/${now.getFullYear()}`
    const montoStr = op.amount_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    // ── Generate DOCX ────────────────────────────────────────────────────────
    const templatePath = path.join(process.cwd(), 'public', 'contrato_template.docx')
    if (!fs.existsSync(templatePath)) {
      return { success: false, error: 'Template no encontrado en /public/contrato_template.docx' }
    }

    let docxBuffer: Buffer
    try {
      const PizZip = (await import('pizzip')).default
      const { default: Docxtemplater } = await import('docxtemplater')

      const content = fs.readFileSync(templatePath, 'binary')
      const zip     = new PizZip(content)
      const doc     = new Docxtemplater(zip, {
        delimiters:    { start: '[', end: ']' },
        paragraphLoop: true,
        linebreaks:    true,
        nullGetter()  { return '' },
      })

      doc.render({
        FECHA_CHI:       fechaChi,
        FECHA_USA:       fechaUsa,
        NOMBRE_COMPLETO: input.cliente_nombre,
        RUT:             input.cliente_rut,
        CIUDAD:          input.ciudad,
        DIRECCION:       input.direccion,
        MONTO_USD:       montoStr,
        TARJETACRE:      input.tarjeta_credito,
      })

      docxBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer
    } catch (e: unknown) {
      return { success: false, error: `Error procesando template Word: ${e instanceof Error ? e.message : String(e)}` }
    }

    // ── Upload DOCX ──────────────────────────────────────────────────────────
    const safeName = input.cliente_nombre.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
    const dateStr  = now.toISOString().split('T')[0]
    const fileName = `contrato_${safeName}_${dateStr}`
    const folder   = `contratos/${input.operation_id}`

    const { error: docxUpErr } = await supabase.storage
      .from('contratos')
      .upload(`${folder}/${fileName}.docx`, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })

    if (docxUpErr) {
      return { success: false, error: `Error subiendo Word (¿se corrió la migración SQL?): ${docxUpErr.message}` }
    }

    const { data: docxData } = supabase.storage.from('contratos').getPublicUrl(`${folder}/${fileName}.docx`)

    await supabase
      .from('operations')
      .update({ contract_url: docxData.publicUrl })
      .eq('id', input.operation_id)

    revalidatePath('/operaciones')

    // El PDF lo genera el cliente (browser) con jsPDF para evitar dependencias de fuentes en el servidor
    return { success: true, docxUrl: docxData.publicUrl, folder, fileName }

  } catch (err: unknown) {
    return { success: false, error: `Error inesperado: ${err instanceof Error ? err.message : String(err)}` }
  }
}
