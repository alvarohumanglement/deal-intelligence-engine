'use client'

import { useState } from 'react'

type Path = 'demo' | 'manual' | 'synthetic' | null

const paths = [
  {
    id: 'demo' as const,
    title: 'Run the demo',
    description: 'Three real-world archetypes scored and analyzed. See the engine in action.',
    label: '3 pre-loaded deals',
  },
  {
    id: 'manual' as const,
    title: 'Score your own deal',
    description: 'Input key deal parameters and get an instant IC-ready scorecard.',
    label: '6 key inputs',
  },
  {
    id: 'synthetic' as const,
    title: 'Build me a deal',
    description: 'Generate a synthetic CIM with correlated financials, then score it.',
    label: 'AI-generated CIM',
  },
]

export default function Home() {
  const [selected, setSelected] = useState<Path>(null)

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center pt-24 pb-16 px-6">
        <p className="font-body text-sm tracking-widest uppercase text-hint mb-4">
          Heritage Experience Platforms
        </p>
        <h1 className="font-display font-normal text-5xl md:text-6xl text-ink text-center leading-tight tracking-tight">
          Deal Intelligence Engine
        </h1>
        <p className="font-body text-muted text-base md:text-lg mt-4 max-w-xl text-center leading-relaxed">
          AI-powered screening for premium hospitality investments.
          <br className="hidden md:block" />
          Deterministic scoring. Narrative intelligence. IC-ready output.
        </p>
        <div className="mt-6 w-12 border-t border-copper/30" />
      </section>

      {/* Path Selector */}
      <section className="flex-1 flex flex-col items-center px-6 pb-24">
        <p className="font-body text-sm text-muted mb-8">Choose a path</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {paths.map((path) => (
            <button
              key={path.id}
              onClick={() => setSelected(path.id)}
              className={`
                group text-left p-6 rounded-card transition-all duration-200
                border hover:border-copper/40
                ${selected === path.id
                  ? 'border-copper bg-copper/[0.04]'
                  : 'border-ink/10 bg-white'
                }
              `}
            >
              <span className="inline-block font-body text-[11px] tracking-wider uppercase text-hint mb-3">
                {path.label}
              </span>
              <h2 className="font-display text-2xl font-normal text-ink mb-2 leading-snug">
                {path.title}
              </h2>
              <p className="font-body text-sm text-muted leading-relaxed">
                {path.description}
              </p>
              <div className={`
                mt-4 flex items-center gap-1.5 text-sm font-body transition-colors duration-200
                ${selected === path.id ? 'text-copper' : 'text-hint group-hover:text-copper'}
              `}>
                <span>{selected === path.id ? 'Selected' : 'Select'}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-px">
                  <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* CTA */}
        {selected && (
          <button className="mt-10 px-8 py-3 bg-ink text-paper font-body text-sm tracking-wide rounded-card hover:bg-ink/90 transition-colors duration-200">
            Continue
          </button>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-ink/5 py-6 text-center">
        <p className="font-body text-xs text-hint">
          Deal Intelligence Engine v1.0 — Heritage Experience Platforms
        </p>
      </footer>
    </main>
  )
}
