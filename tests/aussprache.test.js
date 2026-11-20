// Hotfix V0.6.1: Anzeige und Aussprache getrennt. „Toooor!“ / „TOOOR!“ bleibt sichtbar, die Sprachausgabe sagt „Tor!“
// (Kindertest: gedehntes „Toooor“ klang teils wie „Tour“). Browserseitig: tests/e2e/aussprache.mjs.
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');

const T = E.texts('mission-1');

test('sprechtext: gedehntes Tor wird „Tor!“, alles andere bleibt unverändert', () => {
  assert.strictEqual(T.sprechtext('Toooor! Der Weg war frei.'), 'Tor! Der Weg war frei.');
  assert.strictEqual(T.sprechtext('Toooor! Vor dem anderen Tor stand Rot 2 – du hast das freie gewählt.'), 'Tor! Vor dem anderen Tor stand Rot 2 – du hast das freie gewählt.');
  assert.strictEqual(T.sprechtext('TOOOR! ⚽'), 'Tor! ⚽');
  for (const t of ['Tor!', 'Das obere Tor war frei.', 'Tore', 'Torwart', 'Tour', 'Geblockt! Rot 2 stand vor dem Tor.', '']) assert.strictEqual(T.sprechtext(t), t);
});

test('Jede Mission nutzt dieselbe Aussprache-Regel; die Anzeigetexte bleiben „Toooor!“', () => {
  for (const id of ['mission-1', 'welches-tor-ist-frei', 'freie-bahn']) {
    const t = E.texts(id);
    assert.strictEqual(typeof t.sprechtext, 'function', id);
    assert.match(t.ergebnis.tor, /^Toooor!/, id + ': Anzeige unverändert');
    assert.match(t.ergebnis.torKurz, /^Toooor!$/, id);
    assert.match(t.bedienung.torBlau, /^TOOOR!/, id);
  }
});

test('Alle Rückmeldungen mit Tor: angezeigt „Toooor!“, gesprochen (sprechtext) nie ein gedehntes Tor', () => {
  let tore = 0;
  for (const id of ['mission-1', 'welches-tor-ist-frei', 'freie-bahn']) {
    const n = (E.mission(id).durchlaeufe || [0]).length;
    for (let d = 0; d < n; d++) for (const goal of [0, 1]) {
      const s = E.newState(id, d), ctx = E.context(s, null);
      if (!ctx.actions.includes('schiessen')) continue;
      E.startAction(s, { kind: 'shoot', goal }); let i = 0; while (!s.ep.done && i++ < 3000) E.tick(s);
      const fb = E.feedback(s), t = E.texts(id);
      for (const x of [fb.say, fb.text, fb.tip]) assert.doesNotMatch(t.sprechtext(x), /to{2,}r/i);
      if (fb.goal) { tore++; assert.match(fb.text + ' ' + fb.say, /Toooor!/, 'Anzeige behält „Toooor!“'); assert.match(t.sprechtext(fb.say), /(^|\s)Tor!/); }
    }
  }
  assert.ok(tore >= 5, `genug Torsituationen geprüft (${tore})`);
});
