// V0.6c C1 – Zuspielprüfung als reine Analysefunktion (noch NICHT in der Engine).
// Gleiche Kriterien und Schwellen wie die Sternebewertung beim Freilaufen (engine.js runSpotScore), angewendet auf die
// aktuelle Lage, plus zwei Spielregeln des Ballführenden (Torschusszone, Rückpass nur unter Druck).
// Prüfreihenfolge = genannter Grund: zone → besetzt → zuNah → zuWeit → versperrt → hinten.
// opts.freiraum = false lässt „besetzt“ weg (Vergleich: neue 3,2-m-Freiraumregel als Zuspielbedingung).
// Ändert nichts an Lage, Engine, Bewertung oder Referenzen.
'use strict';

const GRENZEN = { open: 3.2, dMin: 3.5, dMax: 15, hinten: 1, druck: 2.5 };   // open/dMin/dMax = runSpotScore

function zuspielPruefung(E, s, r, opts) {
  const o = Object.assign({ freiraum: true }, opts || {});
  const F = E.F, C = E.CFG, c = E.carrier(s);
  if (!c || c.team !== 'blue' || !r || r === c || r.id === c.id) return { pass: false, grund: 'keinBall', key: null };
  const reds = E.team(s, 'red');
  const nah = (p) => reds.slice().sort((a, b) => E.dist(a, p) - E.dist(b, p) || (a.id < b.id ? -1 : 1))[0];
  const opt = E.passOptions(s).find((x) => x.id === r.id);
  const d = E.dist(c, r), open = E.dist(nah(r), r);
  const druck = E.dist(nah(c), c) < GRENZEN.druck;
  const werte = { d, open, lane: opt.margin, druck, hinterBall: c.x - r.x };
  const nein = (grund, key) => ({ pass: false, grund, key: key || null, werte });
  if (c.x >= F.W - F.ZONE - 0.3) return nein('zone');
  if (o.freiraum && open < GRENZEN.open) return nein('besetzt', nah(r).id);
  if (d < GRENZEN.dMin) return nein('zuNah');
  if (d > GRENZEN.dMax) return nein('zuWeit');
  if (opt.margin <= C.passLaneOk) return nein('versperrt', (opt.hit && opt.hit.id) || E.laneKey(s, c, r, 'red'));
  if (r.x < c.x - GRENZEN.hinten && !druck) return nein('hinten');
  return { pass: true, grund: null, key: null, werte };
}

module.exports = { zuspielPruefung, GRENZEN };
