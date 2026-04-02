# Deal Intelligence Engine

AI-powered deal screening for premium hospitality investments. Built on the [Heritage Experience Platforms](/) consolidation thesis.

## What it does

Screens restaurant group acquisitions against an investment thesis in under 30 seconds. Three modes:

1. **Guided demo** — Pre-loaded deals with real public data (Castellucci HG, Trabocchi, Maple & Ash)
2. **Manual input** — Enter 6 parameters from a deal in your pipeline, get a scored assessment
3. **Synthetic CIM** — Generate a realistic restaurant group profile calibrated to sector benchmarks

## Architecture

```
User Input → Data Normalizer → Scoring Engine (deterministic JS) → Narrative Layer (Gemini 2.0 Flash) → Scorecard
```

The scoring engine is fully deterministic — no LLM in the scoring loop. The LLM generates the narrative mini-memo and flag context only.

### Scoring model

5 dimensions, calibrated via backtesting against 13 adversarial deal scenarios (Deal Tribunal method):

| Dimension | Weight | What it measures |
|---|---|---|
| Thesis Alignment | 25% | Cuisine, revenue band, geography, cap table |
| Financial Health | 25% | Margins, prime cost, SSG, lease cost, seasonality |
| Operational Readiness | 20% | Tech stack, AvT variance, labor model, CFO quality |
| Key Person Risk (FDI v2.0) | 15% | Structural dependency × transitional readiness |
| Value Creation Potential | 15% | Margin expansion, speed to deployment, add-on viability |

Includes 5 circuit breakers, 8 non-linear modifiers, and a proprietary Founder Dependency Index (FDI v2.0) with proxy validation.

### Tech stack

- **Framework:** Next.js 14 (App Router)
- **Hosting:** Vercel
- **LLM:** Gemini 2.0 Flash (~$0.001 per analysis)
- **Scoring:** Pure JavaScript (no LLM dependency)
- **Styling:** Tailwind CSS
- **Typography:** Cormorant Garamond + DM Sans

## Development

```bash
npm install
npm run dev     # Start dev server
npm test        # Run scoring engine tests (13 deals, 100% accuracy required)
```

## Scoring engine tests

```bash
$ npm test

  ✓ # 1 Oleander House   Score: 74 → conditional
  ✓ # 2 Porto Copper     Score:  0 → pass          [CB-1: cuisine]
  ✓ # 3 Fig & Marble     Score: 59 → conditional
  ...
  Results: 13 passed, 0 failed (100%)
  ✓ ALL TESTS PASSED
```

## Project context

This engine is part of a portfolio demonstrating operational transformation and AI deployment for PE-backed hospitality companies. It runs on the Heritage Experience Platforms thesis: buy independently owned Mediterranean restaurant groups at 5.5–7.0x, professionalize with AI, exit at 10.0x.

The scoring intelligence is sector-calibrated. The architecture is portable.

---

*This demo runs on synthetic data calibrated to sector benchmarks. The production version processes full CIMs and broker teasers. Available for live demo on request.*
