// Erzeugt eine vollständige, vergleichbare Aufzeichnung von Missionsdurchläufen
// (Kontext, Bewertung, Rückmeldung, Ereignisse, Positionen, Phasen).
// Wird für den Nachweis genutzt, dass Mission 1 nach Umbauten verhaltensgleich bleibt.
const crypto = require('node:crypto');

function lcg(seed) { let x = seed >>> 0; return () => ((x = (1664525 * x + 1013904223) >>> 0) / 4294967296); }

/** Kinder-Abfolge: oft „falsch“, auch Ziele außerhalb des Feldes (wie tests/branches.test.js). */
function childAction(E, s, ctx, rnd) {
  const F = E.F, c = E.carrier(s), blues = E.team(s, 'blue');
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) });
  const k = pick(ctx.actions);
  if (k === 'passen') { if (rnd() < 0.6) return { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id }; return Object.assign({ kind: 'pass' }, spot()); }
  if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot());
  if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
  if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot());
  if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
  return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
}

const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run', erobern: 'press', raum: 'cover' };
function hintAction(E, s, ctx) {
  const k = E.recommend(s, ctx.actions), h = E.hint(s, k);
  const a = { kind: MAP[k] };
  if (h.ids) a.id = h.ids[0];
  if (h.point) { a.x = h.point.x; a.y = h.point.y; }
  if (h.goal != null) a.goal = h.goal;
  return { a, hint: { k, say: h.say } };
}

const r6 = (v) => Math.round(v * 1e6) / 1e6;
function snap(s) { return { p: s.players.map((p) => [p.id, r6(p.x), r6(p.y)]), ball: s.ball.owner, poss: s.poss, score: { ...s.score } }; }

/** chooser(E, s, ctx, i) -> Aktion | {a, hint} */
function playMission(E, chooser, newStateArgs) {
  const s = E.newState(...(newStateArgs || []));
  const m = E.newMission(...(newStateArgs || []));
  let last = null; const out = [];
  for (let i = 0; !m.done && i < 8; i++) {
    const ctx = E.context(s, last);
    let a = chooser(E, s, ctx, i), hint = null;
    if (a && a.a) { hint = a.hint; a = a.a; }
    const ev = E.evaluate(s, a);
    const opts = s.poss === 'blue' ? E.passOptions(s).map((o) => [o.id, r6(o.margin)]) : null;
    E.startAction(s, a);
    let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s);
    const fb = E.feedback(s);
    E.missionAfter(m, s, ctx.type);
    const rec = { ctx: { type: ctx.type, title: ctx.title, tag: ctx.tag, say: ctx.say, actions: ctx.actions }, a, hint, opts, ev: { good: ev.good, rec: ev.rec, exe: ev.exe, why: ev.why },
      fb: { good: fb.good, success: fb.success, icon: fb.icon, text: fb.text, tip: fb.tip, tags: fb.tags, say: fb.say, goal: fb.goal, explain: fb.explain && JSON.parse(JSON.stringify(fb.explain, (k, v) => (typeof v === 'number' ? r6(v) : v))) },
      events: s.ep.events.map((e) => e.type + (e.by ? ':' + e.by : '')), ticks: n, mission: { phase: m.phase, att: m.att, def: m.def, done: m.done, note: m.note }, after: snap(s) };
    E.missionApply(m, s);
    rec.afterApply = snap(s);
    out.push(rec);
    last = { kind: a.kind, success: fb.success, team: 'blue' };
  }
  return out;
}

const hash = (o) => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);

const SCRIPTED = {
  musterweg: [{ kind: 'pass', id: 'b2' }, { kind: 'run', id: 'b3', x: 23, y: 14 }, { kind: 'shoot', goal: 0 }, { kind: 'press', id: 'b3' }, { kind: 'cover', id: 'b1', x: 12, y: 6 }],
  abgefangen: [{ kind: 'pass', id: 'b3' }, { kind: 'press', id: 'b1' }, { kind: 'cover', id: 'b1', x: 6, y: 17 }],
  geblockt: [{ kind: 'pass', id: 'b2' }, { kind: 'run', id: 'b3', x: 23, y: 14 }, { kind: 'shoot', goal: 1 }, { kind: 'press', id: 'b1' }, { kind: 'cover', id: 'b2', x: 30, y: 20 }],
  dribbling: [{ kind: 'dribble', x: 10, y: 13 }, { kind: 'dribble', x: 6, y: 13 }, { kind: 'dribble', x: 3, y: 16 }, { kind: 'dribble', x: 3, y: 20 }, { kind: 'press', id: 'b3' }, { kind: 'cover', id: 'b1', x: 20, y: 10 }],
};

/** Gesamtaufzeichnung für Mission 1 */
function traceAll(E, newStateArgs) {
  const scripted = {};
  for (const [k, steps] of Object.entries(SCRIPTED)) scripted[k] = playMission(E, (E2, s, ctx, i) => steps[Math.min(i, steps.length - 1)], newStateArgs);
  const hinted = playMission(E, (E2, s, ctx) => hintAction(E2, s, ctx), newStateArgs);
  const seeds = {};
  for (let seed = 1; seed <= 200; seed++) { const rnd = lcg(seed); seeds[seed] = hash(playMission(E, (E2, s, ctx) => childAction(E2, s, ctx, rnd), newStateArgs)); }
  // Bewertung + Hilfe in vielen Lagen (Zustände aus den Fuzz-Läufen)
  return { scripted, hinted, seeds };
}

module.exports = { traceAll, playMission, hash, lcg };
