// V0.6c C1 – Ausgangsmessung „Freilaufen mit Folge“ und Schattenprognose ab Ankunft. Engine unverändert (v0.6.2).
//   node tests/analysis/v0.6c/freilaufen-folge.js [--raster 1] [--json datei]   Messung über R (+ L1–L5)
//   node tests/analysis/v0.6c/freilaufen-folge.js --suchen                       L2/L3/L5 suchen und einfrieren
// Kennzeichnung im Ergebnis:  gemessen = heutige Engine;  prognose = Schattenrechnung ab Ankunft (Blickpause + Pass,
// öffentliche API auf Klonen);  erstC2 = nicht prognostizierbar ohne neue Engine (spätere Passfenster, Zyklen).
'use strict';
const fs = require('node:fs');
const E = require('../../helpers/load.js');
const { zuspielPruefung } = require('./zuspiel.js');
const { istSzene, schatten, BLICK, NEU_TAKT } = require('./sim.js');
const { lagenR, lernLagen, einfrieren, auftauen, FIXTURES } = require('./lagen.js');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const RASTER = Number(arg('--raster', '1'));
const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);

function ziele(s0) {
  const c = E.carrier(s0), out = [];
  for (const r of E.team(s0, 'blue').filter((b) => b !== c)) for (let x = 2; x < E.F.W - 1; x += RASTER) for (let y = 2; y < E.F.H - 1; y += RASTER) out.push({ kind: 'run', id: r.id, x, y });
  return out;
}
const klasse = (sz, sh) => (!sz.ank || sz.ank.lost ? 'ballweg' : !sz.ank.z.pass ? 'kein:' + sz.ank.z.grund : sh.blickZu ? 'blickZu:' + sh.grund : sh.received ? 'pass' : 'abgefangen');

// ------------------------------------------------------------------ Suche L2/L3/L5 (einmalig, bewusst)
function suchen() {
  const R = lagenR(E), fx = {};
  for (const { s: s0, herkunft } of R) {
    const c = E.carrier(s0);
    const rows = ziele(s0).map((a) => ({ a, sz: istSzene(E, s0, a) })).filter((x) => x.sz.ank && !x.sz.ank.lost && !x.sz.steal);
    const mitPass = (x) => x.sz.ank.z.pass && schatten(E, x.sz.ank.snap, x.a.id).received;
    if (!fx.L2) {
      // am Rand, in der Angriffshälfte; Rückpass-Ziel hinter dem Ball UND weiter innen (näher an der Feldmitte)
      const rand = (c.y < 4 || c.y > E.F.H - 4) && c.x >= 12, mitte = E.F.H / 2;
      const back = rows.filter((x) => x.sz.ank.z.pass && x.sz.ank.z.werte.druck && x.sz.ank.z.werte.hinterBall > 1 && Math.abs(x.a.y - mitte) < Math.abs(c.y - mitte) - 2 && mitPass(x)).sort((p, q) => q.sz.ank.z.werte.lane - p.sz.ank.z.werte.lane)[0];
      const fwd = rows.filter((x) => x.sz.ank.z.grund === 'versperrt' && x.a.x > c.x + 2 && x.sz.ev.good)[0];
      if (rand && back && fwd) fx.L2 = { titel: 'Ballführender am Rand unter Druck: Rückpass sichert vs. Vorwärtsziel im Deckungsschatten', herkunft, lage: einfrieren(s0),
        ziele: [{ name: 'rueckpassUnterDruck', a: back.a }, { name: 'vornVersperrt', a: fwd.a }] };
    }
    if (!fx.L3) {
      // Ballführender mittig; beide Ziele vor/auf Höhe des Balls, gleicher Läufer, gleiche Tiefe (|Δx| ≤ 2 m), beide Stern + anspielbar
      const mittig = c.y > 7 && c.y < E.F.H - 7;
      const gut = mittig ? rows.filter((x) => x.sz.ev.good && x.a.x >= c.x - 1 && mitPass(x)) : [];
      let paar = null;
      for (const o of gut.filter((x) => x.a.y < c.y - 3)) for (const u of gut.filter((x) => x.a.y > c.y + 3 && x.a.id === o.a.id && Math.abs(x.a.x - o.a.x) <= 2)) {
        const v = Math.min(o.sz.ank.z.werte.lane, u.sz.ank.z.werte.lane) - 0.1 * Math.abs((o.a.y - c.y) + (u.a.y - c.y));
        if (!paar || v > paar.v) paar = { v, o, u };
      }
      const oben = paar && paar.o, unten = paar && paar.u;
      if (oben && unten) fx.L3 = { titel: 'Zwei gleich gute Räume oben/unten (beide Stern, beide anspielbar)', herkunft, lage: einfrieren(s0),
        ziele: [{ name: 'oben', a: oben.a }, { name: 'unten', a: unten.a }] };
    }
    if (!fx.L5) {
      const x = rows.find((x) => x.sz.ev.good && !x.sz.ank.z.pass && x.sz.ank.z.grund === 'versperrt' && x.sz.auto && x.sz.spaetFenster && x.sz.spaetFenster.nachAnkunft >= 0.6);   // deutlich nach Dribbelbeginn
      if (x) fx.L5 = { titel: 'Passweg öffnet sich erst während des Dribblings des Ballführenden', herkunft, lage: einfrieren(s0), ziele: [{ name: 'spaeterOffen', a: x.a }] };
    }
    if (fx.L2 && fx.L3 && fx.L5) break;
  }
  // Einfrieren prüfen: aufgetaute Lage liefert für alle Ziele dieselbe Szene wie die Originallage
  for (const [k, v] of Object.entries(fx)) {
    const s1 = auftauen(E, v.lage);
    for (const z of v.ziele) {
      const sz = istSzene(E, s1, z.a); z.ankunftGrund = sz.ank.z.grund; z.stern = sz.ev.good;
      if (k === 'L5') z.spaetFensterNach = sz.spaetFenster && Math.round(sz.spaetFenster.nachAnkunft * 100) / 100;
    }
  }
  fs.writeFileSync(FIXTURES, JSON.stringify(fx, null, 1) + '\n');
  console.log('gefunden:', Object.keys(fx).join(', '), '→', FIXTURES);
}

// ------------------------------------------------------------------ Messung
function messen() {
  const R = lagenR(E), z = {}, inc = (k, n = 1) => (z[k] = (z[k] || 0) + n);
  const gruende = { stern: {}, ohneStern: {} }, gruendeOhne = {}, kontext = {}, folgeGrund = { raum: 0, zoneTor: 0, optionen: 0, sicherung: 0 };
  const druckHist = {};
  const freiraum = { ausgeschlossen: 0, blickZu: 0, received: 0, intercepted: 0, verbessert: 0, stern: 0, kontext: {} };
  for (const { s: s0 } of R) for (const a of ziele(s0)) {
    const sz = istSzene(E, s0, a); inc('szenen'); const st = sz.ev.good ? 'stern' : 'ohneStern'; inc(st);
    if (!sz.ank) { inc('keineAnkunft'); continue; }
    if (sz.ank.lost || sz.steal) { inc('ballverlustImLauf'); continue; }
    inc('bewertet'); inc(sz.ank.phase === 'auto' ? 'ist.autoDribbling' : 'ist.halten');
    const laneFrei = sz.ank.z.werte.lane > E.CFG.passLaneOk;
    if (laneFrei) inc('ist.ankunftPasswegFrei'); if (sz.endeFrei) inc('ist.endePasswegFrei');
    if (laneFrei && sz.auto) { inc('ist.ankunftFreiUndAuto'); if (!sz.endeFrei) inc('ist.ankunftFreiAutoEndeZu'); }
    if (sz.ev.good) { if (laneFrei && sz.auto) { inc('ist.stern.ankunftFreiUndAuto'); if (!sz.endeFrei) inc('ist.stern.ankunftFreiAutoEndeZu'); } }
    const g = sz.ank.z.pass ? 'pass' : sz.ank.z.grund; gruende[st][g] = (gruende[st][g] || 0) + 1;
    // Druck-Kriterium (Rückpass-Regel): wie oft steht der Ballführende bei Ankunft unter „Druck“ (< 2,5 m)? Abstand in 0,5-m-Stufen
    const ca = E.carrier(sz.ank.snap), nd = Math.min(...E.team(sz.ank.snap, 'red').map((q) => E.dist(q, ca)));
    druckHist[Math.min(10, Math.floor(nd / 0.5)) * 0.5] = (druckHist[Math.min(10, Math.floor(nd / 0.5)) * 0.5] || 0) + 1;
    if (sz.ank.z.werte.druck) inc('ist.druckBeiAnkunft');
    const go = sz.ank.zOhne.pass ? 'pass' : sz.ank.zOhne.grund; gruendeOhne[go] = (gruendeOhne[go] || 0) + 1;
    if (!sz.ank.z.pass && sz.auto && sz.spaetFenster) inc('ist.spaetesFensterImAutoDribbling');
    // Prognose ab Ankunft (mit Freiraumregel)
    if (sz.ank.z.pass) {
      inc('prog.ankunftPass'); if (!sz.ev.good) inc('prog.ankunftPassOhneStern');
      const sh = schatten(E, sz.ank.snap, a.id, null, true);
      if (sh.blickZu) { inc('prog.blickZu'); inc('prog.blickZu.' + sh.grund); continue; }
      inc('prog.pass'); if (sh.received) inc('prog.received'); else inc('prog.intercepted');
      if (sz.ank.z.werte.hinterBall > 1) {
        inc('prog.rueckpass');
        // Alternative Druck-Definition (zur PO-Entscheidung): mindestens zwei Gegner < 3,5 m am Ballführenden
        const cs = E.carrier(sz.ank.snap); if (E.team(sz.ank.snap, 'red').filter((q) => E.dist(q, cs) < 3.5).length >= 2) inc('prog.rueckpassZweiGegner');
      }
      if (sh.folge && sh.folge.verbessert && !(sh.folge.raum || sh.folge.zoneTor || sh.folge.optionen)) inc('prog.verbessertNurSicherung');
      if (sh.folge) { kontext[sh.folge.kontext] = (kontext[sh.folge.kontext] || 0) + 1; if (sh.folge.verbessert) inc('prog.verbessert'); for (const k in folgeGrund) if (sh.folge[k]) folgeGrund[k]++; }
    } else if (sz.ank.zOhne.pass) {
      // nur durch die NEUE Freiraumregel (≥ 3,2 m) ausgeschlossen: wie ginge der Pass ohne die Regel aus?
      freiraum.ausgeschlossen++; if (sz.ev.good) freiraum.stern++;
      const sh = schatten(E, sz.ank.snap, a.id, { freiraum: false }, true);
      if (sh.blickZu) freiraum.blickZu++;
      else if (sh.received) { freiraum.received++; if (sh.folge) { freiraum.kontext[sh.folge.kontext] = (freiraum.kontext[sh.folge.kontext] || 0) + 1; if (sh.folge.verbessert) freiraum.verbessert++; } }
      else freiraum.intercepted++;
    }
  }
  const ohneRegelPass = (gruendeOhne.pass || 0);
  const erg = {
    stand: { engine: E.VERSION, raster: RASTER, lagenR: R.length, blickpause: BLICK, neupruefTakt: NEU_TAKT },
    gemessen: {
      szenen: z.szenen, stern: z.stern, ohneStern: z.ohneStern, keineAnkunft: z.keineAnkunft || 0, ballverlustImLauf: z.ballverlustImLauf || 0, bewertet: z.bewertet,
      autoDribbling: z['ist.autoDribbling'], halten: z['ist.halten'],
      ankunftPasswegFrei: z['ist.ankunftPasswegFrei'], endePasswegFrei: z['ist.endePasswegFrei'],
      ankunftFreiUndAuto: z['ist.ankunftFreiUndAuto'], ankunftFreiAutoEndeZu: z['ist.ankunftFreiAutoEndeZu'], anteilEndeZu: pct(z['ist.ankunftFreiAutoEndeZu'], z['ist.ankunftFreiUndAuto']),
      sternAnkunftFreiUndAuto: z['ist.stern.ankunftFreiUndAuto'], sternAnkunftFreiAutoEndeZu: z['ist.stern.ankunftFreiAutoEndeZu'],
      gruendeBeiAnkunft: gruende, gruendeBeiAnkunftOhneFreiraumregel: gruendeOhne,
      spaetesFensterImAutoDribbling: z['ist.spaetesFensterImAutoDribbling'] || 0,
      druckBeiAnkunft: z['ist.druckBeiAnkunft'] || 0, druckAnteil: pct(z['ist.druckBeiAnkunft'] || 0, z.bewertet), naechsterGegnerAmBallfuehrendenM: druckHist,
    },
    prognose: {
      hinweis: 'nur ab Ankunft: Blickpause + Neuprüfung + Pass als neue Aktion auf dem Klon (Näherung); keine späteren Passfenster, keine Zyklen',
      ankunftPass: z['prog.ankunftPass'], davonOhneStern: z['prog.ankunftPassOhneStern'] || 0,
      blickZu: z['prog.blickZu'] || 0, blickZuAnteil: pct(z['prog.blickZu'] || 0, z['prog.ankunftPass']), blickZuGruende: Object.fromEntries(Object.entries(z).filter(([k]) => k.startsWith('prog.blickZu.')).map(([k, v]) => [k.slice(13), v])),
      pass: z['prog.pass'], received: z['prog.received'] || 0, intercepted: z['prog.intercepted'] || 0, receivedAnteil: pct(z['prog.received'] || 0, z['prog.pass']),
      rueckpaesse: z['prog.rueckpass'] || 0, rueckpaesseBeiZweiGegnernUnter3_5m: z['prog.rueckpassZweiGegner'] || 0, verbessertNurSicherung: z['prog.verbessertNurSicherung'] || 0,
      verbessert: z['prog.verbessert'] || 0, verbessertAnteil: pct(z['prog.verbessert'] || 0, z['prog.received']), verbessertNach: folgeGrund, folgekontext: kontext,
    },
    freiraumregel: Object.assign({ hinweis: 'neue Zuspielbedingung (bisher nur Stern): Freiraum ≥ 3,2 m um den Empfänger', passOhneRegel: ohneRegelPass, passMitRegel: z['prog.ankunftPass'],
      anteilAusgeschlossen: pct(freiraum.ausgeschlossen, ohneRegelPass) }, freiraum),
    erstC2: ['spätere Passfenster während des Dribblings (Neuprüfung, zweite Blickpause) – L5', 'Zyklen über mehrere Kinderentscheidungen (Doppelpass vs. leerer Zyklus) – M5',
      'Pass innerhalb derselben Szene (doPass statt neuer Aktion), Szenenende, Zählung att/Kontext an der Missionsgrenze – M7', 'gespeicherter Erklärzeitpunkt ep.zuspiel – M3'],
    lernLagen: lagenBericht(),
  };
  return erg;
}

function lagenBericht() {
  const out = {};
  for (const [k, L] of Object.entries(lernLagen(E))) {
    out[k] = { titel: L.titel, kontext: E.context(L.s, { kind: 'pass', success: true, team: 'blue' }).type, ziele: [] };
    for (const zz of L.ziele) {
      const sz = istSzene(E, L.s, zz.a), sh = sz.ank && !sz.ank.lost && sz.ank.z.pass ? schatten(E, sz.ank.snap, zz.a.id, null, true) : {};
      const kl = klasse(sz, sh);
      // M8 (Prognose): gleiche Folgeklasse bei Nachbarzielen ±0,75 m
      const nb = [[0.75, 0], [-0.75, 0], [0, 0.75], [0, -0.75]].map(([dx, dy]) => {
        const a2 = Object.assign({}, zz.a, { x: zz.a.x + dx, y: zz.a.y + dy }), s2 = istSzene(E, L.s, a2);
        return klasse(s2, s2.ank && !s2.ank.lost && s2.ank.z.pass ? schatten(E, s2.ank.snap, a2.id) : {});
      });
      out[k].ziele.push({ name: zz.name, a: zz.a, gemessen: { stern: sz.ev.good, laufGrund: sz.ev.exe.lauf, ankunftGrund: sz.ank && sz.ank.z ? (sz.ank.z.pass ? 'pass' : sz.ank.z.grund) : null,
        autoDribbling: sz.auto, endePasswegFrei: sz.endeFrei, spaetesFenster: sz.spaetFenster ? Math.round(sz.spaetFenster.nachAnkunft * 100) / 100 : null },
        prognose: { klasse: kl, folge: sh.folge || null, nachbarnGleich: nb.filter((x) => x === kl).length + '/4' } });
    }
  }
  return out;
}

if (process.argv.includes('--suchen')) suchen();
else {
  const erg = messen(), j = arg('--json');
  const txt = JSON.stringify(erg, null, 1);
  if (j) fs.writeFileSync(j, txt + '\n');
  console.log(txt);
}
