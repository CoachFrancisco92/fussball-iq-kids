// Analyse (kein Test): A3 „Beide Tore zu – Pass zum freien Freund, er schießt“. Jeder Spieler wird einzeln um
// ±0,5 m / ±1 m (x und y) verschoben; geprüft wird der vollständige Hilfe-Ablauf Pass → Ballannahme → Abschluss → Tor
// und wohin er sonst übergeht. Aufruf: node tests/analysis/a3-robustheit.js [b1x b1y b2x b2y r1x r1y r2x r2y]
const E = require('../helpers/load.js');
// Standard: die in missions/welches-tor-ist-frei.js konfigurierte Startlage von A3 (Reihenfolge b1, b2, r1, r2)
const cfgA3 = E.mission('welches-tor-ist-frei').situationen.find((x) => x.id === 'A3').start.spieler;
const base = process.argv.length >= 10 && require.main === module ? process.argv.slice(2).map(Number) : ['b1', 'b2', 'r1', 'r2'].flatMap((id) => { const p = cfgA3.find((q) => q.id === id); return [p.x, p.y]; });
const ids = ['b1', 'b2', 'r1', 'r2'];
const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run' };
let k = 0;
function flow(pos) {
  const id = 'a3-probe-' + k++;
  globalThis.FIQ_MISSIONS.push({ id, nummer: 99, titel: id, lernwelt: 1, lernziele: ['x'], schauSchritt: [], texte: {},
    situationen: [{ id: 'A3', start: { ballbesitz: 'b1', spieler: ids.map((p, i) => ({ id: p, x: pos[2 * i], y: pos[2 * i + 1] })) } }],
    phasen: { maxAngriff: 3, verteidigung: 0, abschlussNachGrenze: true }, hilfe: { reihenfolge: ['schiessen', 'dribbeln', 'passen'] } });
  const s = E.newState(id, 0), m = E.newMission(id, 0), sit = E.situation(s), log = [];
  const shotsBlocked = sit.shots.every((o) => o.margin <= E.CFG.shotLaneOk);
  let last = null;
  for (let i = 0; i < 4 && !m.done; i++) {
    const ctx = E.context(s, last), key = E.recommend(s, ctx.actions), h = E.hint(s, key), a = { kind: MAP[key] };
    if (h.ids && h.ids.length) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal;
    E.startAction(s, a); while (!s.ep.done) E.tick(s); const fb = E.feedback(s);
    log.push(`${ctx.type}:${a.kind}${a.goal != null ? a.goal : ''}${fb.good ? '⭐' : '💭'}${s.ep.events.some((e) => e.type === 'goal') ? '⚽' : ''}`);
    E.missionAfter(m, s, ctx.type); last = { kind: a.kind, success: fb.success, team: 'blue' };
  }
  globalThis.FIQ_MISSIONS.splice(globalThis.FIQ_MISSIONS.findIndex((x) => x.id === id), 1); // Probe wieder entfernen
  const ok = shotsBlocked && log.join(' ') === 'abschluss:pass⭐ abschluss:shoot1⭐⚽';
  return { ok, shotsBlocked, log: log.join(' ') };
}
if (require.main === module) {
const b = flow(base);
console.log(`Ausgangslage ${JSON.stringify(base)}: ${b.ok ? '✓' : '✗'} ${b.log} (beide Tore zu: ${b.shotsBlocked})`);
const rows = [];
for (let i = 0; i < ids.length; i++) for (const ax of [0, 1]) for (const d of [-1, -0.5, 0.5, 1]) {
  const pos = base.slice(); pos[2 * i + ax] += d; const r = flow(pos);
  rows.push({ spieler: ids[i], achse: ax ? 'y' : 'x', abweichung: d, ablauf: r.ok ? '✓ Pass → Abschluss → Tor' : `✗ ${r.log}${r.shotsBlocked ? '' : ' (ein Tor frei)'}` });
}
console.table(rows);
console.log(`Ablauf erhalten: ${rows.filter((r) => r.ablauf.startsWith('✓')).length} von ${rows.length} · bei ±0,5 m: ${rows.filter((r) => Math.abs(r.abweichung) === 0.5 && r.ablauf.startsWith('✓')).length} von ${rows.filter((r) => Math.abs(r.abweichung) === 0.5).length}`);
}
module.exports = { flow, base };
