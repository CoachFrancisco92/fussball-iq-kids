// V0.6c – Rechenzeit Freilauf-Hilfe und längster Tick in Run-Szenen über die Lagen R (ungedrosselt, Node).
//   node tests/analysis/v0.6c/rechenzeit.js <Engine-Stand-Ordner> <Ordner mit tests/analysis/v0.6c/lagen.js>
// Vergleich mit v0.6.2: git archive v0.6.2 | tar -x -C /tmp/v062 ; dann beide Stände messen.
const R0 = process.argv[2], E = require(R0 + '/tests/helpers/load.js');
const { lagenR } = require(process.argv[3] + '/tests/analysis/v0.6c/lagen.js');
const L = lagenR(E), hz = [], tick = [], szene = [];
for (const { s } of L) { const t0 = performance.now(); E.hint(s, 'freilaufen'); hz.push(performance.now() - t0); }
for (const { s: s0 } of L.slice(0, 53)) { const c = E.carrier(s0); for (const r of E.team(s0, 'blue').filter((b) => b !== c)) for (let x = 2; x < 35; x += 3) for (let y = 2; y < 23; y += 3) {
  const s = E.clone(s0); E.startAction(s, { kind: 'run', id: r.id, x, y }); let mx = 0, n = 0; const t1 = performance.now();
  while (!s.ep.done && n++ < 5000) { const t = performance.now(); E.tick(s); mx = Math.max(mx, performance.now() - t); }
  szene.push(performance.now() - t1); tick.push(mx); } }
const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return Math.round(b[Math.min(b.length - 1, Math.floor(p * b.length))] * 10) / 10; };
console.log(JSON.stringify({ hilfe: { median: q(hz, 0.5), p90: q(hz, 0.9), max: q(hz, 1) }, tickMax: { p99: q(tick, 0.99), max: q(tick, 1), ueber16ms: tick.filter((x) => x > 16).length, szenen: tick.length }, szene: { max: q(szene, 1) } }));
