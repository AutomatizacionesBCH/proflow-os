// Tipos para el Lead Intelligence Agent
// Separados para poder importarlos tanto en server como en client components

export type AIRecommendation = {
  heat_score:                 number
  priority_label:             'hot' | 'warm' | 'follow_up' | 'cold'
  lead_type:                  'vip' | 'spot' | 'new' | 'dormant' | 'high_potential' | 'trust_issue' | 'unclear'
  assigned_to_recommendation: string
  next_best_action:           string
  reasoning:                  string
  urgency:                    'alta' | 'media' | 'baja'
  suggested_message:          string
}

export type SavedRecommendation = AIRecommendation & {
  id:         string
  lead_id:    string
  lead_name:  string
  viewed_at:  string | null
  created_at: string
}
