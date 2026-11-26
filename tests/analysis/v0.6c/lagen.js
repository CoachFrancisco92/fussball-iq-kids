// V0.6c C1 – reproduzierbare Freilauf-Lagen.
//   R      = alle Freilauf-Lagen (Kontext „ohneBall“) aus den 200 Kinder-Abfolgen von Mission 1 (wie tests/freilaufen.test.js)
//   L1–L5  = feste Lernwert-Lagen. L1/L4 werden aus der Startaufstellung erzeugt, L2/L3/L5 sind aus R gesucht und
//            mit festen Koordinaten in lagen-fixtures.json eingefroren (unabhängig von späteren Ablaufänderungen).
// Fixtures neu suchen (nur bewusst, Engine-Stand v0.6.2): node tests/analysis/v0.6c/freilaufen-folge.js --suchen
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { playMission, lcg } = require('../../golden/trace.js');

const FIXTURES = path.join(__dirname, 'lagen-fixtures.json');
const LAST_PASS = { kind: 'pass', success: true, team: 'blue' };

/** Kinder-Abfolge wie tests/freilaufen.test.js (gleiche Zufallsreihe lcg(seed)). */
function kindAktion(E2, s, ctx, rnd) {
  const F = E2.F, c = E2.carrier(s), blues = E2.team(s, 'blue'), pick = (x) => x[Math.floor(rnd() * x.length)];
  const spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) }), k = pick(ctx.actions);
  if (k === 'passen') { if (rnd() < 0.6) return { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id }; return Object.assign({ kind: 'pass' }, spot()); }
  if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot()); if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
  if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot()); if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
  return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
}

/** R: alle unterschiedlichen Freilauf-Lagen aus 200 Kinder-Abfolgen (Lage vor der Freilauf-Entscheidung). */
function lagenR(E) {
  const out = [], seen = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const rnd = lcg(seed);
    playMission(E, (E2, s, ctx) => {
      if (ctx.actions.includes('freilaufen')) {
        const k = JSON.stringify(s.players.map((p) => [p.x.toFixed(1), p.y.toFixed(1)]));
        if (!seen.has(k)) { seen.add(k); out.push({ s: E2.clone(s), herkunft: { seed } }); }
      }
      return kindAktion(E2, s, ctx, rnd);
    });
  }
  return out;
}

/** Lage einfrieren: nur, was die Simulation braucht (Spieler, Ball, Besitz, Zeit), Szene als „Pass angekommen“. */
function einfrieren(s) {
  const r = (v) => Math.round(v * 1e6) / 1e6;
  return { missionId: s.missionId, t: r(s.t), poss: s.poss, owner: s.ball.owner, ball: { x: r(s.ball.x), y: r(s.ball.y) },
    spieler: s.players.map((p) => ({ id: p.id, x: r(p.x), y: r(p.y), vx: r(p.vx), vy: r(p.vy) })), score: Object.assign({}, s.score), ai: s.ai };
}
function auftauen(E, f) {
  const s = E.newState(f.missionId);
  s.t = f.t; s.poss = f.poss; s.score = Object.assign({}, f.score); s.ai = Object.assign({}, s.ai, f.ai);
  for (const q of f.spieler) { const p = E.P(s, q.id); Object.assign(p, { x: q.x, y: q.y, vx: q.vx, vy: q.vy, tx: q.x, ty: q.y, ctrl: null, delay: 0, tackleT: 0, role: null }); }
  s.ball = { x: f.ball.x, y: f.ball.y, owner: f.owner, flight: null };
  s.ep = { a: { kind: 'pass', id: f.owner }, t: 0, endT: 0, events: [], frames: [], startPoss: 'blue', eval: null, phase: 'main', restart: null, done: true };
  return s;
}

/** L1: Standardlage (Musterweg) – nach Pass Blau 1 → Blau 2, wie tests/freilaufen.test.js runState(). */
function standardlage(E) {
  const s = E.newState(), m = E.newMission(), ctx = E.context(s, null);
  E.startAction(s, { kind: 'pass', id: 'b2' }); while (!s.ep.done) E.tick(s);
  E.feedback(s); E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
  return s;
}

/** Feste Lernwert-Lagen mit Laufzielen. ziele: [{name, a, erwartet}] – „erwartet“ beschreibt nur die Ausgangsbedingung. */
function lernLagen(E) {
  const fx = fs.existsSync(FIXTURES) ? JSON.parse(fs.readFileSync(FIXTURES, 'utf8')) : {};
  const L = {
    // (30/7): freier Raum vor dem Tor, bei Ankunft anspielbar. (21/15) und (24/15): Stern, bei Ankunft aber zu
    // (Gegner läuft mit); (24/15) wird heute erst durch das Auto-Dribbling frei (bisheriges „frei“-Beispiel der Tests).
    L1: { titel: 'Standardlage: freier Raum vor dem Tor vs. Gegner läuft mit', s: standardlage(E),
      ziele: [{ name: 'frei', a: { kind: 'run', id: 'b3', x: 30, y: 7 } }, { name: 'mitgelaufen', a: { kind: 'run', id: 'b3', x: 21, y: 15 } },
        { name: 'erstNachDribbelFrei', a: { kind: 'run', id: 'b3', x: 24, y: 15 } }] },
    L4: { titel: 'Laufziel zu nah am Ball', s: standardlage(E), ziele: [{ name: 'zuNah', a: { kind: 'run', id: 'b3', x: 23, y: 4 } }] },
  };
  for (const k of ['L2', 'L3', 'L5']) if (fx[k]) L[k] = { titel: fx[k].titel, s: auftauen(E, fx[k].lage), ziele: fx[k].ziele, herkunft: fx[k].herkunft };
  return L;
}

module.exports = { lagenR, lernLagen, standardlage, einfrieren, auftauen, kindAktion, FIXTURES, LAST_PASS };
