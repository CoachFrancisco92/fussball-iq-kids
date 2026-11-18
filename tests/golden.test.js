// Verhaltensgleichheit Mission 1: Die Engine muss exakt dasselbe liefern wie Version 0.2.3
// (vor der Trennung von Inhalten und Engine) – Entscheidungsmomente, Ansagen, Bewertung in drei Teilen,
// Rückmeldungen, Erklärungen, Ereignisse, Positionen, Phasen. Referenz: tests/golden/mission1.v0.2.3.json
// Die Referenz wurde mit tests/golden/trace.js aus dem Stand v0.2.3 (engine.js) erzeugt und wird nie angepasst,
// außer eine Verhaltensänderung ist ausdrücklich gewollt und freigegeben.
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
const { traceAll } = require('./golden/trace.js');
const ref = require('./golden/mission1.v0.2.3.json');
const now = traceAll(E);

for (const name of Object.keys(ref.scripted)) {
  test(`Mission 1 identisch zu v0.2.3: Ablauf „${name}“`, () => assert.deepStrictEqual(now.scripted[name], ref.scripted[name]));
}
test('Mission 1 identisch zu v0.2.3: Durchlauf mit der Hilfe', () => assert.deepStrictEqual(now.hinted, ref.hinted));
test('Mission 1 identisch zu v0.2.3: 200 erzeugte Kinder-Abfolgen', () => {
  const diff = Object.keys(ref.seeds).filter((k) => ref.seeds[k] !== now.seeds[k]);
  assert.deepStrictEqual(diff, [], `abweichende Abfolgen: ${diff.slice(0, 10).join(', ')}`);
});
