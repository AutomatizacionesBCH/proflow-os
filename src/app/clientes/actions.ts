'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ClientTag } from '@/types'

export type ClienteInput = {
  full_name: string
  document_id: string
  email: string
  phone: string
  assigned_company_id: string
  assigned_processor_id: string
  tags: ClientTag[]
  notes: string
}

export type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string }

export async function createCliente(input: ClienteInput): Promise<ActionResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clients')
    .insert({
      full_name:             input.full_name,
      document_id:           input.document_id || null,
      email:                 input.email || null,
      phone:                 input.phone || null,
      assigned_company_id:   input.assigned_company_id || null,
      assigned_processor_id: input.assigned_processor_id || null,
      tags:                  input.tags,
      notes:                 input.notes || null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/clientes')
  return { success: true, id: data.id }
}

export async function updateCliente(id: string, input: ClienteInput): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('clients')
    .update({
      full_name:             input.full_name,
      document_id:           input.document_id || null,
      email:                 input.email || null,
      phone:                 input.phone || null,
      assigned_company_id:   input.assigned_company_id || null,
      assigned_processor_id: input.assigned_processor_id || null,
      tags:                  input.tags,
      notes:                 input.notes || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
  return { success: true, id }
}
