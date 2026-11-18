// Analyse (kein Test): Passweg-Schwelle (passLaneOk 0,2 s) und Empfangsreserve (spaceReserve 0,3 s) gegen die
// SIMULATION prüfen – nicht gegen das Rechenmodell. Für echte Lagen aus Mission 1 (200 Kinder-Abfolgen) werden
// Pässe zu Mitspielern und in den Raum vollständig simuliert: ungestört und mit kleinen Störungen
// (Gegner reagieren 0,1 s schneller; ein Gegner steht 0,5 m bzw. 1 m näher am Ballweg/Zielpunkt).
// Aufruf: node tests/analysis/thresholds.js [rasterMeter=3]
const E = require('../helpers/load.js');
const { collect, simulate } = require('./collect.js');
const C = E.CFG, F = E.F;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const step = +(process.argv[2] || 3);
const seen = new Set(), states = [];
for (const r of collect(E)) {
  if (r.s.poss !== 'blue' || !E.carrier(r.s) || !r.ctx.actions.includes('passen')) continue;
  const k = JSON.stringify(r.s.players.map((p) => [p.x.toFixed(1), p.y.toFixed(1)])); if (seen.has(k)) continue; seen.add(k); states.push(r.s);
}
// Gegner d Meter näher an den Punkt p schieben (Kopie)
function moved(s, id, p, d) { const t = E.clone(s), q = E.P(t, id), L = dist(q, p) || 1, k = Math.min(d, L) / L; q.x += (p.x - q.x) * k; q.y += (p.y - q.y) * k; q.tx = q.x; q.ty = q.y; return t; }
function closestOnPath(a, b, q) { const L = dist(a, b) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L; const t = Math.max(0, Math.min(L, (q.x - a.x) * ux + (q.y - a.y) * uy)); return { x: a.x + ux * t, y: a.y + uy * t }; }
function robust(s, a, to) {
  const c = E.carrier(s), r = {};
  const r0 = C.redReact; C.redReact = r0 - 0.1; r.react = simulate(E, s, a).success; C.redReact = r0;
  for (const d of [0.5, 1]) for (const [name, aim] of [['weg', (q) => closestOnPath(c, to, q)], ['ziel', () => to]]) {
    // jeder Gegner einzeln d Meter näher an den Ballweg bzw. an den Zielpunkt
    r[name + d] = E.team(s, 'red').every((q) => simulate(E, moved(s, q.id, aim(q), d), a).success);
  }
  return r;
}
const rows = [];
for (const s of states) {
  const c = E.carrier(s);
  for (const o of E.passOptions(s)) { const to = E.P(s, o.id), a = { kind: 'pass', id: o.id }; const sim = simulate(E, s, a); rows.push(Object.assign({ typ: 'mate', lane: o.margin, sim: sim.success, ev: E.evaluate(s, a).exe.good }, sim.success ? robust(s, a, to) : {})); }
  for (let x = 1.5; x < F.W - 1; x += step) for (let y = 1.5; y < F.H - 1; y += step) {
    const to = { x, y }; if (dist(c, to) < C.spaceMinDist) continue;
    const info = E.spacePassInfo(s, c, to), a = { kind: 'pass', x, y }, sim = simulate(E, s, a);
    rows.push(Object.assign({ typ: 'raum', lane: info.lane, reserve: info.reserve, status: info.status, sim: sim.success }, sim.success ? robust(s, a, to) : {}));
  }
}
const pct = (n, d) => (d ? Math.round((100 * n) / d) + ' %' : '–');
function table(title, list, key, edges) {
  console.log('\n' + title);
  console.log('Bereich          Anzahl  kommt an  Gegner 0,1 s schneller  Gegner 0,5 m näher am Weg / am Ziel  1 m näher am Weg / am Ziel');
  for (let i = 0; i < edges.length - 1; i++) {
    const g = list.filter((r) => r[key] > edges[i] && r[key] <= edges[i + 1]); const ok = g.filter((r) => r.sim);
    console.log(`(${edges[i].toFixed(2)}; ${edges[i + 1] > 5 ? ' ∞ ' : edges[i + 1].toFixed(2)}]`.padEnd(15) + String(g.length).padStart(6) + pct(ok.length, g.length).padStart(10) +
      pct(ok.filter((r) => r.react).length, g.length).padStart(14) + pct(ok.filter((r) => r['weg0.5']).length, g.length).padStart(22) + ' /' + pct(ok.filter((r) => r['ziel0.5']).length, g.length).padStart(6) + pct(ok.filter((r) => r.weg1).length, g.length).padStart(20) + ' /' + pct(ok.filter((r) => r.ziel1).length, g.length).padStart(6));
  }
}
console.log(`${states.length} Lagen, ${rows.length} simulierte Pässe (Raster ${step} m)`);
const L = [-9, 0, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.6, 99];
table('Pass zum Mitspieler nach Passweg-Reserve (s) – Schwelle passLaneOk 0,2', rows.filter((r) => r.typ === 'mate'), 'lane', L);
const raumWegOk = rows.filter((r) => r.typ === 'raum' && r.lane > C.passLaneOk);
table('Pass in den Raum nach Passweg-Reserve (s) – nur Empfang ≥ 0,3 s', rows.filter((r) => r.typ === 'raum' && r.reserve >= C.spaceReserve), 'lane', L);
table('Pass in den Raum (Weg > 0,2 s) nach Empfangsreserve (s) – Schwelle spaceReserve 0,3', raumWegOk, 'reserve', [-9, -0.05, 0, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.6, 99]);
module.exports = { rows };
