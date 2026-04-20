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
  | { success: true; docxUrl: string; pdfUrl: string }
  | { success: false; error: string }

export async function generateContract(input: ContractInput): Promise<ContractResult> {
  try {
    const supabase = await createClient()

    // Fetch operation data
    const { data: op, error: opError } = await supabase
      .from('operations')
      .select('amount_usd, operation_date')
      .eq('id', input.operation_id)
      .single()

    if (opError || !op) {
      return { success: false, error: `Operación no encontrada: ${opError?.message ?? 'sin datos'}` }
    }

    // Format dates
    const now    = new Date()
    const fechaChi = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const mm     = String(now.getMonth() + 1).padStart(2, '0')
    const dd     = String(now.getDate()).padStart(2, '0')
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
        // Devuelve string vacío para cualquier marcador no definido en vez de lanzar error
        nullGetter() { return '' },
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
    } catch (docxErr: unknown) {
      const msg = docxErr instanceof Error ? docxErr.message : String(docxErr)
      return { success: false, error: `Error procesando template Word: ${msg}` }
    }

    // ── Generate PDF ─────────────────────────────────────────────────────────
    let pdfBuffer: Buffer
    try {
      const PDFDocument = (await import('pdfkit')).default

      pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        // Timeout de seguridad: si pdfkit no responde en 10s, rechazar
        const timeout = setTimeout(() => reject(new Error('Timeout generando PDF')), 10_000)

        const doc    = new PDFDocument({ margin: 60, size: 'LETTER', bufferPages: true })
        const chunks: Buffer[] = []
        doc.on('data',  (c: Buffer) => chunks.push(c))
        doc.on('end',   () => { clearTimeout(timeout); resolve(Buffer.concat(chunks)) })
        doc.on('error', (e: Error) => { clearTimeout(timeout); reject(e) })

        doc.fontSize(14).font('Helvetica-Bold')
          .text('CONTRATO DE CAMBIO DE DIVISAS', { align: 'center' })
        doc.moveDown(0.5)
        doc.fontSize(9).font('Helvetica').fillColor('#444444')
          .text(`Fecha (CL): ${fechaChi}     Fecha (USA): ${fechaUsa}`, { align: 'center' })
        doc.moveDown(1.5)

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('DATOS DEL CLIENTE')
        doc.moveDown(0.3)
        doc.fontSize(9).font('Helvetica')
        doc.text(`Nombre completo:  ${input.cliente_nombre}`)
        doc.text(`RUT:              ${input.cliente_rut}`)
        doc.text(`Ciudad:           ${input.ciudad}`)
        doc.text(`Dirección:        ${input.direccion}`)
        doc.moveDown(1.2)

        doc.fontSize(10).font('Helvetica-Bold').text('DATOS DE LA OPERACIÓN')
        doc.moveDown(0.3)
        doc.fontSize(9).font('Helvetica')
        doc.text(`Monto USD:        $${montoStr}`)
        doc.text(`Tarjeta crédito:  ${input.tarjeta_credito}`)
        doc.moveDown(2.5)

        doc.fontSize(9).font('Helvetica').fillColor('#000000')
        doc.text('_______________________________')
        doc.text('Firma del cliente')

        doc.end()
      })
    } catch (pdfErr: unknown) {
      const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr)
      return { success: false, error: `Error generando PDF: ${msg}` }
    }

    // ── Upload to Supabase Storage ───────────────────────────────────────────
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

    const { error: pdfUpErr } = await supabase.storage
      .from('contratos')
      .upload(`${folder}/${fileName}.pdf`, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (pdfUpErr) {
      return { success: false, error: `Error subiendo PDF: ${pdfUpErr.message}` }
    }

    // Public URLs
    const { data: docxData } = supabase.storage.from('contratos').getPublicUrl(`${folder}/${fileName}.docx`)
    const { data: pdfData }  = supabase.storage.from('contratos').getPublicUrl(`${folder}/${fileName}.pdf`)

    // Save contract URL on operation
    await supabase
      .from('operations')
      .update({ contract_url: docxData.publicUrl })
      .eq('id', input.operation_id)

    revalidatePath('/operaciones')
    return { success: true, docxUrl: docxData.publicUrl, pdfUrl: pdfData.publicUrl }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error inesperado: ${msg}` }
  }
}
