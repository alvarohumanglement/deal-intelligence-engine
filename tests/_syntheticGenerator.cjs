/**
 * Synthetic CIM Generator
 * Produces internally consistent restaurant group profiles.
 * 
 * Key principle: every variable is correlated with others.
 * An MD who has seen 200 deals will know instantly if the numbers don't add up.
 */

// ─── NAME GENERATION ────────────────────────────────────

const prefixes = [
  'Rosemary', 'Porto', 'Oleander', 'Copper', 'Fig', 'Marble', 'Sage', 'Ember',
  'Stone', 'Cedar', 'Vine', 'Olive', 'Basil', 'Saffron', 'Terrace', 'Corso',
  'Luca', 'Sardinia', 'Amalfi', 'Cypress', 'Pomelo', 'Sienna', 'Alba',
  'Adriana', 'Riviera', 'Luna', 'Nocello', 'Oro', 'Piazza', 'Vento'
];

const suffixes = [
  'Kitchen', 'House', 'Table', 'Room', '& Vine', '& Co',
  'Hospitality Group', 'Restaurant Group', 'Collective', 'Holdings'
];

function generateName() {
  const p1 = prefixes[Math.floor(Math.random() * prefixes.length)];
  const useDouble = Math.random() < 0.3;
  let p2;
  if (useDouble) {
    do { p2 = prefixes[Math.floor(Math.random() * prefixes.length)]; } while (p2 === p1);
    const connector = Math.random() < 0.5 ? ' & ' : ' ';
    return `${p1}${connector}${p2} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  }
  return `${p1} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
}

// ─── WEIGHTED RANDOM ────────────────────────────────────

function weightedRandom(options) {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (const o of options) {
    r -= o.weight;
    if (r <= 0) return o.value;
  }
  return options[options.length - 1].value;
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomInRange(min, max + 1));
}

// ─── CITY DATA ──────────────────────────────────────────

const metros = [
  { city: 'New York', weight: 15, state: 'NY' },
  { city: 'Los Angeles', weight: 12, state: 'CA' },
  { city: 'Chicago', weight: 10, state: 'IL' },
  { city: 'Washington DC', weight: 10, state: 'DC' },
  { city: 'Miami', weight: 9, state: 'FL' },
  { city: 'Atlanta', weight: 8, state: 'GA' },
  { city: 'San Francisco', weight: 7, state: 'CA' },
  { city: 'Houston', weight: 6, state: 'TX' },
  { city: 'Dallas', weight: 5, state: 'TX' },
  { city: 'Nashville', weight: 5, state: 'TN' },
  { city: 'Boston', weight: 4, state: 'MA' },
  { city: 'Denver', weight: 3, state: 'CO' },
  { city: 'Seattle', weight: 3, state: 'WA' },
  { city: 'Philadelphia', weight: 3, state: 'PA' },
];

function pickCities(n) {
  const available = [...metros];
  const picked = [];
  for (let i = 0; i < n && available.length > 0; i++) {
    const city = weightedRandom(available.map(c => ({ value: c, weight: c.weight })));
    picked.push(city);
    available.splice(available.indexOf(city), 1);
  }
  return picked;
}

// ─── CUISINE PROFILES ───────────────────────────────────

const cuisineProfiles = {
  med: {
    label: 'Mediterranean',
    avgCheckRange: [55, 85],
    primeCostRange: [59, 66],
    ebitdaRange: [17, 24],
    locationsRange: [5, 15],
    weight: 35
  },
  italian: {
    label: 'Italian',
    avgCheckRange: [45, 78],
    primeCostRange: [58, 65],
    ebitdaRange: [17, 25],
    locationsRange: [5, 15],
    weight: 30
  },
  med_italian: {
    label: 'Mediterranean / Italian',
    avgCheckRange: [50, 82],
    primeCostRange: [58, 66],
    ebitdaRange: [17, 24],
    locationsRange: [6, 14],
    weight: 35
  }
};

// ─── RED FLAG POOL ──────────────────────────────────────

const redFlagPool = [
  { text: 'No documented succession plan', prob: 0.35, condition: (d) => d.fdi_declared >= 4 },
  { text: 'Revenue concentration >55% in top 2 locations', prob: 0.25, condition: () => true },
  { text: 'Tech stack: 3+ systems fragmented', prob: 0.40, condition: (d) => d.tech_status === 'fragmented' },
  { text: 'GM tenure avg < 18 months', prob: 0.20, condition: (d) => d.gm_tenure_months < 18 },
  { text: 'Chef-founder with no professional management team', prob: 0.25, condition: (d) => !d.has_pro_cfo },
  { text: 'Single-city geographic concentration', prob: 0.30, condition: (d) => d.cities === 1 },
  { text: 'Recent negative press or health department flags', prob: 0.10, condition: () => true },
  { text: 'Lease costs trending above 9% of revenue', prob: 0.15, condition: (d) => d.lease_cost_pct > 8.5 },
  { text: 'Menu unchanged for 3+ years', prob: 0.20, condition: () => true },
  { text: 'No standardized onboarding or training program', prob: 0.30, condition: () => true },
  { text: 'Supplier relationships entirely personal (founder-dependent)', prob: 0.25, condition: (d) => d.fdi_declared >= 3 },
  { text: 'AvT food cost variance estimated above sector norm', prob: 0.20, condition: () => true },
  { text: 'Seasonal revenue pattern with fixed lease base', prob: 0.10, condition: (d) => d.is_seasonal },
  { text: 'No centralized financial reporting across locations', prob: 0.25, condition: (d) => !d.has_pro_cfo },
  { text: 'Founder age 60+ with no transition conversation initiated', prob: 0.15, condition: (d) => d.founder_age >= 60 && d.readiness !== 'high' },
];

function pickRedFlags(deal, count = 3) {
  const eligible = redFlagPool.filter(f => f.condition(deal) && Math.random() < f.prob);
  const shuffled = eligible.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(f => f.text);
}

// ─── CONSISTENCY RULES ──────────────────────────────────

function validateConsistency(deal) {
  // Founder 62+ AND FDI ≤ 2 = unrealistic
  if (deal.founder_age >= 62 && deal.fdi_declared <= 2) return false;

  // Prime cost 58% AND margin < 15% = mathematically impossible
  if (deal.prime_cost_pct <= 59 && deal.ebitda_margin_pct < 15) return false;

  // Revenue > $50M AND locations < 5 = only fine dining (check > $100)
  if (deal.revenue_M > 50 && deal.locations < 5 && deal.avg_check < 100) return false;

  // Lease > 12% would make most deals nonviable
  if (deal.lease_cost_pct > 12.5) return false;

  // EBITDA margin + prime cost + rent + other should ≈ 100%
  const impliedOther = 100 - deal.prime_cost_pct - deal.ebitda_margin_pct - deal.lease_cost_pct;
  if (impliedOther < 3 || impliedOther > 20) return false;

  return true;
}

// ─── MAIN GENERATOR ─────────────────────────────────────

function generateSyntheticDeal() {
  let deal;
  let attempts = 0;

  do {
    attempts++;
    if (attempts > 100) throw new Error('Failed to generate consistent deal after 100 attempts');

    // 1. Cuisine
    const cuisineKey = weightedRandom(
      Object.entries(cuisineProfiles).map(([k, v]) => ({ value: k, weight: v.weight }))
    );
    const cuisine = cuisineProfiles[cuisineKey];

    // 2. Geography
    const numCities = weightedRandom([
      { value: 1, weight: 15 },
      { value: 2, weight: 40 },
      { value: 3, weight: 35 },
      { value: 4, weight: 10 },
    ]);
    const cities = pickCities(numCities);

    // 3. Locations (correlated with cuisine)
    const locations = randomInt(cuisine.locationsRange[0], cuisine.locationsRange[1]);

    // 4. Average check (from cuisine profile)
    const avgCheck = Math.round(randomInRange(cuisine.avgCheckRange[0], cuisine.avgCheckRange[1]));

    // 5. Revenue (derived: locations × avg_check × seats × turns × operating_days / 1M)
    const seatsPerLocation = randomInt(60, 120);
    const turnsPerService = randomInRange(1.2, 2.0);
    const operatingDays = randomInt(310, 355);
    const impliedRevenue = (locations * seatsPerLocation * turnsPerService * avgCheck * operatingDays) / 1_000_000;
    // Clamp to thesis range with noise
    const revenue = Math.round(Math.max(15, Math.min(80, impliedRevenue + randomInRange(-5, 5))));

    // 6. EBITDA margin (from cuisine profile)
    const ebitdaMargin = Math.round(randomInRange(cuisine.ebitdaRange[0], cuisine.ebitdaRange[1]));

    // 7. Prime cost (from cuisine profile, inversely correlated with margin)
    const basePrime = randomInRange(cuisine.primeCostRange[0], cuisine.primeCostRange[1]);
    const marginAdjustment = (ebitdaMargin - 20) * -0.3; // higher margin → slightly lower prime
    const primeCost = Math.round(Math.max(57, Math.min(70, basePrime + marginAdjustment)));

    // 8. Founder age
    const founderAge = randomInt(44, 67);

    // 9. FDI (correlated with founder age)
    let baseFDI;
    if (founderAge >= 60) baseFDI = randomInt(3, 6);
    else if (founderAge >= 50) baseFDI = randomInt(2, 5);
    else baseFDI = randomInt(1, 4);

    // 10. Readiness (inversely correlated with FDI)
    const readiness = weightedRandom([
      { value: 'high', weight: baseFDI <= 2 ? 50 : baseFDI <= 4 ? 25 : 10 },
      { value: 'medium', weight: 40 },
      { value: 'low', weight: baseFDI >= 5 ? 30 : baseFDI >= 3 ? 15 : 5 },
    ]);

    // 11. GM tenure (inversely correlated with FDI)
    const gmTenure = baseFDI >= 5 ? randomInt(6, 18) : baseFDI >= 3 ? randomInt(12, 30) : randomInt(18, 48);

    // 12. Tech status
    const techStatus = weightedRandom([
      { value: 'active', weight: 10 },
      { value: 'unified', weight: 20 },
      { value: 'dormant', weight: 10 },
      { value: 'fragmented', weight: 55 },
      { value: 'none', weight: 5 },
    ]);

    // 13. Other flags
    const hasCFO = Math.random() < (founderAge < 55 ? 0.70 : 0.55);
    const hasMinority = Math.random() < 0.12;
    const hasLitigation = Math.random() < 0.05;
    const isSeasonal = cities.some(c => ['Miami', 'Naples'].includes(c.city)) && Math.random() < 0.25;
    const priorFail = Math.random() < 0.10;
    const leaseCost = isSeasonal ? randomInRange(8, 12) : randomInRange(6, 10);
    const ssg = Math.random() < 0.15 ? randomInRange(-3, 0) : randomInRange(1, 5.5);
    const avt = Math.random() < 0.3 ? null : Math.round(randomInRange(1, 8) * 10) / 10;

    deal = {
      name: generateName(),
      cuisine: cuisineKey,
      cuisine_label: cuisine.label,
      revenue_M: revenue,
      ebitda_margin_pct: ebitdaMargin,
      prime_cost_pct: primeCost,
      avg_check: avgCheck,
      locations,
      cities: numCities,
      city_names: cities.map(c => `${c.city}, ${c.state}`),
      founder_age: founderAge,
      fdi_declared: baseFDI,
      readiness,
      gm_tenure_months: gmTenure,
      tech_status: techStatus,
      avt_variance_pct: avt,
      lease_cost_pct: Math.round(leaseCost * 10) / 10,
      ssg_pct: Math.round(ssg * 10) / 10,
      has_pro_cfo: hasCFO,
      has_minority_investor: hasMinority,
      has_active_litigation: hasLitigation,
      is_seasonal: isSeasonal,
      has_prior_expansion_failure: priorFail,
    };
  } while (!validateConsistency(deal));

  // Add red flags
  deal.red_flags = pickRedFlags(deal);

  // Add computed metadata
  deal.revenue_per_location = Math.round(deal.revenue_M / deal.locations * 10) / 10;
  deal.ebitda_M = Math.round(deal.revenue_M * deal.ebitda_margin_pct / 100 * 10) / 10;

  return deal;
}
module.exports = { generateSyntheticDeal };
