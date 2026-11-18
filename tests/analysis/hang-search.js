// Analyse (kein Test): sucht Szenen, die nicht enden. Für jede Entscheidungslage aus den 200 Kinder-Abfolgen von
// Mission 1 werden viele Aktionen simuliert (Pässe/Dribblings/Läufe/Absichern im Raster, alle Schüsse und Angriffe).
// Aufruf: node tests/analysis/hang-search.js [raster=3] [maxSek=50]
const E = require('../helpers/load.js');
const { playMission, lcg } = require('../golden/trace.js');
const step = +(process.argv[2] || 3), maxT = +(process.argv[3] || 50), F = E.F;
function chooser(rnd) { return (E2, s, ctx) => { const c = E2.carrier(s), blues = E2.team(s, 'blue'), pick = (a) => a[Math.floor(rnd() * a.length)], spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) }); const k = pick(ctx.actions);
  if (k === 'passen') { if (rnd() < 0.6) return { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id }; return Object.assign({ kind: 'pass' }, spot()); }
  if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot()); if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
  if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot()); if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
  return Object.assign({ kind: 'cover', id: pick(blues).id }, spot()); }; }
const states = [], seen = new Set();
for (let seed = 1; seed <= 200; seed++) { const ch = chooser(lcg(seed)); playMission(E, (E2, s, ctx) => { const k = JSON.stringify(s.players.map((p) => [p.x.toFixed(2), p.y.toFixed(2)])) + s.poss; if (!seen.has(k)) { seen.add(k); states.push({ s: E2.clone(s), ctx, seed }); } return ch(E2, s, ctx); }); }
let n = 0; const hangs = [], byKind = {};
for (const { s, ctx, seed } of states) {
  const c = E.carrier(s), blues = E.team(s, 'blue'), acts = [];
  const grid = (f) => { for (let x = 1; x < F.W; x += step) for (let y = 1; y < F.H; y += step) acts.push(f(x, y)); };
  for (const k of ctx.actions) {
    if (k === 'passen') { blues.filter((b) => b !== c).forEach((b) => acts.push({ kind: 'pass', id: b.id })); grid((x, y) => ({ kind: 'pass', x, y })); }
    if (k === 'dribbeln') grid((x, y) => ({ kind: 'dribble', x, y }));
    if (k === 'schiessen') acts.push({ kind: 'shoot', goal: 0 }, { kind: 'shoot', goal: 1 });
    if (k === 'freilaufen') blues.filter((b) => b !== c).forEach((b) => grid((x, y) => ({ kind: 'run', id: b.id, x, y })));
    if (k === 'erobern') blues.forEach((b) => acts.push({ kind: 'press', id: b.id }));
    if (k === 'absichern' || k === 'verstellen' || !['passen', 'dribbeln', 'schiessen', 'freilaufen', 'erobern'].includes(k)) blues.forEach((b) => grid((x, y) => ({ kind: 'cover', id: b.id, x, y })));
  }
  for (const a of acts) {
    const t = E.clone(s); E.startAction(t, a); let i = 0; const max = maxT / E.CFG.dt; while (!t.ep.done && i++ < max) E.tick(t);
    n++; byKind[a.kind] = (byKind[a.kind] || 0) + 1;
    if (!t.ep.done) hangs.push({ seed, a, ev: t.ep.events.slice(0, 6).map((e) => e.type).join(',') });
  }
}
const hk = {}; hangs.forEach((h) => (hk[h.a.kind] = (hk[h.a.kind] || 0) + 1));
console.log(`${states.length} Lagen, ${n} Szenen simuliert ${JSON.stringify(byKind)} · nicht beendet nach ${maxT} s: ${hangs.length} ${JSON.stringify(hk)}`);
hangs.slice(0, 5).forEach((h) => console.log('  ', JSON.stringify(h)));
module.exports = { hangs };
