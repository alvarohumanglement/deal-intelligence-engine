const { generateSyntheticDeal } = require('./_syntheticGenerator.cjs');

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  SYNTHETIC CIM GENERATOR — CONSISTENCY TEST         ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

const deals = [];
for (let i = 0; i < 20; i++) {
  deals.push(generateSyntheticDeal());
}

deals.forEach((d, i) => {
  console.log(`${String(i+1).padStart(2)}. ${d.name}`);
  console.log(`   ${d.cuisine_label} — ${d.city_names.join(', ')} — ${d.locations} locs`);
  console.log(`   Rev:$${d.revenue_M}M  EBITDA:${d.ebitda_margin_pct}%  Prime:${d.prime_cost_pct}%  Check:$${d.avg_check}  FDI:${d.fdi_declared}/${d.readiness}`);
  console.log(`   Founder:${d.founder_age}  GM:${d.gm_tenure_months}mo  Tech:${d.tech_status}  Lease:${d.lease_cost_pct}%  SSG:${d.ssg_pct}%`);
  if (d.red_flags.length) console.log(`   Flags: ${d.red_flags.join(' | ')}`);
  console.log('');
});

// Validate ranges
let issues = 0;
deals.forEach((d, i) => {
  if (d.revenue_M < 15 || d.revenue_M > 80) { console.log(`ISSUE #${i+1}: Revenue ${d.revenue_M} out of range`); issues++; }
  if (d.ebitda_margin_pct < 14 || d.ebitda_margin_pct > 26) { console.log(`ISSUE #${i+1}: EBITDA ${d.ebitda_margin_pct} out of range`); issues++; }
  if (d.prime_cost_pct < 57 || d.prime_cost_pct > 70) { console.log(`ISSUE #${i+1}: Prime ${d.prime_cost_pct} out of range`); issues++; }
  if (d.founder_age >= 62 && d.fdi_declared <= 2) { console.log(`ISSUE #${i+1}: Founder ${d.founder_age} with FDI ${d.fdi_declared}`); issues++; }
});

console.log(`${issues === 0 ? '✓' : '✗'} Consistency check: ${issues} issues found in 20 deals`);
