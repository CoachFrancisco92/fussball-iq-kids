// Meilenstein 3b – Zusatzprüfung E3 (Raumgewinn) und E5 (mehrere gute Entscheidungen). Nur Analyse, ändert nichts.
// Grundlage: Engine des Branches (D1/D2 umgesetzt: ⭐-Ziel = sicher), dieselben Lagen wie in 3a.
//   node tests/analysis/paket-d/vergleich.js --dump /tmp/paketd-lagen.json   (falls noch nicht vorhanden)
//   node tests/analysis/paket-d/e3-e5.js /tmp/paketd-lagen.json
const fs = require('node:fs');
const { E } = require('./common.js');
const F = E.F, CFG = E.CFG;
const L = JSON.parse(fs.readFileSync(process.argv[2] || '/tmp/paketd-lagen.json', 'utf8'));
const near = (s, p) => Math.min(...E.team(s, 'red').map((r) => Math.hypot(r.x - p.x, r.y - p.y)));
const bestPass = (s) => { const o = E.passOptions(s); return o.length ? Math.max(...o.map((x) => x.margin)) : -9; };
const freeShotFrom = (s, p) => Math.max(...F.goals.red.map((g, i) => { const t = E.clone(s); const c = E.carrier(t); c.x = p.x; c.y = p.y; return E.shotOptions(t)[i].margin; })) > CFG.shotLaneOk;
function simEnd(s, to) {
  const t = E.clone(s), c0 = E.carrier(t); E.startAction(t, { kind: 'dribble', x: to.x, y: to.y }); let n = 0; while (!t.ep.done && n++ < 3000) E.tick(t);
  return t;
}
const rows = [];
for (const l of L) {
  const s = l.s, c = E.carrier(s), open0 = near(s, c), druck = open0 < 2.5, pass0 = bestPass(s), mateFrei = pass0 > CFG.passLaneOk;
  const inZone0 = c.x >= F.W - F.ZONE - 0.3;
  const zs = [];
  for (let a = 0; a < 360; a += 15) for (const d of [2, 3, 4, 5, 6, 8]) { const r = (a * Math.PI) / 180; const x = c.x + Math.cos(r) * d, y = c.y + Math.sin(r) * d; if (x < 0.7 || y < 0.7 || x > F.W - 0.7 || y > F.H - 0.7) continue; zs.push({ x, y, a, d }); }
  const judged = zs.map((z) => {
    const ev = E.evaluate(s, { kind: 'dribble', x: z.x, y: z.y }); if (!ev.exe.good) return { z, safe: false };
    const t = simEnd(s, z), c1 = E.carrier(t), gain = c1.x - c.x, open1 = near(t, c1), pass1 = t.poss === 'blue' ? bestPass(t) : -9;
    const zone1 = c1.x >= F.W - F.ZONE - 0.3, shot1 = zone1 && freeShotFrom(t, c1);
    return { z, safe: true, gain, open1, pass1, zone1, shot1, lat: Math.abs(c1.y - c.y) };
  });
  const fwdSafe = judged.some((j) => j.safe && j.gain >= 1);
  for (const j of judged.filter((x) => x.safe)) rows.push({ src: l.src, druck, open0, mateFrei, pass0, fwdSafe, inZone0, ...j, anschluss: (!mateFrei && j.pass1 > CFG.passLaneOk) || (j.shot1 && !inZone0) });
}
fs.writeFileSync('/tmp/e3.json', JSON.stringify(rows));
const n = (f) => rows.filter(f).length;
console.log(`Sichere Dribblings (heute ⭐ nach E1): ${rows.length} in ${L.length} Lagen`);
const cat = (r) => r.gain >= 1 ? 'A Raumgewinn ≥ 1 m'
  : r.gain > -1 ? (r.druck ? 'B seitlich unter Druck (|Δx| < 1 m)' : 'C seitlich ohne Druck')
  : r.druck ? 'D rückwärts unter Druck' : 'E rückwärts ohne Druck';
const tab = {};
for (const r of rows) { const k = cat(r); const t = (tab[k] = tab[k] || { Anzahl: 0, 'vorn frei (sicherer Vorwärtsweg)': 0, 'Freund frei': 0, 'Anschluss geschaffen': 0, 'Abstand Gegner +1 m': 0, 'weder vorn frei noch Freund frei': 0 }); t.Anzahl++;
  if (r.fwdSafe) t['vorn frei (sicherer Vorwärtsweg)']++; if (r.mateFrei) t['Freund frei']++; if (r.anschluss) t['Anschluss geschaffen']++; if (r.open1 >= r.open0 + 1) t['Abstand Gegner +1 m']++; if (!r.fwdSafe && !r.mateFrei) t['weder vorn frei noch Freund frei']++; }
console.table(tab);
// Grenzfälle um 1 m
const g = {}; for (const r of rows) { if (r.gain < 0 || r.gain >= 2) continue; const b = (Math.floor(r.gain * 4) / 4).toFixed(2); g[b] = g[b] || { n: 0, anschluss: 0, zone: 0 }; g[b].n++; if (r.anschluss) g[b].anschluss++; if (r.zone1) g[b].zone++; }
console.log('Raumgewinn 0–2 m in 0,25-m-Stufen:'); console.table(g);
// Regeln
const R1 = (r) => r.gain >= 1 || (!r.fwdSafe && !r.mateFrei);
const R2 = (r) => r.gain >= 1 || r.anschluss || (!r.fwdSafe && !r.mateFrei);
const R2b = (r) => r.gain >= 0.5 || r.anschluss || (!r.fwdSafe && !r.mateFrei);
const R3 = (r) => R2(r) || (r.druck && r.open1 >= r.open0 + 1);
for (const [k, f] of [['R1 (3a: ≥1 m oder Ball sichern)', R1], ['R2 (+ Anschluss geschaffen)', R2], ['R2b (≥0,5 m statt 1 m)', R2b], ['R3 (R2 + Druck gelöst)', R3]]) {
  const by = {}; for (const r of rows) { const c = cat(r)[0]; by[c] = by[c] || [0, 0]; by[c][0]++; if (f(r)) by[c][1]++; }
  console.log(k.padEnd(34), `⭐ ${n(f)} von ${rows.length}`, Object.entries(by).sort().map(([c, [a, b]]) => `${c}: ${b}/${a}`).join(' · '));
}
