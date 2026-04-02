export interface DealInput {
  name: string
  cuisine: string
  revenue_M: number
  ebitda_margin_pct: number
  prime_cost_pct: number
  avg_check: number
  locations: number
  cities: number
  founder_age: number
  fdi_declared: number
  readiness: 'high' | 'medium' | 'low'
  gm_tenure_months: number
  tech_status: 'active' | 'dormant' | 'unified' | 'fragmented' | 'none'
  avt_variance_pct: number | null
  lease_cost_pct: number
  ssg_pct: number
  has_pro_cfo: boolean
  has_minority_investor: boolean
  has_active_litigation: boolean
  is_seasonal: boolean
  has_prior_expansion_failure: boolean
  historical_data_months?: number
  existing_debt_M?: number
}

export interface Flag {
  type: 'green' | 'amber' | 'red'
  text: string
  dimension: string
}

export interface CircuitBreaker {
  id: string
  rule: string
  action: string
}

export interface Modifier {
  id: string
  rule: string
  effect: string
}

export interface MarginExpansion {
  bps: number
  dollars_M: number
  sources: { lever: string; bps: number }[]
}

export interface FDIResult {
  declared: number
  adjusted: number
  proxies: { indicator: string; value: string; adjustment: string }[]
  readiness: string
  avt_used: number
}

export interface ScoringResult {
  composite: number
  classification: 'strong_fit' | 'conditional' | 'below_thesis' | 'pass' | 'reclassify' | 'suspended'
  dimensions: { d1: number; d2: number; d3: number; d4: number; d5: number }
  value_creation_type: 'margin_expansion' | 'platform_acceleration' | 'hybrid' | null
  flags: Flag[]
  circuit_breakers: CircuitBreaker[]
  modifiers_applied: Modifier[]
  deal_structure_advisory: { type: string; text: string }[]
  margin_expansion: MarginExpansion | null
  fdi_v2: FDIResult
  is_suspended: boolean
  reclassification: string | null
}
