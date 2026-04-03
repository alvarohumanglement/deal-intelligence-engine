'use client'

import { useState } from 'react'
import type { ScoringResult, Flag } from '@/types/scoring'
import { scoreDeal } from '@/lib/scoringEngine'

const dimensionLabels: Record<string, string> = {
  d1: 'Thesis Alignment',
  d2: 'Financial Health',
  d3: 'Operational Readiness',
  d4: 'Key-Person Risk',
  d5: 'Value Creation',
}

const classificationLabels: Record<string, { label: string; color: string; bg: string }> = {
  strong_fit:   { label: 'Strong Fit — Advance to IC',        color: 'text-score-high', bg: 'bg-score-high-bg' },
  conditional:  { label: 'Conditional — Advance with DD',     color: 'text-score-mid',  bg: 'bg-score-mid-bg' },
  below_thesis: { label: 'Below Thesis — Review Required',    color: 'text-score-low',  bg: 'bg-score-low-bg' },
  pass:         { label: 'Pass — Outside Thesis Parameters',  color: 'text-score-low',  bg: 'bg-score-low-bg' },
  suspended:    { label: 'Suspended — Pending Litigation',    color: 'text-score-low',  bg: 'bg-score-low-bg' },
  reclassify:   { label: 'Reclassify — Add-on Candidate',    color: 'text-score-mid',  bg: 'bg-score-mid-bg' },
}

const valueCreationLabels: Record<string, { label: string; detail: string }> = {
  margin_expansion:       { label: 'Margin expansion deal',       detail: 'Value created through operational improvement — procurement, labor optimization, and cost structure rationalization.' },
  platform_acceleration:  { label: 'Platform acceleration deal',  detail: 'Value created through add-on velocity, geographic expansion, and multiple arbitrage at exit.' },
  hybrid:                 { label: 'Hybrid — margin + platform',  detail: 'Value created through both operational improvement and platform-driven growth and multiple expansion.' },
}

function scoreColor(score: number) {
  if (score >= 75) return 'bg-score-high'
  if (score >= 50) return 'bg-score-mid'
  return 'bg-score-low'
}

function scoreTrackColor(score: number) {
  if (score >= 75) return 'bg-score-high/10'
  if (score >= 50) return 'bg-score-mid/10'
  return 'bg-score-low/10'
}

function flagStyle(type: Flag['type']) {
  switch (type) {
    case 'green': return 'text-score-high bg-score-high-bg'
    case 'amber': return 'text-score-mid bg-score-mid-bg'
    case 'red':   return 'text-score-low bg-score-low-bg'
  }
}

// ─── P3: DD focus mapping (flag text patterns → specific recommendations) ─────
const ddMapping: { pattern: RegExp; severity: 'red' | 'amber'; text: string }[] = [
  { pattern: /AvT variance|AvT \d/i,                       severity: 'red',   text: 'Validate AvT food cost variance: actual vs theoretical across all locations. Identify top-3 leakage points by unit.' },
  { pattern: /FDI \d+\/8.*critical|FDI \d+\/8.*moderate/i, severity: 'amber', text: 'Assess founder transition readiness via vacation test and GM autonomy interviews. Map all founder-dependent relationships (suppliers, landlords, key accounts).' },
  { pattern: /fragmented|migration required/i,              severity: 'amber', text: 'Estimate tech migration timeline and cost for unified POS deployment. Benchmark against 90-day Phase 1 target.' },
  { pattern: /Lease cost \d+%.*structural/i,                severity: 'red',   text: 'Benchmark lease portfolio: remaining terms, renewal clauses, % of revenue by location. Model impact of rent escalators on hold-period returns.' },
  { pattern: /SSG.*declining|SSG -/i,                       severity: 'red',   text: 'Distinguish execution decline from market decline: compare SSG to local market growth rates and competitive set performance.' },
  { pattern: /No professional CFO|No pro CFO/i,             severity: 'red',   text: 'Plan CFO search: timeline (target Week 2 post-close), budget ($200-250K), reporting requirements. Assess QoE reliability without professional finance function.' },
  { pattern: /Prior expansion.*underperformed/i,            severity: 'red',   text: 'Audit underperforming locations: site selection criteria, ramp timelines, fix-vs-close analysis. Validate organic growth assumptions in the model.' },
  { pattern: /prime cost.*above red|Prime cost \d+%.*red/i, severity: 'red',   text: 'Deep-dive prime cost composition: food vs labor split, supplier contracts, menu engineering. Quantify procurement savings from centralization.' },
  { pattern: /seasonal.*cash flow|Revenue concentration/i,  severity: 'red',   text: 'Model cash flow seasonality: monthly EBITDA profile, working capital requirements during off-peak, covenant compliance under stress.' },
  { pattern: /Single-city/i,                                severity: 'amber', text: 'Assess geographic concentration risk: market-specific regulatory exposure, labor market depth, and expansion corridor options.' },
]

function generateDDPriorities(flags: Flag[]): string[] {
  const matched: { severity: 'red' | 'amber'; text: string }[] = []
  const allFlagText = flags.map(f => f.text).join(' | ')

  for (const rule of ddMapping) {
    if (rule.pattern.test(allFlagText) && !matched.find(m => m.text === rule.text)) {
      matched.push({ severity: rule.severity, text: rule.text })
    }
  }

  // Sort: red first, then amber
  matched.sort((a, b) => (a.severity === 'red' ? 0 : 1) - (b.severity === 'red' ? 0 : 1))
  return matched.slice(0, 3).map(m => m.text)
}

// ─── P2: Entry economics calculation ──────────────────────
function computeEntryEconomics(revenueM: number, marginPct: number) {
  const ebitda = revenueM * (marginPct / 100)
  const entryMultiples = [6.5, 7.0, 7.5]
  const exitMultiple = 10
  const equityPct = 0.60
  const holdYears = 5
  const ssgRate = 0.035
  const marginExpansionPct = 0.04
  const addonRevenue = 26 // $26M from 3 add-ons

  const exitRevenue = revenueM * Math.pow(1 + ssgRate, holdYears) + addonRevenue
  const exitMargin = (marginPct / 100) + marginExpansionPct
  const exitEbitda = exitRevenue * exitMargin

  const rows = entryMultiples.map(entry => {
    const ev = ebitda * entry
    const equity = ev * equityPct
    const debt = ev - equity
    const exitEv = exitEbitda * exitMultiple
    const exitEquity = exitEv - debt
    const moic = exitEquity / equity
    return { entry, ev: Math.round(ev), equity: Math.round(equity), moic: Math.round(moic * 10) / 10 }
  })

  return { ebitda: Math.round(ebitda * 10) / 10, rows }
}

// ─── C3: Radar chart SVG ──────────────────────────────────
const radarLabels = ['Thesis', 'Financial', 'Ops', 'Key-Person', 'Value']
const radarSize = 280
const radarCenter = radarSize / 2
const radarRadius = 110

function polarToXY(angle: number, radius: number): [number, number] {
  // Start from top (-90deg), go clockwise
  const rad = ((angle - 90) * Math.PI) / 180
  return [radarCenter + radius * Math.cos(rad), radarCenter + radius * Math.sin(rad)]
}

function makePolygon(scores: number[]): string {
  return scores
    .map((s, i) => {
      const angle = (360 / 5) * i
      const r = (s / 100) * radarRadius
      const [x, y] = polarToXY(angle, r)
      return `${x},${y}`
    })
    .join(' ')
}

// ─── C2: Score improvement levers ─────────────────────────
interface Lever {
  description: string
  from: number
  to: number
  delta: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeImprovementLevers(deal: any, currentComposite: number): Lever[] {
  if (!deal) return []

  const mutations: { description: string; mutate: (d: any) => void }[] = [
    { description: `prime cost improves from ${deal.prime_cost_pct}% to 60%`, mutate: d => { d.prime_cost_pct = 60 } },
    { description: 'tech stack upgraded to active', mutate: d => { d.tech_status = 'active' } },
    { description: `FDI reduced by 2 with high readiness`, mutate: d => { d.fdi_declared = Math.max(0, d.fdi_declared - 2); d.readiness = 'high' } },
    { description: `EBITDA margin improves to ${Math.min(24, deal.ebitda_margin_pct + 4)}%`, mutate: d => { d.ebitda_margin_pct = Math.min(24, d.ebitda_margin_pct + 4) } },
    { description: `lease cost normalizes to 8%`, mutate: d => { d.lease_cost_pct = 8 } },
    { description: 'professional CFO hired', mutate: d => { d.has_pro_cfo = true } },
  ]

  const levers: Lever[] = []

  for (const m of mutations) {
    const cloned = { ...deal }
    m.mutate(cloned)
    const newResult = scoreDeal(cloned) as ScoringResult
    if (newResult.circuit_breakers.length > 0) continue
    const delta = newResult.composite - currentComposite
    if (delta > 0) {
      levers.push({ description: m.description, from: currentComposite, to: newResult.composite, delta })
    }
  }

  levers.sort((a, b) => b.delta - a.delta)
  return levers.slice(0, 3)
}

// ─── C5: Time to Value ───────────────────────────────────
function getDeploymentTimeline(techStatus: string, vcType: string | null): string | null {
  if (!vcType) return null
  switch (techStatus) {
    case 'active':
      return vcType === 'platform_acceleration'
        ? 'Add-on deployment from Month 6. No stabilization required.'
        : 'Margin levers active from Month 3. Full deployment by Month 9.'
    case 'unified':
      return 'Tech centralization from Day 31. AI deployment Month 4-6. Full playbook Month 9-12.'
    case 'dormant':
      return 'Tech reactivation: 1-2 months (data asset available). AI deployment Month 3-5. Full playbook Month 8-10.'
    case 'fragmented':
      return 'Tech migration: 3-4 months. AI deployment Month 6-8. Full playbook Month 12-15.'
    case 'none':
      return 'Full tech build required. AI deployment Month 9-12. Full playbook Month 15-18.'
    default:
      return null
  }
}

// ─── C7: One-line verdict generator ──────────────────────
const cuisineLabelMap: Record<string, string> = {
  med: 'Mediterranean', italian: 'Italian', med_italian: 'Mediterranean/Italian',
  steakhouse: 'steakhouse', american: 'American', asian: 'Asian', seafood: 'seafood', other: '',
}

const classificationUpperMap: Record<string, string> = {
  strong_fit: 'STRONG FIT', conditional: 'CONDITIONAL', below_thesis: 'BELOW THESIS',
  pass: 'PASS', suspended: 'SUSPENDED', reclassify: 'RECLASSIFY',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateVerdict(result: ScoringResult, deal: any): string {
  // Circuit breaker verdict
  if (result.circuit_breakers.length > 0) {
    const cb = result.circuit_breakers[0]
    return `${cb.rule}. Scoring not applicable.`
  }

  const cls = classificationUpperMap[result.classification] || 'CONDITIONAL'
  const cuisineLabel = deal ? (cuisineLabelMap[deal.cuisine] || '') : ''
  const revenue = deal?.revenue_M ? `$${deal.revenue_M}M` : ''
  const cities = deal?.cities ?? 1
  const cityStr = cities >= 2 ? `across ${cities} metros` : (deal?.city_names?.[0] || '')

  // Key strength
  let strength = ''
  if (result.composite >= 75 && result.margin_expansion) {
    strength = `margin expansion potential ${result.margin_expansion.bps}bps`
  } else {
    const greenFlags = result.flags.filter(f => f.type === 'green')
    if (greenFlags.length > 0) {
      strength = greenFlags[0].text.toLowerCase()
    }
  }

  // Key condition/risk
  let risk = ''
  const fdiAdj = result.fdi_v2?.adjusted ?? 0
  const hasRedFlags = result.flags.some(f => f.type === 'red')
  const techFragmented = deal?.tech_status === 'fragmented'

  if (fdiAdj >= 5) {
    risk = 'Conditional on founder transition assessment.'
  } else if (techFragmented) {
    risk = 'Tech migration required before AI deployment.'
  } else if (result.composite >= 75 && !hasRedFlags) {
    risk = 'No critical risk factors identified.'
  } else {
    const redFlag = result.flags.find(f => f.type === 'red')
    if (redFlag) {
      risk = redFlag.text.split('—')[0].trim() + '.'
    } else {
      risk = 'Standard DD scope applies.'
    }
  }

  const parts = [cls]
  if (revenue && cuisineLabel) parts.push(`— ${revenue} ${cuisineLabel}`)
  else if (revenue) parts.push(`— ${revenue}`)
  if (cityStr) parts.push(cityStr)
  if (strength) parts.push(`, ${strength}`)
  parts.push(`. ${risk}`)

  return parts.join(' ').replace(/ {2,}/g, ' ').replace(' ,', ',')
}

interface ScorecardProps {
  result: ScoringResult
  dealName: string
  dealRevenue?: number
  dealMargin?: number
  dealData?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  memo?: string
  disclaimer?: string
}

export default function Scorecard({ result, dealName, dealRevenue, dealMargin, dealData, memo, disclaimer }: ScorecardProps) {
  const classification = classificationLabels[result.classification] ?? classificationLabels.pass
  const [showVCTooltip, setShowVCTooltip] = useState(false)

  const verdict = generateVerdict(result, dealData)

  // ─── CIRCUIT BREAKER — C4: dramatic, disciplined ─────────
  if (result.circuit_breakers.length > 0) {
    const primary = result.circuit_breakers[0]
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* C7: One-line verdict for circuit breaker */}
        <p className="font-body font-medium text-[15px] text-ink leading-relaxed scorecard-verdict">
          {verdict}
        </p>
        <div className="border-2 border-score-low rounded-card p-6 bg-score-low-bg">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-5 h-5 rounded-full border-2 border-score-low flex items-center justify-center flex-shrink-0">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-score-low" />
              </svg>
            </div>
            <h2 className="font-display text-2xl text-ink">Circuit breaker triggered</h2>
          </div>

          <div className="space-y-3 mb-5">
            {result.circuit_breakers.map((cb) => (
              <div key={cb.id} className="flex items-start gap-3">
                <span className="text-score-low font-body text-xs font-medium mt-0.5 flex-shrink-0">{cb.id}</span>
                <p className="text-sm text-ink font-body leading-relaxed">{cb.rule}</p>
              </div>
            ))}
          </div>

          <p className="font-body text-sm text-ink leading-relaxed">
            Composite score not calculated. {primary.id === 'CB-1'
              ? 'This engine is calibrated for Mediterranean and Italian formats. The architecture is portable, but the scoring intelligence is sector-specific.'
              : primary.action === 'suspended'
              ? 'Scoring suspended pending resolution of material litigation. Re-submit when status changes.'
              : primary.action === 'reclassify_addon'
              ? 'Revenue below platform minimum. This target may qualify as an add-on acquisition within an existing portfolio company.'
              : 'Deal parameters fall outside thesis boundaries.'}
          </p>

          <div className="mt-5 pt-4 border-t border-score-low/20">
            <p className="font-body text-xs text-muted">
              {dealName}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── FULL SCORECARD ──────────────────────────────────────
  // Compute entry economics and timeline for both scorecard and summary card
  const entryEcon = (dealRevenue && dealMargin && dealRevenue > 0 && dealMargin > 0)
    ? computeEntryEconomics(dealRevenue, dealMargin)
    : null
  const timeline = dealData ? getDeploymentTimeline(dealData.tech_status, result.value_creation_type) : null
  const vcType = result.value_creation_type ? valueCreationLabels[result.value_creation_type] : null
  const fdi = result.fdi_v2

  return (
    <div className="max-w-2xl mx-auto space-y-6 scorecard-root" data-print-date={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}>
      {/* C7: One-line verdict */}
      <p className="font-body font-medium text-[15px] text-ink leading-relaxed scorecard-verdict">
        {verdict}
      </p>

      {/* Header + Score + Value Creation Badge */}
      <div className="border border-ink/10 rounded-card p-6 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-ink">{dealName}</h2>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-body ${classification.color} ${classification.bg} mt-2`}>
              {classification.label}
            </div>
          </div>
          <div className="text-right">
            <span className="font-display text-5xl leading-none text-ink">{result.composite}</span>
            <span className="font-body text-sm text-hint block mt-1">/100</span>
          </div>
        </div>

        {/* C7: Value creation type badge */}
        {vcType && (
          <div className="mt-4 pt-4 border-t border-ink/5">
            <div className="relative inline-block">
              <button
                onMouseEnter={() => setShowVCTooltip(true)}
                onMouseLeave={() => setShowVCTooltip(false)}
                onClick={() => setShowVCTooltip(v => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body bg-copper/[0.08] text-copper cursor-help"
              >
                {vcType.label}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-60">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
                  <path d="M6 5.5V8.5M6 3.5V4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
              </button>
              {showVCTooltip && (
                <div className="absolute left-0 top-full mt-2 w-72 p-3 rounded-md bg-ink text-paper text-xs font-body leading-relaxed z-10 shadow-sm">
                  {vcType.detail}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* C3: Radar Chart + Dimension Bars */}
      <div className="border border-ink/10 rounded-card p-6 bg-white">
        <h3 className="font-body text-xs tracking-wider uppercase text-hint mb-4">Dimension Scores</h3>

        {/* Radar chart */}
        <div className="flex justify-center mb-6">
          <svg width={radarSize} height={radarSize} viewBox={`0 0 ${radarSize} ${radarSize}`} className="max-w-[280px]">
            {/* Grid rings */}
            {[25, 50, 75, 100].map(level => (
              <polygon
                key={level}
                points={Array.from({ length: 5 }, (_, i) => {
                  const [x, y] = polarToXY((360 / 5) * i, (level / 100) * radarRadius)
                  return `${x},${y}`
                }).join(' ')}
                fill="none"
                stroke="rgba(26,26,24,0.06)"
                strokeWidth="0.5"
              />
            ))}
            {/* Axis lines */}
            {Array.from({ length: 5 }, (_, i) => {
              const [x, y] = polarToXY((360 / 5) * i, radarRadius)
              return <line key={i} x1={radarCenter} y1={radarCenter} x2={x} y2={y} stroke="rgba(26,26,24,0.06)" strokeWidth="0.5" />
            })}
            {/* Thesis target (80 per axis) */}
            <polygon
              points={makePolygon([80, 80, 80, 80, 80])}
              fill="rgba(154,123,79,0.06)"
              stroke="#9a7b4f"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            {/* Deal actual */}
            {(() => {
              const scores = [result.dimensions.d1, result.dimensions.d2, result.dimensions.d3, result.dimensions.d4, result.dimensions.d5]
              const fillColor = result.composite >= 75 ? 'rgba(45,90,71,0.10)' : result.composite >= 50 ? 'rgba(139,108,47,0.10)' : 'rgba(139,58,47,0.10)'
              const strokeColor = result.composite >= 75 ? '#2d5a47' : result.composite >= 50 ? '#8b6c2f' : '#8b3a2f'
              return (
                <polygon
                  points={makePolygon(scores)}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />
              )
            })()}
            {/* Labels */}
            {radarLabels.map((label, i) => {
              const [x, y] = polarToXY((360 / 5) * i, radarRadius + 18)
              return (
                <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                  className="font-body" style={{ fontSize: '10px', fill: '#9c9a92' }}>
                  {label}
                </text>
              )
            })}
          </svg>
        </div>

        {/* C4: Dimension bars with benchmark markers */}
        <div className="space-y-3">
          {(Object.entries(result.dimensions) as [string, number][]).map(([key, score]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-body text-sm text-ink">{dimensionLabels[key]}</span>
                <span className="font-body text-sm text-muted tabular-nums">{score}</span>
              </div>
              <div className={`relative h-2 rounded-full ${scoreTrackColor(score)}`}>
                <div
                  className={`h-2 rounded-full ${scoreColor(score)} transition-all duration-500`}
                  style={{ width: `${score}%` }}
                />
                {/* Benchmark marker at 75 */}
                <div
                  className="absolute top-0 h-full w-px border-l border-dashed border-copper/50"
                  style={{ left: '75%' }}
                  title="Strong Fit threshold: 75"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* C5: FDI v2.0 detail panel */}
      {fdi && (
        <div className="border border-ink/10 rounded-card p-6 bg-white">
          <h3 className="font-body text-xs tracking-wider uppercase text-hint mb-4">Founder Dependency Index — v2.0</h3>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="font-display text-3xl text-ink">{fdi.declared}</span>
            {fdi.declared !== fdi.adjusted && (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-1 text-hint">
                  <path d="M4 8H12M12 8L9 5M12 8L9 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-display text-3xl text-ink">{fdi.adjusted}</span>
              </>
            )}
            <span className="font-body text-sm text-muted ml-0.5">/ 8</span>
            {fdi.declared !== fdi.adjusted && (
              <span className="font-body text-xs text-hint ml-2">(proxy-adjusted)</span>
            )}
          </div>

          {/* Proxy adjustments */}
          {fdi.proxies.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {fdi.proxies.map((p, i) => (
                <span key={i} className="inline-block px-2.5 py-1 rounded-full text-xs font-body text-score-mid bg-score-mid-bg">
                  {p.indicator} ({p.adjustment})
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 text-sm font-body">
            <span className="text-muted">Transitional readiness:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs ${
              fdi.readiness === 'high' ? 'text-score-high bg-score-high-bg' :
              fdi.readiness === 'low' ? 'text-score-low bg-score-low-bg' :
              'text-score-mid bg-score-mid-bg'
            }`}>
              {fdi.readiness}
            </span>
          </div>
        </div>
      )}

      {/* Flags */}
      <div className="border border-ink/10 rounded-card p-6 bg-white">
        <h3 className="font-body text-xs tracking-wider uppercase text-hint mb-4">Flags</h3>
        <div className="flex flex-wrap gap-2">
          {result.flags.map((flag, i) => (
            <span
              key={i}
              className={`inline-block px-3 py-1 rounded-full text-xs font-body leading-relaxed ${flagStyle(flag.type)}`}
            >
              {flag.text}
            </span>
          ))}
        </div>
      </div>

      {/* Mini-Memo */}
      {memo && (
        <div className="border border-ink/10 rounded-card p-6 bg-white">
          <h3 className="font-body text-xs tracking-wider uppercase text-hint mb-4">Investment Memo</h3>
          <div className="border-l-2 border-copper pl-5">
            <p className="font-display text-base text-ink leading-relaxed whitespace-pre-line">
              {memo}
            </p>
          </div>
        </div>
      )}

      {/* Margin Expansion */}
      {result.margin_expansion && (
        <div className="border border-ink/10 rounded-card p-6 bg-white">
          <h3 className="font-body text-xs tracking-wider uppercase text-hint mb-4">Margin Expansion Potential</h3>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="font-display text-3xl text-ink">{result.margin_expansion.bps}</span>
            <span className="font-body text-sm text-muted">bps</span>
            <span className="font-body text-sm text-hint mx-1">&middot;</span>
            <span className="font-display text-3xl text-ink">${result.margin_expansion.dollars_M}M</span>
          </div>
          <div className="space-y-2">
            {result.margin_expansion.sources.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm font-body">
                <span className="text-muted">{s.lever}</span>
                <span className="text-ink tabular-nums">{s.bps} bps</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deal Structure Advisory */}
      {result.deal_structure_advisory.length > 0 && (
        <div className="border border-ink/10 rounded-card p-6 bg-white">
          <h3 className="font-body text-xs tracking-wider uppercase text-hint mb-4">Deal Structure Advisory</h3>
          <div className="space-y-3">
            {result.deal_structure_advisory.map((a, i) => (
              <p key={i} className="font-body text-sm text-ink leading-relaxed">
                {a.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* P2: Entry Economics */}
      {entryEcon && (() => {
        const econ = entryEcon
        return (
          <div className="rounded-card p-6 bg-paper-warm">
            <h3 className="font-body text-xs tracking-wider uppercase text-hint mb-4">Entry Economics (indicative)</h3>
            <div className="flex gap-6 mb-4">
              <div>
                <span className="font-body text-xs text-hint block">Implied EBITDA</span>
                <span className="font-display text-2xl text-ink">${econ.ebitda}M</span>
              </div>
              <div>
                <span className="font-body text-xs text-hint block">Implied EV at 7.0x</span>
                <span className="font-display text-2xl text-ink">${econ.rows[1].ev}M</span>
              </div>
              <div>
                <span className="font-body text-xs text-hint block">Equity required (60%)</span>
                <span className="font-display text-2xl text-ink">${econ.rows[1].equity}M</span>
              </div>
            </div>

            <div className="border-t border-ink/5 pt-4">
              <span className="font-body text-xs text-hint block mb-2">MOIC sensitivity</span>
              <div className="space-y-1.5">
                {econ.rows.map(row => (
                  <div key={row.entry} className="flex items-center justify-between text-sm font-body">
                    <span className="text-muted">Entry {row.entry}x</span>
                    <span className="text-ink tabular-nums font-medium">{row.moic}x MOIC</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-4 font-body text-[11px] text-hint leading-relaxed">
              Illustrative. Based on Heritage Experience Platforms thesis assumptions: 60% equity, exit 10x, 5yr hold, 400bps margin expansion, 3.5% SSG, 3 add-ons ($26M revenue).
            </p>
          </div>
        )
      })()}

      {/* C5: Time to Value estimator */}
      {timeline && (() => {
        return (
          <div className="rounded-card p-6 bg-paper-warm">
            <h3 className="font-body text-xs tracking-wider uppercase text-hint mb-3">Estimated Deployment Timeline</h3>
            <p className="font-body text-sm text-ink leading-relaxed">{timeline}</p>
            <p className="mt-3 font-body text-[11px] text-hint">
              Based on Heritage Experience Platforms playbook deployment benchmarks.
            </p>
          </div>
        )
      })()}

      {/* P3: Shadow Audit / DD Priorities */}
      {(() => {
        const ddItems = generateDDPriorities(result.flags)
        if (ddItems.length === 0) return null
        return (
          <div className="border border-ink/10 rounded-card p-6 bg-white">
            <h3 className="font-body text-xs tracking-wider uppercase text-hint mb-4">Recommended Due Diligence Focus</h3>
            <div className="space-y-3">
              {ddItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="font-display text-lg text-copper leading-none mt-0.5">{i + 1}</span>
                  <p className="font-body text-sm text-ink leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* C2: Score improvement levers */}
      {dealData && result.composite < 75 && (() => {
        const levers = computeImprovementLevers(dealData, result.composite)
        if (levers.length === 0) return null
        return (
          <div className="border border-ink/10 rounded-card p-6 bg-white">
            <h3 className="font-body text-xs tracking-wider uppercase text-hint mb-4">Score Improvement Levers</h3>
            <div className="space-y-3">
              {levers.map((lever, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="font-display text-lg text-copper leading-none mt-0.5">{i + 1}</span>
                  <p className="font-body text-sm text-ink leading-relaxed">
                    If {lever.description} → composite moves from{' '}
                    <span className="font-medium tabular-nums">{lever.from}</span> to{' '}
                    <span className="font-medium tabular-nums">{lever.to}</span>{' '}
                    <span className="text-score-high font-medium">(+{lever.delta} points)</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* C9: Deal Summary Card */}
      {dealData && (
        <div className="rounded-card p-5 bg-paper-warm scorecard-summary">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-body font-medium text-base text-ink">{dealName}</span>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-body ${classification.color} ${classification.bg}`}>
              {classificationLabels[result.classification]?.label.split('—')[0].trim()}
            </span>
          </div>
          <p className="font-body text-[13px] text-muted">
            {cuisineLabelMap[dealData.cuisine] || dealData.cuisine} — {dealData.cities} {dealData.cities === 1 ? 'city' : 'cities'}
          </p>
          <p className="font-body text-[13px] text-muted">
            ${dealData.revenue_M}M revenue · {dealData.ebitda_margin_pct}% EBITDA · {dealData.locations} locations
          </p>

          <div className="my-3 border-t border-ink/10" />

          <div className="flex items-center gap-2 mb-1">
            <span className="font-body font-medium text-sm text-ink">Score: {result.composite}</span>
            <span className="font-body text-xs text-muted tabular-nums">
              D1:{result.dimensions.d1} D2:{result.dimensions.d2} D3:{result.dimensions.d3} D4:{result.dimensions.d4} D5:{result.dimensions.d5}
            </span>
          </div>
          <p className="font-body text-[13px] text-muted">
            {vcType?.label || '—'}
            {result.margin_expansion ? ` · ${result.margin_expansion.bps}bps ($${result.margin_expansion.dollars_M}M)` : ''}
          </p>
          <p className="font-body text-[13px] text-muted">
            {timeline || '—'}
            {entryEcon ? ` · ${entryEcon.rows[1].moic}x MOIC at 7.0x` : ''}
          </p>

          <div className="my-3 border-t border-ink/10" />

          <p className="font-body text-[13px] text-ink leading-relaxed">
            {verdict}
          </p>
        </div>
      )}

      {/* C8: Export button */}
      <div className="text-center no-print">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-5 py-2 border border-ink/10 rounded-card font-body text-sm text-muted hover:border-copper/40 hover:text-copper transition-colors duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6V2h8v4M4 12H2.5A1.5 1.5 0 011 10.5v-3A1.5 1.5 0 012.5 6h11A1.5 1.5 0 0115 7.5v3a1.5 1.5 0 01-1.5 1.5H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="4" y="10" width="8" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          Export scorecard
        </button>
      </div>

      {/* Disclaimer (passed in by ManualPath) */}
      {disclaimer && (
        <p className="font-body text-xs text-hint text-center max-w-lg mx-auto leading-relaxed no-print" style={{ fontSize: '12px' }}>
          {disclaimer}
        </p>
      )}
    </div>
  )
}
