// Analyse (kein Test): Mission B „Freie Bahn!“ – Situationen B1–B5 (1 gegen 1, dann 1 gegen 2).
// 1 gegen N ist erst mit M2 möglich. Aufruf mit Wegwerf-Kopie (M2-Prototyp):
//   FIQ_ROOT=/tmp/m2proto node tests/analysis/missionsentwurf/b-freie-bahn.js [--kurz]
// Ohne Prototyp meldet validateMission „mindestens 2 gegen 2“ (wird ausgegeben).
const H = require('./harness.js');
const { E, r2 } = H;
const kurz = process.argv.includes('--kurz');

const L = (o) => Object.entries(o).map(([id, [x, y]]) => ({ id, x, y }));
const NEU = (reds) => ({
  red: { ballbesitz: 'r1', spieler: L(Object.assign({ b1: [24, 12], r1: [33, 12] }, reds ? { r2: [31, 18] } : {})) },
  blue: { ballbesitz: 'b1', spieler: L(Object.assign({ b1: [4, 12], r1: [16, 12] }, reds ? { r2: [22, 18] } : {})) },
});
const TEXTE = {
  kontext: {
    angriffFrei: { title: 'Wohin dribbelst du?', tag: 'Freie Bahn', say: 'Du hast den Ball! Wo ist der Weg frei? Tippe dorthin, wohin du dribbeln willst.' },
    angriffDruck: { title: 'Wohin dribbelst du?', tag: 'Freie Bahn', say: 'Achtung, ein Gegner ist nah! Wo ist der Weg frei? Tippe dorthin, wohin du dribbeln willst.' },
    abschluss: { title: 'Welches Tor ist frei?', tag: 'Torabschluss', say: 'Du bist nah am Tor! Schau genau: Welches Tor ist frei? Tippe darauf.' },
  },
};
const sit = (id, sp, zwei) => ({ id, start: { ballbesitz: 'b1', spieler: L(sp) }, neustart: NEU(zwei), phasen: { maxAngriff: 5, verteidigung: 0 },
  hilfe: { reihenfolge: ['dribbeln', 'schiessen'], alternativenNennen: false }, texte: TEXTE });
const S = {
  B1: sit('B1', { b1: [17, 14], r1: [22, 9] }),              // 1:1 – Gegner oben vorn, unten frei
  B3: sit('B3', { b1: [18, 12], r1: [15.5, 12] }),           // 1:1 – Verfolger von hinten (2,5 m)
  B4: sit('B4', { b1: [17, 12], r1: [23, 12] }),             // 1:1 – Gegner frontal
  B2: sit('B2', { b1: [12, 12], r1: [19, 7], r2: [19, 17] }, true),  // 1:2 – Lücke zwischen zwei Gegnern oder außen herum
  B5: sit('B5', { b1: [12, 13], r1: [23, 3], r2: [32, 17] }, true),  // 1:2 – viel Platz, ein großes oder zwei kleine Stücke
};
const WEGE = {
  B1: { 'unten vorbei weit (24|18)': [{ kind: 'dribble', x: 24, y: 18 }], 'unten vorbei kurz (20|18)': [{ kind: 'dribble', x: 20, y: 18 }], 'gerade nach vorn (25|14)': [{ kind: 'dribble', x: 25, y: 14 }], 'auf den Gegner (22|9)': [{ kind: 'dribble', x: 22, y: 8.5 }] },
  B3: { 'weit nach vorn (26|12)': [{ kind: 'dribble', x: 26, y: 12 }], 'kurz nach vorn (21|12)': [{ kind: 'dribble', x: 21, y: 12 }], 'schräg (24|17)': [{ kind: 'dribble', x: 24, y: 17 }], 'zurück zum Verfolger (15|12)': [{ kind: 'dribble', x: 14, y: 12 }] },
  B4: { 'schräg oben (21|6)': [{ kind: 'dribble', x: 21, y: 6 }], 'schräg unten (21|18)': [{ kind: 'dribble', x: 21, y: 18 }], 'seitlich (17|18)': [{ kind: 'dribble', x: 17, y: 18 }], 'frontal in den Gegner (24|12)': [{ kind: 'dribble', x: 24, y: 12 }] },
  B2: { 'durch die Lücke (17|12)': [{ kind: 'dribble', x: 17, y: 12 }], 'durch die Lücke weit (20|12)': [{ kind: 'dribble', x: 20, y: 12 }], 'außen oben (17|2)': [{ kind: 'dribble', x: 17, y: 2 }], 'außen unten (17|22)': [{ kind: 'dribble', x: 17, y: 22 }], 'in Rot 2 (19|17)': [{ kind: 'dribble', x: 19, y: 17 }] },
  B5: { 'zwei große Stücke (20|13),(28|13)': [{ kind: 'dribble', x: 20, y: 13 }, { kind: 'dribble', x: 28, y: 13 }], 'vier kleine Stücke (14|13)…(26|13)': [{ kind: 'dribble', x: 14, y: 13 }, { kind: 'dribble', x: 18, y: 13 }, { kind: 'dribble', x: 22, y: 13 }, { kind: 'dribble', x: 26, y: 13 }], 'groß schräg, groß (19|16),(27|14)': [{ kind: 'dribble', x: 19, y: 16 }, { kind: 'dribble', x: 27, y: 14 }], 'sehr weit getippt (32|13)': [{ kind: 'dribble', x: 32, y: 13 }] },
};

function gridAt(s, label) {
  // Raster aller Dribbelziele in DIESER Lage (1 m, Tipp > 2 m vom Ball): Anteil Stern, Ballverlust in der Szene
  const c = E.carrier(s); let n = 0, good = 0, lost = 0, goodLost = 0, near = 0, nearGood = 0; const dirs = new Set(); const band = { '2-4': [0, 0], '4-6': [0, 0], '6-8': [0, 0], '>8': [0, 0] }; let cap = 0, strict = 0;
  for (let x = 1; x <= 35; x++) for (let y = 1; y <= 23; y++) {
    const d = Math.hypot(x - c.x, y - c.y); if (d < 2) continue;
    const t = E.clone(s); const ev = E.startAction(t, { kind: 'dribble', x, y }); let k = 0; while (!t.ep.done && k++ < 3000) E.tick(t);
    const l = t.poss === 'red'; n++; if (!ev.good && !l) strict++; if (ev.good) { good++; dirs.add(Math.round(Math.atan2(y - c.y, x - c.x) / (Math.PI / 4))); } if (l) lost++; if (ev.good && l) goodLost++;
    if (d <= 8) { near++; if (ev.good) nearGood++; }
    const b = d < 4 ? '2-4' : d < 6 ? '4-6' : d <= 8 ? '6-8' : '>8'; band[b][0]++; if (ev.good) band[b][1]++;
    if (d > 8) { const q = { kind: 'dribble', x: c.x + (x - c.x) / d * 8, y: c.y + (y - c.y) / d * 8 }; if (E.evaluate(E.clone(s), q).good !== ev.good) cap++; }
  }
  return `${label}: Raster ${n} Ziele, ⭐ ${good} (${Math.round(100 * good / n)} %), davon im 8-m-Kreis ${nearGood}/${near} (${Math.round(100 * nearGood / near)} %); Ballverlust ${lost}; ⭐ trotz Ballverlust ${goodLost}; 💭 obwohl Ball behalten ${strict}; ⭐-Richtungen (45°-Sektoren) ${dirs.size}; ⭐ nach Strecke ${Object.entries(band).map(([k, v]) => k + ' m ' + (v[0] ? Math.round(100 * v[1] / v[0]) : '-') + ' %').join(', ')}; Ziel > 8 m anders bewertet als der tatsächlich gedribbelte 8-m-Punkt: ${cap}`;
}

for (const [k, def] of Object.entries(S)) {
  const { errors } = H.register(def);
  console.log(`\n===== ${k}  validateMission: ${JSON.stringify(errors)}`);
  if (errors.length) continue;
  const s0 = E.newState(k); const ctx = E.context(s0, null);
  console.log(`Start: ${H.pos(s0)} | Kontext ${ctx.type} ${ctx.actions.join('+')} | „${ctx.say}“`);
  console.log(gridAt(s0, 'Startlage'));
  // Hilfe-Weg mit Raster in jedem Entscheidungsmoment
  const r = H.play(k, (s, c) => { if (c.actions.includes('dribbeln')) console.log('  ' + gridAt(s, 'Moment ' + c.type)); return H.hintAction(s, c); }, { verbose: !kurz });
  console.log('Hilfe-Weg:'); console.log(H.fmtSteps(r));
  for (const [name, seq] of Object.entries(WEGE[k])) {
    const w = H.play(k, (s, c, i) => (i < seq.length ? seq[i] : H.hintAction(s, c)), { verbose: !kurz });
    console.log(`Weg „${name}“:`); console.log(H.fmtSteps(w));
  }
  console.log('200 Zufallsabfolgen (lcg wie trace.js):', JSON.stringify(H.seeds(k)));
  console.log('200 Zufallsabfolgen (gemischt):        ', JSON.stringify(H.seeds(k, 200, true)));
}

// Verfolger-Prüfung: Gegner direkt hinter dem Ballführenden (Abstand d), Dribbling 4/6/8 m geradeaus nach vorn.
// Vergleicht Bewertung (Ziel gut?) mit der Simulation (Ballverlust?).
console.log('\n===== Verfolger-Prüfung (1 gegen 1, Gegner direkt hinten)');
for (const d of [1.5, 2.5, 2.9, 3.1, 4, 5, 6]) {
  const id = 'verf-' + d; H.register(sit(id, { b1: [12, 12], r1: [12 - d, 12] }));
  const line = [4, 6, 8].map((len) => { const s = E.newState(id); const ev = E.startAction(s, { kind: 'dribble', x: 12 + len, y: 12 }); let k = 0; while (!s.ep.done && k++ < 3000) E.tick(s); return `${len} m: ${ev.good ? '⭐' : '💭'}${s.poss === 'red' ? ' VERLUST' : ' behalten'} (Abstand am Ende ${r2(E.dist(E.carrier(s), E.P(s, 'r1')))} m)`; });
  console.log(`  Abstand ${d} m → ${line.join(' | ')}`);
}
