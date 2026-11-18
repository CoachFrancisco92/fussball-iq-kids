// Analyse (kein Test): Grenzfälle der Passweg-Schwelle (CFG.passLaneOk) in echten Lagen aus Mission 1.
// 1) Pässe zu Mitspielern mit Passweg-Reserve nahe 0,2 s: Abstand des nächsten Gegners zum Ballweg, Simulation, Störungen.
// 2) Was würde sich an den Sternen der 710 Kinder-Entscheidungen ändern, wenn NUR die Bewertung eine andere Schwelle nutzte?
// Aufruf: node tests/analysis/lane-cases.js
const E = require('../helpers/load.js');
const { collect, simulate } = require('./collect.js');
const C = E.CFG;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function pathDist(a, b, q) { const L = dist(a, b) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L; const t = Math.max(0, Math.min(L, (q.x - a.x) * ux + (q.y - a.y) * uy)); return Math.hypot(a.x + ux * t - q.x, a.y + uy * t - q.y); }
const all = collect(E);
const seen = new Map();
for (const r of all) {
  if (r.s.poss !== 'blue' || !E.carrier(r.s) || !r.ctx.actions.includes('passen')) continue;
  const c = E.carrier(r.s);
  for (const o of E.passOptions(r.s)) {
    if (o.margin < 0.05 || o.margin > 0.45) continue;
    const key = JSON.stringify(r.s.players.map((p) => [p.x.toFixed(1), p.y.toFixed(1)])) + o.id;
    if (seen.has(key)) { seen.get(key).haeufig++; continue; }
    const to = E.P(r.s, o.id), a = { kind: 'pass', id: o.id };
    const near = E.team(r.s, 'red').map((q) => ({ id: q.id, d: pathDist(c, to, q) })).sort((x, y) => x.d - y.d)[0];
    const r0 = C.redReact; C.redReact = r0 - 0.1; const fast = simulate(E, r.s, a).success; C.redReact = r0;
    seen.set(key, { lage: `${c.id}→${o.id} (${dist(c, to).toFixed(1)} m)`, reserve: +o.margin.toFixed(2), bewertung: o.margin > C.passLaneOk ? 'frei' : 'Gegner nah', naechsterGegner: `${near.id} ${near.d.toFixed(2)} m vom Ballweg`, simulation: simulate(E, r.s, a).success ? 'kommt an' : 'Ballverlust', gegner01schneller: fast ? 'kommt an' : 'Ballverlust', haeufig: 1 });
  }
}
console.table([...seen.values()].sort((a, b) => a.reserve - b.reserve));
const stars = (th) => { const o = C.passLaneOk; C.passLaneOk = th; try { return all.map((r) => (r.s.poss === 'blue' && E.carrier(r.s) && ['pass', 'shoot', 'dribble'].includes(r.a.kind) ? E.evaluate(r.s, r.a).good : null)); } finally { C.passLaneOk = o; } };
const base = stars(C.passLaneOk);
for (const th of [0.1, 0.15, 0.25, 0.3, 0.4]) { const v = stars(th); let lost = 0, won = 0; v.forEach((x, i) => { if (base[i] && !x) lost++; if (!base[i] && x) won++; }); console.log(`passLaneOk ${th}: Sterne −${lost} / +${won} (nur Bewertung; Gegnerverhalten nutzt dieselbe Schwelle und würde sich zusätzlich ändern)`); }
