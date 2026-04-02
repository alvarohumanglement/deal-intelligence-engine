# BRIEF PARA CLAUDE CODE — Deal Intelligence Engine

## Qué es este proyecto

Un deal screening engine para PE hospitality. Tres paths de usuario:
demo guiada (deals precargados), input manual (6 params), CIM sintético (generador).
Output: scorecard con 5 dimensiones, flags, mini-memo AI, recomendación.

## Lo que ya está construido

- `src/lib/scoringEngine.js` — Motor de scoring, 100% calibrado, deterministic JS
- `src/lib/syntheticGenerator.js` — Generador de CIMs sintéticos con correlaciones
- `src/data/scoringConfig.json` — Config del scoring model (pesos, thresholds, circuit breakers)
- `src/data/preloadedDeals.js` — 3 deals precargados (Castellucci, Trabocchi, Maple & Ash)
- `src/app/tokens.css` — Design system CSS variables
- `tests/` — Test suite (13 deals, 100% accuracy)

## Lo que falta construir

1. Frontend React: página principal con tres paths (tabs/cards)
2. Scorecard component (ver design system)
3. Manual input form (6 campos)
4. Synthetic CIM card + "Analyze" flow
5. API route `/api/analyze` para Gemini 2.0 Flash (narrative generation)
6. Rate limiting (10 análisis/IP/hora)
7. Responsive design

## Design system (OBLIGATORIO seguir)

Leer `src/app/tokens.css` para todos los colores, fuentes, spacing.

- Fonts: Cormorant Garamond (display/headings) + DM Sans (body/UI)
- Colors: ink #1a1a18, paper #faf9f6, copper accent #9a7b4f
- Scoring: green #2d5a47 (75+), amber #8b6c2f (50-74), red #8b3a2f (<50)
- Light mode only. No dark mode.
- Cards: 0.5px border, 12px radius, 24px padding
- Buttons: ink bg for primary, copper border for CTAs
- Mini-memo: Cormorant Garamond, copper left border (2px)

## API — Gemini 2.0 Flash

- Endpoint: Google AI Generative API
- Model: gemini-2.0-flash
- El scoring es deterministic (JS). Gemini SOLO genera el mini-memo narrativo.
- Prompt recibe: deal data + scores + flags → output: 150 words IC-language memo
- Cost: ~$0.001 por análisis. Rate limit: 10/IP/hour.

## Archivos de referencia

- `CLAUDE_CODE_BRIEF.md` (este archivo)
- Para design system completo: ver design_system_portfolio.md en project knowledge
- Para scoring logic detallada: ver deal_tribunal_complete_learnings.md

```

Después, cuando abras Claude Code en la terminal, le dices:

> "Lee CLAUDE_CODE_BRIEF.md y tokens.css. Construye el frontend del engine siguiendo ese design system. Empieza por la página principal con los tres paths de usuario."

Claude Code tiene acceso al filesystem — lee tus archivos, entiende la estructura, y construye sobre lo que existe.

## Resumen del flujo
```

Esta conversación (diseño + scoring + strategy)
↓
Archivos generados (scoring engine, config, design system, tests)
↓
CLAUDE_CODE_BRIEF.md (puente de contexto)
↓
Claude Code (build del frontend sobre la base existente)
↓
GitHub → Vercel (deploy automático)
