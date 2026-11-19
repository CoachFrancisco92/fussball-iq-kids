// D2-Analyse (kein Test): Hilfe-Weg in den Entwurfslagen (B1–B5, A4) und Stern-Richtungen je Lage.
// FIQ_ROOT=<Engine> node hilfeweg.js
const { E, probeState, ENTWURF, MAP, ziele } = require('./common.js');
const rows = [];
for (const [k, sp] of Object.entries(ENTWURF)) {
  const s = probeState(sp), log = []; let last = null, goal = false;
  for (let i = 0; i < 6; i++) {
    if (s.poss !== 'blue') { log.push('Ballverlust'); break; }
    const ctx = E.context(s, last), key = E.recommend(s, ctx.actions), h = E.hint(s, key), a = { kind: MAP[key] };
    if (h.ids && h.ids.length) a.id = h.ids[0]; if (h.point) { a.x = +h.point.x.toFixed(1); a.y = +h.point.y.toFixed(1); } if (h.goal != null) a.goal = h.goal;
    const ev = E.evaluate(s, a); E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s);
    const fb = E.feedback(s); goal = s.ep.events.some((e) => e.type === 'goal');
    log.push(`${a.kind}${a.x != null ? `(${a.x}|${a.y})` : a.goal != null ? a.goal : ''}${ev.good ? '⭐' : '💭'}${goal ? '⚽' : ''}`);
    last = { kind: a.kind, success: fb.success, team: 'blue' };
    if (goal) break;
  }
  // Stern-Richtungen in der Startlage: 45°-Sektoren mit mindestens einem ⭐-Ziel, Strecken mit ⭐
  const s0 = probeState(sp), sect = new Set(), dist = new Set(); let n = 0, st = 0;
  for (const z of ziele(s0)) { const ev = E.evaluate(s0, { kind: 'dribble', x: z.x, y: z.y }); n++; if (ev.good) { st++; sect.add(Math.floor(((z.ang + 22.5) % 360) / 45)); dist.add(z.d); } }
  rows.push({ lage: k, 'Hilfe-Weg': log.join(' → '), Entscheidungen: log.length, Tor: goal ? 'ja' : 'nein', '⭐-Anteil Startlage': Math.round((100 * st) / n) + ' %', '⭐-Sektoren (von 8)': sect.size, '⭐-Strecken': [...dist].sort((a, b) => a - b).join('/') });
}
console.table(rows);
