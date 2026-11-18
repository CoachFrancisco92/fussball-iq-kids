// Analyse-Hilfe (kein Test): spielt die 200 Kinder-Abfolgen aus tests/golden/trace.js nach (gleiche Zufallsfolge)
// und liefert je Entscheidung den Zustand VOR der Aktion, den Kontext und die Aktion.
const { playMission, lcg } = require('../golden/trace.js');
function childChooser(rnd) { // identisch zu trace.js / diff.js
  return (E2, s, ctx) => {
    const F = E2.F, c = E2.carrier(s), blues = E2.team(s, 'blue');
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) });
    const k = pick(ctx.actions);
    if (k === 'passen') { if (rnd() < 0.6) return { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id }; return Object.assign({ kind: 'pass' }, spot()); }
    if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot());
    if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
    if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot());
    if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
    return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
  };
}
function collect(E) {
  const out = [];
  for (let seed = 1; seed <= 200; seed++) {
    const ch = childChooser(lcg(seed)); let step = 0;
    playMission(E, (E2, s, ctx) => { const a = ch(E2, s, ctx); step++; out.push({ seed, step, s: E2.clone(s), ctx, a }); return a; });
  }
  return out;
}
/** Aktion auf einer Kopie bis zum Ende simulieren. */
function simulate(E, s, a) { const t = E.clone(s); E.startAction(t, a); let n = 0; while (!t.ep.done && n++ < 3000) E.tick(t); const fb = E.feedback(t); return { success: fb.success, text: fb.text, poss: t.poss, carrier: E.carrier(t) && E.carrier(t).id }; }
module.exports = { collect, simulate };
