// Analyse (kein Test): Wie robust ist ein Pass in den Raum bei gegebener Zeitreserve?
// Für viele echte Spielsituationen aus Mission 1 (Zustände aus 200 Kinder-Abfolgen) und Zielpunkte im Raster
// wird geprüft, ob ein ankommender Pass auch dann noch ankäme, wenn EIN Gegner etwas besser stünde
// (d Meter näher am Zielpunkt) oder schneller reagierte (−0,1 s). Aufruf: node tests/analysis/pass-reserve.js
const E = require('../helpers/load.js');
const { lcg } = require('../golden/trace.js');
const F = E.F, C = E.CFG;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const runSpeed = (p) => (p.team === 'blue' ? C.blueRun : C.redRun);

function contest(c, mates, defs, to, react) {
  const recv = mates.slice().sort((a, b) => dist(a, to) - dist(b, to))[0];
  const tArr = Math.max(dist(c, to) / C.passSpeed, 0.15 + dist(recv, to) / runSpeed(recv));
  let r = 9; for (const d of defs) r = Math.min(r, react + Math.max(0, dist(d, to) - C.reach) / runSpeed(d) - tArr);
  return r;
}
function laneOk(c, to, defs, react) {
  // gleiche Prüfung wie Engine (lane): Abfangen auf dem Weg
  const L = dist(c, to); const dx = (to.x - c.x) / L, dy = (to.y - c.y) / L; let m = 9;
  for (const df of defs) for (let s = 0.6; s <= L + 1e-6; s += 0.2) {
    const p = { x: c.x + dx * s, y: c.y + dy * s }, tb = s / C.passSpeed, gap = dist(df, p) - C.reach;
    const td = gap <= 0 ? 0 : react + gap / runSpeed(df); m = Math.min(m, td - tb);
  }
  return m > C.passLaneOk;
}

// Zustände sammeln
const states = [];
for (let seed = 1; seed <= 200; seed++) {
  const rnd = lcg(seed); const s = E.newState(); const m = E.newMission(); let last = null;
  for (let i = 0; i < 6 && !m.done; i++) {
    const ctx = E.context(s, last);
    if (s.poss === 'blue' && E.carrier(s)) states.push(E.clone(s));
    const c = E.carrier(s), blues = E.team(s, 'blue'), k = ctx.actions[Math.floor(rnd() * ctx.actions.length)];
    const a = k === 'passen' ? { kind: 'pass', id: blues.find((b) => b !== c).id } : k === 'dribbeln' ? { kind: 'dribble', x: rnd() * 36, y: rnd() * 24 } : k === 'schiessen' ? { kind: 'shoot', goal: 0 } : k === 'freilaufen' ? { kind: 'run', id: blues.find((b) => b !== c).id, x: rnd() * 36, y: rnd() * 24 } : k === 'erobern' ? { kind: 'press', id: blues[0].id } : { kind: 'cover', id: blues[0].id, x: rnd() * 36, y: rnd() * 24 };
    E.startAction(s, a); while (!s.ep.done) E.tick(s);
    const fb = E.feedback(s); E.missionAfter(m, s, ctx.type); E.missionApply(m, s); last = { kind: a.kind, success: fb.success, team: 'blue' };
  }
}
const uniq = [...new Map(states.map((s) => [JSON.stringify(s.players.map((p) => [p.x.toFixed(1), p.y.toFixed(1)])), s])).values()];

const buckets = [[-0.05, 0], [0, 0.1], [0.1, 0.2], [0.2, 0.3], [0.3, 0.4], [0.4, 0.6], [0.6, 99]];
const res = {};
for (const d of [0.5, 1.0, 1.5]) res[d] = buckets.map(() => ({ n: 0, ok: 0 }));
let total = 0;
for (const s of uniq) {
  const c = E.carrier(s), mates = E.team(s, 'blue').filter((p) => p !== c), defs = E.team(s, 'red');
  for (let x = 1.5; x < F.W - 1; x += 2) for (let y = 1.5; y < F.H - 1; y += 2) {
    const to = { x, y }; if (dist(c, to) < 3) continue;
    if (!laneOk(c, to, defs, C.redReact)) continue;
    const r = contest(c, mates, defs, to, C.redReact);
    if (r <= -0.05) continue; // käme nicht an
    const b = buckets.findIndex(([lo, hi]) => r >= lo && r < hi); total++;
    for (const dd of [0.5, 1.0, 1.5]) {
      // NUR das Ankommen am Zielpunkt: jeder Gegner einzeln dd Meter näher am Zielpunkt bzw. 0,1 s schneller
      let robust = contest(c, mates, defs, to, C.redReact - 0.1) > -0.05;
      for (let i = 0; i < defs.length && robust; i++) {
        const moved = defs.map((q, j) => { if (j !== i) return q; const L = dist(q, to) || 1; const k = Math.min(dd, L) / L; return Object.assign({}, q, { x: q.x + (to.x - q.x) * k, y: q.y + (to.y - q.y) * k }); });
        if (contest(c, mates, moved, to, C.redReact) <= -0.05) robust = false;
      }
      res[dd][b].n++; if (robust) res[dd][b].ok++;
    }
  }
}
console.log(`Spielsituationen: ${uniq.length}, ankommende Raum-Pässe (Ballweg frei) untersucht: ${total}`);
console.log('Reserve am Zielpunkt (s) | robust, wenn ein Gegner 0,5 m / 1,0 m / 1,5 m näher stünde bzw. 0,1 s schneller reagierte');
buckets.forEach(([lo, hi], i) => {
  const f = (d) => (res[d][i].n ? Math.round((100 * res[d][i].ok) / res[d][i].n) + '%' : '–').padStart(5);
  console.log(`${(lo + ' – ' + (hi > 9 ? '∞' : hi)).padEnd(24)} | n=${String(res[1.0][i].n).padStart(5)}  ${f(0.5)} ${f(1.0)} ${f(1.5)}`);
});

// Ballweg (Abfangen unterwegs): gleiche Frage für die Reserve auf dem Passweg (Schwelle heute 0,2 s, auch für Pässe zum Mitspieler)
function laneMargin(c, to, defs, react) {
  const L = dist(c, to); const dx = (to.x - c.x) / L, dy = (to.y - c.y) / L; let m = 9;
  for (const df of defs) for (let s = 0.6; s <= L + 1e-6; s += 0.2) {
    const p = { x: c.x + dx * s, y: c.y + dy * s }, tb = s / C.passSpeed, gap = dist(df, p) - C.reach;
    const td = gap <= 0 ? 0 : react + gap / runSpeed(df); m = Math.min(m, td - tb);
  }
  return m;
}
const lb = [[0, 0.1], [0.1, 0.2], [0.2, 0.3], [0.3, 0.4], [0.4, 99]]; const lres = lb.map(() => ({ n: 0, ok: 0 }));
for (const s of uniq) {
  const c = E.carrier(s), defs = E.team(s, 'red');
  for (let x = 1.5; x < F.W - 1; x += 2) for (let y = 1.5; y < F.H - 1; y += 2) {
    const to = { x, y }; if (dist(c, to) < 3) continue;
    const m = laneMargin(c, to, defs, C.redReact); if (m <= 0) continue;
    const b = lb.findIndex(([lo, hi]) => m >= lo && m < hi); if (b < 0) continue;
    let robust = laneMargin(c, to, defs, C.redReact - 0.1) > 0;
    for (let i = 0; i < defs.length && robust; i++) {
      // Gegner 1 m näher an die Passlinie
      const q = defs[i], L = dist(c, to), ux = (to.x - c.x) / L, uy = (to.y - c.y) / L;
      const t = Math.max(0, Math.min(L, (q.x - c.x) * ux + (q.y - c.y) * uy)), px = c.x + ux * t, py = c.y + uy * t, dd = Math.hypot(px - q.x, py - q.y) || 1, k = Math.min(1, dd) / dd;
      const moved = defs.map((o, j) => (j !== i ? o : Object.assign({}, o, { x: o.x + (px - o.x) * k, y: o.y + (py - o.y) * k })));
      if (laneMargin(c, to, moved, C.redReact) <= 0) robust = false;
    }
    lres[b].n++; if (robust) lres[b].ok++;
  }
}
console.log('\nReserve auf dem Ballweg (s) | robust, wenn ein Gegner 1 m näher an der Passlinie stünde bzw. 0,1 s schneller reagierte');
lb.forEach(([lo, hi], i) => console.log(`${(lo + ' – ' + (hi > 9 ? '∞' : hi)).padEnd(27)} | n=${String(lres[i].n).padStart(5)}  ${(lres[i].n ? Math.round((100 * lres[i].ok) / lres[i].n) + '%' : '–').padStart(5)}`));
