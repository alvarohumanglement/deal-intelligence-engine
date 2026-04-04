'use client'

import { useState } from 'react'
import Scorecard from '@/components/Scorecard'
import { generateSyntheticDeal } from '@/lib/syntheticGenerator'
import { scoreDeal } from '@/lib/scoringEngine'
import type { ScoringResult } from '@/types/scoring'

interface SyntheticDeal {
  name: string
  cuisine: string
  cuisine_label: string
  revenue_M: number
  ebitda_margin_pct: number
  prime_cost_pct: number
  avg_check: number
  locations: number
  cities: number
  city_names: string[]
  founder_age: number
  fdi_declared: number
  readiness: string
  gm_tenure_months: number
  tech_status: string
  avt_variance_pct: number | null
  lease_cost_pct: number
  ssg_pct: number
  has_pro_cfo: boolean
  has_minority_investor: boolean
  has_active_litigation: boolean
  is_seasonal: boolean
  has_prior_expansion_failure: boolean
  red_flags: string[]
  revenue_per_location: number
  ebitda_M: number
}

type ScoreState = { result: ScoringResult; memo: string | null; loading: boolean } | null

const metricCell = (label: string, value: string) => (
  <div>
    <span className="font-body text-[10px] md:text-[11px] tracking-wider uppercase text-hint block">{label}</span>
    <span className="font-display text-base md:text-xl text-ink">{value}</span>
  </div>
)

export default function SyntheticPath() {
  const [deal, setDeal] = useState<SyntheticDeal | null>(null)
  const [score, setScore] = useState<ScoreState>(null)

  function handleGenerate() {
    setScore(null)
    setDeal(generateSyntheticDeal() as SyntheticDeal)
  }

  async function handleAnalyze() {
    if (!deal) return
    const result = scoreDeal(deal) as ScoringResult
    setScore({ result, memo: null, loading: true })

    if (result.circuit_breakers.length === 0) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deal, scores: result }),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        const data = await res.json()
        setScore(prev => prev ? { ...prev, memo: data.memo ?? null, loading: false } : null)
      } catch {
        setScore(prev => prev ? { ...prev, memo: '__timeout__', loading: false } : null)
      }
    } else {
      setScore(prev => prev ? { ...prev, loading: false } : null)
    }
  }

  // Initial state — big CTA
  if (!deal) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <p className="font-body text-sm text-muted mb-8">
          Generate a synthetic CIM with internally consistent financials, correlated operating metrics, and realistic red flags.
        </p>
        <button
          onClick={handleGenerate}
          className="px-8 py-3.5 border-2 border-copper text-copper font-body text-sm tracking-wide rounded-card hover:bg-copper/[0.06] transition-colors duration-200"
        >
          No NDA required. Build me a deal.
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      {/* CIM Card */}
      <div className="border border-ink/10 rounded-card p-4 md:p-6 bg-white">
        <div className="flex items-start justify-between gap-3 md:gap-4 mb-1">
          <div className="min-w-0">
            <h2 className="font-display text-xl md:text-2xl text-ink">{deal.name}</h2>
            <p className="font-body text-xs md:text-sm text-muted mt-1">{deal.city_names.join(' · ')} — {deal.cuisine_label}</p>
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-body tracking-wider uppercase bg-copper/[0.08] text-copper">
            Synthetic
          </span>
        </div>

        <div className="mt-5 border-t border-ink/5 pt-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-4">
            {metricCell('Revenue', `$${deal.revenue_M}M`)}
            {metricCell('EBITDA', `${deal.ebitda_margin_pct}% · $${deal.ebitda_M}M`)}
            {metricCell('Prime Cost', `${deal.prime_cost_pct}%`)}
            {metricCell('Avg Check', `$${deal.avg_check}`)}
            {metricCell('Locations', `${deal.locations} · ${deal.cities} cities`)}
            {metricCell('Founder Age', `${deal.founder_age}`)}
            {metricCell('FDI', `${deal.fdi_declared}/8`)}
            {metricCell('Readiness', deal.readiness)}
            {metricCell('Tech', deal.tech_status)}
          </div>
        </div>

        {/* Red flags */}
        {deal.red_flags.length > 0 && (
          <div className="mt-5 border-t border-ink/5 pt-5">
            <span className="font-body text-[11px] tracking-wider uppercase text-hint block mb-2">Red Flags</span>
            <div className="flex flex-wrap gap-2">
              {deal.red_flags.map((flag, i) => (
                <span key={i} className="inline-block px-3 py-1 rounded-full text-xs font-body text-score-low bg-score-low-bg">
                  {flag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Additional metrics row */}
        <div className="mt-5 border-t border-ink/5 pt-4 flex flex-wrap gap-x-3 md:gap-x-6 gap-y-1">
          <span className="font-body text-xs text-hint">Lease {deal.lease_cost_pct}%</span>
          <span className="font-body text-xs text-hint">SSG {deal.ssg_pct}%</span>
          <span className="font-body text-xs text-hint">GM tenure {deal.gm_tenure_months}mo</span>
          <span className="font-body text-xs text-hint">{deal.has_pro_cfo ? 'Pro CFO' : 'No pro CFO'}</span>
          {deal.avt_variance_pct !== null && (
            <span className="font-body text-xs text-hint">AvT {deal.avt_variance_pct}%</span>
          )}
          {deal.is_seasonal && <span className="font-body text-xs text-score-low">Seasonal</span>}
        </div>
      </div>

      {/* Actions */}
      {!score && (
        <div className="flex flex-col md:flex-row gap-2 md:gap-3 justify-center">
          <button
            onClick={handleAnalyze}
            className="px-8 py-3.5 md:py-3 bg-ink text-paper font-body text-sm tracking-wide rounded-card hover:bg-ink/90 transition-colors duration-200"
          >
            Analyze This Deal
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-3.5 md:py-3 border border-ink/10 font-body text-sm text-muted rounded-card hover:border-copper/40 hover:text-copper transition-colors duration-200"
          >
            Generate Another
          </button>
        </div>
      )}

      {/* Scorecard */}
      {score && (
        <div>
          {score.loading && !score.result.circuit_breakers.length ? (
            <div className="mb-4 flex items-center gap-2">
              <div className="w-3 h-3 border border-copper border-t-transparent rounded-full animate-spin" />
              <span className="font-body text-sm text-hint">Generating investment memo...</span>
            </div>
          ) : null}

          <Scorecard result={score.result} dealName={deal.name} dealRevenue={deal.revenue_M} dealMargin={deal.ebitda_margin_pct} dealData={deal} memo={score.memo ?? undefined} />

          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={handleGenerate}
              className="px-6 py-2.5 border border-ink/10 rounded-card font-body text-sm text-muted hover:border-copper/40 hover:text-copper transition-colors duration-200"
            >
              Generate Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
