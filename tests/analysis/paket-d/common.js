// Paket D – Analyse (kein Test). Gemeinsame Hilfen: Engine laden (optional aus FIQ_ROOT, z. B. einer Prototyp-Kopie),
// Dribbel-Lagen sammeln, Ziele im Raster, Wahrheit per vollständiger Simulation auf einer Kopie.
const path = require('node:path'), fs = require('node:fs');
function load() {
  const root = process.env.FIQ_ROOT || path.join(__dirname, '..', '..', '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const f of [...html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"/g)].map((m) => m[1]).filter((f) => f !== 'app.js')) require(path.join(root, f));
  return globalThis.FIQ;
}
const E = load();
const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run' };

// Probe-Missionen für Entwurfslagen (B1–B5 „Freie Bahn!“, A4) – nur im Speicher
let probeN = 0;
function probeState(spieler) {
  const id = 'paketd-probe-' + probeN++;
  globalThis.FIQ_MISSIONS.push({ id, nummer: 90, titel: id, lernwelt: 9, lernziele: ['x'], schauSchritt: [], texte: {},
    situationen: [{ id: 'P', start: { ballbesitz: 'b1', spieler } }], phasen: { maxAngriff: 5, verteidigung: 0 } });
  return E.newState(id, 0); // Probe bleibt im Speicher registriert (nur in diesem Analyseprozess); Standardtexte
}
const P = (id, x, y) => ({ id, x, y });
const ENTWURF = {
  B1: [P('b1', 17, 14), P('r1', 22, 9)], B3: [P('b1', 18, 12), P('r1', 15.5, 12)], B4: [P('b1', 17, 12), P('r1', 23, 12)],
  B2: [P('b1', 12, 12), P('r1', 19, 7), P('r2', 19, 17)], B5: [P('b1', 12, 13), P('r1', 23, 3), P('r2', 32, 17)],
  A4: [P('b1', 26, 12), P('b2', 21, 19), P('r1', 24, 9.5), P('r2', 34.4, 7.9)],
};

/** Alle Lagen, in denen „Dribbeln“ angeboten wird: Mission 1 (200 Kinder-Abfolgen + Hilfe-Weg), Mission A (alle Spielweisen
 *  und Kinder-Abfolgen), Entwurfslagen. Je Lage: Zustand vor der Entscheidung. Doppelte Lagen werden entfernt. */
function lagen() {
  const out = [], seen = new Set();
  const add = (src, s, ctx) => {
    if (!ctx.actions.includes('dribbeln')) return;
    const k = JSON.stringify(s.players.map((p) => [p.id, +p.x.toFixed(3), +p.y.toFixed(3)])) + s.ball.owner;
    if (seen.has(k)) return; seen.add(k); out.push({ src, s: E.clone(s), ctx });
  };
  const { collect } = require('../collect.js');
  for (const r of collect(E)) add('M1', r.s, r.ctx);
  const { playMission } = require('../../golden/trace.js');
  playMission(E, (E2, s, ctx) => { add('M1', s, ctx); const k = E2.recommend(s, ctx.actions), h = E2.hint(s, k), a = { kind: MAP[k] || 'press' };
    if (h.ids && h.ids.length) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal; if (a.kind === 'press' && ctx.type === 'verteidigung') { a.kind = ctx.actions[0] === 'raum' ? 'cover' : 'press'; } return a; });
  if (E.mission('welches-tor-ist-frei')) {
    const ma = require('../../golden/mission-a.js');
    for (const f of Object.values(ma.STYLES)) for (let d = 0; d < 4; d++) ma.play(E, d, (E2, s, ctx, i) => { add('MA', s, ctx); return f(E2, s, ctx, i); });
    const { lcg } = require('../../golden/trace.js');
    for (let seed = 1; seed <= 200; seed++) { const rnd = lcg(seed); ma.play(E, seed % 4, (E2, s, ctx) => { add('MA', s, ctx); return ma.childAction(E2, s, ctx, rnd); }); }
  }
  for (const [k, sp] of Object.entries(ENTWURF)) { const s = probeState(sp); out.push({ src: 'E-' + k, s, ctx: E.context(s, null) }); }
  return out;
}

/** Dribbelziele im Raster um den Ballführenden: Richtungen alle 15°, Strecken 2…12 m (über 8 m wird gekappt). */
function ziele(s) {
  const c = E.carrier(s), out = [];
  for (let a = 0; a < 360; a += 15) for (const d of [2, 3, 4, 5, 6, 8, 10, 12]) {
    const r = (a * Math.PI) / 180, x = c.x + Math.cos(r) * d, y = c.y + Math.sin(r) * d;
    if (x < 0 || y < 0 || x > E.F.W || y > E.F.H) continue;
    out.push({ x: +x.toFixed(3), y: +y.toFixed(3), ang: a, d });
  }
  return out;
}

/** Wahrheit: Dribbling vollständig simulieren. */
function sim(s, tgt) {
  const t = E.clone(s), c0 = E.carrier(t), from = { x: c0.x, y: c0.y };
  E.startAction(t, { kind: 'dribble', x: tgt.x, y: tgt.y });
  let n = 0, minD = 99, minKey = null;
  while (!t.ep.done && n++ < 3000) {
    E.tick(t);
    const c = E.P(t, c0.id);
    for (const r of E.team(t, 'red')) { const d = Math.hypot(r.x - c.x, r.y - c.y); if (d < minD) { minD = d; minKey = r.id; } }
  }
  const steal = t.ep.events.find((e) => e.type === 'steal');
  const c = E.P(t, c0.id), reds = E.team(t, 'red');
  const open = Math.min(...reds.map((r) => Math.hypot(r.x - c.x, r.y - c.y)));
  return { lost: !!steal, by: steal ? steal.by : null, end: { x: c.x, y: c.y }, gainX: c.x - from.x, open, minD, minKey,
    zone: !steal && c.x >= E.F.W - E.F.ZONE - 0.3, ticks: n };
}
const evalNow = (s, tgt) => E.evaluate(s, { kind: 'dribble', x: tgt.x, y: tgt.y });
module.exports = { E, load, lagen, ziele, sim, evalNow, probeState, ENTWURF, MAP };
