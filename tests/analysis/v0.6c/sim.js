// V0.6c C1 – Hilfsfunktionen für Messung und Testlagen. Nutzen nur die öffentliche Engine-API auf Klonen;
// keine zweite Engine. Die Schattenprognose deckt NUR den Moment ab Ankunft ab (Blickpause 0,3 s + Pass);
// spätere Passfenster während des Dribblings (L5) und Zyklen über mehrere Entscheidungen (M5) prognostiziert sie nicht.
'use strict';
const { zuspielPruefung, GRENZEN } = require('./zuspiel.js');

const BLICK = 0.3;          // s, Blickpause (Vorschlag, PO-Bestätigung offen)
const NEU_TAKT = 0.2;       // s, Neuprüfung während des heutigen Auto-Dribblings (nur Ist-Beleg)

/** Heutige Szene (Engine unverändert) vollständig abspielen und dabei messen. */
function istSzene(E, s0, a, opts) {
  const s = E.clone(s0), ev = E.startAction(s, a);
  let ank = null, n = 0, spaetFenster = null, naechsteNeu = null;
  while (!s.ep.done && n++ < 3000) {
    E.tick(s);
    if (!ank && s.ep.phase !== 'main') {
      const lost = s.poss !== 'blue';
      ank = { t: s.ep.t, phase: s.ep.phase, lost, snap: E.clone(s), z: lost ? null : zuspielPruefung(E, s, E.P(s, a.id), opts), zOhne: lost ? null : zuspielPruefung(E, s, E.P(s, a.id), { freiraum: false }) };
      naechsteNeu = s.ep.t + NEU_TAKT;
    } else if (ank && s.ep.phase === 'auto' && !spaetFenster && s.ep.endT == null && s.poss === 'blue' && s.ep.t >= naechsteNeu - 1e-9) {
      naechsteNeu += NEU_TAKT;
      const z = zuspielPruefung(E, s, E.P(s, a.id), opts);
      if (z.pass) spaetFenster = { t: s.ep.t, nachAnkunft: s.ep.t - ank.t };
    }
  }
  const steal = s.ep.events.some((e) => e.type === 'steal');
  const r = E.P(s, a.id), c = E.carrier(s);
  const endeFrei = !steal && c && c.team === 'blue' && c.id !== r.id ? E.passOptions(s).find((o) => o.id === r.id).margin > E.CFG.passLaneOk : null;
  return { ev, ank, steal, auto: s.ep.events.some((e) => e.type === 'autoDribble'), endeFrei, spaetFenster, s };
}

const druckAuf = (E, s, p) => Math.min(...E.team(s, 'red').map((r) => E.dist(r, p))) < GRENZEN.druck;
const sichereOptionen = (E, s) => { const ok = E.situation(s).ok; return ['shoot', 'pass', 'dribble'].filter((k) => ok[k]).length; };
const freieToreJetzt = (E, s) => E.shotOptions(s).filter((o) => o.margin > E.CFG.shotLaneOk).length;

/** Schattenprognose ab Ankunft: Blickpause (Ballführender hält), vollständige Neuprüfung, ggf. Pass (öffentliche API).
 *  Näherung: Der Pass startet als neue Aktion auf dem Klon (startAction), nicht innerhalb derselben Szene. */
function schatten(E, sArr, rId, opts, mitFolge) {
  const t = E.clone(sArr), c = E.carrier(t);
  c.ctrl = null; c.tx = c.x; c.ty = c.y;
  t.ep.phase = 'c1Blick'; t.ep.endT = null;
  const steps = Math.round(BLICK / E.CFG.dt);
  for (let i = 0; i < steps && t.poss === 'blue'; i++) { const cc = E.carrier(t); if (cc) { cc.tx = cc.x; cc.ty = cc.y; } E.tick(t); }
  if (t.poss !== 'blue') return { blickZu: true, grund: 'ballweg', z1: null };
  const z1 = zuspielPruefung(E, t, E.P(t, rId), opts);
  if (!z1.pass) return { blickZu: true, grund: z1.grund, key: z1.key, z1 };
  const passer = E.carrier(t), vorher = mitFolge ? { x: passer.x, druck: druckAuf(E, t, passer), opt: sichereOptionen(E, t) } : null;
  E.startAction(t, { kind: 'pass', id: rId });
  let n = 0; while (!t.ep.done && n++ < 3000) E.tick(t);
  const ok = t.ep.events.some((e) => e.type === 'received' && e.by === rId);
  const res = { blickZu: false, received: ok, intercepted: t.ep.events.some((e) => e.type === 'intercepted'), z1 };
  if (ok && mitFolge) {
    const rr = E.P(t, rId), inZone = rr.x >= E.F.W - E.F.ZONE - 0.3;
    const g = { raum: rr.x - vorher.x >= 2, zoneTor: inZone && freieToreJetzt(E, t) > 0, optionen: sichereOptionen(E, t) > vorher.opt, sicherung: vorher.druck && !druckAuf(E, t, rr) };
    res.folge = Object.assign(g, { verbessert: g.raum || g.zoneTor || g.optionen || g.sicherung, kontext: E.context(t, { kind: 'run', success: true, team: 'blue' }).type });
  }
  return res;
}

module.exports = { istSzene, schatten, BLICK, NEU_TAKT };
