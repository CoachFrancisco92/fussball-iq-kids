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

// Begriffe: „steht frei“ = Mitspieler mit freiem Passweg; „freier Raum“ = Stelle, zu der ein Freund hinlaufen kann.
// Kann ein Freund in den freien Raum laufen, sagt der Schau-Schritt das dazu – sonst widerspräche er der Bewertung.
test('„Keiner ist frei“, und es stimmt – ein Freund kann aber in den freien Raum laufen: richtig, beide Wege werden genannt', () => {
  const s = noneFree();
  assert.ok(E.situation(s).ok.space, 'Lage mit freiem Raum');
  const r = E.lookAnswer(s, null, 1);
  assert.deepStrictEqual([r.right, r.finish, r.reveal], [true, true, null]);
  assert.strictEqual(r.say, 'Richtig! Gerade steht keiner frei. Du kannst in den freien Platz dribbeln. Oder spiel den Ball in den freien Raum – dein Freund läuft hin.');
  assert.ok(r.dribblePoint && Number.isFinite(r.dribblePoint.x));
  assert.deepStrictEqual(r.dribblePoint, E.hint(s, 'dribbeln').point, 'gleicher Punkt wie die Hilfe');
});

test('„Keiner ist frei“ ohne freien Raum: richtig, Dribbel-Platz wird gezeigt (Text wie bisher)', () => {
  const s = noneFreeNoSpace();
  const r = E.lookAnswer(s, null, 1);
  assert.deepStrictEqual([r.right, r.finish, r.reveal], [true, true, null]);
  assert.strictEqual(r.say, 'Richtig! Gerade ist keiner frei. Dann kannst du mit dem Ball in den freien Platz dribbeln.');
});

test('Keiner frei, aber Freund angetippt: zweiter Versuch endet mit „Gerade ist keiner frei.“ bzw. dem Hinweis auf den freien Raum', () => {
  const r2 = E.lookAnswer(noneFree(), 'b2', 2);
  assert.deepStrictEqual([r2.right, r2.finish, r2.reveal], [false, true, null]);
  assert.match(r2.say, / Gerade steht keiner frei\. Aber ein Freund kann in den freien Raum laufen\.$/);
  const s3 = noneFreeNoSpace(), id = E.team(s3, 'blue').find((b) => b !== E.carrier(s3)).id;
  assert.match(E.lookAnswer(s3, id, 2).say, / Gerade ist keiner frei\.$/);
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

// Lage ohne freien Mitspieler und ohne sicheren Pass in den Raum – echte Lage aus Mission 1 (Kinder-Abfolge 24, 3. Entscheidung)
function noneFreeNoSpace() {
  const s = E.newState();
  const pos = { b1: [21.08, 18.41], b2: [30.8, 2.37], b3: [19, 19.5], r1: [24.07, 18.33], r2: [29.58, 3.05], r3: [30.14, 16.94] };
  for (const [id, [x, y]] of Object.entries(pos)) { const p = E.P(s, id); p.x = p.tx = x; p.y = p.ty = y; p.vx = p.vy = 0; }
  s.ball.owner = 'b2'; s.ball.x = 30.8; s.ball.y = 2.37;
  const sit = E.situation(s);
  assert.ok(!sit.ok.mate && !sit.ok.space, 'Lage ohne freien Mitspieler und ohne freien Raum');
  return s;
}
