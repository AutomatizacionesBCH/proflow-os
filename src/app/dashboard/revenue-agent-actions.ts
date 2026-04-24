'use server'

import { createClient } from '@/lib/supabase/server'
import { analyzeRevenue } from '@/lib/agents/revenue-agent'
import type { SavedRevenueAnalysis } from '@/types/agent.types'

// ── Ejecutar el análisis y guardar en BD ──────────────────────────────────────
export async function runRevenueAgentAction(): Promise<{
  success: boolean
  data?:   SavedRevenueAnalysis
  error?:  string
}> {
  try {
    const analysis = await analyzeRevenue()

    const supabase = await createClient()
    const db = supabase as any

    const { data, error } = await db
      .from('revenue_analyses')
      .insert({ analysis_data: analysis })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { success: true, data: data as SavedRevenueAnalysis }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[runRevenueAgentAction]', message)
    return { success: false, error: message }
  }
}
