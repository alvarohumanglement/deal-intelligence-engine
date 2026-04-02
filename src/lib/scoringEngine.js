/**
 * Deal Intelligence Engine — Scoring Module
 * Heritage Experience Platforms | Case 1
 * 
 * Calibrated via Deal Tribunal backtesting (13 labeled deals, 100% accuracy)
 * This module is deterministic — no LLM dependency.
 * The LLM (Gemini) only handles narrative generation downstream.
 */

import config from '../data/scoringConfig.json' assert { type: 'json' };

// ─── TYPES ──────────────────────────────────────────────

/**
 * @typedef {Object} DealInput
 * @property {string} name
 * @property {string} cuisine - "med" | "italian" | "med_italian" | "steakhouse" | "american" | "asian" | "seafood" | "other"
 * @property {number} revenue_M - Annual revenue in $M
 * @property {number} ebitda_margin_pct - EBITDA margin as whole number (e.g. 20 = 20%)
 * @property {number} prime_cost_pct - Prime cost as whole number
 * @property {number} avg_check - Average check in $
 * @property {number} locations - Number of locations
 * @property {number} cities - Number of distinct metro areas
 * @property {number} founder_age
 * @property {number} fdi_declared - Founder Dependency Index (0-8)
 * @property {string} readiness - "high" | "medium" | "low"
 * @property {number} gm_tenure_months - Average GM tenure in months
 * @property {string} tech_status - "active" | "dormant" | "unified" | "fragmented" | "none"
 * @property {number|null} avt_variance_pct - Actual vs Theoretical food cost variance (null if unknown)
 * @property {number} lease_cost_pct - Lease cost as % of revenue
 * @property {number} ssg_pct - Same-store sales growth as whole number (e.g. 3.5)
 * @property {boolean} has_pro_cfo
 * @property {boolean} has_minority_investor
 * @property {boolean} has_active_litigation
 * @property {boolean} is_seasonal - Revenue concentration > 60% in ≤ 6 months
 * @property {boolean} has_prior_expansion_failure
 * @property {number} [historical_data_months] - Months of integrated POS/scheduling data
 * @property {number} [existing_debt_M] - Existing debt on target in $M
 */

/**
 * @typedef {Object} ScoringResult
 * @property {number} composite - 0-100
 * @property {string} classification - "strong_fit" | "conditional" | "below_thesis" | "pass"
 * @property {Object} dimensions - { d1, d2, d3, d4, d5 } each 0-100
 * @property {string} value_creation_type - "margin_expansion" | "platform_acceleration" | "hybrid"
 * @property {Array} flags - { type: "green"|"amber"|"red", text, dimension }
 * @property {Array} circuit_breakers - { id, rule, action } if triggered
 * @property {Array} modifiers_applied - { id, rule, effect } 
 * @property {Object} deal_structure_advisory - if FDI ≥ 5 or cap table complex
 * @property {Object} margin_expansion - { bps, dollars_M, sources }
 * @property {Object} fdi_v2 - { declared, proxy_adjusted, readiness, d4_base }
 * @property {boolean} is_suspended - if litigation/regulatory flags present
 * @property {string|null} reclassification - "addon_candidate" if revenue < $25M
 */

// ─── HELPERS ────────────────────────────────────────────

const { weights, classification_thresholds: ct, key_thresholds: kt } = config;

function clamp(val, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(val)));
}

// ─── CIRCUIT BREAKERS ───────────────────────────────────

function checkCircuitBreakers(deal, fdiAdjusted) {
  const triggered = [];

  // CB-1: Cuisine gate
  const validCuisines = ['med', 'italian', 'med_italian'];
  if (!validCuisines.includes(deal.cuisine)) {
    triggered.push({ id: 'CB-1', rule: 'Cuisine outside thesis (non-Mediterranean/Italian)', action: 'pass' });
  }

  // CB-2: Revenue floor
  if (deal.revenue_M < kt.revenue_platform_min_M) {
    triggered.push({ id: 'CB-2', rule: `Revenue $${deal.revenue_M}M below $${kt.revenue_platform_min_M}M platform minimum`, action: 'reclassify_addon' });
  }

  // CB-3: FDI + low readiness
  if (fdiAdjusted >= kt.fdi_red && deal.readiness === 'low') {
    triggered.push({ id: 'CB-3', rule: `FDI ${fdiAdjusted}/8 with low transitional readiness`, action: 'pass' });
  }

  // CB-4: Active litigation
  if (deal.has_active_litigation) {
    triggered.push({ id: 'CB-4', rule: 'Active litigation on core assets', action: 'suspended' });
  }

  return triggered;
}

// ─── FDI v2.0 ───────────────────────────────────────────

function computeFDI(deal) {
  let adjusted = deal.fdi_declared;
  const proxies = [];

  // Proxy 1: GM tenure < 12 months → +2 (operational presence)
  if (deal.gm_tenure_months < kt.gm_tenure_red_months) {
    adjusted = Math.min(8, adjusted + 2);
    proxies.push({ indicator: 'GM tenure', value: `${deal.gm_tenure_months}mo`, adjustment: '+2' });
  }

  // Proxy 2: No professional CFO → +1 (decision bottleneck)
  if (!deal.has_pro_cfo) {
    adjusted = Math.min(8, adjusted + 1);
    proxies.push({ indicator: 'No professional CFO', value: 'family/founder', adjustment: '+1' });
  }

  // Proxy 3: AvT variance > threshold → +1 (vacation test)
  const avtVal = deal.avt_variance_pct !== null ? deal.avt_variance_pct : 4;
  if (avtVal > kt.avt_red_pct) {
    adjusted = Math.min(8, adjusted + 1);
    proxies.push({ indicator: 'AvT variance', value: `${avtVal}%`, adjustment: '+1' });
  }

  return { declared: deal.fdi_declared, adjusted, proxies, readiness: deal.readiness, avt_used: avtVal };
}

function scoreFDI(fdiAdjusted, readiness, cities) {
  const rMap = { high: 0, medium: 1, low: 2 };
  const rIdx = rMap[readiness] !== undefined ? rMap[readiness] : 1;

  let d4;
  if (fdiAdjusted <= 2) {
    const bases = [95, 90, 85];
    d4 = bases[rIdx] - (fdiAdjusted * 3);
  } else if (fdiAdjusted <= 5) {
    const floors = [60, 40, 20];
    const ceilings = [75, 55, 35];
    const t = (fdiAdjusted - 3) / 2;
    d4 = Math.round(ceilings[rIdx] - t * (ceilings[rIdx] - floors[rIdx]));
  } else {
    const floors = [35, 15, 0];
    const ceilings = [50, 30, 10];
    const t = (fdiAdjusted - 6) / 2;
    d4 = Math.round(ceilings[rIdx] - t * (ceilings[rIdx] - floors[rIdx]));
  }

  // Geographic amplifier: single-city compounds key-person risk
  let geoAmplifier = false;
  if (cities === 1 && fdiAdjusted >= 4) {
    d4 -= 15;
    geoAmplifier = true;
  }

  return { score: clamp(d4), geoAmplifier };
}

// ─── DIMENSION SCORING ──────────────────────────────────

function scoreThesisAlignment(deal) {
  let score = 50; // base for passing cuisine gate
  const flags = [];

  // Cuisine preference
  if (['med', 'med_italian'].includes(deal.cuisine)) score += 15;
  else if (deal.cuisine === 'italian') score += 10;

  // Revenue band
  if (deal.revenue_M >= 25 && deal.revenue_M <= 80) score += 10;
  if (deal.revenue_M >= 35 && deal.revenue_M <= 60) score += 5; // sweet spot

  // Geography
  if (deal.cities >= 2) { score += 10; flags.push({ type: 'green', text: `Multi-city presence (${deal.cities} metros)` }); }
  if (deal.cities >= 3) score += 5;
  if (deal.cities === 1) flags.push({ type: 'amber', text: 'Single-city concentration' });

  // Average check
  if (deal.avg_check >= kt.avg_check_min) score += 5;
  if (deal.avg_check >= 65 && deal.avg_check <= 90) score += 5; // premium sweet spot

  // Cap table
  if (deal.has_minority_investor) {
    flags.push({ type: 'amber', text: 'Minority investor — cap table complexity. Assess drag-along rights.' });
  } else {
    flags.push({ type: 'green', text: 'Clean cap table' });
  }

  return { score: clamp(score), flags };
}

function scoreFinancialHealth(deal, avtVal) {
  let score = 40;
  const flags = [];

  // EBITDA margin
  if (deal.ebitda_margin_pct >= kt.ebitda_baseline_pct) {
    score += 15;
    if (deal.ebitda_margin_pct >= 22) { score += 5; flags.push({ type: 'green', text: `EBITDA ${deal.ebitda_margin_pct}% — above thesis baseline` }); }
  } else if (deal.ebitda_margin_pct >= kt.ebitda_baseline_pct - 3) {
    score += 8;
    flags.push({ type: 'amber', text: `EBITDA ${deal.ebitda_margin_pct}% — below baseline but lever exists` });
  } else {
    score -= 5;
    flags.push({ type: 'red', text: `EBITDA ${deal.ebitda_margin_pct}% — significant margin gap` });
  }

  // Prime cost
  if (deal.prime_cost_pct <= 62) {
    score += 15;
    flags.push({ type: 'green', text: `Prime cost ${deal.prime_cost_pct}% — efficient` });
  } else if (deal.prime_cost_pct <= kt.prime_cost_red_pct) {
    score += 5;
    flags.push({ type: 'amber', text: `Prime cost ${deal.prime_cost_pct}% — operational lever (${deal.prime_cost_pct - 62}pp to best-in-class)` });
  } else {
    score -= 15;
    flags.push({ type: 'red', text: `Prime cost ${deal.prime_cost_pct}% — above red threshold. Thesis recalibration required.` });
  }

  // SSG
  if (deal.ssg_pct >= 3) { score += 10; }
  else if (deal.ssg_pct >= 1) { score += 5; }
  else if (deal.ssg_pct < 0) {
    score -= 20;
    flags.push({ type: 'red', text: `SSG ${deal.ssg_pct}% — declining revenue. Assess market vs. execution decline.` });
  }

  // Lease cost
  if (deal.lease_cost_pct <= 8) {
    score += 5;
  } else if (deal.lease_cost_pct > kt.lease_cost_red_pct) {
    score -= 25;
    flags.push({ type: 'red', text: `Lease cost ${deal.lease_cost_pct}% of revenue — structural, irreversible during hold` });
  }

  // Seasonality
  if (deal.is_seasonal) {
    score -= 10;
    flags.push({ type: 'red', text: 'Revenue concentration >60% in peak season — cash flow risk' });
  }

  // Revenue per location
  const rpl = deal.revenue_M / deal.locations;
  if (rpl >= 4 && rpl <= 7) score += 5;
  else if (rpl > 7) { score += 8; flags.push({ type: 'green', text: `$${rpl.toFixed(1)}M per location — elite unit economics` }); }

  return { score: clamp(score), flags };
}

function scoreOperationalReadiness(deal, avtVal) {
  let score = 40;
  const flags = [];

  // Tech stack
  switch (deal.tech_status) {
    case 'active':
      score += 25;
      flags.push({ type: 'green', text: 'Tech stack deployed and active — AI deployment ready' });
      break;
    case 'unified':
      score += 20;
      flags.push({ type: 'green', text: 'Unified POS — centralization can begin Day 31' });
      break;
    case 'dormant':
      score += 15;
      flags.push({ type: 'amber', text: 'Tech deployed but dormant — systems installed, no operator. Data asset available.' });
      break;
    case 'fragmented':
      flags.push({ type: 'amber', text: 'Tech fragmented — migration required before AI deployment' });
      break;
    case 'none':
      score -= 5;
      flags.push({ type: 'red', text: 'No integrated tech — full stack deployment required' });
      break;
  }

  // AvT
  if (avtVal < 2) { score += 15; flags.push({ type: 'green', text: `AvT variance ${avtVal}% — excellent kitchen controls` }); }
  else if (avtVal <= kt.avt_red_pct) score += 8;
  else {
    score -= 5;
    flags.push({ type: 'red', text: `AvT variance ${avtVal}% — value leakage in kitchen operations` });
  }

  // CFO
  if (deal.has_pro_cfo) { score += 10; }
  else {
    score -= 10;
    flags.push({ type: 'red', text: 'No professional CFO — QoE reliability concern' });
  }

  // Seasonality impact on MESA
  if (deal.is_seasonal) {
    score -= 10;
    flags.push({ type: 'amber', text: 'Seasonal workforce — MESA deployment limited to core team (60%+ year-round)' });
  }

  // Historical data
  if (deal.historical_data_months && deal.historical_data_months >= 12) {
    flags.push({ type: 'green', text: `${deal.historical_data_months} months of historical data — AI training accelerator` });
  }

  return { score: clamp(score), flags };
}

function scoreValueCreation(deal, avtVal) {
  let score = 40;
  const flags = [];

  // Margin expansion room
  const marginRoom = 24 - deal.ebitda_margin_pct;
  if (marginRoom >= 6) { score += 20; flags.push({ type: 'green', text: `${marginRoom}pp margin expansion potential` }); }
  else if (marginRoom >= 3) score += 12;
  else if (marginRoom >= 1) score += 5;
  else { score -= 5; flags.push({ type: 'amber', text: 'Margin near ceiling — limited operational lever' }); }

  // Prime cost lever
  const pcRoom = deal.prime_cost_pct - 60;
  if (pcRoom >= 6) {
    score += 10;
    const dollarsRecoverable = (deal.revenue_M * (deal.prime_cost_pct / 100) * ((pcRoom - 2) / 100)).toFixed(1);
    flags.push({ type: 'green', text: `~$${dollarsRecoverable}M recoverable from prime cost optimization` });
  } else if (pcRoom >= 3) score += 5;

  // Speed to deployment
  if (deal.tech_status === 'active') score += 10;
  else if (deal.tech_status === 'dormant') score += 8;
  else if (deal.tech_status === 'unified') score += 5;

  // Platform potential
  if (deal.locations >= 8 && deal.cities >= 2) { score += 8; flags.push({ type: 'green', text: 'Multi-city platform — add-on absorption ready' }); }
  else if (deal.locations >= 6) score += 4;

  // Prior expansion failure
  if (deal.has_prior_expansion_failure) {
    score -= 10;
    flags.push({ type: 'red', text: 'Prior expansion underperformed — organic growth assumptions require DD validation' });
  }

  // Seasonality
  if (deal.is_seasonal) {
    score -= 8;
    flags.push({ type: 'amber', text: 'Seasonal operations limit AI deployment window' });
  }

  // AvT as hidden value
  if (avtVal > kt.avt_red_pct) {
    score += 5;
    flags.push({ type: 'green', text: `AvT ${avtVal}% is fixable waste — quick win in 60-90 days` });
  }

  return { score: clamp(score), flags };
}

// ─── VALUE CREATION TYPING ──────────────────────────────

function classifyValueCreationType(deal) {
  if (deal.ebitda_margin_pct >= 23 && deal.prime_cost_pct <= 60) {
    return 'platform_acceleration';
  }
  if (deal.ebitda_margin_pct < kt.ebitda_baseline_pct || deal.prime_cost_pct > 64) {
    return 'margin_expansion';
  }
  return 'hybrid';
}

// ─── MARGIN EXPANSION ESTIMATE ──────────────────────────

function estimateMarginExpansion(deal) {
  let bps = 0;
  const sources = [];

  // Centralized procurement
  if (deal.prime_cost_pct > 62) {
    const procurementBps = Math.min(150, (deal.prime_cost_pct - 60) * 25);
    bps += procurementBps;
    sources.push({ lever: 'Centralized procurement', bps: procurementBps });
  }

  // AI optimization (pricing + labor)
  if (deal.tech_status !== 'active') {
    bps += 150;
    sources.push({ lever: 'AI-driven pricing + labor optimization', bps: 150 });
  } else {
    bps += 50; // already deployed, limited additional
    sources.push({ lever: 'AI optimization (incremental)', bps: 50 });
  }

  // Scale efficiencies
  if (deal.locations >= 8) {
    bps += 100;
    sources.push({ lever: 'Scale efficiencies', bps: 100 });
  } else if (deal.locations >= 5) {
    bps += 50;
    sources.push({ lever: 'Scale efficiencies (limited)', bps: 50 });
  }

  const dollars = (deal.revenue_M * bps / 10000).toFixed(1);

  return { bps, dollars_M: parseFloat(dollars), sources };
}

// ─── DEAL STRUCTURE ADVISORY ────────────────────────────

function generateDealStructureAdvisory(deal, fdiResult) {
  const advisories = [];

  if (fdiResult.adjusted >= 5) {
    const rollPct = fdiResult.adjusted >= 6 ? '35-40%' : '25-30%';
    const transitionMonths = fdiResult.adjusted >= 6 ? 24 : 18;
    advisories.push({
      type: 'fdi_mitigation',
      text: `FDI ${fdiResult.adjusted}/8 requires structured transition: ${rollPct} equity roll, earn-out tied to knowledge transfer milestones, ${transitionMonths}-month transition period.`
    });
  }

  if (deal.has_minority_investor) {
    advisories.push({
      type: 'cap_table',
      text: 'Minority investor present. Priority DD: assess drag-along rights. If absent, negotiate buyout or roll before term sheet. Estimate MOIC impact of additional equity requirement.'
    });
  }

  if (!deal.has_pro_cfo) {
    advisories.push({
      type: 'management',
      text: 'No professional CFO. Plan external hire in Week 2 post-close. Budget $200-250K. Critical for Phase 2 deployment.'
    });
  }

  if (deal.existing_debt_M && deal.existing_debt_M > 0) {
    advisories.push({
      type: 'existing_debt',
      text: `$${deal.existing_debt_M}M existing debt. Adjust sources & uses. Consider refinancing at ~7% as part of new capital structure.`
    });
  }

  return advisories;
}

// ─── MAIN SCORING FUNCTION ──────────────────────────────

export function scoreDeal(deal) {
  // Step 1: Compute FDI v2.0
  const fdiResult = computeFDI(deal);
  const modifiers = fdiResult.proxies.map(p => ({
    id: `FDI-proxy-${p.indicator}`,
    rule: `${p.indicator}: ${p.value}`,
    effect: `FDI ${p.adjustment} → ${fdiResult.adjusted}/8`
  }));

  // Step 2: Circuit breakers
  const circuitBreakers = checkCircuitBreakers(deal, fdiResult.adjusted);

  if (circuitBreakers.length > 0) {
    const primary = circuitBreakers[0];
    return {
      composite: 0,
      classification: primary.action === 'reclassify_addon' ? 'reclassify' : primary.action,
      dimensions: { d1: 0, d2: 0, d3: 0, d4: 0, d5: 0 },
      value_creation_type: null,
      flags: [],
      circuit_breakers: circuitBreakers,
      modifiers_applied: modifiers,
      deal_structure_advisory: [],
      margin_expansion: null,
      fdi_v2: fdiResult,
      is_suspended: primary.action === 'suspended',
      reclassification: primary.action === 'reclassify_addon' ? 'addon_candidate' : null
    };
  }

  // Step 3: Score each dimension
  const d1Result = scoreThesisAlignment(deal);
  const d2Result = scoreFinancialHealth(deal, fdiResult.avt_used);
  const d3Result = scoreOperationalReadiness(deal, fdiResult.avt_used);
  const d4Result = scoreFDI(fdiResult.adjusted, fdiResult.readiness, deal.cities);
  const d5Result = scoreValueCreation(deal, fdiResult.avt_used);

  if (d4Result.geoAmplifier) {
    modifiers.push({ id: 'M-4', rule: `Single-city + FDI ${fdiResult.adjusted} ≥ 4`, effect: 'D4 -= 15 (geographic amplifier)' });
  }
  if (deal.is_seasonal) {
    modifiers.push({ id: 'M-5', rule: 'Seasonality >60% in 6mo', effect: 'D2 -10, D3 -10, D5 -8' });
  }
  if (deal.has_prior_expansion_failure) {
    modifiers.push({ id: 'M-6', rule: 'Prior expansion failure', effect: 'D5 -10' });
  }

  // Step 4: Composite score
  const { thesis_alignment: w1, financial_health: w2, operational_readiness: w3, key_person_risk: w4, value_creation: w5 } = weights;
  const wt = w1 + w2 + w3 + w4 + w5;
  let composite = Math.round(
    (d1Result.score * w1 + d2Result.score * w2 + d3Result.score * w3 + d4Result.score * w4 + d5Result.score * w5) / wt
  );

  // Step 5: Composite modifiers (lease severity)
  if (deal.lease_cost_pct > kt.lease_cost_red_pct && deal.is_seasonal) {
    composite = Math.round(composite * 0.65);
    modifiers.push({ id: 'CM-1', rule: `Lease ${deal.lease_cost_pct}% + seasonality`, effect: 'Composite × 0.65 (structural + cyclical risk)' });
  } else if (deal.lease_cost_pct > kt.lease_cost_red_pct) {
    composite = Math.round(composite * 0.80);
    modifiers.push({ id: 'CM-2', rule: `Lease ${deal.lease_cost_pct}% > ${kt.lease_cost_red_pct}%`, effect: 'Composite × 0.80 (structural lease risk)' });
  }

  // Step 6: Classification
  let classification;
  if (composite >= ct.strong_fit) classification = 'strong_fit';
  else if (composite >= ct.conditional) classification = 'conditional';
  else if (composite >= ct.below_thesis) classification = 'below_thesis';
  else classification = 'pass';

  // Step 7: Collect all flags
  const allFlags = [
    ...d1Result.flags.map(f => ({ ...f, dimension: 'thesis_alignment' })),
    ...d2Result.flags.map(f => ({ ...f, dimension: 'financial_health' })),
    ...d3Result.flags.map(f => ({ ...f, dimension: 'operational_readiness' })),
    ...d5Result.flags.map(f => ({ ...f, dimension: 'value_creation' })),
  ];

  // Add FDI flags
  if (fdiResult.adjusted >= 6) {
    allFlags.push({ type: 'red', text: `FDI ${fdiResult.adjusted}/8 (proxy-adjusted) — critical founder dependency`, dimension: 'key_person_risk' });
  } else if (fdiResult.adjusted >= 4) {
    allFlags.push({ type: 'amber', text: `FDI ${fdiResult.adjusted}/8 (proxy-adjusted) — moderate founder dependency`, dimension: 'key_person_risk' });
  } else {
    allFlags.push({ type: 'green', text: `FDI ${fdiResult.adjusted}/8 — manageable key-person risk`, dimension: 'key_person_risk' });
  }

  return {
    composite,
    classification,
    dimensions: {
      d1: d1Result.score,
      d2: d2Result.score,
      d3: d3Result.score,
      d4: d4Result.score,
      d5: d5Result.score,
    },
    value_creation_type: classifyValueCreationType(deal),
    flags: allFlags,
    circuit_breakers: [],
    modifiers_applied: modifiers,
    deal_structure_advisory: generateDealStructureAdvisory(deal, fdiResult),
    margin_expansion: estimateMarginExpansion(deal),
    fdi_v2: fdiResult,
    is_suspended: false,
    reclassification: null,
  };
}

export { config };
