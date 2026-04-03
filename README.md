# Deal Intelligence Engine

AI-powered deal screening for premium hospitality investments. Built on the [Heritage Experience Platforms](/) consolidation thesis.

**Production:** https://deal-intelligence-engine-eight.vercel.app

## What it does

Screens restaurant group acquisitions against a calibrated investment thesis in under 30 seconds. Three paths:

1. **Run the demo** — Three real-world archetypes: Castellucci (Strong Fit), Trabocchi (Conditional), Maple & Ash (Circuit Breaker). Castellucci auto-loads on entry.
2. **Score your own deal** — Quick screen (6 fields) or enhanced assessment (11 fields) with operational detail. Conservative defaults for undisclosed parameters.
3. **Build me a deal** — Generate a synthetic CIM with correlated financials and realistic red flags, then score it.

## Scorecard output

Every scored deal produces:

- **One-line verdict** — Deterministic summary (e.g., "STRONG FIT — $55M Mediterranean across 3 metros, margin expansion potential 300bps")
- **Radar chart** — SVG pentagon comparing deal shape to thesis target (80/axis)
- **5 dimension scores** — Thesis Alignment, Financial Health, Operational Readiness, Key-Person Risk, Value Creation — with benchmark markers at the Strong Fit threshold
- **FDI v2.0** — Founder Dependency Index with proxy adjustments (GM tenure, CFO, AvT) and readiness assessment
- **Investment memo** — AI-generated narrative (Gemini 2.5 Flash), IC-ready language
- **Margin expansion** — Quantified in bps and dollars, source breakdown
- **Entry economics** — Implied EBITDA, EV, equity required, MOIC sensitivity table (6.5x / 7.0x / 7.5x entry)
- **Deployment timeline** — Estimated time-to-value based on tech stack and value creation type
- **DD priorities** — Top 3 due diligence items, pattern-matched from amber/red flags
- **Score improvement levers** — "What would fix this deal" — clones deal, mutates variables, shows composite delta
- **Deal summary card** — Compact executive summary for print
- **Print/export** — Browser-native print with print stylesheet (A4, summary card first)

## Circuit breakers

Deals that fall outside thesis parameters are rejected with discipline, not silence:

- **CB-1**: Cuisine not Mediterranean/Italian → Pass
- **CB-2**: Revenue < $25M → Reclassify as add-on candidate
- **CB-3**: FDI >= 6 AND readiness = low → Pass
- **CB-4**: Active litigation → Suspended

## Scoring model

5 dimensions, calibrated via backtesting against 13 adversarial deal scenarios (Deal Tribunal method, 100% accuracy):

| Dimension | Weight |
|---|---|
| Thesis Alignment | 25% |
| Financial Health | 25% |
| Operational Readiness | 20% |
| Key-Person Risk (FDI v2.0) | 15% |
| Value Creation Potential | 15% |

The scoring engine is fully deterministic — no LLM in the scoring loop. Gemini generates narrative only.

## Tech stack

- **Framework:** Next.js 14 (App Router)
- **Hosting:** Vercel (serverless + static)
- **Narrative AI:** Gemini 2.5 Flash via @google/genai
- **Scoring:** Pure JavaScript, deterministic
- **Styling:** Tailwind CSS 3.4 + custom design system (tokens.css)
- **Typography:** Cormorant Garamond (display) + DM Sans (body)

## Development

```bash
npm install
npm run dev     # Start dev server (http://localhost:3000)
npm test        # Run scoring engine tests (13/13 required)
```

## Environment variables

```
GEMINI_API_KEY=your_google_ai_key
```

Set in `.env.local` for development. In Vercel: Settings > Environment Variables (all environments, sensitive).

## URL routing

| URL | View |
|-----|------|
| `/` | Landing (hero + path cards + scorecard preview) |
| `/?path=demo` | Demo path (auto-loads Castellucci) |
| `/?path=manual` | Manual input (quick + enhanced) |
| `/?path=synthetic` | Synthetic CIM generator |
| `/demo`, `/manual`, `/synthetic` | 307 redirects to query param versions |

## Project context

This engine is part of a portfolio demonstrating operational transformation and AI deployment for PE-backed hospitality companies. It runs on the Heritage Experience Platforms thesis: buy independently owned Mediterranean restaurant groups at 5.5-7.0x, professionalize with AI, exit at 10.0x.

The scoring intelligence is sector-calibrated. The architecture is portable.

---

*This demo runs on synthetic data calibrated to sector benchmarks. The production version processes full CIMs and broker teasers. Available for live demo on request.*
