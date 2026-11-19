// Analyse (kein Test): Mission A „Welches Tor ist frei?“ – Situationen A1–A5 als Einzelmissionen im Speicher.
// Aufruf: node tests/analysis/missionsentwurf/a-welches-tor.js [--kurz]
const H = require('./harness.js');
const { E } = H;
const kurz = process.argv.includes('--kurz');

const NEUSTART = {
  red: { ballbesitz: 'r1', spieler: [{ id: 'b1', x: 25, y: 10 }, { id: 'b2', x: 25, y: 16 }, { id: 'r1', x: 33.5, y: 12 }, { id: 'r2', x: 31, y: 18 }] },
  blue: { ballbesitz: 'b1', spieler: [{ id: 'b1', x: 24, y: 12 }, { id: 'b2', x: 22, y: 18 }, { id: 'r1', x: 28, y: 10 }, { id: 'r2', x: 33, y: 14 }] },
};
const sit = (id, spieler, extra) => Object.assign({ id, start: { ballbesitz: 'b1', spieler }, neustart: NEUSTART, phasen: { maxAngriff: 3, verteidigung: 0 },
  hilfe: { reihenfolge: ['schiessen', 'dribbeln', 'passen'], alternativenNennen: false } }, extra);
const S = {
  A1: sit('A1', [{ id: 'b1', x: 31, y: 12 }, { id: 'b2', x: 24, y: 19 }, { id: 'r1', x: 29.5, y: 13.5 }, { id: 'r2', x: 34.5, y: 7.8 }]),
  A2: sit('A2', [{ id: 'b1', x: 30.5, y: 14.5 }, { id: 'b2', x: 24, y: 6 }, { id: 'r1', x: 29, y: 13 }, { id: 'r2', x: 34, y: 16.7 }]),
  A3: sit('A3', [{ id: 'b1', x: 32, y: 8 }, { id: 'b2', x: 30, y: 20 }, { id: 'r1', x: 33.1, y: 10.8 }, { id: 'r2', x: 34.2, y: 7 }]),
  A4: sit('A4', [{ id: 'b1', x: 26, y: 12 }, { id: 'b2', x: 21, y: 19 }, { id: 'r1', x: 24, y: 9.5 }, { id: 'r2', x: 34.4, y: 7.9 }]),
  A5: sit('A5', [{ id: 'b1', x: 30.5, y: 13 }, { id: 'b2', x: 24, y: 6 }, { id: 'r1', x: 28.5, y: 13 }, { id: 'r2', x: 34, y: 12 }]),
};
// Skriptwege je Situation: erste Entscheidung fest, danach Hilfe-Weg (oder fest, falls angegeben)
const WEGE = {
  A1: { 'Tor unten (frei)': [{ kind: 'shoot', goal: 1 }], 'Tor oben (Torwächter)': [{ kind: 'shoot', goal: 0 }], 'Pass zu b2 (Gegner nah am Weg)': [{ kind: 'pass', id: 'b2' }], 'Pass in den Raum (28|20)': [{ kind: 'pass', x: 28, y: 20 }] },
  A2: { 'Tor oben (frei)': [{ kind: 'shoot', goal: 0 }], 'Tor unten (Torwächter)': [{ kind: 'shoot', goal: 1 }], 'Pass zu b2': [{ kind: 'pass', id: 'b2' }] },
  A3: { 'Pass zu b2, dann Tor unten': [{ kind: 'pass', id: 'b2' }, { kind: 'shoot', goal: 1 }], 'Pass zu b2, dann Tor oben': [{ kind: 'pass', id: 'b2' }, { kind: 'shoot', goal: 0 }], 'Schuss oben': [{ kind: 'shoot', goal: 0 }], 'Schuss unten': [{ kind: 'shoot', goal: 1 }], 'Pass in den Raum (30|16)': [{ kind: 'pass', x: 30, y: 16 }] },
  A4: { 'Dribbeln nach (31|15), dann Hilfe': [{ kind: 'dribble', x: 31, y: 15 }], 'Dribbeln nach (30|18), dann Hilfe': [{ kind: 'dribble', x: 30, y: 18 }], 'gerade nach (31|12), dann Hilfe': [{ kind: 'dribble', x: 31, y: 12 }], 'Dribbeln nach (31|9) (zum Torwächter), dann Hilfe': [{ kind: 'dribble', x: 31, y: 9 }], 'kurz dribbeln (28|12), dann Hilfe': [{ kind: 'dribble', x: 28, y: 12 }], 'Dribbeln nach (31|15), dann Tor oben': [{ kind: 'dribble', x: 31, y: 15 }, { kind: 'shoot', goal: 0 }], 'Pass zu b2': [{ kind: 'pass', id: 'b2' }], 'Dribbeln in Rot 1': [{ kind: 'dribble', x: 24, y: 8 }] },
  A5: { 'Tor unten (freier)': [{ kind: 'shoot', goal: 1 }], 'Tor oben (auch frei)': [{ kind: 'shoot', goal: 0 }], 'Pass zu b2': [{ kind: 'pass', id: 'b2' }] },
};

for (const [k, def] of Object.entries(S)) {
  const { errors } = H.register(def);
  console.log(`\n===== ${k}  validateMission: ${JSON.stringify(errors)}`);
  const s0 = E.newState(k); const st = E.situation(s0); const ctx = E.context(s0, null);
  console.log(`Start: ${H.pos(s0)} | Kontext ${ctx.type} ${ctx.actions.join('+')}`);
  console.log(`Schussreserven oben/unten: ${st.shots.length ? st.shots.map((o) => H.r2(o.margin)).join(' / ') : '– (außerhalb der Zone)'} | Pass b2: ${H.r2(st.passes[0].margin)} | ok ${JSON.stringify(st.ok)}`);
  console.log('Hilfe-Weg:'); console.log(H.fmtSteps(H.play(k, 'hint', { verbose: !kurz })));
  for (const [name, seq] of Object.entries(WEGE[k])) {
    const r = H.play(k, (s, c, i) => (i < seq.length ? seq[i] : H.hintAction(s, c)), { verbose: !kurz });
    console.log(`Weg „${name}“:`); console.log(H.fmtSteps(r));
  }
  console.log('200 Zufallsabfolgen (lcg wie trace.js):', JSON.stringify(H.seeds(k)));
  console.log('200 Zufallsabfolgen (gemischt):        ', JSON.stringify(H.seeds(k, 200, true)));
}

// Dribbel-Raster für A4 (Startlage): Anteil Stern, und wie viele ⭐-Ziele direkt in die Torschusszone führen
const g = H.dribbleGrid('A4'); const zone = g.goodPts.filter(([x]) => x >= E.F.W - E.F.ZONE - 0.3).length;
console.log(`\nA4 Dribbel-Raster: ${g.n} Ziele, ⭐ ${g.good} (${Math.round(100 * g.anteilStern)} %), davon in der Torschusszone ${zone}; Ballverlust ${g.ballverlust}`);
