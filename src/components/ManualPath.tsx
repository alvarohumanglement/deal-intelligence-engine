'use client'

import { useState } from 'react'
import Scorecard from '@/components/Scorecard'
import { scoreDeal } from '@/lib/scoringEngine'
import type { ScoringResult } from '@/types/scoring'

const cuisineMap: Record<string, { value: string; label: string; primeCost: number }> = {
  med:         { value: 'med',         label: 'Mediterranean',             primeCost: 63 },
  italian:     { value: 'italian',     label: 'Italian',                   primeCost: 63 },
  med_italian: { value: 'med_italian', label: 'Mediterranean & Italian',   primeCost: 63 },
}

const metros = [
  'New York', 'Los Angeles', 'Chicago', 'Washington DC', 'Miami',
  'Atlanta', 'San Francisco', 'Houston', 'Dallas', 'Nashville',
  'Boston', 'Denver', 'Seattle', 'Other',
]

const techOptions = [
  { value: 'unified',     label: 'Unified POS across locations' },
  { value: 'fragmented',  label: 'Multiple systems' },
  { value: 'none',        label: 'No integrated systems' },
  { value: 'dormant',     label: 'Installed but not actively used' },
]

const founderOptions = [
  { value: 'low',    label: 'Brand ambassador — mostly stepped back',                fdi: 2 },
  { value: 'medium', label: 'Active operator — involved daily',                      fdi: 4 },
  { value: 'high',   label: 'Runs everything — all decisions flow through founder',  fdi: 6 },
]

const managementOptions = [
  { value: 'pro',    label: 'Professional CFO + ops leadership',     hasCfo: true,  fdiAdj: 0 },
  { value: 'some',   label: 'Some professional hires',              hasCfo: false, fdiAdj: 0 },
  { value: 'family', label: 'Family-managed or founder-only',       hasCfo: false, fdiAdj: 1 },
]

type ScoreState = { result: ScoringResult; dealName: string; dealRevenue: number; dealMargin: number; dealData: any; memo: string | null; loading: boolean; enhanced: boolean } | null

export default function ManualPath() {
  // Quick screen (6 fields)
  const [revenue, setRevenue] = useState(40)
  const [ebitda, setEbitda] = useState(20)
  const [locations, setLocations] = useState(8)
  const [cuisine, setCuisine] = useState('med')
  const [founderAge, setFounderAge] = useState<number | ''>('')
  const [selectedCities, setSelectedCities] = useState<string[]>([])

  // Enhanced fields (5 additional)
  const [showEnhanced, setShowEnhanced] = useState(false)
  const [primeCost, setPrimeCost] = useState<number | null>(null) // null = derive from cuisine
  const [techStatus, setTechStatus] = useState('fragmented')
  const [founderInvolvement, setFounderInvolvement] = useState('medium')
  const [management, setManagement] = useState('some')
  const [leaseCost, setLeaseCost] = useState(8)

  const [score, setScore] = useState<ScoreState>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  function toggleCity(city: string) {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  function deriveFDI(age: number | ''): number {
    if (age === '') return 4
    if (age > 60) return 5
    if (age >= 50) return 4
    return 3
  }

  const effectivePrimeCost = primeCost ?? cuisineMap[cuisine].primeCost

  async function handleScore() {
    if (revenue < 5) { setValidationError('Minimum revenue: $5M'); return }
    if (locations < 1) { setValidationError('Minimum 1 location'); return }
    setValidationError(null)

    const age = founderAge === '' ? 52 : founderAge
    const cities = Math.max(1, selectedCities.length)
    const avgCheck = 68
    const isEnhanced = showEnhanced

    // FDI: if enhanced, use founder involvement dropdown + management adjustment
    // If not enhanced, derive from age
    let fdi: number
    if (isEnhanced) {
      const founderFdi = founderOptions.find(o => o.value === founderInvolvement)?.fdi ?? 4
      const mgmtAdj = managementOptions.find(o => o.value === management)?.fdiAdj ?? 0
      fdi = Math.min(8, founderFdi + mgmtAdj)
    } else {
      fdi = deriveFDI(founderAge)
    }

    const hasCfo = isEnhanced
      ? (managementOptions.find(o => o.value === management)?.hasCfo ?? false)
      : locations >= 8

    const deal = {
      name: 'Manual Assessment',
      cuisine,
      revenue_M: revenue,
      ebitda_margin_pct: ebitda,
      prime_cost_pct: isEnhanced ? effectivePrimeCost : cuisineMap[cuisine].primeCost,
      avg_check: avgCheck,
      locations,
      cities,
      founder_age: age,
      fdi_declared: fdi,
      readiness: 'medium' as const,
      gm_tenure_months: 20,
      tech_status: (isEnhanced ? techStatus : 'fragmented') as 'unified' | 'fragmented' | 'none' | 'dormant' | 'active',
      avt_variance_pct: null,
      lease_cost_pct: isEnhanced ? leaseCost : 8,
      ssg_pct: 3,
      has_pro_cfo: hasCfo,
      has_minority_investor: false,
      has_active_litigation: false,
      is_seasonal: false,
      has_prior_expansion_failure: false,
    }

    const result = scoreDeal(deal) as ScoringResult
    setScore({ result, dealName: 'Manual Assessment', dealRevenue: revenue, dealMargin: ebitda, dealData: deal, memo: null, loading: true, enhanced: isEnhanced })

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

  const inputClass = "w-full px-3 py-2 border border-ink/10 rounded-md font-body text-sm text-ink bg-paper focus:outline-none focus:border-copper transition-colors"
  const labelClass = "font-body text-xs tracking-wider uppercase text-hint block mb-1.5"

  return (
    <div className="max-w-2xl mx-auto w-full">
      {!score ? (
        <div className="border border-ink/10 rounded-card p-4 md:p-6 bg-white">
          <h2 className="font-display text-xl md:text-2xl text-ink mb-1">Score your own deal</h2>
          <p className="font-body text-sm text-muted mb-6">Enter key parameters. Conservative defaults fill the rest.</p>

          <div className="space-y-5">
            {/* Revenue */}
            <div>
              <label className={labelClass}>Revenue ($M)</label>
              <input type="number" min={5} max={200} value={revenue}
                onChange={e => setRevenue(Number(e.target.value))} className={inputClass} />
            </div>

            {/* EBITDA slider */}
            <div>
              <label className={labelClass}>
                EBITDA Margin: <span className="text-ink font-medium">{ebitda}%</span>
              </label>
              <input type="range" min={5} max={35} value={ebitda}
                onChange={e => setEbitda(Number(e.target.value))} className="w-full accent-copper h-1.5" />
              <div className="flex justify-between font-body text-[11px] text-hint mt-0.5">
                <span>5%</span><span>35%</span>
              </div>
            </div>

            {/* Locations */}
            <div>
              <label className={labelClass}>Number of locations</label>
              <input type="number" min={1} max={50} value={locations}
                onChange={e => setLocations(Number(e.target.value))} className={inputClass} />
            </div>

            {/* Cuisine */}
            <div>
              <label className={labelClass}>Cuisine / positioning</label>
              <select value={cuisine} onChange={e => { setCuisine(e.target.value); setPrimeCost(null) }} className={inputClass}>
                {Object.values(cuisineMap).map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <p className="font-body text-xs text-hint mt-1.5 leading-relaxed" style={{ fontSize: '12px' }}>
                This engine scores against a Mediterranean/Italian consolidation thesis. Other cuisine formats require sector-specific calibration.
              </p>
            </div>

            {/* Founder age */}
            <div>
              <label className={labelClass}>
                Founder age <span className="text-hint/60">(optional)</span>
              </label>
              <input type="number" min={30} max={80} value={founderAge}
                onChange={e => setFounderAge(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="52" className={`${inputClass} placeholder:text-hint/40`} />
            </div>

            {/* Geography */}
            <div>
              <label className="font-body text-xs tracking-wider uppercase text-hint block mb-2">Geography</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-2">
                {metros.map(city => (
                  <button key={city} type="button" onClick={() => toggleCity(city)}
                    className={`px-2 md:px-3 py-2 md:py-1.5 rounded-md border text-[11px] md:text-xs font-body transition-all duration-150 ${
                      selectedCities.includes(city)
                        ? 'border-copper bg-copper/[0.06] text-copper'
                        : 'border-ink/10 text-muted hover:border-copper/30'
                    }`}
                  >{city}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced section */}
          <div className="mt-6 border-t border-ink/5 pt-5">
            <button
              onClick={() => setShowEnhanced(!showEnhanced)}
              className="flex items-center gap-2 font-body text-sm text-copper hover:text-copper-light transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                className={`transition-transform duration-200 ${showEnhanced ? 'rotate-90' : ''}`}>
                <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add operational detail for enhanced scoring
            </button>

            {showEnhanced && (
              <div className="mt-5 space-y-5">
                {/* Prime cost slider */}
                <div>
                  <label className={labelClass}>
                    Prime cost: <span className="text-ink font-medium">{effectivePrimeCost}%</span>
                  </label>
                  <input type="range" min={55} max={72}
                    value={effectivePrimeCost}
                    onChange={e => setPrimeCost(Number(e.target.value))}
                    className="w-full accent-copper h-1.5" />
                  <div className="flex justify-between font-body text-[11px] text-hint mt-0.5">
                    <span>55%</span><span>72%</span>
                  </div>
                </div>

                {/* Tech stack */}
                <div>
                  <label className={labelClass}>Tech stack</label>
                  <select value={techStatus} onChange={e => setTechStatus(e.target.value)} className={inputClass}>
                    {techOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Founder involvement */}
                <div>
                  <label className={labelClass}>Founder involvement</label>
                  <select value={founderInvolvement} onChange={e => setFounderInvolvement(e.target.value)} className={inputClass}>
                    {founderOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Management team */}
                <div>
                  <label className={labelClass}>Management team</label>
                  <select value={management} onChange={e => setManagement(e.target.value)} className={inputClass}>
                    {managementOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Lease cost slider */}
                <div>
                  <label className={labelClass}>
                    Lease cost (% of revenue): <span className="text-ink font-medium">{leaseCost}%</span>
                  </label>
                  <input type="range" min={5} max={14} step={0.5}
                    value={leaseCost}
                    onChange={e => setLeaseCost(Number(e.target.value))}
                    className="w-full accent-copper h-1.5" />
                  <div className="flex justify-between font-body text-[11px] text-hint mt-0.5">
                    <span>5%</span><span>14%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation + Submit */}
          {validationError && (
            <p className="mt-4 font-body text-sm text-score-low">{validationError}</p>
          )}
          <button onClick={handleScore}
            className="mt-4 md:mt-6 w-full px-6 py-3.5 md:py-3 bg-ink text-paper font-body text-sm tracking-wide rounded-card hover:bg-ink/90 transition-colors duration-200">
            Score This Deal
          </button>
        </div>
      ) : (
        <div>
          {score.loading && !score.result.circuit_breakers.length ? (
            <div className="mb-4 flex items-center gap-2">
              <div className="w-3 h-3 border border-copper border-t-transparent rounded-full animate-spin" />
              <span className="font-body text-sm text-hint">Generating investment memo...</span>
            </div>
          ) : null}

          <Scorecard
            result={score.result}
            dealName={score.dealName}
            dealRevenue={score.dealRevenue}
            dealMargin={score.dealMargin}
            dealData={score.dealData}
            memo={score.memo ?? undefined}
            disclaimer={score.enhanced
              ? "Enhanced assessment — 11 parameters. Undisclosed variables use conservative sector defaults."
              : "Quick assessment — 6 parameters. Undisclosed variables use conservative sector defaults. A complete analysis with full operational data refines the scoring by approximately 15\u201320 points of precision."
            }
          />

          <div className="mt-6 text-center">
            <button onClick={() => setScore(null)}
              className="px-6 py-2.5 border border-ink/10 rounded-card font-body text-sm text-muted hover:border-copper/40 hover:text-copper transition-colors duration-200">
              Score another deal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
