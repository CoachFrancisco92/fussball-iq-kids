// Wahrnehmungslogik „Erst schauen, dann entscheiden“ – jetzt in der Engine (E.lookAnswer) unabhängig testbar.
// Erwartete Sätze entsprechen exakt dem Verhalten von v0.2.3 (damals in app.js).
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');

const noneFree = () => {
  const s = E.newState();
  for (const [id, x, y] of [['r1', 19, 9.5], ['r3', 16.5, 16], ['r2', 22, 7]]) { const p = E.P(s, id); p.x = p.tx = x; p.y = p.ty = y; }
  return s;
};

test('Freien Freund angetippt: richtig, sofort fertig, Weg grün', () => {
  const r = E.lookAnswer(E.newState(), 'b2', 1);
  assert.deepStrictEqual([r.right, r.finish, r.reveal, r.key, r.lane.ok], [true, true, 'b2', null, true]);
  assert.strictEqual(r.say, 'Ja! Blau 2 steht frei. Zwischen euch ist kein Gegner.');
});

test('Zugestellten Freund angetippt: Gegner wird gezeigt, zweiter Versuch, dann Auflösung', () => {
  const s = E.newState();
  const r1 = E.lookAnswer(s, 'b3', 1);
  assert.deepStrictEqual([r1.right, r1.finish, r1.key, r1.reveal, r1.lane.ok], [false, false, 'r3', null, false]);
  assert.strictEqual(r1.say, "Schau genau: Rot 3 steht im Weg zu Blau 3. Probier's nochmal!");
  const r2 = E.lookAnswer(s, 'b3', 2);
  assert.deepStrictEqual([r2.right, r2.finish, r2.reveal], [false, true, 'b2']);
  assert.strictEqual(r2.say, 'Schau genau: Rot 3 steht im Weg zu Blau 3. Blau 2 steht frei.');
});

test('„Keiner ist frei“, obwohl jemand frei ist: erst nachfragen, dann zeigen', () => {
  const s = E.newState();
  const r1 = E.lookAnswer(s, null, 1);
  assert.deepStrictEqual([r1.right, r1.finish, r1.say], [false, false, 'Schau nochmal genau. Ist wirklich keiner frei?']);
  const r2 = E.lookAnswer(s, null, 2);
  assert.deepStrictEqual([r2.right, r2.finish, r2.reveal, r2.say], [false, true, 'b2', 'Schau nochmal genau: Blau 2 steht frei.']);
});

test('„Keiner ist frei“, und es stimmt: richtig, Dribbel-Platz wird gezeigt', () => {
  const s = noneFree();
  const r = E.lookAnswer(s, null, 1);
  assert.deepStrictEqual([r.right, r.finish, r.reveal], [true, true, null]);
  assert.strictEqual(r.say, 'Richtig! Gerade ist keiner frei. Dann kannst du mit dem Ball in den freien Platz dribbeln.');
  assert.ok(r.dribblePoint && Number.isFinite(r.dribblePoint.x));
  assert.deepStrictEqual(r.dribblePoint, E.hint(s, 'dribbeln').point, 'gleicher Punkt wie die Hilfe');
});

test('Keiner frei, aber Freund angetippt: zweiter Versuch endet mit „Gerade ist keiner frei.“', () => {
  const s = noneFree();
  const r2 = E.lookAnswer(s, 'b2', 2);
  assert.deepStrictEqual([r2.right, r2.finish, r2.reveal], [false, true, null]);
  assert.match(r2.say, / Gerade ist keiner frei\.$/);
});

test('Wahrnehmungslogik ist rein und deterministisch', () => {
  const s = E.newState(), before = JSON.stringify(s);
  const a = E.lookAnswer(s, 'b3', 1), b = E.lookAnswer(s, 'b3', 1);
  assert.strictEqual(JSON.stringify(s), before, 'Zustand unverändert');
  assert.deepStrictEqual(a, b);
});

test('Schau-Schritt vor Angriff laut Mission 1, nicht vor anderen Momenten', () => {
  const s = E.newState();
  assert.strictEqual(E.lookBefore(s, { type: 'angriff' }), true);
  for (const t of ['ohneBall', 'abschluss', 'verteidigung']) assert.strictEqual(E.lookBefore(s, { type: t }), false);
});
