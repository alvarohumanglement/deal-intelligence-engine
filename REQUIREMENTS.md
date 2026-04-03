# Deal Intelligence Engine — Requirements, Implementation Status & User Narrative

Last updated: 2026-04-03
Production: https://deal-intelligence-engine-eight.vercel.app
Tests: 13/13 Deal Tribunal scenarios (100% accuracy)

---

## 0. The User: Who This Is Built For

The primary user is a **Managing Director at a lower middle-market PE firm** focused on premium hospitality. This person:

- Screens 200+ CIMs per year to close 2-3 deals
- Has seen every pitch deck trick — knows when numbers don't add up
- Reads memos, not dashboards. Thinks in MOIC, not charts.
- Trusts discipline over enthusiasm. A tool that says "pass" on the wrong deal earns more credibility than one that says "advance" on every deal.
- Has 90 seconds of attention before deciding if this is serious or a toy
- Does NOT want to be "educated" about PE — they ARE PE. The tool should speak their language, not explain their language to them.
- Judges credibility by what the tool chooses NOT to show (e.g., circuit breakers that reject deals demonstrate thesis conviction)

### The MD's journey through the engine:

1. **Landing** — Reads "200+ CIMs per year to close 3 deals." Copper rule separates title from subtitle. Recognizes their own reality. Below the path cards, a pre-rendered Castellucci scorecard (composite, bars, flags) shows the output before they click anything.
2. **Demo** — Clicks "Run the full analysis" or selects "Run the demo" (labeled "3 real-world archetypes", visually recommended). Castellucci auto-loads. Full scorecard: one-line verdict, radar chart, dimension bars with 75-threshold markers, FDI v2.0 panel, flags, Gemini memo, margin expansion, entry economics with MOIC sensitivity, deployment timeline, DD priorities, score improvement levers, deal summary card. "This is what I would have told my associate to produce — but it took 30 seconds."
3. **Maple & Ash** — Circuit breaker fires. One-line verdict: "PASS — Cuisine positioning outside thesis parameters. Scoring not applicable." Red card with thesis discipline copy. "Good — this thing has conviction."
4. **Manual input** — 6 quick fields (cuisine dropdown: only Med/Italian/Med&Italian — thesis-aligned). Expand for 5 enhanced fields (prime cost, tech, founder involvement, management, lease). Score sharpens. Disclaimer: "15-20 points of precision."
5. **Synthetic** — "No NDA required. Build me a deal." Correlated CIM appears. Click Analyze. Full scorecard. "Whoever built this understands the space."
6. **Export** — "Export scorecard" button. Print dialog. Summary card appears first. A4 layout, professional. Shareable.
7. **Thesis footer** — Every path: "This engine runs on the Heritage Experience Platforms thesis — 5.5-7.0x entry." Three CTA links. Footer: "This demo runs on synthetic data calibrated to sector benchmarks."

### What the MD does NOT want to see:

- Technical jargon ("deterministic", "API", "algorithm")
- Feature descriptions ("powered by AI", "machine learning")
- Excessive UI chrome, animations, or visual noise
- Dark mode, gradients, or anything that looks like a SaaS dashboard
- Explanations of what PE is or how scoring works — they know

---

## 1. Architecture Overview

| Layer | Technology | Status |
|-------|-----------|--------|
| Framework | Next.js 14 (App Router) | Implemented |
| Styling | Tailwind CSS 3.4 + tokens.css design system | Implemented |
| Scoring | Deterministic JS engine (no LLM dependency) | Implemented, 13/13 tests |
| Narrative | Gemini 2.5 Flash via @google/genai | Implemented |
| Hosting | Vercel (serverless + static) | Deployed |
| TypeScript | Strict mode, full type coverage | Implemented |

### File Map

```
src/
├── app/
│   ├── layout.tsx              — Root layout, globals.css, OG meta tags
│   ├── page.tsx                — Landing + all path views (URL-routed via ?path=)
│   ├── globals.css             — Tailwind directives + tokens.css + print stylesheet
│   ├── tokens.css              — Design system: colors, fonts, spacing, radii
│   ├── demo/page.tsx           — Redirect → /?path=demo
│   ├── manual/page.tsx         — Redirect → /?path=manual
│   ├── synthetic/page.tsx      — Redirect → /?path=synthetic
│   └── api/analyze/route.ts    — POST: Gemini memo generation + rate limiting
├── components/
│   ├── Scorecard.tsx           — Full scorecard (verdict, radar, dims, FDI, memo, econ, DD, levers, summary, print)
│   ├── ManualPath.tsx          — Path 2: two-level form (6 quick + 5 enhanced), thesis-aligned cuisine
│   ├── SyntheticPath.tsx       — Path 3: CIM generator + card + analyze flow
│   └── ThesisFooter.tsx        — Shared footer: thesis statement + 3 CTA links + disclaimer
├── lib/
│   ├── scoringEngine.js        — Core scoring (export scoreDeal)
│   └── syntheticGenerator.js   — CIM generator (export generateSyntheticDeal)
├── data/
│   ├── scoringConfig.json      — Weights, thresholds, circuit breakers, FDI matrix
│   └── preloadedDeals.js       — 3 demo deals (Castellucci, Trabocchi, Maple & Ash)
└── types/
    └── scoring.ts              — TypeScript interfaces for all scoring I/O
tests/
├── scoringEngine.test.js       — 13 Deal Tribunal scenarios, 100% accuracy
├── generator.test.js           — Synthetic generator tests
└── _syntheticGenerator.cjs     — CJS wrapper for generator tests
```

---

## 2. Design System (tokens.css)

Light mode only. No dark mode. No gradients. No shadows. Warm, editorial, quiet confidence.

### Colors

| Token | Value | Used for |
|-------|-------|----------|
| `--ink` | `#1a1a18` | Primary text, primary buttons |
| `--paper` | `#faf9f6` | Page background |
| `--paper-warm` | `#f5f2ed` | Thesis footer, entry economics, deployment timeline, summary card |
| `--muted` | `#6b6862` | Secondary text, descriptions |
| `--hint` | `#9c9a92` | Labels, captions, tertiary text |
| `--copper` | `#9a7b4f` | Accent, CTAs, selected states, value creation badge, radar thesis target, benchmark markers |
| `--score-high` | `#2d5a47` | Green: scores 75+, positive flags |
| `--score-mid` | `#8b6c2f` | Amber: scores 50-74, conditional flags |
| `--score-low` | `#8b3a2f` | Red: scores <50, negative flags, circuit breakers |

### Typography

| Token | Value | Used for |
|-------|-------|----------|
| `--font-display` | Cormorant Garamond | Headings, score numbers, memo text, deal names, MOIC figures |
| `--font-body` | DM Sans | All UI: labels, buttons, flags, form fields, descriptions, verdicts |

### Component patterns

| Pattern | Implementation |
|---------|---------------|
| Cards | `border-ink/10 rounded-card p-6 bg-white` (border 0.5px, radius 12px, padding 24px) |
| Primary button | `bg-ink text-paper rounded-card` |
| CTA button | `border-copper text-copper rounded-card` |
| Selected state | `border-copper bg-copper/[0.04]` |
| Mini-memo | `border-l-2 border-copper pl-5`, Cormorant Garamond |
| Flag pills | `rounded-full`, score-colored background per type, gap-2 (8px) |
| Surface panel | `bg-paper-warm rounded-card p-6` (entry economics, timeline, summary) |
| Benchmark marker | `border-l border-dashed border-copper/50` at 75% position on dimension bars |

---

## 3. Scoring Engine (`scoringEngine.js`)

Fully deterministic. No LLM dependency. The LLM (Gemini) only generates the narrative memo downstream.

### 3.1 Input / Output

- **Input**: DealInput (22 fields — see `types/scoring.ts`)
- **Output**: ScoringResult (composite 0-100, classification, 5 dimension scores, flags, circuit_breakers, fdi_v2, margin_expansion, deal_structure_advisory, value_creation_type)

### 3.2 Five dimensions (weighted composite)

| Dim | Name | Weight | Scores |
|-----|------|--------|--------|
| D1 | Thesis Alignment | 25% | Cuisine, revenue band, geography, avg check, cap table |
| D2 | Financial Health | 25% | EBITDA margin, prime cost, SSG, lease cost, seasonality, RPL |
| D3 | Operational Readiness | 20% | Tech stack, AvT variance, CFO, seasonality/MESA |
| D4 | Key-Person Risk | 15% | FDI v2.0 matrix (proxy-adjusted), geographic amplifier |
| D5 | Value Creation | 15% | Margin room, prime cost lever, tech speed, platform, expansion history |

### 3.3 Classifications

| Classification | Range | MD reads it as |
|---------------|-------|----------------|
| `strong_fit` | 75-100 | "Advance to IC" |
| `conditional` | 50-74 | "Advance with DD conditions" |
| `below_thesis` | 25-49 | "Review required — probably not" |
| `pass` | 0-24 | "Outside thesis — don't waste time" |

### 3.4 Circuit breakers, FDI v2.0, composite modifiers, value creation typing

Unchanged from scoring engine. See `scoringEngine.js` and `scoringConfig.json` for full logic.

### 3.5 Test suite

13 Deal Tribunal scenarios, 100% accuracy. Run: `node tests/scoringEngine.test.js`.

---

## 4. Landing Page (`page.tsx`)

### 4.1 Hero

- Kicker: "Heritage Experience Platforms" (uppercase, tracking-widest, hint)
- Title: "Deal Intelligence Engine" (Cormorant Garamond, 60px)
- Copper rule: 48px wide, 2px height, 30% opacity — between title and subtitle
- Subtitle: "Your team screens 200+ CIMs per year to close 3 deals. This engine does the first-pass analysis in 30 seconds — scored against a calibrated investment thesis for premium hospitality."

### 4.2 Path selector (3 cards, gap 16px)

| Card | Visual priority | Label | Description |
|------|----------------|-------|-------------|
| Run the demo | Primary — copper border, "Recommended" | "3 real-world archetypes" | "Castellucci, Trabocchi, and a thesis discipline test. See the full scoring output." |
| Score your own deal | Secondary | "Quick + enhanced screening" | "Enter key deal parameters. Expand for operational detail." |
| Build me a deal | Secondary | "AI-generated CIM" | "Generate a realistic restaurant group with correlated financials, then score it." |

### 4.3 Scorecard preview (static)

Pre-rendered Castellucci: composite score, classification badge, 5 dimension bars (h-1.5), 4 flags (green + amber). CTA: "Run the full analysis →" → `/?path=demo` with Castellucci auto-selected.

### 4.4 URL routing

- `/` → Landing
- `/?path=demo` → Demo (Castellucci auto-loaded)
- `/?path=manual` → Manual input
- `/?path=synthetic` → Synthetic CIM
- `/demo`, `/manual`, `/synthetic` → 307 redirects
- Browser back works (useSearchParams sync)

### 4.5 Thesis footer (all views)

- Paper-warm background, py-48px
- Thesis copy: "...consolidation framework targeting independently owned Mediterranean restaurant groups at 5.5-7.0x entry."
- 3 copper CTA buttons: thesis / playbook / case study (placeholder `#`)
- Footer line: "This demo runs on synthetic data calibrated to sector benchmarks. The production version processes full CIMs and broker teasers. Available for live demo on request."

---

## 5. Path 1 — Demo

- Castellucci auto-loads on entry (no click required)
- 3 deal tabs: Castellucci (Strong Fit), Trabocchi (Conditional), Maple & Ash (CB-1)
- Click tab → instant scoring + async Gemini memo
- Full Scorecard rendered (see section 9)

---

## 6. Path 2 — Manual Input (`ManualPath.tsx`)

### Cuisine dropdown (thesis-aligned)

3 options only: Mediterranean, Italian, Mediterranean & Italian.
Caption: "This engine scores against a Mediterranean/Italian consolidation thesis. Other cuisine formats require sector-specific calibration."

### Two-level form

**Quick screen (6 fields):** Revenue, EBITDA margin (slider), Locations, Cuisine, Founder age (optional), Geography (14 metros multi-select)

**Enhanced scoring (5 additional, collapsed by default, expandable via chevron):** Prime cost (slider 55-72%), Tech stack (dropdown), Founder involvement (dropdown → FDI 2/4/6), Management team (dropdown → has_pro_cfo + FDI adj), Lease cost (slider 5-14%)

All sliders show current value inline. Cuisine-derived defaults for undisclosed parameters. `avg_check` fixed at 68 (thesis-aligned).

### Output

Same Scorecard + disclaimer:
- Quick: "Quick assessment — 6 parameters. ...refines the scoring by approximately 15-20 points of precision."
- Enhanced: "Enhanced assessment — 11 parameters. Undisclosed variables use conservative sector defaults."

---

## 7. Path 3 — Synthetic CIM (`SyntheticPath.tsx`)

1. CTA: "No NDA required. Build me a deal." (copper border-2, centered, prominent)
2. CIM card: deal name in Cormorant Garamond, "Synthetic" badge, 3x3 metric grid, red flags, secondary metrics
3. "Analyze This Deal" → full Scorecard + Gemini memo
4. "Generate Another" → regenerate (before and after analysis)

---

## 8. API Route (`/api/analyze`)

| Aspect | Detail |
|--------|--------|
| Method | POST |
| Input | `{ deal, scores }` |
| Output | `{ memo }` (120-150 words) |
| Model | `gemini-2.5-flash` |
| SDK | `@google/genai` (GoogleGenAI) |
| System prompt | Senior PE analyst, IC-ready, third person, no bullets, Goldman MD tone |
| Config | maxOutputTokens 512, temp 0.7, thinkingBudget 0 |
| Rate limit | 10 req/IP/hour (in-memory Map), 429 on exceed |
| Error handling | 400 (missing data), 429 (rate limit), 500 (Gemini failure) |

---

## 9. Scorecard Component — Full Section Inventory

The Scorecard (`Scorecard.tsx`) is the shared output component used by all three paths. It receives `ScoringResult` + optional `dealRevenue`, `dealMargin`, `dealData`, `memo`, `disclaimer`.

### Sections rendered (top to bottom):

| # | Section | Condition | What the MD sees |
|---|---------|-----------|-----------------|
| 1 | **One-line verdict** | Always | Deterministic summary: "STRONG FIT — $55M Mediterranean across 3 metros, margin expansion potential 300bps. No critical risk factors identified." DM Sans 500, 15px. |
| 2 | **Header + composite** | Always | Deal name, classification badge, score in 48px Cormorant |
| 3 | **Value creation badge** | If `value_creation_type` exists | Copper pill with tooltip: "Margin expansion" / "Platform acceleration" / "Hybrid" |
| 4 | **Radar chart** | Always | SVG pentagon (280px). Thesis target (80/axis, copper dashed) vs deal actual (score-colored). 5 axis labels. |
| 5 | **Dimension bars** | Always | 5 bars, score-colored, with copper dashed benchmark marker at 75% (Strong Fit threshold) |
| 6 | **FDI v2.0 panel** | If `fdi_v2` exists | Declared → adjusted / 8, proxy pills, readiness badge |
| 7 | **Flags** | Always | Green/amber/red pills, gap 8px |
| 8 | **Investment memo** | If `memo` passed | Gemini narrative, Cormorant Garamond, border-l-2 copper, pl-20px |
| 9 | **Margin expansion** | If exists | bps + $M headline, source breakdown table |
| 10 | **Deal structure advisory** | If advisories exist | FDI mitigation, cap table, CFO hire, debt |
| 11 | **Entry economics** | If `dealRevenue` + `dealMargin` | Paper-warm. EBITDA, EV, equity. MOIC sensitivity (3 rows). Thesis assumptions footnote. |
| 12 | **Deployment timeline** | If `dealData` + `value_creation_type` | Paper-warm. Time-to-value based on tech_status x value_creation_type. Playbook benchmarks footnote. |
| 13 | **DD priorities** | If flags match patterns | Top 3 items, severity-sorted (red first), pattern-matched from 10 regex rules |
| 14 | **Score improvement levers** | If composite < 75 + `dealData` | "What would fix this deal" — clones deal, mutates 1 variable, re-scores, shows top 3 by delta |
| 15 | **Deal summary card** | If `dealData` | Paper-warm. Compact exec summary: name, classification, metrics, scores (D1-D5 inline), value creation type, margin expansion, timeline, MOIC, verdict. Prints first via CSS order:-1. |
| 16 | **Export button** | Always | "Export scorecard" with printer SVG. `window.print()`. |
| 17 | **Disclaimer** | If passed | Assessment basis (quick vs enhanced, parameter count) |

### Circuit breaker display (alternate render):

1. One-line verdict (before red card): "PASS — [CB rule]. Scoring not applicable."
2. Red-bordered card (border-2 score-low, bg score-low-bg): "Circuit breaker triggered" header, CB IDs + rules, sector-specific copy.

### Score improvement levers (Section 14):

6 mutations tested: prime_cost → 60%, tech → active, FDI -2 + high readiness, EBITDA +4pp, lease → 8%, pro CFO. Each clones deal, re-runs `scoreDeal()`, computes delta. Top 3 by delta shown as: "If [description] → composite moves from X to Y (+Z points)".

### Print stylesheet (`globals.css @media print`):

- Hides: header, footer, buttons, inputs, ThesisFooter, spinners, disclaimer (`.no-print`)
- Shows: all scorecard sections
- Summary card: `order: -1` (prints first as executive summary)
- Footer: CSS `::after` — "Deal Intelligence Engine — Heritage Experience Platforms — [date]"
- Page: `@page { margin: 20mm; size: A4 }`, body 12px, `print-color-adjust: exact`

---

## 10. Meta & SEO

- `og:title`: "Deal Intelligence Engine"
- `og:description`: "First-pass deal analysis in 30 seconds — scored against a calibrated investment thesis for premium hospitality."
- `og:type`: website
- `og:siteName`: "Heritage Experience Platforms"
- `twitter:card`: summary_large_image
- No OG image (placeholder)

---

## 11. What Is NOT Implemented

| Feature | Status | Impact |
|---------|--------|--------|
| Responsive / mobile | PARTIAL | Grid collapses. Not phone-optimized. MDs use desktop/tablet. |
| Dark mode | EXCLUDED | By design. Light only. |
| Authentication | NONE | Public demo/pitch tool. |
| Thesis/playbook/case study links | PLACEHOLDER (#) | Footer CTAs don't navigate yet. |
| Deal persistence / history | NONE | Ephemeral. No database. |
| Deal comparison | NOT IMPLEMENTED | Cannot compare two deals side-by-side. |
| Analytics / tracking | NONE | No usage metrics. |
| Error boundaries | NONE | API failure = memo doesn't appear (silent). |
| Loading skeleton | NONE | Spinner text only during memo gen. |
| Accessibility | PARTIAL | Semantic HTML. No ARIA, no keyboard nav testing. |
| OG image | PLACEHOLDER | No social preview image. |
| Input validation | PARTIAL | HTML min/max only. No JS enforcement. |

---

## 12. Known Technical Debt

1. **ESM import assertion**: `scoringEngine.js` uses `assert { type: 'json' }` (deprecated → `with`). Works in Next.js 14.
2. **Test suite is CJS**: Inlines scoring logic. Changes must be mirrored manually.
3. **No unified deal type**: Components define deal shapes independently. Should converge on `DealInput`.
4. **Static preview at module level**: `scoreDeal(preloadedDeals[0])` runs at import time.
5. **No input validation**: ManualPath accepts out-of-range values.
6. **Gemini build warning**: "API key should be set" during build. Harmless.
7. **`deal-engine/` subdirectory**: Dead weight in git.
8. **Rate limiter in-memory**: Resets on serverless cold start. Adequate for demo.
9. **`dealData` prop is `any`**: Scorecard accepts untyped deal object for improvement levers and timeline.

---

## 13. Deployment

| Setting | Value |
|---------|-------|
| Platform | Vercel |
| Framework | Next.js (via `vercel.json`) |
| Production URL | https://deal-intelligence-engine-eight.vercel.app |
| Env vars | `GEMINI_API_KEY` (sensitive, all environments) |
| Build | `npm run build` → `next build` |
| Routes | `/` (static), `/?path=*` (client), `/api/analyze` (serverless), `/demo` `/manual` `/synthetic` (307 redirects) |
