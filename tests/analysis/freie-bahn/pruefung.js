// „Freie Bahn!“ – Prüfung der Entwurfslagen B1–B5 mit der Paket-D-Bewertung (Analyse, kein Test).
// Je Lage: ⭐-Anteil und gute Richtungen in der Startlage, schlechte Entscheidungen, Hilfe-Weg im Missionsablauf
// (maxAngriff, Abschluss nach Grenze), Robustheit der Startlage (jeder Spieler ±0,5 / ±1 m, x und y).
// Aufruf: node tests/analysis/freie-bahn/pruefung.js [maxAngriff]
const E = require('../../helpers/load.js');
const MAX = Number(process.argv[2] || E.mission('freie-bahn').phasen.maxAngriff);
const P = (id, x, y) => ({ id, x, y });
// Situationen aus missions/freie-bahn.js, dazu B1 aus dem Entwurf (zum Vergleich, nicht übernommen)
const LAGEN = Object.assign({ 'B1 (Entwurf)': [P('b1', 17, 14), P('r1', 22, 9)] },
  Object.fromEntries(E.mission('freie-bahn').situationen.map((x) => [x.id, x.start.spieler.map((p) => ({ ...p }))])));
let n = 0;
function mission(sp) {
  const id = 'fb-probe-' + n++;
  globalThis.FIQ_MISSIONS.push({ id, nummer: 90, titel: id, lernwelt: 9, lernziele: ['x'], schauSchritt: [], texte: {},
    situationen: [{ id: 'S', start: { ballbesitz: 'b1', spieler: sp } }], phasen: { maxAngriff: MAX, verteidigung: 0, abschlussNachGrenze: true },
    hilfe: { reihenfolge: ['dribbeln', 'schiessen'], alternativenNennen: false } });
  return id;
}
const MAP = { dribbeln: 'dribble', schiessen: 'shoot' };
function hilfeWeg(sp) {
  const id = mission(sp), s = E.newState(id, 0), m = E.newMission(id, 0), log = []; let last = null, goal = false;
  for (let i = 0; i < 10 && !m.done; i++) {
    const ctx = E.context(s, last), key = E.recommend(s, ctx.actions), h = E.hint(s, key), a = { kind: MAP[key] };
    if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal;
    const ev = E.evaluate(s, a); E.startAction(s, a); let k = 0; while (!s.ep.done && k++ < 3000) E.tick(s);
    goal = goal || s.ep.events.some((e) => e.type === 'goal');
    log.push(`${a.kind === 'dribble' ? `D(${a.x.toFixed(0)}|${a.y.toFixed(0)})` : 'S' + a.goal}${ev.good ? '⭐' : '💭'}${h.eng ? '!eng' : h.genau ? '!genau' : ''}${goal ? '⚽' : ''}`);
    E.missionAfter(m, s, ctx.type); last = { kind: a.kind, success: E.feedback(s).success, team: 'blue' };
    if (goal) break; E.missionApply(m, s);
  }
  return { goal, log: log.join(' '), n: log.length, alleSterne: !log.join(' ').includes('💭') };
}
const rows = [];
for (const [k, sp] of Object.entries(LAGEN)) {
  const id = mission(sp), s = E.newState(id, 0), c = E.carrier(s);
  const dirs = new Map(); let st = 0, tot = 0;
  for (let a = 0; a < 360; a += 15) for (const d of [3, 5, 8]) {
    const r = (a * Math.PI) / 180, z = { x: c.x + Math.cos(r) * d, y: c.y + Math.sin(r) * d }; if (z.x < 0.7 || z.y < 0.7 || z.x > 35.3 || z.y > 23.3) continue;
    const ev = E.evaluate(s, { kind: 'dribble', ...z }); tot++; if (ev.good) { st++; dirs.set(a, (dirs.get(a) || 0) + 1); }
  }
  const schlecht = [];
  for (const r of E.team(s, 'red')) { const ev = E.evaluate(s, { kind: 'dribble', x: r.x, y: r.y }); schlecht.push(`in ${r.id}: ${ev.good ? '⭐' : '💭'} ${ev.why}`); }
  const back = E.evaluate(s, { kind: 'dribble', x: c.x - 4, y: c.y }); schlecht.push(`zurück: ${back.good ? '⭐' : '💭'} ${back.why}`);
  const hw = hilfeWeg(sp);
  // Robustheit
  let ok5 = 0, n5 = 0, ok1 = 0, n1 = 0; const fail = [];
  for (let i = 0; i < sp.length; i++) for (const ax of ['x', 'y']) for (const dd of [-1, -0.5, 0.5, 1]) {
    const q = sp.map((p) => ({ ...p })); q[i][ax] += dd; const r = hilfeWeg(q); const ok = r.goal && r.alleSterne;
    if (Math.abs(dd) === 0.5) { n5++; ok5 += ok; } else { n1++; ok1 += ok; } if (!ok) fail.push(`${q[i].id} ${ax} ${dd}: ${r.log}`);
  }
  rows.push({ lage: k, '⭐ Start': Math.round((100 * st) / tot) + ' %', 'gute Richtungen (15°)': [...dirs.keys()].map((a) => (a > 180 ? a - 360 : a)).sort((x, y) => x - y).join(','), 'Hilfe-Weg': hw.log, 'Robust ±0,5': `${ok5}/${n5}`, '±1': `${ok1}/${n1}` });
  console.log(k, '| schlecht:', schlecht.join(' · ')); if (fail.length) console.log('   nicht robust:', fail.join(' | '));
}
console.table(rows);
