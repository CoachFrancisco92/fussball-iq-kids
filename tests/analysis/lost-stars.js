// Analyse (kein Test): die Raumpässe, die durch E1 ihren Stern verlieren, einzeln prüfen.
// Für jeden Fall: Status/Reserve, Ergebnis in der Simulation, Ergebnis bei kleinen Störungen (Gegner 0,1 s schneller
// bzw. ein Gegner 0,5 m näher am Zielpunkt), Richtung, Nähe zum eigenen Tor, nächster sicherer Punkt.
// Aufruf: node tests/analysis/lost-stars.js  (Liste kommt aus tests/golden/diff.js)
const E = require('../helpers/load.js');
const { collect, simulate } = require('./collect.js');
const C = E.CFG, F = E.F;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (p) => ({ x: Math.max(0.7, Math.min(F.W - 0.7, p.x)), y: Math.max(0.7, Math.min(F.H - 0.7, p.y)) });
const all = collect(E);
const lost = all.filter(({ s, a }) => {
  if (a.kind !== 'pass' || a.id || s.poss !== 'blue') return false;
  const c = E.carrier(s), info = E.spacePassInfo(s, c, clamp(a)), ev = E.evaluate(s, a);
  // vorher (v0.2.4): Stern, wenn Entscheidung gut und Passweg frei (margin > passLaneOk) – jetzt kein Stern
  return ev.rec.good && info.lane > C.passLaneOk && !ev.good;
});
function perturbed(s, a) {
  const res = [];
  const r0 = C.redReact; C.redReact = r0 - 0.1; res.push(simulate(E, s, a).success); C.redReact = r0;
  const to = clamp(a);
  for (const d of E.team(s, 'red')) { const t = E.clone(s), q = E.P(t, d.id), L = dist(q, to) || 1, k = Math.min(0.5, L) / L; q.x += (to.x - q.x) * k; q.y += (to.y - q.y) * k; q.tx = q.x; q.ty = q.y; res.push(simulate(E, t, a).success); }
  return res;
}
const rows = lost.map(({ seed, step, s, a }) => {
  const c = E.carrier(s), to = clamp(a), info = E.spacePassInfo(s, c, to), sim = simulate(E, s, a), pert = perturbed(s, a), sit = E.situation(s);
  let near = 99; for (let dx = -3; dx <= 3; dx += 0.25) for (let dy = -3; dy <= 3; dy += 0.25) { const p = clamp({ x: to.x + dx, y: to.y + dy }); if (dist(c, p) >= C.spaceMinDist && E.spacePassInfo(s, c, p).ok) near = Math.min(near, Math.hypot(dx, dy)); }
  const mate = Math.max(...E.passOptions(s).map((o) => o.margin));
  return { seed, step, von: `${c.id} (${c.x.toFixed(1)}/${c.y.toFixed(1)})`, ziel: `(${to.x.toFixed(1)}/${to.y.toFixed(1)})`, ausserhalb: to.x !== a.x || to.y !== a.y,
    richtung: +(to.x - c.x).toFixed(1), abstandEigeneLinie: +to.x.toFixed(1), status: info.status, reserve: +info.reserve.toFixed(2), weg: +info.lane.toFixed(2), empf: info.recv, gegner: info.key,
    simulation: sim.success ? 'angekommen' : 'Ballverlust', stoerungen: `${pert.filter(Boolean).length}/${pert.length}`, sichererPunktIn: near === 99 ? '–' : +near.toFixed(2) + ' m',
    freierMitspieler: sit.ok.mate ? 'ja (' + mate.toFixed(2) + ' s)' : 'nein', sichererRaumpass: sit.ok.space ? 'ja' : 'nein' };
});
if (require.main === module) { console.table(rows); }
module.exports = { rows };
