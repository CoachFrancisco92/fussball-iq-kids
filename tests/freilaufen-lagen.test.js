// V0.6c C1: reproduzierbare Freilauf-Lagen L1–L5 und ihre Ausgangsbedingungen (Lage bis zur Ankunft des Läufers).
// Prüft bewusst KEIN Verhalten nach der Ankunft (Auto-Dribbling, Szenenende) – das ändert erst C2.
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
const { lernLagen, auftauen, LAST_PASS } = require('./analysis/v0.6c/lagen.js');
const { zuspielPruefung } = require('./analysis/v0.6c/zuspiel.js');
const FX = require('./analysis/v0.6c/lagen-fixtures.json');

/** Lauf bis zur Ankunft (erster Tick, in dem die Szene die Laufphase verlässt) – Lage und Zuspielprüfung dort. */
function ankunft(s0, a) {
  const s = E.clone(s0), ev = E.evaluate(s0, a);
  E.startAction(s, a); let n = 0;
  while (!s.ep.done && s.ep.phase === 'main' && n++ < 3000) E.tick(s);
  assert.ok(s.ep.phase !== 'main' && s.poss === 'blue', 'Läufer kommt an, Blau hat den Ball');
  return { s, ev, z: zuspielPruefung(E, s, E.P(s, a.id)), zOhne: zuspielPruefung(E, s, E.P(s, a.id), { freiraum: false }) };
}
const L = lernLagen(E);
const ziel = (k, name) => L[k].ziele.find((z) => z.name === name).a;

test('L1–L5 vorhanden, reproduzierbar und im Kontext „ohneBall“ (nur Freilaufen)', () => {
  assert.deepStrictEqual(Object.keys(L).sort(), ['L1', 'L2', 'L3', 'L4', 'L5']);
  const L2nd = lernLagen(E);
  for (const k of Object.keys(L)) {
    assert.strictEqual(JSON.stringify(L2nd[k].s.players), JSON.stringify(L[k].s.players), k + ' reproduzierbar');
    assert.deepStrictEqual(E.context(L[k].s, LAST_PASS).actions, ['freilaufen'], k);
    const c = E.carrier(L[k].s);
    assert.ok(c && c.team === 'blue', k + ': Blau hat den Ball');
    for (const z of L[k].ziele) assert.ok(z.a.kind === 'run' && E.P(L[k].s, z.a.id).team === 'blue' && z.a.id !== c.id, k + '/' + z.name + ': Läufer ist ein blauer Spieler ohne Ball');
  }
});

test('Eingefrorene Lagen (L2, L3, L5): Auftauen ist deterministisch und unabhängig von späteren Abläufen', () => {
  for (const k of ['L2', 'L3', 'L5']) {
    const a = auftauen(E, FX[k].lage), b = auftauen(E, FX[k].lage);
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
    assert.strictEqual(a.ball.owner, FX[k].lage.owner);
  }
});

test('Zuspielprüfung: feste Reihenfolge der Gründe; „zu weit“ (> 15 m) führt nie zum Zuspiel', () => {
  const s0 = L.L1.s, c = E.carrier(s0);
  const s = E.clone(s0), r = E.P(s, 'b3');
  Object.assign(r, { x: Math.max(0.7, c.x - 16), y: c.y });                 // > 15 m entfernt
  const z = zuspielPruefung(E, s, r), zo = zuspielPruefung(E, s, r, { freiraum: false });
  assert.strictEqual(zo.pass, false); assert.ok(['zuWeit', 'besetzt'].includes(z.grund));
  assert.strictEqual(zo.grund, 'zuWeit');
  const s2 = E.clone(s0), c2 = E.carrier(s2); c2.x = E.F.W - E.F.ZONE + 0.5;   // Ballführender in der Torschusszone
  assert.strictEqual(zuspielPruefung(E, s2, E.P(s2, 'b3')).grund, 'zone');
});

test('L1 Standardlage: (30/7) bei Ankunft anspielbar; (21/15) und (24/15) Stern, bei Ankunft aber kein Zuspiel (Gegner läuft mit)', () => {
  const f = ankunft(L.L1.s, ziel('L1', 'frei'));
  assert.strictEqual(f.ev.good, true); assert.strictEqual(f.z.pass, true, JSON.stringify(f.z));
  for (const n of ['mitgelaufen', 'erstNachDribbelFrei']) {
    const m = ankunft(L.L1.s, ziel('L1', n));
    assert.strictEqual(m.ev.good, true, n); assert.strictEqual(m.z.pass, false, n);
    assert.strictEqual(m.zOhne.grund, 'versperrt', n + ': ohne Freiraumregel ist der Passweg der Grund'); assert.ok(m.zOhne.key);
  }
});

test('L2 Rand unter Druck: Rückpass-Ziel hinter dem Ball anspielbar (nur weil unter Druck); Vorwärtsziel versperrt', () => {
  const b = ankunft(L.L2.s, ziel('L2', 'rueckpassUnterDruck')), v = ankunft(L.L2.s, ziel('L2', 'vornVersperrt'));
  assert.strictEqual(b.z.pass, true); assert.ok(b.z.werte.druck && b.z.werte.hinterBall > 1);
  assert.strictEqual(v.z.grund, 'versperrt'); assert.strictEqual(v.ev.good, true);
});

test('L3 zwei gleichwertige Räume: oben und unten Stern und anspielbar, gleicher Läufer, gleiche Tiefe', () => {
  const o = ziel('L3', 'oben'), u = ziel('L3', 'unten'), c = E.carrier(L.L3.s);
  assert.strictEqual(o.id, u.id); assert.ok(Math.abs(o.x - u.x) <= 2 && o.y < c.y && u.y > c.y);
  for (const a of [o, u]) { const r = ankunft(L.L3.s, a); assert.strictEqual(r.ev.good, true); assert.strictEqual(r.z.pass, true); }
});

test('L4 zu nah: Stern-Grund „zuNah“ und bei Ankunft kein Zuspiel wegen Nähe', () => {
  const r = ankunft(L.L4.s, ziel('L4', 'zuNah'));
  assert.strictEqual(r.ev.exe.lauf, 'zuNah'); assert.strictEqual(r.ev.good, false);
  assert.strictEqual(r.zOhne.grund, 'zuNah');
});

test('L5 Passweg erst später offen: bei Ankunft versperrt, Laufziel mit Stern', () => {
  const r = ankunft(L.L5.s, ziel('L5', 'spaeterOffen'));
  assert.strictEqual(r.ev.good, true); assert.strictEqual(r.z.grund, 'versperrt');
});
