'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { EmpresaStatus } from '@/types'

export type EmpresaInput = {
  name: string
  legal_name: string
  status: EmpresaStatus
  notes: string
}

export type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string }

export async function createEmpresa(input: EmpresaInput): Promise<ActionResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('companies')
    .insert({
      name:       input.name,
      legal_name: input.legal_name || null,
      status:     input.status,
      notes:      input.notes || null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/empresas')
  return { success: true, id: data.id }
}

export async function updateEmpresa(id: string, input: EmpresaInput): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('companies')
    .update({
      name:       input.name,
      legal_name: input.legal_name || null,
      status:     input.status,
      notes:      input.notes || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/empresas')
  return { success: true, id }
}
