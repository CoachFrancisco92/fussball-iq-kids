// Meilenstein 3b – Zusatzprüfung E5 (Pass und Dribbling als gute Entscheidungen). Nur Analyse.
// Vier Beispiel-Lagen (je 2 gegen 2 bzw. 3 gegen 3, keine präparierten Sonderregeln) und Häufigkeit in den 113 Lagen.
const fs = require('node:fs');
const { E, probeState } = require('./common.js');
const F = E.F, CFG = E.CFG, P = (id, x, y) => ({ id, x, y });
const near = (s, p) => Math.min(...E.team(s, 'red').map((r) => Math.hypot(r.x - p.x, r.y - p.y)));
const zone = (p) => p.x >= F.W - F.ZONE - 0.3;
const shotFree = (s, p) => { const t = E.clone(s), c = E.carrier(t); c.x = p.x; c.y = p.y; return Math.max(...E.shotOptions(t).map((o) => o.margin)) > CFG.shotLaneOk; };
function dribbles(s) { // sichere Dribblings (E1) mit Endlage
  const c = E.carrier(s), out = [];
  for (let a = -90; a <= 90; a += 15) for (const d of [3, 5, 8]) { const r = (a * Math.PI) / 180, z = { x: c.x + Math.cos(r) * d, y: c.y + Math.sin(r) * d };
    if (z.x < 0.7 || z.y < 0.7 || z.x > F.W - 0.7 || z.y > F.H - 0.7) continue; const ev = E.evaluate(s, { kind: 'dribble', x: z.x, y: z.y }); if (!ev.exe.good) continue;
    const t = E.clone(s); E.startAction(t, { kind: 'dribble', x: z.x, y: z.y }); let n = 0; while (!t.ep.done && n++ < 3000) E.tick(t); const c1 = E.carrier(t);
    out.push({ z, gain: c1.x - c.x, zoneShot: zone(c1) && shotFree(t, c1) }); }
  return out;
}
function torchancePass(s) { // Pass zu einem freien Freund, der in der Zone steht und von dort frei schießen kann
  const c = E.carrier(s);
  return E.passOptions(s).filter((o) => o.margin > CFG.passLaneOk).some((o) => { const m = E.P(s, o.id); return zone(m) && shotFree(s, m); });
}
function urteil(s) {
  const sit = E.situation(s), dr = dribbles(s), fwd = dr.filter((d) => d.gain >= 1), mate = sit.ok.mate, tc = torchancePass(s);
  const hp = E.hint(s, 'passen'), pass = hp.ids && hp.ids.length ? E.evaluate(s, { kind: 'pass', id: hp.ids[0] }) : null;
  const hd = E.hint(s, 'dribbeln'), drb = E.evaluate(s, { kind: 'dribble', x: hd.point.x, y: hd.point.y });
  const dribbelSinnvoll = fwd.length > 0 || (dr.length > 0 && !mate);
  const vorrang = tc && !dr.some((d) => d.zoneShot);
  return { heute: { pass: pass ? (pass.good ? '⭐' : '💭') + ' ' + pass.why : '–', dribbeln: (drb.good ? '⭐' : '💭') + ' ' + drb.why, hilfe: E.recommend(s, E.context(s, null).actions) },
    vorschlag: { pass: pass ? (pass.good ? '⭐' : '💭') : '–', dribbeln: !dribbelSinnvoll ? '💭 (kein guter Dribbelweg)' : vorrang ? '💭 „Dein Freund stand frei vor dem Tor – Passen war besser.“' : drb.exe.good ? '⭐' : '💭' },
    fakten: { freundFrei: mate, torchancePass: tc, sichereVorwaertswege: fwd.length, dribbelInZoneMitFreiemSchuss: dr.some((d) => d.zoneShot) } };
}
const X = {
  'X1 Freund frei vor dem Tor': [P('b1', 20, 12), P('b2', 31, 7), P('r1', 21.4, 12.6), P('r2', 34.4, 15.5)],
  'X2 Dribbeln möglich, aber wenig zweckmäßig': [P('b1', 9, 12), P('b2', 18, 5), P('r1', 13, 12), P('r2', 16, 16), P('r3', 30, 12)],
  'X3 Pass und Dribbling gut': [P('b1', 14, 12), P('b2', 21, 5), P('r1', 15.4, 12.6), P('r2', 30, 18)],
  'X4 Pass riskanter als Dribbling': [P('b1', 14, 12), P('b2', 22, 6), P('r1', 18.5, 9.2), P('r2', 30, 18)],
};
for (const [k, sp] of Object.entries(X)) { const s = probeState(sp); console.log('\n' + k, JSON.stringify(urteil(s), null, 1)); }
// Häufigkeit in den 113 Lagen (Mission 1, Mission A, Entwürfe)
const L = JSON.parse(fs.readFileSync(process.argv[2] || '/tmp/paketd-lagen.json', 'utf8'));
let tc = 0, tcDr = 0, mateFwd = 0, mate = 0;
for (const l of L) { const s = l.s, sit = E.situation(s); if (!sit.ok.mate) continue; mate++; const dr = dribbles(s); if (dr.some((d) => d.gain >= 1)) mateFwd++; if (torchancePass(s)) { tc++; if (dr.some((d) => d.zoneShot)) tcDr++; } }
console.log(`\nLagen mit freiem Freund: ${mate}; davon mit sicherem Vorwärts-Dribbling: ${mateFwd}; mit Torchance-Pass: ${tc} (davon Dribbling bis zum freien Schuss ebenfalls möglich: ${tcDr})`);
