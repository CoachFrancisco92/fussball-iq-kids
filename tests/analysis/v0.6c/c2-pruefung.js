// V0.6c C2 – Prüfung gegen die ECHTE Engine (Zuspiel in der Szene): M1–M9 über die Lagen R (aus v0.6.2 eingefroren, damit
// die Bezugsmenge mit C1 identisch bleibt) und über ganze Missionsdurchläufe (Kinder-Abfolgen + Hilfe) für M5/M7.
//   node tests/analysis/v0.6c/c2-pruefung.js [--raster 1] [--json datei]
// M6 (Bewertung bitgleich) vergleicht jede Bewertung mit dem Engine-Stand v0.6.2 (git worktree, Tag v0.6.2).
// Nur Analyse – ändert nichts.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..', '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const RASTER = Number(arg('--raster', '1'));
const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
const evKey = (ev) => JSON.stringify([ev.good, ev.rec.good, ev.rec.why, ev.exe.good, ev.exe.why, ev.exe.lauf]);
const ziele = (E, s0) => { const c = E.carrier(s0), out = []; for (const r of E.team(s0, 'blue').filter((b) => b !== c)) for (let x = 2; x < E.F.W - 1; x += RASTER) for (let y = 2; y < E.F.H - 1; y += RASTER) out.push({ kind: 'run', id: r.id, x, y }); return out; };

// ------------------------------------------------------------------ Teil 0: Lagen R und Bewertungen aus v0.6.2
function altStand() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fiq-v062-'));
  execFileSync('git', ['worktree', 'add', '-q', '--detach', tmp, 'v0.6.2'], { cwd: ROOT });
  try {
    const out = execFileSync(process.execPath, ['-e', `
      const E = require(${JSON.stringify(path.join(tmp, 'tests/helpers/load.js'))});
      const L = require(${JSON.stringify(path.join(__dirname, 'lagen.js'))});
      const R = L.lagenR(E).map((x) => L.einfrieren(x.s));
      const ziele = ${ziele.toString()}, evKey = ${evKey.toString()}, RASTER = ${RASTER};
      const ev = R.map((f) => { const s = L.auftauen(E, f); return ziele(E, s).map((a) => evKey(E.evaluate(s, a))); });
      process.stdout.write(JSON.stringify({ R, ev }));`], { maxBuffer: 2e9 });
    return JSON.parse(out);
  } finally { execFileSync('git', ['worktree', 'remove', '--force', tmp], { cwd: ROOT }); }
}

const E = require('../../helpers/load.js');
const { auftauen, kindAktion } = require('./lagen.js');
const { lcg } = require('../../golden/trace.js');

const szeneSpielen = (s0, a) => { const s = E.clone(s0), ev = E.evaluate(s0, a); E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 4000) E.tick(s); return { s, ev, fb: E.feedback(s) }; };
const druckAuf = (s, p) => Math.min(...E.team(s, 'red').map((r) => E.dist(r, p))) < 2.5;
const sichereOptionen = (s) => { const ok = E.situation(s).ok; return ['shoot', 'pass', 'dribble'].filter((k) => ok[k]).length; };

// ------------------------------------------------------------------ Teil 1: Szenen über R (Raster)
function szenen(alt) {
  const z = {}, inc = (k, n = 1) => (z[k] = (z[k] || 0) + n);
  const richtung = { rueck: 0, quer: 0, vor: 0 }, mehrwert = {}, grundKein = {}, blickZuGrund = {}, kontext = {}, verbessert = { rueck: [0, 0], quer: [0, 0], vor: [0, 0] };
  const verbessertNach = { raum: 0, zoneTor: 0, optionen: 0, sicherung: 0 };
  let m6diff = 0, m6n = 0; const m6bsp = [];
  alt.R.forEach((f, li) => {
    const s0 = auftauen(E, f);
    ziele(E, s0).forEach((a, ai) => {
      const { s, ev, fb } = szeneSpielen(s0, a); inc('szenen');
      m6n++; if (evKey(ev) !== alt.ev[li][ai]) { m6diff++; if (m6bsp.length < 5) m6bsp.push({ li, a }); }
      const evs = s.ep.events, typ = evs.map((e) => e.type);
      if (typ.includes('steal')) { inc('ballverlust'); return; }
      const blicke = evs.filter((e) => e.type === 'blick'), iAuto = typ.indexOf('autoDribble');
      const ankunftPass = blicke.length > 0 && (iAuto < 0 || typ.indexOf('blick') < iAuto);    // Bedingung bei Ankunft erfüllt
      const spaet = blicke.filter((b) => iAuto >= 0 && typ.indexOf('blick') >= 0 && evs.indexOf(b) > iAuto).length;
      if (blicke.length > 2) inc('fehler.mehrAls2Blicke');
      inc('blicke', blicke.length); if (ev.good) inc('stern');
      const zsp = evs.find((e) => e.type === 'zuspiel'), rec = evs.some((e) => e.type === 'received' && e.by === a.id);
      const bz = evs.filter((e) => e.type === 'blickZu'); bz.forEach((e) => (blickZuGrund[e.grund] = (blickZuGrund[e.grund] || 0) + 1));
      if (ankunftPass) { inc('ankunftPass'); if (!zsp) { inc('ankunftPassOhneZuspiel'); if (!bz.length) inc('fehler.ohneZuspielOhneBlickZu'); } if (ev.good) { inc('sternAnkunftPass'); if (!rec) inc('sternAnkunftPassOhneAnnahme'); } }
      if (spaet) { inc('spaeteBlicke', spaet); inc('szenenMitSpaetemFenster'); if (zsp && evs.indexOf(zsp) > iAuto) inc('spaetesFensterZuspiel'); }
      // M1: Bedingung nach Blickpause erfüllt → Zuspiel; angenommen?
      if (zsp) { inc('zuspiel'); richtung[zsp.richtung]++; if (rec) inc('angenommen'); else inc('abgefangen');
        if (zsp.richtung === 'rueck') { const m = s.ep.zuspiel.werte.mehrwert; mehrwert[m] = (mehrwert[m] || 0) + 1; }
        if (!ev.good) inc('zuspielOhneStern'); }
      if (!zsp && s.ep.zuspiel) { const g = s.ep.zuspiel.grund; grundKein[g] = (grundKein[g] || 0) + 1; }
      // M3: Begründung = gespeicherter Zeitpunkt
      if (!rec && s.ep.zuspiel && !s.ep.zuspiel.pass) {
        inc('m3.n'); const zz = s.ep.zuspiel, T = E.texts(s).ergebnis, nm = zz.key ? E.nameOf(s, zz.key) : T.einGegner;
        const lauf = ev.exe.lauf, einGrund = !(zz.alle && zz.alle.includes(lauf)) || zz.grund === lauf;
        const ok = fb.text.startsWith(T.laufKeinZuspiel[zz.grund](nm)) && fb.explain.key === zz.key && einGrund && (!fb.explain.pass || (fb.explain.pass.from.x === zz.von.x && fb.explain.pass.to.y === zz.zu.y));
        if (!ok) inc('fehler.m3');
      }
      // M4: Folge nach Annahme (Szenenende = nächste Entscheidung); „Lage verbessert“ wie C1, getrennt nach Richtung
      if (rec) {
        const k = E.context(s, { kind: 'run', success: true, team: 'blue' }).type; kontext[k] = (kontext[k] || 0) + 1;
        if (s.poss === 'blue' && E.carrier(s).id !== a.id) inc('fehler.empfaengerNichtAmBall');
        if (s.poss === 'blue' && E.carrier(s).id === a.id) {
          const zz = s.ep.zuspiel, von = zz.von, rr = E.P(s, a.id);
          // Vorher-Lage = Zeitpunkt des Zuspiels: Optionen des Passgebers dort (Lage aus gespeicherten Positionen rekonstruiert)
          const vorS = E.clone(s); for (const p of vorS.players) { const q = p.id === von.id ? von : p.id === a.id ? zz.zu : zz.gegner[p.id]; if (q) { p.x = q.x; p.y = q.y; } }
          vorS.ball = { x: von.x, y: von.y, owner: von.id, flight: null };
          const g = { raum: rr.x - von.x >= 2, zoneTor: rr.x >= E.F.W - E.F.ZONE - 0.3 && E.shotOptions(s).some((o) => o.margin > E.CFG.shotLaneOk),
            optionen: sichereOptionen(s) > sichereOptionen(vorS), sicherung: druckAuf(vorS, E.P(vorS, von.id)) && !druckAuf(s, rr) };
          const v = g.raum || g.zoneTor || g.optionen, vS = v || g.sicherung;
          for (const kk in verbessertNach) if (g[kk]) verbessertNach[kk]++;
          if (v) inc('verbessertOhneSicherung'); if (vS) inc('verbessertMitSicherung');
          verbessert[zsp.richtung][0]++; if (v) verbessert[zsp.richtung][1]++;
        }
      }
      // K3 (wie C1): Stern, Passweg bei Ankunft frei, kein Zuspiel, am Ende zu
    });
  });
  return { z, richtung, mehrwert, grundKein, blickZuGrund, kontext, verbessert, verbessertNach, m6: { n: m6n, abweichend: m6diff, beispiele: m6bsp } };
}

// ------------------------------------------------------------------ Teil 2: ganze Durchläufe (M5 Zyklen, M7 Zählung/Kontext)
const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run', erobern: 'press', raum: 'cover' };
function hilfeAktion(s, ctx) { const k = E.recommend(s, ctx.actions), h = E.hint(s, k), a = { kind: MAP[k] }; if (h.ids && h.ids.length) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal; if (a.kind === 'run' && !a.id) return null; return a; }
function durchlauf(missionId, durchlaufNr, chooser, out) {
  const s = E.newState(missionId, durchlaufNr), m = E.newMission(missionId, durchlaufNr); let last = null, vorPass = null;
  for (let i = 0; !m.done && i < 12; i++) {
    const ctx = E.context(s, last); let a = chooser(s, ctx); if (!a) break;
    const vor = { ball: E.carrier(s) ? { x: E.carrier(s).x, id: E.carrier(s).id } : null, att: m.att };
    E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 4000) E.tick(s);
    const fb = E.feedback(s); E.missionAfter(m, s, ctx.type);
    const zsp = a.kind === 'run' && s.ep.events.find((e) => e.type === 'zuspiel'), rec = zsp && s.ep.events.some((e) => e.type === 'received' && e.by === a.id);
    if (a.kind === 'run') out.laeufe++;
    if (zsp) {
      out.zuspiele++; out.richtung[zsp.richtung]++;
      // M7: genau eine Kinderentscheidung verbraucht; danach nie „ohneBall“; Angriff/Abschluss mit Empfänger, wenn die Mission weiterläuft
      if (ctx.type !== 'verteidigung' && m.att !== vor.att + 1 && !(m.note === 'situation' && m.att === 0)) out.fehler.push(['zaehlung', missionId, durchlaufNr, i]);
      E.missionApply(m, s);
      const weiter = !m.done && m.note == null && !m.pending && m.att < m.maxAttack;
      const nk = m.done ? null : E.context(s, { kind: 'run', success: fb.success, team: 'blue' }).type;
      if (nk === 'ohneBall') out.fehler.push(['ohneBall', missionId, durchlaufNr, i]);
      if (rec && weiter) { out.m7weiter++; if (!['angriff', 'abschluss'].includes(nk) || E.carrier(s).id !== a.id) out.fehler.push(['kontext', missionId, durchlaufNr, i, nk]); }
      else if (rec) out.m7grenze++;
      // M5: Zyklus = vorige Kinderentscheidung Pass A→B, jetzt Freilaufen A, Auto-Zuspiel B→A
      if (rec && vorPass && vorPass.from === a.id && vorPass.to === zsp.from) {
        const A = E.P(s, a.id), raum = A.x - vorPass.ballX >= 3, zoneTor = A.x >= E.F.W - E.F.ZONE - 0.3 && E.carrier(s) === A && E.shotOptions(s).some((o) => o.margin > E.CFG.shotLaneOk);
        const sinnvoll = raum || zoneTor || (zsp.richtung === 'rueck' && !!s.ep.zuspiel.werte.mehrwert);
        out.zyklen.push({ missionId, durchlaufNr, i, sinnvoll, raum, zoneTor, richtung: zsp.richtung });
      }
    } else E.missionApply(m, s);
    vorPass = a.kind === 'pass' && fb.success && s.poss === 'blue' ? { from: vor.ball && vor.ball.id, to: E.carrier(s).id, ballX: vor.ball ? vor.ball.x : 0 } : null;
    last = { kind: a.kind, success: fb.success, team: 'blue' };
  }
  return out;
}
function durchlaeufe() {
  const res = {};
  for (const [missionId, nD] of [['mission-1', 1], ['welches-tor-ist-frei', 5], ['freie-bahn', 5]]) {
    const neu = () => ({ laeufe: 0, zuspiele: 0, richtung: { rueck: 0, quer: 0, vor: 0 }, m7weiter: 0, m7grenze: 0, zyklen: [], fehler: [] });
    const kind = neu(), hilfe = neu(); const abfolgen = { kind: new Map(), hilfe: new Map() };
    for (let seed = 1; seed <= 200; seed++) { const rnd = lcg(seed); const vorher = kind.zyklen.length; durchlauf(missionId, 0, (s, ctx) => kindAktion(E, s, ctx, rnd), kind); abfolgen.kind.set(seed, kind.zyklen.slice(vorher)); }
    for (let d = 0; d < nD; d++) { const vorher = hilfe.zyklen.length; durchlauf(missionId, d, hilfeAktion, hilfe); abfolgen.hilfe.set(d, hilfe.zyklen.slice(vorher)); }
    const leer = (m) => [...m.values()].map((zs) => zs.filter((x) => !x.sinnvoll).length);
    const fass = (o, m) => ({ laeufe: o.laeufe, zuspiele: o.zuspiele, richtung: o.richtung, m7weiterlaufend: o.m7weiter, m7anGrenze: o.m7grenze, zyklen: o.zyklen.length, leereZyklen: o.zyklen.filter((x) => !x.sinnvoll).length,
      abfolgenMitLeeremZyklus: leer(m).filter((n) => n >= 1).length, abfolgenMitZweiLeeren: leer(m).filter((n) => n >= 2).length, abfolgen: m.size, fehler: o.fehler });
    res[missionId] = { kinderAbfolgen: fass(kind, abfolgen.kind), hilfe: fass(hilfe, abfolgen.hilfe) };
  }
  return res;
}

// ------------------------------------------------------------------ Bericht
const alt = altStand();
const t = szenen(alt), z = t.z;
const erg = {
  stand: { raster: RASTER, lagenR: alt.R.length, quelleR: 'v0.6.2 (eingefroren)', blickpause: E.ZUSPIEL.blick, neupruefTakt: E.ZUSPIEL.takt, maxBlick: E.ZUSPIEL.maxBlick },
  gemessenSzenen: {
    szenen: z.szenen, ballverlustImLauf: z.ballverlust || 0, stern: z.stern,
    M1: { zuspiele: z.zuspiel || 0, angenommen: z.angenommen || 0, abgefangen: z.abgefangen || 0, anteilAngenommen: pct(z.angenommen || 0, z.zuspiel), zuspielOhneStern: z.zuspielOhneStern || 0 },
    M2: { ankunftBedingungErfuellt: z.ankunftPass || 0, ohneZuspiel: z.ankunftPassOhneZuspiel || 0, anteil: pct(z.ankunftPassOhneZuspiel || 0, z.ankunftPass), blickZuGruende: t.blickZuGrund, fehlerOhneBlickZu: z['fehler.ohneZuspielOhneBlickZu'] || 0 },
    M2b: { sternMitBedingungBeiAnkunft: z.sternAnkunftPass || 0, ohneAnnahme: z.sternAnkunftPassOhneAnnahme || 0, anteil: pct(z.sternAnkunftPassOhneAnnahme || 0, z.sternAnkunftPass) },
    richtung: t.richtung, rueckpassMehrwert: t.mehrwert, grundOhneZuspiel: t.grundKein,
    M3: { szenenOhneZuspiel: z['m3.n'] || 0, fehler: z['fehler.m3'] || 0 },
    M4: { folgekontext: t.kontext, empfaengerNichtAmBall: z['fehler.empfaengerNichtAmBall'] || 0, verbessertOhneSicherung: z.verbessertOhneSicherung || 0, verbessertMitSicherung: z.verbessertMitSicherung || 0,
      anteilOhneSicherung: pct(z.verbessertOhneSicherung || 0, z.angenommen), nachRichtung: Object.fromEntries(Object.entries(t.verbessert).map(([k, [n, v]]) => [k, { angenommen: n, verbessert: v, anteil: pct(v, n) }])), nach: t.verbessertNach },
    M6: t.m6,
    M9: { szenenMitSpaetemFenster: z.szenenMitSpaetemFenster || 0, spaeteBlicke: z.spaeteBlicke || 0, davonZuspiel: z.spaetesFensterZuspiel || 0, mehrAls2Blicke: z['fehler.mehrAls2Blicke'] || 0 },
  },
  gemessenDurchlaeufe: durchlaeufe(),
};
const j = arg('--json'); const txt = JSON.stringify(erg, null, 1);
if (j) fs.writeFileSync(j, txt + '\n');
console.log(txt);
