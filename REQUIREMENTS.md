# Deal Intelligence Engine — Requirements, Implementation Status & User Narrative

Last updated: 2026-04-04 (v1.0 final)
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

1. **Landing** → Reads the subtitle ("200+ CIMs per year to close 3 deals"). Recognizes their own reality. Doesn't need convincing — wants to see the output.
2. **Preview** → Sees a pre-rendered scorecard (Castellucci, composite 78, dimension bars, flags). Immediately understands the output format without clicking anything.
3. **Demo** → Clicks "Run the full analysis" or selects "Run the demo" path. Castellucci auto-loads. They see the full scorecard: composite score, 5 dimensions, FDI v2.0 proxy adjustments, flags, Gemini-generated investment memo, margin expansion quantified in bps and dollars, entry economics with MOIC sensitivity, and specific DD priorities. They think: "This is what I would have told my associate to produce — but it took 30 seconds."
4. **Maple & Ash** → They click the steakhouse deal. Circuit breaker fires. Red card: "Cuisine outside thesis parameters." They think: "Good — this thing has discipline. It's not trying to force-fit every deal."
5. **Manual input** → They try their own deal. 6 quick fields. Score appears. They expand the enhanced section, add prime cost and tech stack details. Score sharpens. Disclaimer says "15-20 points of precision" — they understand the delta.
6. **Synthetic** → They generate a deal. Sees correlated financials, realistic red flags. They think: "Whoever built this understands the space." They click Analyze — full scorecard with DD priorities.
7. **Thesis footer** → Every path ends with: "This engine runs on the Heritage Experience Platforms thesis — a consolidation framework targeting independently owned Mediterranean restaurant groups at 5.5-7.0x entry." Three links to thesis / playbook / case study. The MD understands this engine exists to sell a thesis.

### What the MD does NOT want to see:

- Technical jargon ("deterministic", "API", "algorithm")
- Feature descriptions ("powered by AI", "machine learning")
- Excessive UI chrome, animations, or visual noise
- Dark mode, gradients, or anything that looks like a SaaS dashboard
- Explanations of what PE is or how scoring works — they know

---

## 1. Architecture Overview

| Layer      | Technology                                  | Status                   |
| ---------- | ------------------------------------------- | ------------------------ |
| Framework  | Next.js 14 (App Router)                     | Implemented              |
| Styling    | Tailwind CSS 3.4 + tokens.css design system | Implemented              |
| Scoring    | Deterministic JS engine (no LLM dependency) | Implemented, 13/13 tests |
| Narrative  | Gemini 2.5 Flash via @google/genai          | Implemented              |
| Hosting    | Vercel (serverless + static)                | Deployed                 |
| TypeScript | Strict mode, full type coverage             | Implemented              |

### File Map

```
src/
├── app/
│   ├── layout.tsx              — Root layout, globals.css, OG meta tags
│   ├── page.tsx                — Landing + all path views (URL-routed via ?path=)
│   ├── globals.css             — Tailwind directives + tokens.css import
│   ├── tokens.css              — Design system: colors, fonts, spacing, radii
│   ├── demo/page.tsx           — Redirect → /?path=demo
│   ├── manual/page.tsx         — Redirect → /?path=manual
│   ├── synthetic/page.tsx      — Redirect → /?path=synthetic
│   └── api/analyze/route.ts    — POST: Gemini memo generation + rate limiting
├── components/
│   ├── Scorecard.tsx           — Full scorecard (dims, flags, FDI, memo, entry econ, DD)
│   ├── ManualPath.tsx          — Path 2: two-level form (6 quick + 5 enhanced fields)
│   ├── SyntheticPath.tsx       — Path 3: CIM generator + card + analyze flow
│   └── ThesisFooter.tsx        — Shared footer: thesis statement + 3 CTA links
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

| Token          | Value     | Used for                                            |
| -------------- | --------- | --------------------------------------------------- |
| `--ink`        | `#1a1a18` | Primary text, primary buttons                       |
| `--paper`      | `#faf9f6` | Page background                                     |
| `--paper-warm` | `#f5f2ed` | Thesis footer, entry economics panel                |
| `--muted`      | `#6b6862` | Secondary text, descriptions                        |
| `--hint`       | `#9c9a92` | Labels, captions, tertiary text                     |
| `--copper`     | `#9a7b4f` | Accent, CTAs, selected states, value creation badge |
| `--score-high` | `#2d5a47` | Green: scores 75+, positive flags                   |
| `--score-mid`  | `#8b6c2f` | Amber: scores 50-74, conditional flags              |
| `--score-low`  | `#8b3a2f` | Red: scores <50, negative flags, circuit breakers   |

### Typography

| Token            | Value              | Used for                                                  |
| ---------------- | ------------------ | --------------------------------------------------------- |
| `--font-display` | Cormorant Garamond | Headings, score numbers, memo text, deal names            |
| `--font-body`    | DM Sans            | All UI: labels, buttons, flags, form fields, descriptions |

### Component patterns

| Pattern        | Implementation                                                                      |
| -------------- | ----------------------------------------------------------------------------------- |
| Cards          | `border-ink/10 rounded-card p-6 bg-white` (border 0.5px, radius 12px, padding 24px) |
| Primary button | `bg-ink text-paper rounded-card`                                                    |
| CTA button     | `border-copper text-copper rounded-card`                                            |
| Selected state | `border-copper bg-copper/[0.04]`                                                    |
| Mini-memo      | `border-l-2 border-copper`, Cormorant Garamond body                                 |
| Flag pills     | `rounded-full`, score-colored background per type                                   |
| Surface panel  | `bg-paper-warm rounded-card p-6` (entry economics)                                  |

---

## 3. Scoring Engine (`scoringEngine.js`)

Fully deterministic. No LLM dependency. The LLM (Gemini) only generates the narrative memo downstream.

### 3.1 Input / Output

- **Input**: DealInput (22 fields — see `types/scoring.ts`)
- **Output**: ScoringResult (composite 0-100, classification, 5 dimension scores, flags, circuit_breakers, fdi_v2, margin_expansion, deal_structure_advisory, value_creation_type)

### 3.2 Five dimensions (weighted composite)

| Dim | Name                  | Weight | Scores                                                                 |
| --- | --------------------- | ------ | ---------------------------------------------------------------------- |
| D1  | Thesis Alignment      | 25%    | Cuisine, revenue band, geography, avg check, cap table                 |
| D2  | Financial Health      | 25%    | EBITDA margin, prime cost, SSG, lease cost, seasonality, RPL           |
| D3  | Operational Readiness | 20%    | Tech stack, AvT variance, CFO, seasonality/MESA                        |
| D4  | Key-Person Risk       | 15%    | FDI v2.0 matrix (proxy-adjusted), geographic amplifier                 |
| D5  | Value Creation        | 15%    | Margin room, prime cost lever, tech speed, platform, expansion history |

### 3.3 Classifications

| Classification | Range  | MD reads it as                      |
| -------------- | ------ | ----------------------------------- |
| `strong_fit`   | 75-100 | "Advance to IC"                     |
| `conditional`  | 50-74  | "Advance with DD conditions"        |
| `below_thesis` | 25-49  | "Review required — probably not"    |
| `pass`         | 0-24   | "Outside thesis — don't waste time" |

### 3.4 Circuit breakers (hard stops)

| ID   | Trigger                      | Result               | Why the MD cares                                |
| ---- | ---------------------------- | -------------------- | ----------------------------------------------- |
| CB-1 | Cuisine not Med/Italian      | Pass                 | Thesis discipline — won't score outside sector  |
| CB-2 | Revenue < $25M               | Reclassify as add-on | Too small for platform, might work as bolt-on   |
| CB-3 | FDI >= 6 AND readiness = low | Pass                 | Founder can't transition — deal dies post-close |
| CB-4 | Active litigation            | Suspended            | Legal risk trumps everything                    |

Display: Red-bordered card, "Circuit breaker triggered" header, CB ID + rule, and sector-specific explanatory copy. For CB-1: "This engine is calibrated for Mediterranean and Italian formats. The architecture is portable, but the scoring intelligence is sector-specific." This is a credibility moment — it shows the tool has conviction.

### 3.5 FDI v2.0 (Founder Dependency Index)

Declared (0-8) → proxy-adjusted via:

- GM tenure < 12mo → +2
- No professional CFO → +1
- AvT variance > 5% → +1
- Cap: 8

Geographic amplifier: single-city + FDI >= 4 → D4 -= 15.

Scored via 3-band matrix × 3 readiness levels.

Displayed in scorecard as: `declared → adjusted / 8`, proxy pills, readiness badge. This is the "intellectual credibility" panel — any MD who's been burned by a founder-dependent deal recognizes the rigor.

### 3.6 Composite modifiers

- Lease > 10% + seasonal → composite × 0.65 (structural + cyclical)
- Lease > 10% (not seasonal) → composite × 0.80 (structural)

### 3.7 Value creation typing

| Type                    | Condition                      | Badge text                   |
| ----------------------- | ------------------------------ | ---------------------------- |
| `margin_expansion`      | EBITDA < 20% OR prime > 64%    | "Margin expansion deal"      |
| `platform_acceleration` | EBITDA >= 23% AND prime <= 60% | "Platform acceleration deal" |
| `hybrid`                | Everything else                | "Hybrid — margin + platform" |

Copper badge with info tooltip in scorecard header. Tells the MD _how_ the deal creates value, not just _whether_.

### 3.8 Test suite

13 Deal Tribunal scenarios, 100% accuracy. Run: `node tests/scoringEngine.test.js`.

---

## 4. Landing Page (`page.tsx`)

### 4.1 Hero

- Kicker: "Heritage Experience Platforms" (uppercase, hint)
- Title: "Deal Intelligence Engine" (Cormorant Garamond, 60px)
- Subtitle: "Your team screens 200+ CIMs per year to close 3 deals. This engine does the first-pass analysis in 30 seconds — scored against a calibrated investment thesis for premium hospitality."

### 4.2 Path selector (3 cards)

| Card                | Visual priority                        | Label                |
| ------------------- | -------------------------------------- | -------------------- |
| Run the demo        | Primary — copper border, "Recommended" | "3 pre-loaded deals" |
| Score your own deal | Secondary                              | "6 key inputs"       |
| Build me a deal     | Secondary                              | "AI-generated CIM"   |

### 4.3 Scorecard preview

Pre-rendered Castellucci scorecard (static, no API call): composite score, 5 dimension bars (h-1.5), classification badge, 4 flags. CTA: "Run the full analysis →" → auto-selects Castellucci in demo view. The MD sees the output before doing anything.

### 4.4 URL routing

- `/` → Landing
- `/?path=demo` → Demo view (Castellucci auto-loaded)
- `/?path=manual` → Manual input
- `/?path=synthetic` → Synthetic CIM
- `/demo`, `/manual`, `/synthetic` → 307 redirect to query param version
- Browser back button works (useSearchParams sync)

### 4.5 Thesis footer (all views)

`ThesisFooter.tsx` — paper-warm background, thesis copy, 3 copper CTA buttons (placeholder `#`), footer line. Appears at bottom of every view. Funnels the MD back to the thesis.

---

## 5. Path 1 — Demo

### Behavior

- Enters demo view → Castellucci auto-loads (P4). No click required.
- 3 deal tabs: Castellucci (Strong Fit), Trabocchi (Conditional), Maple & Ash (Circuit Breaker CB-1)
- Click tab → instant scoring + async Gemini memo

### Full scorecard sections (in order)

1. **Header**: Deal name, classification badge, composite score (5xl), value creation type badge (copper, tooltip)
2. **Dimension bars**: 5 bars, color-coded by score range
3. **FDI v2.0 panel**: declared → adjusted, proxy pills, readiness badge
4. **Flags**: Green/amber/red pills
5. **Investment memo**: Gemini-generated, Cormorant Garamond, copper left border
6. **Margin expansion**: bps + $M, source breakdown table
7. **Deal structure advisory**: Text recommendations (FDI mitigation, cap table, CFO hire, debt)
8. **Entry economics**: Paper-warm surface. Implied EBITDA, EV at 7.0x, equity required. MOIC sensitivity table (6.5x/7.0x/7.5x entry). Thesis assumptions footnote.
9. **DD priorities**: Top 3 due diligence items, pattern-matched from amber/red flags, severity-sorted
10. **Disclaimer** (if applicable): Assessment basis note

---

## 6. Path 2 — Manual Input (`ManualPath.tsx`)

### Two-level form

**Quick screen (6 fields):**

| Field         | Type                     | Default       |
| ------------- | ------------------------ | ------------- |
| Revenue ($M)  | Number                   | 40            |
| EBITDA Margin | Slider 5-35%             | 20            |
| Locations     | Number                   | 8             |
| Cuisine       | Dropdown (8 options)     | Mediterranean |
| Founder age   | Number (optional)        | —             |
| Geography     | Multi-select (14 metros) | —             |

**Enhanced scoring (5 additional, expandable):**

| Field               | Type         | Default                   | Maps to                                         |
| ------------------- | ------------ | ------------------------- | ----------------------------------------------- |
| Prime cost (%)      | Slider 55-72 | Derived from cuisine      | `prime_cost_pct`                                |
| Tech stack          | Dropdown     | "Multiple systems"        | `tech_status` (unified/fragmented/none/dormant) |
| Founder involvement | Dropdown     | "Active operator"         | `fdi_declared` (2/4/6)                          |
| Management team     | Dropdown     | "Some professional hires" | `has_pro_cfo` + FDI adjustment                  |
| Lease cost (%)      | Slider 5-14  | 8                         | `lease_cost_pct`                                |

### Derived defaults (for undisclosed parameters)

| Parameter                                  | Quick screen rule                            | Enhanced override                               |
| ------------------------------------------ | -------------------------------------------- | ----------------------------------------------- |
| `prime_cost_pct`                           | By cuisine (Med 63, Steakhouse 66, Other 65) | Slider value                                    |
| `fdi_declared`                             | By age (>60→5, 50-60→4, <50→3)               | Founder involvement dropdown (2/4/6) + mgmt adj |
| `has_pro_cfo`                              | locations >= 8                               | Management team dropdown                        |
| `tech_status`                              | "fragmented"                                 | Tech stack dropdown                             |
| `lease_cost_pct`                           | 8                                            | Slider value                                    |
| `avg_check`                                | By cuisine (Steak 110, Med 68, Other 60)     | Same                                            |
| `readiness`, `gm_tenure_months`, `ssg_pct` | "medium", 20, 3                              | Same                                            |
| All boolean flags                          | false                                        | Same                                            |

### Output

Same Scorecard. Disclaimer changes:

- Quick: "Quick assessment — 6 parameters. ...refines the scoring by approximately 15-20 points of precision."
- Enhanced: "Enhanced assessment — 11 parameters. Undisclosed variables use conservative sector defaults."

---

## 7. Path 3 — Synthetic CIM (`SyntheticPath.tsx`)

### Flow

1. CTA: "No NDA required. Build me a deal." (copper border)
2. Generates CIM → card with name, cities, cuisine, 3×3 metric grid, red flags, secondary metrics
3. "Analyze This Deal" → scoring + Gemini → Scorecard
4. "Generate Another" → regenerate (available before and after analysis)

### Generator internals

- 30 name prefixes × 10 suffixes
- Cuisine: weighted med/italian/med_italian only
- All variables correlated: founder age → FDI → readiness, margin ↔ prime cost, locations → revenue
- P&L consistency validation (prime + EBITDA + lease + other ≈ 100%)
- 15 contextual red flags with conditional probability
- 14 metros weighted by market size

---

## 8. API Route (`/api/analyze`)

| Aspect         | Detail                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| Method         | POST                                                                   |
| Input          | `{ deal, scores }`                                                     |
| Output         | `{ memo }` (120-150 words)                                             |
| Model          | `gemini-2.5-flash`                                                     |
| SDK            | `@google/genai` (GoogleGenAI)                                          |
| System prompt  | Senior PE analyst, IC-ready, third person, no bullets, Goldman MD tone |
| Config         | maxOutputTokens 512, temp 0.7, thinkingBudget 0                        |
| Rate limit     | 10 req/IP/hour (in-memory Map), 429 on exceed                          |
| Error handling | 400 (missing data), 429 (rate limit), 500 (Gemini failure)             |

---

## 9. Scorecard Component — Full Section Inventory

The Scorecard (`Scorecard.tsx`) is the shared output component used by all three paths. It receives `ScoringResult` + optional `dealRevenue`, `dealMargin`, `dealData`, `memo`, `disclaimer`. Fully mobile responsive (375px–desktop).

### Sections rendered (top to bottom):

| #   | Section                     | Condition                          | What the MD sees                                                                                     |
| --- | --------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | **One-line verdict**        | Always                             | Deterministic: "STRONG FIT — $55M Mediterranean across 3 metros, margin expansion 300bps." DM Sans. |
| 2   | Header + composite score    | Always                             | Deal name, classification badge, score in 48px Cormorant                                             |
| 3   | Value creation badge        | If `value_creation_type` exists    | Copper pill with tooltip: "Margin expansion" / "Platform acceleration" / "Hybrid"                    |
| 4   | Radar chart                 | Always                             | SVG pentagon (240-280px). Thesis target (80/axis, copper dashed) vs deal (score-colored)             |
| 5   | Dimension bars              | Always                             | 5 bars, score-colored, copper dashed benchmark marker at 75%                                         |
| 6   | FDI v2.0 panel              | If `fdi_v2` exists                 | Declared → adjusted / 8, proxy pills, readiness badge                                                |
| 7   | Flags                       | Always                             | Green/amber/red pills, gap 8px                                                                       |
| 8   | Investment memo             | If `memo` passed (not `__timeout__`)| Gemini narrative, Cormorant Garamond, copper left border                                            |
| 8b  | Memo fallback               | If memo = `__timeout__`            | "Investment memo generation temporarily unavailable. All scoring data above is complete."             |
| 9   | Margin expansion            | If `margin_expansion` exists       | bps + $M headline, source breakdown table                                                            |
| 10  | Deal structure advisory     | If advisories exist                | FDI mitigation, cap table, CFO hire, debt                                                            |
| 11  | Entry economics             | If `dealRevenue` + `dealMargin`    | Paper-warm. EBITDA, EV, equity (responsive grid). MOIC sensitivity (3 rows). Thesis footnote.        |
| 12  | Deployment timeline         | If `dealData` + `value_creation_type` | Paper-warm. Time-to-value by tech_status × value_creation_type. Playbook footnote.                |
| 13  | DD priorities               | If flags match patterns            | Top 3 items, severity-sorted (red first), 10 regex pattern matchers                                 |
| 14  | Score improvement levers    | If composite < 75 + `dealData`     | Clone deal, mutate 1 variable, re-score, top 3 by delta                                             |
| 15  | Deal summary card           | If `dealData`                      | Paper-warm exec summary. Prints first via CSS order:-1                                               |
| 16  | Export button               | Always                             | "Export scorecard" + printer SVG. `window.print()`.                                                  |
| 17  | Disclaimer                  | If passed                          | Quick vs enhanced, parameter count                                                                   |

### Circuit breaker display (alternate render):

1. One-line verdict: "PASS — [CB rule]. Scoring not applicable." (before red card)
2. Red-bordered card (border-2 score-low, bg score-low-bg): "Circuit breaker triggered" header, CB IDs + rules, sector-specific copy.

### Memo timeout behavior:

All three callers (demo, manual, synthetic) use `AbortController` with 15-second timeout on the `/api/analyze` fetch. On timeout or error, memo is set to `__timeout__` sentinel. Scorecard renders italic fallback: "Investment memo generation temporarily unavailable. All scoring data above is complete and deterministic."

### DD priority pattern matching (Section 10):

10 regex patterns matched against flag text, severity-sorted (red first), max 3:

| Flag pattern            | DD recommendation                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------- |
| AvT variance            | "Validate AvT food cost variance: actual vs theoretical across all locations"         |
| FDI critical/moderate   | "Assess founder transition readiness via vacation test and GM autonomy interviews"    |
| Tech fragmented         | "Estimate tech migration timeline and cost for unified POS deployment"                |
| Lease structural        | "Benchmark lease portfolio: remaining terms, renewal clauses, % of revenue"           |
| SSG declining           | "Distinguish execution decline from market decline"                                   |
| No pro CFO              | "Plan CFO search: timeline, budget ($200-250K), reporting requirements"               |
| Prior expansion failure | "Audit underperforming locations: site selection, fix-vs-close analysis"              |
| Prime cost red          | "Deep-dive prime cost composition: food vs labor, supplier contracts"                 |
| Seasonal cash flow      | "Model cash flow seasonality: monthly EBITDA, working capital, covenant compliance"   |
| Single-city             | "Assess geographic concentration risk: regulatory, labor market, expansion corridors" |

### Entry economics formula (Section 9):

```
exit_revenue = revenue × 1.035^5 + 26
exit_margin = margin + 0.04
exit_ebitda = exit_revenue × exit_margin
MOIC = (exit_ebitda × 10 - debt) / equity
```

Assumptions: 60% equity, exit 10x, 5yr hold, 400bps margin expansion, 3.5% SSG, 3 add-ons ($26M revenue).

---

## 10. Meta & SEO

- `og:title`: "Deal Intelligence Engine"
- `og:description`: "First-pass deal analysis in 30 seconds — scored against a calibrated investment thesis for premium hospitality."
- `og:type`: website
- `og:siteName`: "Heritage Experience Platforms"
- `twitter:card`: summary_large_image
- No OG image yet (placeholder)

---

## 11. What Is NOT Implemented

| Feature                          | Status             | Notes                                                                        |
| -------------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| Dark mode                        | EXCLUDED           | By design. Light mode only.                                                  |
| Authentication                   | NONE               | Public. Appropriate for demo/pitch tool.                                     |
| Thesis/playbook/case study links | PLACEHOLDER (#)    | Footer CTAs don't navigate yet.                                              |
| Deal persistence / history       | NONE               | No database. All scoring is ephemeral.                                       |
| Deal comparison view             | NONE               | Can't compare two deals side-by-side.                                        |
| Analytics / tracking             | NONE               | No usage metrics.                                                            |
| Error boundaries                 | NONE               | React error boundary not set up. Memo failure handled via timeout fallback.  |
| Loading skeleton                 | NONE               | Spinner text only during memo gen.                                           |
| Accessibility                    | PARTIAL            | Semantic HTML. No ARIA labels, no keyboard nav testing.                      |
| OG image                         | PLACEHOLDER        | No social preview image.                                                     |

### What IS implemented (previously missing):

| Feature              | Status         | Notes                                                                       |
| -------------------- | -------------- | --------------------------------------------------------------------------- |
| Mobile responsive    | IMPLEMENTED    | Full 375px–desktop. Progressive scaling, stacked layouts, responsive grids. |
| PDF export / print   | IMPLEMENTED    | Print stylesheet (A4), summary card first, window.print() button.           |
| Input validation     | IMPLEMENTED    | Revenue >= $5M, locations >= 1. Inline error before scoreDeal().            |
| Memo fallback        | IMPLEMENTED    | 15s AbortController timeout. Graceful fallback text on failure.             |

---

## 12. Known Technical Debt

1. **ESM import assertion**: `scoringEngine.js` uses `assert { type: 'json' }` (deprecated → `with`). Works in Next.js 14.
2. **Test suite is CJS**: Inlines scoring logic. Changes must be mirrored manually.
3. **No unified deal type**: Components define deal shapes independently. Should converge on `DealInput` from `types/scoring.ts`.
4. **Static preview at module level**: `scoreDeal(preloadedDeals[0])` runs at import time.
5. **Gemini build warning**: "API key should be set" during build. Harmless.
6. **`deal-engine/` subdirectory**: Dead weight in git from original upload.
7. **Rate limiter in-memory**: Resets on serverless cold start. Adequate for demo.
8. **`dealData` prop is `any`**: Scorecard accepts untyped deal for improvement levers and timeline.

---

## 13. Deployment

| Setting        | Value                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Platform       | Vercel                                                                                                              |
| Framework      | Next.js (via `vercel.json`)                                                                                         |
| Production URL | https://deal-intelligence-engine-eight.vercel.app                                                                   |
| Env vars       | `GEMINI_API_KEY` (sensitive, all environments)                                                                      |
| Build          | `npm run build` → `next build`                                                                                      |
| Routes         | `/` (static), `/?path=*` (client-side), `/api/analyze` (serverless), `/demo` `/manual` `/synthetic` (307 redirects) |
