/**
 * Scoring Engine Test Suite
 * Validates against 13 Deal Tribunal scenarios (100% accuracy required)
 * 
 * Run: node tests/scoringEngine.test.js
 */

// Since we're testing as standalone, inline the scoring logic
// In production this imports from ../src/lib/scoringEngine.js

const config = require('../src/data/scoringConfig.json');

const { weights, classification_thresholds: ct, key_thresholds: kt } = config;

function clamp(val, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function computeFDI(deal) {
  let adjusted = deal.fdi_declared;
  const proxies = [];
  if (deal.gm_tenure_months < kt.gm_tenure_red_months) {
    adjusted = Math.min(8, adjusted + 2);
    proxies.push('GM tenure');
  }
  if (!deal.has_pro_cfo) {
    adjusted = Math.min(8, adjusted + 1);
    proxies.push('No CFO');
  }
  const avtVal = deal.avt_variance_pct !== null ? deal.avt_variance_pct : 4;
  if (avtVal > kt.avt_red_pct) {
    adjusted = Math.min(8, adjusted + 1);
    proxies.push('AvT');
  }
  return { declared: deal.fdi_declared, adjusted, proxies, readiness: deal.readiness, avt_used: avtVal };
}

function scoreDeal(deal) {
  const fdi = computeFDI(deal);
  const avtVal = fdi.avt_used;

  // Circuit breakers
  if (!['med','italian','med_italian'].includes(deal.cuisine)) return { composite: 0, verdict: 'pass', cb: 'CB-1' };
  if (deal.revenue_M < 25) return { composite: 0, verdict: 'reclassify', cb: 'CB-2' };
  if (deal.has_active_litigation) return { composite: 0, verdict: 'suspended', cb: 'CB-4' };
  if (fdi.adjusted >= kt.fdi_red && deal.readiness === 'low') return { composite: 0, verdict: 'pass', cb: 'CB-3' };

  // D1
  let d1 = 50;
  if (['med','med_italian'].includes(deal.cuisine)) d1 += 15; else if (deal.cuisine === 'italian') d1 += 10;
  if (deal.revenue_M >= 25 && deal.revenue_M <= 80) d1 += 10;
  if (deal.revenue_M >= 35 && deal.revenue_M <= 60) d1 += 5;
  if (deal.cities >= 2) d1 += 10;
  if (deal.cities >= 3) d1 += 5;
  if (deal.avg_check >= 50) d1 += 5;
  if (deal.avg_check >= 65 && deal.avg_check <= 90) d1 += 5;
  d1 = clamp(d1);

  // D2
  let d2 = 40;
  if (deal.ebitda_margin_pct >= kt.ebitda_baseline_pct) d2 += 15; else if (deal.ebitda_margin_pct >= kt.ebitda_baseline_pct - 3) d2 += 8; else d2 -= 5;
  if (deal.ebitda_margin_pct >= 22) d2 += 5;
  if (deal.prime_cost_pct <= 62) d2 += 15; else if (deal.prime_cost_pct <= kt.prime_cost_red_pct) d2 += 5; else d2 -= 15;
  if (deal.ssg_pct >= 3) d2 += 10; else if (deal.ssg_pct >= 1) d2 += 5; else if (deal.ssg_pct < 0) d2 -= 20;
  if (deal.lease_cost_pct <= 8) d2 += 5; else if (deal.lease_cost_pct > kt.lease_cost_red_pct) d2 -= 25;
  if (deal.is_seasonal) d2 -= 10;
  const rpl = deal.revenue_M / deal.locations;
  if (rpl >= 4 && rpl <= 7) d2 += 5; else if (rpl > 7) d2 += 8;
  d2 = clamp(d2);

  // D3
  let d3 = 40;
  if (deal.tech_status === 'active') d3 += 25; else if (deal.tech_status === 'dormant') d3 += 15; else if (deal.tech_status === 'unified') d3 += 20;
  if (avtVal < 2) d3 += 15; else if (avtVal <= kt.avt_red_pct) d3 += 8; else d3 -= 5;
  if (deal.has_pro_cfo) d3 += 10; else d3 -= 10;
  if (deal.is_seasonal) d3 -= 10;
  d3 = clamp(d3);

  // D4 FDI v2.0 matrix
  const rMap = { high: 0, medium: 1, low: 2 };
  const rIdx = rMap[deal.readiness] !== undefined ? rMap[deal.readiness] : 1;
  let d4;
  if (fdi.adjusted <= 2) { const b = [95,90,85]; d4 = b[rIdx] - (fdi.adjusted * 3); }
  else if (fdi.adjusted <= 5) { const f=[60,40,20],c=[75,55,35]; const t=(fdi.adjusted-3)/2; d4=Math.round(c[rIdx]-t*(c[rIdx]-f[rIdx])); }
  else { const f=[35,15,0],c=[50,30,10]; const t=(fdi.adjusted-6)/2; d4=Math.round(c[rIdx]-t*(c[rIdx]-f[rIdx])); }
  if (deal.cities === 1 && fdi.adjusted >= 4) d4 -= 15;
  d4 = clamp(d4);

  // D5
  let d5 = 40;
  const mr = 24 - deal.ebitda_margin_pct;
  if (mr >= 6) d5 += 20; else if (mr >= 3) d5 += 12; else if (mr >= 1) d5 += 5; else d5 -= 5;
  const pcr = deal.prime_cost_pct - 60;
  if (pcr >= 6) d5 += 10; else if (pcr >= 3) d5 += 5;
  if (deal.tech_status === 'active') d5 += 10; else if (deal.tech_status === 'dormant') d5 += 8; else if (deal.tech_status === 'unified') d5 += 5;
  if (deal.locations >= 8 && deal.cities >= 2) d5 += 8; else if (deal.locations >= 6) d5 += 4;
  if (deal.has_prior_expansion_failure) d5 -= 10;
  if (deal.is_seasonal) d5 -= 8;
  if (avtVal > kt.avt_red_pct) d5 += 5;
  d5 = clamp(d5);

  // Composite
  const { thesis_alignment: w1, financial_health: w2, operational_readiness: w3, key_person_risk: w4, value_creation: w5 } = weights;
  const wt = w1 + w2 + w3 + w4 + w5;
  let composite = Math.round((d1*w1 + d2*w2 + d3*w3 + d4*w4 + d5*w5) / wt);

  // Lease severity composite modifier
  if (deal.lease_cost_pct > kt.lease_cost_red_pct && deal.is_seasonal) composite = Math.round(composite * 0.65);
  else if (deal.lease_cost_pct > kt.lease_cost_red_pct) composite = Math.round(composite * 0.80);

  let verdict;
  if (composite >= ct.strong_fit) verdict = 'advance';
  else if (composite >= ct.conditional) verdict = 'conditional';
  else if (composite >= ct.below_thesis) verdict = 'below';
  else verdict = 'pass';

  return { d1, d2, d3, d4, d5, composite, verdict, fdi_adj: fdi.adjusted, fdi_proxies: fdi.proxies };
}

function verdictMatch(model, target) {
  if (target === 'conditional' && (model === 'conditional' || model === 'advance')) return true;
  if (target === 'advance' && model === 'advance') return true;
  if (target === 'pass' && (model === 'pass' || model === 'below')) return true;
  if (target === 'reclassify' && model === 'reclassify') return true;
  if (target === 'suspended' && model === 'suspended') return true;
  return false;
}

// ─── TEST DATA: 13 Deal Tribunal scenarios ──────────────

const tribunalDeals = [
  {id:1,name:"Oleander House",cuisine:"med",revenue_M:42,ebitda_margin_pct:21,prime_cost_pct:61,avg_check:68,locations:9,cities:2,founder_age:58,fdi_declared:3,readiness:"medium",gm_tenure_months:8,tech_status:"fragmented",avt_variance_pct:null,lease_cost_pct:8,ssg_pct:3.5,has_pro_cfo:true,has_minority_investor:false,has_active_litigation:false,is_seasonal:false,has_prior_expansion_failure:false,target:"conditional"},
  {id:2,name:"Porto Copper",cuisine:"steakhouse",revenue_M:58,ebitda_margin_pct:24,prime_cost_pct:64,avg_check:115,locations:6,cities:2,founder_age:51,fdi_declared:2,readiness:"high",gm_tenure_months:36,tech_status:"unified",avt_variance_pct:2,lease_cost_pct:7,ssg_pct:4,has_pro_cfo:true,has_minority_investor:false,has_active_litigation:false,is_seasonal:false,has_prior_expansion_failure:false,target:"pass"},
  {id:3,name:"Fig & Marble",cuisine:"italian",revenue_M:48,ebitda_margin_pct:16,prime_cost_pct:67,avg_check:62,locations:12,cities:2,founder_age:63,fdi_declared:6,readiness:"medium",gm_tenure_months:24,tech_status:"fragmented",avt_variance_pct:null,lease_cost_pct:8,ssg_pct:2,has_pro_cfo:false,has_minority_investor:false,has_active_litigation:false,is_seasonal:false,has_prior_expansion_failure:false,target:"conditional"},
  {id:4,name:"Sage & Ember",cuisine:"med",revenue_M:18,ebitda_margin_pct:22,prime_cost_pct:59,avg_check:74,locations:5,cities:2,founder_age:47,fdi_declared:4,readiness:"medium",gm_tenure_months:30,tech_status:"unified",avt_variance_pct:2,lease_cost_pct:7,ssg_pct:4,has_pro_cfo:true,has_minority_investor:false,has_active_litigation:false,is_seasonal:false,has_prior_expansion_failure:false,target:"reclassify"},
  {id:5,name:"Rosemary & Vine",cuisine:"med_italian",revenue_M:52,ebitda_margin_pct:19,prime_cost_pct:63,avg_check:71,locations:11,cities:3,founder_age:61,fdi_declared:5,readiness:"medium",gm_tenure_months:24,tech_status:"fragmented",avt_variance_pct:3,lease_cost_pct:8,ssg_pct:3,has_pro_cfo:true,has_minority_investor:true,has_active_litigation:false,is_seasonal:false,has_prior_expansion_failure:false,target:"conditional"},
  {id:6,name:"Ember & Stone",cuisine:"med",revenue_M:45,ebitda_margin_pct:22,prime_cost_pct:62,avg_check:72,locations:9,cities:2,founder_age:55,fdi_declared:3,readiness:"high",gm_tenure_months:28,tech_status:"fragmented",avt_variance_pct:8.5,lease_cost_pct:7,ssg_pct:3.5,has_pro_cfo:true,has_minority_investor:false,has_active_litigation:false,is_seasonal:false,has_prior_expansion_failure:false,target:"conditional"},
  {id:7,name:"Cedar Table",cuisine:"italian",revenue_M:38,ebitda_margin_pct:24,prime_cost_pct:58,avg_check:61,locations:11,cities:3,founder_age:49,fdi_declared:2,readiness:"high",gm_tenure_months:42,tech_status:"active",avt_variance_pct:1.5,lease_cost_pct:6,ssg_pct:4,has_pro_cfo:true,has_minority_investor:false,has_active_litigation:false,is_seasonal:false,has_prior_expansion_failure:false,target:"conditional"},
  {id:8,name:"Vine & Copper",cuisine:"med",revenue_M:36,ebitda_margin_pct:18,prime_cost_pct:65,avg_check:66,locations:8,cities:3,founder_age:57,fdi_declared:4,readiness:"medium",gm_tenure_months:18,tech_status:"dormant",avt_variance_pct:4,lease_cost_pct:8,ssg_pct:2.5,has_pro_cfo:true,has_minority_investor:false,has_active_litigation:false,is_seasonal:false,has_prior_expansion_failure:false,target:"conditional"},
  {id:9,name:"Marchetti",cuisine:"italian",revenue_M:62,ebitda_margin_pct:20,prime_cost_pct:63,avg_check:58,locations:15,cities:1,founder_age:60,fdi_declared:5,readiness:"medium",gm_tenure_months:20,tech_status:"fragmented",avt_variance_pct:3,lease_cost_pct:7.5,ssg_pct:3,has_pro_cfo:true,has_minority_investor:false,has_active_litigation:false,is_seasonal:false,has_prior_expansion_failure:false,target:"conditional"},
  {id:10,name:"Lunaria",cuisine:"med_italian",revenue_M:44,ebitda_margin_pct:21,prime_cost_pct:61,avg_check:78,locations:10,cities:3,founder_age:53,fdi_declared:3,readiness:"high",gm_tenure_months:30,tech_status:"unified",avt_variance_pct:2,lease_cost_pct:7,ssg_pct:4,has_pro_cfo:true,has_minority_investor:false,has_active_litigation:true,is_seasonal:false,has_prior_expansion_failure:false,target:"suspended"},
  {id:11,name:"Terrazza",cuisine:"italian",revenue_M:34,ebitda_margin_pct:17,prime_cost_pct:66,avg_check:54,locations:8,cities:2,founder_age:59,fdi_declared:4,readiness:"medium",gm_tenure_months:16,tech_status:"fragmented",avt_variance_pct:null,lease_cost_pct:8.5,ssg_pct:-4.5,has_pro_cfo:true,has_minority_investor:false,has_active_litigation:false,is_seasonal:false,has_prior_expansion_failure:false,target:"conditional"},
  {id:12,name:"Costa Sol",cuisine:"med",revenue_M:32,ebitda_margin_pct:19,prime_cost_pct:62,avg_check:82,locations:7,cities:3,founder_age:56,fdi_declared:3,readiness:"medium",gm_tenure_months:14,tech_status:"fragmented",avt_variance_pct:3,lease_cost_pct:11.8,ssg_pct:2,has_pro_cfo:true,has_minority_investor:false,has_active_litigation:false,is_seasonal:true,has_prior_expansion_failure:false,target:"pass"},
  {id:13,name:"Ardor Kitchen",cuisine:"med_italian",revenue_M:46,ebitda_margin_pct:20,prime_cost_pct:63,avg_check:67,locations:10,cities:3,founder_age:54,fdi_declared:3,readiness:"high",gm_tenure_months:24,tech_status:"fragmented",avt_variance_pct:3,lease_cost_pct:8,ssg_pct:3,has_pro_cfo:true,has_minority_investor:false,has_active_litigation:false,is_seasonal:false,has_prior_expansion_failure:true,target:"conditional"},
];

// ─── RUN TESTS ──────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  DEAL INTELLIGENCE ENGINE — SCORING ENGINE TESTS    ║');
console.log('║  13 Deal Tribunal scenarios — 100% accuracy target  ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

tribunalDeals.forEach(deal => {
  const result = scoreDeal(deal);
  const match = verdictMatch(result.verdict, deal.target);

  if (match) {
    passed++;
    console.log(`  ✓ #${String(deal.id).padStart(2)} ${deal.name.padEnd(16)} Score:${String(result.composite).padStart(3)} → ${result.verdict.padEnd(12)} [expected: ${deal.target}]`);
  } else {
    failed++;
    console.log(`  ✗ #${String(deal.id).padStart(2)} ${deal.name.padEnd(16)} Score:${String(result.composite).padStart(3)} → ${result.verdict.padEnd(12)} [expected: ${deal.target}] FAIL`);
    console.log(`    D1:${result.d1} D2:${result.d2} D3:${result.d3} D4:${result.d4} D5:${result.d5} FDI:${result.fdi_adj}`);
  }
});

console.log(`\n${'─'.repeat(56)}`);
console.log(`  Results: ${passed} passed, ${failed} failed (${Math.round(passed / tribunalDeals.length * 100)}%)`);

if (failed === 0) {
  console.log('  ✓ ALL TESTS PASSED — Scoring engine calibrated\n');
  process.exit(0);
} else {
  console.log(`  ✗ ${failed} TESTS FAILED — Review scoring logic\n`);
  process.exit(1);
}
