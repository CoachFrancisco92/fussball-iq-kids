// Dribbel-Lagen für Tests (Paket D): Zustände, in denen „Dribbeln“ angeboten wird – aus Mission 1 (Hilfe-Weg, feste Abläufe,
// Kinder-Abfolgen), Mission A (Spielweisen, Kinder-Abfolgen) und den Entwurfslagen „Freie Bahn!“ B1–B5 sowie A4.
const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run' };
const P = (id, x, y) => ({ id, x, y });
const ENTWURF = {
  B1: [P('b1', 17, 14), P('r1', 22, 9)], B3: [P('b1', 18, 12), P('r1', 15.5, 12)], B4: [P('b1', 17, 12), P('r1', 23, 12)],
  B2: [P('b1', 12, 12), P('r1', 19, 7), P('r2', 19, 17)], B5: [P('b1', 12, 13), P('r1', 23, 3), P('r2', 32, 17)],
  A4: [P('b1', 26, 12), P('b2', 21, 19), P('r1', 24, 9.5), P('r2', 34.4, 7.9)],
};
let probeN = 0;
/** Lage als eigene Situationsmission (nur im Speicher dieses Testprozesses). hilfe optional (Lernweg). */
function probeState(E, spieler, hilfe) {
  const id = 'test-dribbel-' + probeN++;
  globalThis.FIQ_MISSIONS.push({ id, nummer: 90 + (probeN % 9), titel: id, lernwelt: 9, lernziele: ['x'], schauSchritt: [], texte: {},
    situationen: [{ id: 'P', start: { ballbesitz: 'b1', spieler } }], phasen: { maxAngriff: 5, verteidigung: 0, abschlussNachGrenze: true },
    hilfe: hilfe || undefined });
  return E.newState(id, 0);
}
function lagen(E, { seeds = 60 } = {}) {
  const out = [], seen = new Set();
  const add = (src, s, ctx) => {
    if (!ctx.actions.includes('dribbeln')) return;
    const k = JSON.stringify(s.players.map((p) => [p.id, +p.x.toFixed(3), +p.y.toFixed(3)])) + s.ball.owner;
    if (seen.has(k)) return; seen.add(k); out.push({ src, s: E.clone(s) });
  };
  const T = require('../golden/trace.js');
  const hintChooser = (E2, s, ctx) => { const k = E2.recommend(s, ctx.actions), h = E2.hint(s, k); const a = { kind: MAP[k] || (k === 'raum' ? 'cover' : 'press') };
    if (h.ids && h.ids.length) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal; return a; };
  T.playMission(E, (E2, s, ctx) => { add('M1', s, ctx); return hintChooser(E2, s, ctx); });
  for (let seed = 1; seed <= seeds; seed++) {
    const rnd = T.lcg(seed), F = E.F;
    T.playMission(E, (E2, s, ctx) => { add('M1', s, ctx); const c = E2.carrier(s), blues = E2.team(s, 'blue'); const pick = (a) => a[Math.floor(rnd() * a.length)];
      const spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) }); const k = pick(ctx.actions);
      if (k === 'passen') return rnd() < 0.6 ? { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id } : Object.assign({ kind: 'pass' }, spot());
      if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot()); if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
      if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot());
      if (k === 'erobern') return { kind: 'press', id: pick(blues).id }; return Object.assign({ kind: 'cover', id: pick(blues).id }, spot()); });
  }
  const ma = require('../golden/mission-a.js');
  for (const f of Object.values(ma.STYLES)) for (let d = 0; d < 4; d++) ma.play(E, d, (E2, s, ctx, i) => { add('MA', s, ctx); return f(E2, s, ctx, i); });
  for (let seed = 1; seed <= seeds; seed++) { const rnd = T.lcg(seed); ma.play(E, seed % 4, (E2, s, ctx) => { add('MA', s, ctx); return ma.childAction(E2, s, ctx, rnd); }); }
  for (const [k, sp] of Object.entries(ENTWURF)) out.push({ src: k, s: probeState(E, sp) });
  return out;
}
/** Dribbling vollständig simulieren (Wahrheit, unabhängig von der Bewertung). */
function sim(E, s, to) {
  const t = E.clone(s), c0 = E.carrier(t);
  E.startAction(t, { kind: 'dribble', x: to.x, y: to.y });
  let n = 0; while (!t.ep.done && n++ < 3000) E.tick(t);
  return { lost: t.ep.events.some((e) => e.type === 'steal'), done: t.ep.done, end: { x: E.P(t, c0.id).x, y: E.P(t, c0.id).y } };
}
const segDist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)); return { d: Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)), t }; };
function cap(E, c, to) { const t = { x: Math.max(0.7, Math.min(E.F.W - 0.7, to.x)), y: Math.max(0.7, Math.min(E.F.H - 0.7, to.y)) }; const d = Math.hypot(t.x - c.x, t.y - c.y); return d > 8 ? { x: c.x + ((t.x - c.x) / d) * 8, y: c.y + ((t.y - c.y) / d) * 8 } : t; }
module.exports = { lagen, sim, probeState, ENTWURF, MAP, segDist, cap };
