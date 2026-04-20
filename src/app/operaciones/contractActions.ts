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
  const supabase = await createClient()

  // Fetch operation data
  const { data: op, error: opError } = await supabase
    .from('operations')
    .select('amount_usd, operation_date')
    .eq('id', input.operation_id)
    .single()

  if (opError || !op) {
    return { success: false, error: 'Operación no encontrada' }
  }

  // Format dates
  const now = new Date()
  const fechaChi = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const fechaUsa = `${mm}/${dd}/${now.getFullYear()}`
  const montoStr = op.amount_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ── Generate DOCX ──────────────────────────────────────────────────────────
  const templatePath = path.join(process.cwd(), 'public', 'contrato_template.docx')
  let docxBuffer: Buffer

  if (fs.existsSync(templatePath)) {
    const PizZip = (await import('pizzip')).default
    const { default: Docxtemplater } = await import('docxtemplater')

    const content = fs.readFileSync(templatePath, 'binary')
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      delimiters: { start: '[', end: ']' },
      paragraphLoop: true,
      linebreaks: true,
    })

    doc.render({
      FECHA_CHI:      fechaChi,
      FECHA_USA:      fechaUsa,
      NOMBRE_COMPLETO: input.cliente_nombre,
      RUT:            input.cliente_rut,
      CIUDAD:         input.ciudad,
      DIRECCION:      input.direccion,
      MONTO_USD:      montoStr,
      TARJETACRE:     input.tarjeta_credito,
    })

    docxBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer
  } else {
    return { success: false, error: 'Template no encontrado en /public/contrato_template.docx. Sube el archivo antes de generar contratos.' }
  }

  // ── Generate PDF ───────────────────────────────────────────────────────────
  const PDFDocument = (await import('pdfkit')).default

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'LETTER' })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Header
    doc.fontSize(14).font('Helvetica-Bold')
      .text('CONTRATO DE CAMBIO DE DIVISAS', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text(`Fecha (CL): ${fechaChi}   |   Fecha (USA): ${fechaUsa}`, { align: 'center' })
    doc.moveDown(1.5)

    // Section: Cliente
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('DATOS DEL CLIENTE')
    doc.moveTo(60, doc.y).lineTo(560, doc.y).strokeColor('#cccccc').stroke()
    doc.moveDown(0.4)
    doc.fontSize(9).font('Helvetica')
    doc.text(`Nombre completo:  ${input.cliente_nombre}`)
    doc.text(`RUT:              ${input.cliente_rut}`)
    doc.text(`Ciudad:           ${input.ciudad}`)
    doc.text(`Dirección:        ${input.direccion}`)
    doc.moveDown(1.2)

    // Section: Operación
    doc.fontSize(10).font('Helvetica-Bold').text('DATOS DE LA OPERACIÓN')
    doc.moveTo(60, doc.y).lineTo(560, doc.y).strokeColor('#cccccc').stroke()
    doc.moveDown(0.4)
    doc.fontSize(9).font('Helvetica')
    doc.text(`Monto USD:        $${montoStr}`)
    doc.text(`Tarjeta crédito:  ${input.tarjeta_credito}`)
    doc.moveDown(2)

    // Signatures
    doc.fontSize(9).font('Helvetica').fillColor('#000000')
    doc.text('_______________________________', 60, doc.y)
    doc.text('Firma del cliente', 60, doc.y + 4)
    doc.end()
  })

  // ── Upload to Supabase Storage ─────────────────────────────────────────────
  const safeName = input.cliente_nombre.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
  const dateStr  = now.toISOString().split('T')[0]
  const fileName = `contrato_${safeName}_${dateStr}`
  const folder   = `contratos/${input.operation_id}`

  const { error: docxErr } = await supabase.storage
    .from('contratos')
    .upload(`${folder}/${fileName}.docx`, docxBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    })

  if (docxErr) return { success: false, error: `Error subiendo Word: ${docxErr.message}` }

  const { error: pdfErr } = await supabase.storage
    .from('contratos')
    .upload(`${folder}/${fileName}.pdf`, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (pdfErr) return { success: false, error: `Error subiendo PDF: ${pdfErr.message}` }

  // Get public URLs
  const { data: docxData } = supabase.storage.from('contratos').getPublicUrl(`${folder}/${fileName}.docx`)
  const { data: pdfData }  = supabase.storage.from('contratos').getPublicUrl(`${folder}/${fileName}.pdf`)

  // Update operation
  await supabase
    .from('operations')
    .update({ contract_url: docxData.publicUrl })
    .eq('id', input.operation_id)

  revalidatePath('/operaciones')
  return { success: true, docxUrl: docxData.publicUrl, pdfUrl: pdfData.publicUrl }
}
