'use client'

import type { ScoringResult, Flag } from '@/types/scoring'

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

interface ScorecardProps {
  result: ScoringResult
  dealName: string
  memo?: string
}

export default function Scorecard({ result, dealName, memo }: ScorecardProps) {
  const classification = classificationLabels[result.classification] ?? classificationLabels.pass

  // Circuit breaker early return
  if (result.circuit_breakers.length > 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="border border-ink/10 rounded-card p-6 bg-white">
          <h2 className="font-display text-2xl text-ink mb-1">{dealName}</h2>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-body ${classification.color} ${classification.bg} mt-2`}>
            {classification.label}
          </div>
          <div className="mt-6 space-y-3">
            {result.circuit_breakers.map((cb) => (
              <div key={cb.id} className="flex items-start gap-3 p-3 rounded-md bg-score-low-bg">
                <span className="text-score-low font-body text-xs font-medium mt-0.5">{cb.id}</span>
                <p className="text-sm text-ink font-body leading-relaxed">{cb.rule}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header + Score */}
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
      </div>

      {/* Dimension Bars */}
      <div className="border border-ink/10 rounded-card p-6 bg-white">
        <h3 className="font-body text-xs tracking-wider uppercase text-hint mb-4">Dimension Scores</h3>
        <div className="space-y-3">
          {(Object.entries(result.dimensions) as [string, number][]).map(([key, score]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-body text-sm text-ink">{dimensionLabels[key]}</span>
                <span className="font-body text-sm text-muted tabular-nums">{score}</span>
              </div>
              <div className={`h-2 rounded-full ${scoreTrackColor(score)}`}>
                <div
                  className={`h-2 rounded-full ${scoreColor(score)} transition-all duration-500`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

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
            <span className="font-body text-sm text-hint mx-1">·</span>
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
    </div>
  )
}
