'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Scorecard from '@/components/Scorecard'
import ManualPath from '@/components/ManualPath'
import SyntheticPath from '@/components/SyntheticPath'
import ThesisFooter from '@/components/ThesisFooter'
import { preloadedDeals } from '@/data/preloadedDeals'
import { scoreDeal } from '@/lib/scoringEngine'
import type { ScoringResult } from '@/types/scoring'

type Path = 'demo' | 'manual' | 'synthetic' | null
type DemoState = { result: ScoringResult; dealName: string; dealRevenue: number; dealMargin: number; dealData: any; memo: string | null; loading: boolean } | null

const castellucciPreview = scoreDeal(preloadedDeals[0]) as ScoringResult

const paths = [
  {
    id: 'demo' as const,
    title: 'Run the demo',
    description: 'Castellucci, Trabocchi, and a thesis discipline test. See the full scoring output.',
    label: '3 real-world archetypes',
  },
  {
    id: 'manual' as const,
    title: 'Score your own deal',
    description: 'Enter key deal parameters. Expand for operational detail.',
    label: 'Quick + enhanced screening',
  },
  {
    id: 'synthetic' as const,
    title: 'Build me a deal',
    description: 'Generate a realistic restaurant group with correlated financials, then score it.',
    label: 'AI-generated CIM',
  },
]

const dimensionLabels: Record<string, string> = {
  d1: 'Thesis Alignment',
  d2: 'Financial Health',
  d3: 'Operational Readiness',
  d4: 'Key-Person Risk',
  d5: 'Value Creation',
}

function previewBarColor(score: number) {
  if (score >= 75) return 'bg-score-high'
  if (score >= 50) return 'bg-score-mid'
  return 'bg-score-low'
}

function previewTrackColor(score: number) {
  if (score >= 75) return 'bg-score-high/10'
  if (score >= 50) return 'bg-score-mid/10'
  return 'bg-score-low/10'
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <HomeContent />
    </Suspense>
  )
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const pathParam = searchParams.get('path') as Path
  const [selected, setSelected] = useState<Path>(pathParam)
  const [started, setStarted] = useState(!!pathParam)
  const [activeDealIdx, setActiveDealIdx] = useState<number | null>(null)
  const [demo, setDemo] = useState<DemoState>(null)
  const demoAutoLoaded = useRef(false)

  // Sync URL → state on popstate (browser back)
  useEffect(() => {
    const p = searchParams.get('path') as Path
    if (p) {
      setSelected(p)
      setStarted(true)
    } else {
      setStarted(false)
      setSelected(null)
      setDemo(null)
      setActiveDealIdx(null)
      demoAutoLoaded.current = false
    }
  }, [searchParams])

  function navigateTo(path: Path) {
    if (path) {
      router.push(`/?path=${path}`)
    } else {
      router.push('/')
    }
    setSelected(path)
    setStarted(!!path)
  }

  function handleContinue() {
    if (selected) navigateTo(selected)
  }

  function goToDemo(dealIdx?: number) {
    navigateTo('demo')
    if (dealIdx !== undefined) {
      runDeal(dealIdx)
    }
  }

  function goBack() {
    setDemo(null)
    setActiveDealIdx(null)
    demoAutoLoaded.current = false
    navigateTo(null)
  }

  // P4: Auto-load Castellucci when entering demo path
  useEffect(() => {
    if (selected === 'demo' && started && activeDealIdx === null && !demoAutoLoaded.current) {
      demoAutoLoaded.current = true
      runDeal(0)
    }
  }, [selected, started])

  async function runDeal(idx: number) {
    const deal = preloadedDeals[idx]
    const result = scoreDeal(deal) as ScoringResult
    setActiveDealIdx(idx)
    setDemo({ result, dealName: deal.name, dealRevenue: deal.revenue_M, dealMargin: deal.ebitda_margin_pct, dealData: deal, memo: null, loading: true })

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
        setDemo(prev => prev ? { ...prev, memo: data.memo ?? null, loading: false } : null)
      } catch {
        setDemo(prev => prev ? { ...prev, memo: '__timeout__', loading: false } : null)
      }
    } else {
      setDemo(prev => prev ? { ...prev, loading: false } : null)
    }
  }

  // ─── DEMO VIEW ───────────────────────────────────────────
  if (selected === 'demo' && started) {
    return (
      <main className="min-h-screen flex flex-col">
        <header className="border-b border-ink/5 px-5 md:px-6 py-4 flex items-center justify-between">
          <h1 className="font-display text-lg md:text-xl text-ink">Deal Intelligence Engine</h1>
          <button onClick={goBack} className="font-body text-sm text-hint hover:text-copper transition-colors">
            Back
          </button>
        </header>

        <div className="flex-1 px-4 md:px-6 py-6 md:py-8 max-w-5xl mx-auto w-full">
          <p className="font-body text-xs tracking-wider uppercase text-hint mb-4 md:mb-6">Select a deal to analyze</p>

          <div className="flex gap-2 md:gap-3 mb-6 md:mb-8 flex-wrap">
            {preloadedDeals.map((deal, idx) => (
              <button
                key={deal.name}
                onClick={() => runDeal(idx)}
                className={`px-3 md:px-4 py-2 md:py-2.5 rounded-card border text-left transition-all duration-200 ${
                  activeDealIdx === idx
                    ? 'border-copper bg-copper/[0.04]'
                    : 'border-ink/10 bg-white hover:border-copper/40'
                }`}
              >
                <span className="font-body text-xs md:text-sm text-ink block">{deal.name}</span>
                <span className="font-body text-[11px] md:text-xs text-hint">{deal.subtitle}</span>
              </button>
            ))}
          </div>

          {demo && (
            <div>
              {demo.loading && !demo.result.circuit_breakers.length ? (
                <div className="mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 border border-copper border-t-transparent rounded-full animate-spin" />
                  <span className="font-body text-sm text-hint">Generating investment memo...</span>
                </div>
              ) : null}
              <Scorecard result={demo.result} dealName={demo.dealName} dealRevenue={demo.dealRevenue} dealMargin={demo.dealMargin} dealData={demo.dealData} memo={demo.memo ?? undefined} />
            </div>
          )}
        </div>

        <ThesisFooter />
      </main>
    )
  }

  // ─── MANUAL / SYNTHETIC VIEW ─────────────────────────────
  if ((selected === 'manual' || selected === 'synthetic') && started) {
    return (
      <main className="min-h-screen flex flex-col">
        <header className="border-b border-ink/5 px-5 md:px-6 py-4 flex items-center justify-between">
          <h1 className="font-display text-lg md:text-xl text-ink">Deal Intelligence Engine</h1>
          <button onClick={goBack} className="font-body text-sm text-hint hover:text-copper transition-colors">
            Back
          </button>
        </header>

        <div className="flex-1 px-4 md:px-6 py-6 md:py-8">
          {selected === 'manual' ? <ManualPath /> : <SyntheticPath />}
        </div>

        <ThesisFooter />
      </main>
    )
  }

  // ─── LANDING VIEW ────────────────────────────────────────
  const previewFlags = castellucciPreview.flags.filter(f =>
    f.type === 'green' || f.type === 'amber'
  ).slice(0, 4)

  const previewClassification = castellucciPreview.composite >= 75
    ? { label: 'Strong Fit', color: 'text-score-high', bg: 'bg-score-high-bg' }
    : { label: 'Conditional', color: 'text-score-mid', bg: 'bg-score-mid-bg' }

  return (
    <main className="min-h-screen flex flex-col">
      <section className="flex flex-col items-center justify-center pt-14 md:pt-24 pb-10 md:pb-16 px-5 md:px-6">
        <p className="font-body text-xs md:text-sm tracking-widest uppercase text-hint mb-3 md:mb-4">
          Heritage Experience Platforms
        </p>
        <h1 className="font-display font-normal text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-ink text-center leading-tight tracking-tight">
          Deal Intelligence Engine
        </h1>
        <div className="mt-4 md:mt-5 w-12 border-t-2 border-copper/30" />
        <p className="font-body text-muted text-sm md:text-base lg:text-lg mt-4 md:mt-5 max-w-2xl text-center leading-relaxed">
          Your team screens 200+ CIMs per year to close 3 deals. This engine does the first-pass analysis in 30 seconds — scored against a calibrated investment thesis for premium hospitality.
        </p>
      </section>

      <section className="flex flex-col items-center px-5 md:px-6 pb-10 md:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 max-w-4xl w-full">
          {paths.map((path) => {
            const isDemo = path.id === 'demo'
            const isSelected = selected === path.id
            return (
              <button
                key={path.id}
                onClick={() => setSelected(path.id)}
                className={`
                  group text-left p-4 md:p-6 rounded-card transition-all duration-200 border
                  ${isSelected
                    ? 'border-copper bg-copper/[0.04]'
                    : isDemo
                    ? 'border-copper/40 bg-white hover:border-copper'
                    : 'border-ink/10 bg-white hover:border-copper/40'
                  }
                `}
              >
                <span className="inline-block font-body text-[11px] tracking-wider uppercase text-hint mb-3">
                  {path.label}
                </span>
                <h2 className="font-display text-xl md:text-2xl font-normal text-ink mb-2 leading-snug">
                  {path.title}
                </h2>
                <p className="font-body text-sm text-muted leading-relaxed">
                  {path.description}
                </p>
                <div className={`
                  mt-4 flex items-center gap-1.5 text-sm font-body transition-colors duration-200
                  ${isSelected ? 'text-copper' : isDemo ? 'text-copper' : 'text-hint group-hover:text-copper'}
                `}>
                  <span>{isSelected ? 'Selected' : isDemo ? 'Recommended' : 'Select'}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-px">
                    <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
            )
          })}
        </div>

        {selected && (
          <button
            onClick={handleContinue}
            className="mt-6 md:mt-8 w-full md:w-auto px-8 py-3.5 md:py-3 bg-ink text-paper font-body text-sm tracking-wide rounded-card hover:bg-ink/90 transition-colors duration-200"
          >
            Continue
          </button>
        )}
      </section>

      <section className="px-5 md:px-6 pb-12 md:pb-16">
        <div className="max-w-2xl mx-auto">
          <p className="font-body text-xs tracking-wider uppercase text-hint mb-5 text-center">See the output</p>

          <div className="border border-ink/10 rounded-card p-4 md:p-6 bg-white">
            <div className="flex items-start justify-between gap-3 md:gap-4 mb-4">
              <div>
                <h3 className="font-display text-lg md:text-xl text-ink">{preloadedDeals[0].name}</h3>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-body mt-1.5 ${previewClassification.color} ${previewClassification.bg}`}>
                  {previewClassification.label}
                </span>
              </div>
              <div className="text-right">
                <span className="font-display text-3xl md:text-4xl leading-none text-ink">{castellucciPreview.composite}</span>
                <span className="font-body text-xs text-hint block mt-0.5">/100</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {(Object.entries(castellucciPreview.dimensions) as [string, number][]).map(([key, score]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-body text-xs text-muted">{dimensionLabels[key]}</span>
                    <span className="font-body text-xs text-hint tabular-nums">{score}</span>
                  </div>
                  <div className={`h-1.5 rounded-full ${previewTrackColor(score)}`}>
                    <div className={`h-1.5 rounded-full ${previewBarColor(score)}`} style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {previewFlags.map((flag, i) => (
                <span key={i} className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-body ${
                  flag.type === 'green' ? 'text-score-high bg-score-high-bg' :
                  flag.type === 'amber' ? 'text-score-mid bg-score-mid-bg' :
                  'text-score-low bg-score-low-bg'
                }`}>{flag.text}</span>
              ))}
            </div>

            <button
              onClick={() => goToDemo(0)}
              className="mt-5 w-full px-6 py-2.5 bg-ink text-paper font-body text-sm tracking-wide rounded-card hover:bg-ink/90 transition-colors duration-200"
            >
              Run the full analysis &rarr;
            </button>
          </div>
        </div>
      </section>

      <ThesisFooter />
    </main>
  )
}
