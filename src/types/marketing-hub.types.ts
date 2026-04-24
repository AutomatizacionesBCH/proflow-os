// ============================================================
// ProFlow OS — Marketing Data Hub Types
// Alineados con migración 012_marketing_data_hub.sql
// ============================================================

// ── Enums ─────────────────────────────────────────────────────

export type AdPlatform =
  | 'meta'
  | 'tiktok'
  | 'linkedin'
  | 'google'
  | 'x'
  | 'vambe'
  | 'manual'

export type AccountStatus   = 'active' | 'paused' | 'disconnected' | 'error'
export type AdStatus        = 'active' | 'paused' | 'finished' | 'archived'
export type RecommendationPriority = 'high' | 'medium' | 'low'
export type RecommendationStatus   = 'pending' | 'approved' | 'rejected' | 'dismissed'

export type AttributionEventType =
  | 'lead_created'
  | 'lead_qualified'
  | 'lead_converted'
  | 'operation_created'

export type RecommendationType =
  | 'budget_shift'
  | 'pause_campaign'
  | 'launch_campaign'
  | 'audience_expand'
  | 'audience_narrow'
  | 'creative_refresh'
  | 'channel_focus'
  | 'custom'


// ── Tablas ───────────────────────────────────────────────────

export type MarketingAccount = {
  id:                   string
  platform:             AdPlatform
  account_name:         string
  account_external_id:  string | null
  status:               AccountStatus
  currency:             string
  config_json:          Record<string, unknown> | null
  last_sync_at:         string | null
  notes:                string | null
  created_at:           string
  updated_at:           string
}

export type MarketingAccountInsert = Omit<MarketingAccount, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

// ─────────────────────────────────────────────────────────────

export type AdCampaign = {
  id:                   string
  marketing_account_id: string | null
  platform:             AdPlatform
  external_campaign_id: string | null
  campaign_name:        string
  objective:            string | null
  status:               AdStatus
  start_date:           string | null
  end_date:             string | null
  raw_payload:          Record<string, unknown> | null
  created_at:           string
  updated_at:           string
}

export type AdCampaignInsert = Omit<AdCampaign, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

// ─────────────────────────────────────────────────────────────

export type AdAdset = {
  id:                 string
  ad_campaign_id:     string | null
  platform:           AdPlatform
  external_adset_id:  string | null
  adset_name:         string
  targeting_summary:  string | null
  status:             AdStatus
  raw_payload:        Record<string, unknown> | null
  created_at:         string
  updated_at:         string
}

export type AdAdsetInsert = Omit<AdAdset, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

// ─────────────────────────────────────────────────────────────

export type AdAd = {
  id:               string
  ad_adset_id:      string | null
  platform:         AdPlatform
  external_ad_id:   string | null
  ad_name:          string
  creative_summary: string | null
  status:           AdStatus
  raw_payload:      Record<string, unknown> | null
  created_at:       string
  updated_at:       string
}

export type AdAdInsert = Omit<AdAd, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

// ─────────────────────────────────────────────────────────────

export type DailyChannelMetrics = {
  id:                                   string
  date:                                 string
  platform:                             AdPlatform
  marketing_account_id:                 string | null
  ad_campaign_id:                       string | null
  campaign_name:                        string | null
  // Inversión
  spend_clp:                            number
  spend_original:                       number | null
  currency:                             string | null
  // Alcance
  impressions:                          number
  clicks:                               number
  // Funnel
  leads:                                number
  qualified_leads:                      number
  hot_leads:                            number
  converted_clients:                    number
  operations_count:                     number
  // Económico
  revenue_clp:                          number
  profit_clp:                           number
  // Calculados
  cost_per_lead:                        number | null
  cost_per_qualified_lead:              number | null
  cost_per_client:                      number | null
  conversion_rate_lead_to_client:       number | null
  conversion_rate_client_to_operation:  number | null
  roas:                                 number | null
  // Extras
  notes:                                string | null
  raw_payload:                          Record<string, unknown> | null
  created_at:                           string
  updated_at:                           string
}

export type DailyChannelMetricsInsert = Omit<DailyChannelMetrics, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

// ─────────────────────────────────────────────────────────────

export type AttributionEvent = {
  id:            string
  lead_id:       string | null
  client_id:     string | null
  operation_id:  string | null
  platform:      AdPlatform | null
  campaign_id:   string | null
  campaign_name: string | null
  source_channel: string | null
  event_type:    AttributionEventType
  event_time:    string
  value_clp:     number | null
  metadata_json: Record<string, unknown> | null
  created_at:    string
}

export type AttributionEventInsert = Omit<AttributionEvent, 'id' | 'created_at'> & {
  id?: string
}

// ─────────────────────────────────────────────────────────────

export type MarketingRecommendation = {
  id:                 string
  agent_name:         string
  recommendation_type: RecommendationType
  priority:           RecommendationPriority
  title:              string
  explanation:        string | null
  expected_impact:    string | null
  suggested_action:   string | null
  status:             RecommendationStatus
  approved_by:        string | null
  approved_at:        string | null
  dismissed_reason:   string | null
  metadata_json:      Record<string, unknown> | null
  created_at:         string
  updated_at:         string
}

export type MarketingRecommendationInsert = Omit<MarketingRecommendation, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}


// ── Labels de UI ──────────────────────────────────────────────

export const PLATFORM_LABELS: Record<AdPlatform, string> = {
  meta:     'Meta',
  tiktok:   'TikTok',
  linkedin: 'LinkedIn',
  google:   'Google',
  x:        'X / Twitter',
  vambe:    'Vambe',
  manual:   'Manual',
}

export const RECOMMENDATION_TYPE_LABELS: Record<RecommendationType, string> = {
  budget_shift:    'Reasignar presupuesto',
  pause_campaign:  'Pausar campaña',
  launch_campaign: 'Lanzar campaña',
  audience_expand: 'Expandir audiencia',
  audience_narrow: 'Acotar audiencia',
  creative_refresh:'Renovar creativos',
  channel_focus:   'Concentrar canal',
  custom:          'Personalizada',
}

export const RECOMMENDATION_PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  high:   'Alta',
  medium: 'Media',
  low:    'Baja',
}
