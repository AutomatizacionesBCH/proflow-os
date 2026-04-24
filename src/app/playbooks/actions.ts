'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Playbook, PlaybookInsert, PlaybookStep, PlaybookStepInsert,
  PlaybookAssignment, AssignmentWithContext,
} from '@/types/playbook.types'
import { LEAD_TYPE_TO_SEGMENT } from '@/types/playbook.types'

type ActionResult<T = void> =
  | { success: true;  data: T }
  | { success: false; error: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = async () => (await createClient()) as any

// ── Playbooks CRUD ────────────────────────────────────────────

export async function getAllPlaybooks(): Promise<Playbook[]> {
  const supabase = await db()
  const { data } = await supabase
    .from('playbooks')
    .select('*')
    .order('created_at', { ascending: true })
  return (data ?? []) as Playbook[]
}

export async function getPlaybookWithSteps(id: string): Promise<(Playbook & { steps: PlaybookStep[] }) | null> {
  const supabase = await db()
  const [pbRes, stepsRes] = await Promise.all([
    supabase.from('playbooks').select('*').eq('id', id).single(),
    supabase.from('playbook_steps').select('*').eq('playbook_id', id).order('step_order'),
  ])
  if (pbRes.error || !pbRes.data) return null
  return { ...(pbRes.data as Playbook), steps: (stepsRes.data ?? []) as PlaybookStep[] }
}

export async function createPlaybook(input: PlaybookInsert): Promise<ActionResult<Playbook>> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('playbooks')
    .insert(input)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/playbooks')
  return { success: true, data: data as Playbook }
}

export async function updatePlaybook(id: string, input: Partial<PlaybookInsert>): Promise<ActionResult<Playbook>> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('playbooks')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/playbooks')
  revalidatePath(`/playbooks/${id}`)
  return { success: true, data: data as Playbook }
}

export async function deletePlaybook(id: string): Promise<ActionResult> {
  const supabase = await db()
  const { error } = await supabase.from('playbooks').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/playbooks')
  return { success: true, data: undefined }
}

// ── Steps CRUD ────────────────────────────────────────────────

export async function createPlaybookStep(input: PlaybookStepInsert): Promise<ActionResult<PlaybookStep>> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('playbook_steps')
    .insert(input)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath(`/playbooks/${input.playbook_id}`)
  return { success: true, data: data as PlaybookStep }
}

export async function updatePlaybookStep(id: string, input: Partial<PlaybookStepInsert>): Promise<ActionResult<PlaybookStep>> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('playbook_steps')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/playbooks')
  return { success: true, data: data as PlaybookStep }
}

export async function deletePlaybookStep(id: string, playbookId: string): Promise<ActionResult> {
  const supabase = await db()
  const { error } = await supabase.from('playbook_steps').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/playbooks/${playbookId}`)
  return { success: true, data: undefined }
}

// ── Assignments ───────────────────────────────────────────────

export async function assignPlaybook(params: {
  playbook_id: string
  lead_id?:    string
  client_id?:  string
  assigned_to?: string
  notes?:      string
}): Promise<ActionResult<PlaybookAssignment>> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('playbook_assignments')
    .insert({
      playbook_id:  params.playbook_id,
      lead_id:      params.lead_id   ?? null,
      client_id:    params.client_id ?? null,
      assigned_to:  params.assigned_to ?? null,
      notes:        params.notes ?? null,
      current_step: 1,
      status:       'in_progress',
      started_at:   new Date().toISOString(),
    })
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/playbooks')
  return { success: true, data: data as PlaybookAssignment }
}

export async function completeStep(assignmentId: string): Promise<ActionResult> {
  const supabase = await db()

  const { data: assignment, error: aErr } = await supabase
    .from('playbook_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single()

  if (aErr || !assignment) return { success: false, error: 'Asignación no encontrada' }

  const { count } = await supabase
    .from('playbook_steps')
    .select('*', { count: 'exact', head: true })
    .eq('playbook_id', assignment.playbook_id)

  const isLastStep = assignment.current_step >= (count ?? 1)

  const update = isLastStep
    ? { status: 'completed', completed_at: new Date().toISOString() }
    : { current_step: assignment.current_step + 1 }

  const { error } = await supabase
    .from('playbook_assignments')
    .update(update)
    .eq('id', assignmentId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/playbooks')
  return { success: true, data: undefined }
}

export async function updateAssignmentStatus(
  id: string,
  status: 'paused' | 'cancelled' | 'in_progress',
): Promise<ActionResult> {
  const supabase = await db()
  const { error } = await supabase
    .from('playbook_assignments')
    .update({ status })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/playbooks')
  return { success: true, data: undefined }
}

// ── Consultas enriquecidas ────────────────────────────────────

export async function getActivePlaybooksFor(params: {
  leadId?:   string
  clientId?: string
}): Promise<AssignmentWithContext[]> {
  const supabase = await db()

  const query = supabase
    .from('playbook_assignments')
    .select('*')
    .neq('status', 'cancelled')

  if (params.leadId)   query.eq('lead_id',   params.leadId)
  if (params.clientId) query.eq('client_id', params.clientId)

  const { data: assignments } = await query.order('created_at', { ascending: false })
  if (!assignments?.length) return []

  const playbookIds = [...new Set((assignments as PlaybookAssignment[]).map(a => a.playbook_id))]

  const [pbRes, stepsRes] = await Promise.all([
    supabase.from('playbooks').select('*').in('id', playbookIds),
    supabase.from('playbook_steps').select('*').in('playbook_id', playbookIds).order('step_order'),
  ])

  const playbooksMap = Object.fromEntries(
    ((pbRes.data ?? []) as Playbook[]).map(p => [p.id, p])
  )
  const stepsMap: Record<string, PlaybookStep[]> = {}
  for (const step of (stepsRes.data ?? []) as PlaybookStep[]) {
    if (!stepsMap[step.playbook_id]) stepsMap[step.playbook_id] = []
    stepsMap[step.playbook_id].push(step)
  }

  return (assignments as PlaybookAssignment[]).map(a => {
    const steps = stepsMap[a.playbook_id] ?? []
    return {
      ...a,
      playbook:          playbooksMap[a.playbook_id],
      total_steps:       steps.length,
      current_step_data: steps.find(s => s.step_order === a.current_step) ?? null,
    }
  })
}

export async function getRecommendedPlaybook(leadType: string): Promise<Playbook | null> {
  const segment = LEAD_TYPE_TO_SEGMENT[leadType]
  if (!segment) return null

  const supabase = await db()
  const { data } = await supabase
    .from('playbooks')
    .select('*')
    .eq('target_segment', segment)
    .eq('status', 'active')
    .limit(1)
    .single()

  return data as Playbook | null
}

// Para la vista principal: assignments con contexto de playbook
export async function getAllAssignmentsWithContext(): Promise<AssignmentWithContext[]> {
  const supabase = await db()

  const [assignRes, pbRes, stepsRes] = await Promise.all([
    supabase.from('playbook_assignments').select('*').order('created_at', { ascending: false }),
    supabase.from('playbooks').select('*'),
    supabase.from('playbook_steps').select('*').order('step_order'),
  ])

  const playbooksMap = Object.fromEntries(
    ((pbRes.data ?? []) as Playbook[]).map(p => [p.id, p])
  )
  const stepsMap: Record<string, PlaybookStep[]> = {}
  for (const step of (stepsRes.data ?? []) as PlaybookStep[]) {
    if (!stepsMap[step.playbook_id]) stepsMap[step.playbook_id] = []
    stepsMap[step.playbook_id].push(step)
  }

  return ((assignRes.data ?? []) as PlaybookAssignment[]).map(a => {
    const steps = stepsMap[a.playbook_id] ?? []
    return {
      ...a,
      playbook:          playbooksMap[a.playbook_id],
      total_steps:       steps.length,
      current_step_data: steps.find(s => s.step_order === a.current_step) ?? null,
    }
  })
}
