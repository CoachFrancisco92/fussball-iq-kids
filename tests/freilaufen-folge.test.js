// V0.6c C2: Mitspieler reagiert auf das Freilaufen – Verhalten der echten Engine in den Lernwert-Lagen L1–L5,
// Blickpause und Neuprüfung, gespeicherter Erklärzeitpunkt, Kontext und Entscheidungszählung (docs/v0.6c.md, M1–M9).
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
const { lernLagen } = require('./analysis/v0.6c/lagen.js');
const Z = E.ZUSPIEL, T = () => E.texts(E.newState());

const L = lernLagen(E);
const ziel = (k, name) => L[k].ziele.find((z) => z.name === name).a;
function play(s0, a) { const s = E.clone(s0), ev = E.evaluate(s0, a); E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 4000) E.tick(s); return { s, ev, fb: E.feedback(s) }; }
const typen = (s) => s.ep.events.map((e) => e.type);
const angenommen = (s, id) => s.ep.events.some((e) => e.type === 'received' && e.by === id);

test('L1 (30/7): Ankunft frei → Blickpause → Zuspiel kommt an; Ballführender bewegt sich in der Blickpause nicht', () => {
  const a = ziel('L1', 'frei'), s = E.clone(L.L1.s); E.startAction(s, a);
  let blickPos = null, n = 0;
  while (!s.ep.done && n++ < 4000) {
    E.tick(s);
    if (!blickPos && s.ep.phase === 'blick') { const c = E.carrier(s); blickPos = { x: c.x, y: c.y, t: s.ep.t }; }
    if (blickPos && s.ep.phase === 'blick') { const c = E.carrier(s); assert.ok(Math.hypot(c.x - blickPos.x, c.y - blickPos.y) < 1e-9, 'Ballführender hält in der Blickpause'); }
  }
  assert.deepStrictEqual(typen(s).slice(0, 4), ['blick', 'zuspiel', 'pass', 'received']);
  assert.ok(Math.abs(s.ep.zuspiel.t - blickPos.t - Z.blick) < 0.02, 'Zuspiel nach 0,3 s Blickpause');
  assert.strictEqual(s.ep.zuspiel.quelle, 'blick'); assert.strictEqual(s.ep.zuspiel.werte.richtung, 'vor');
  assert.strictEqual(E.carrier(s).id, 'b3');
  assert.strictEqual(E.context(s, { kind: 'run', success: true, team: 'blue' }).type, 'abschluss', 'Empfänger steht in der Torschusszone');
});

test('L1 (21/15): kein Zuspiel – Erklärung aus dem gespeicherten Ankunftszeitpunkt, nicht aus der Lage nach dem Dribbling', () => {
  const { s, fb } = play(L.L1.s, ziel('L1', 'mitgelaufen')), z = s.ep.zuspiel;
  assert.ok(!typen(s).includes('zuspiel') && typen(s).includes('autoDribble'));
  assert.strictEqual(z.quelle, 'ankunft'); assert.strictEqual(z.pass, false);
  const c = E.carrier(s);
  assert.ok(Math.hypot(c.x - z.von.x, c.y - z.von.y) > 1, 'Ballführender ist danach weitergedribbelt');
  assert.deepStrictEqual(fb.explain.pass.from, { x: z.von.x, y: z.von.y }, 'Bild zeigt die gespeicherte Position');
  assert.strictEqual(fb.explain.key, z.key);
  assert.ok(fb.text.startsWith(T().ergebnis.laufKeinZuspiel[z.grund](E.nameOf(s, z.key))));
});

test('L2: klarer Rückpass ohne Mehrwert → kein Zuspiel (Grund „rueckpass“), obwohl der Ballführende unter Druck steht', () => {
  const { s, fb } = play(L.L2.s, ziel('L2', 'rueckpassUnterDruck')), z = s.ep.zuspiel;
  assert.ok(!typen(s).includes('zuspiel'));
  assert.strictEqual(z.grund, 'rueckpass'); assert.strictEqual(z.werte.richtung, 'rueck');
  assert.ok(fb.text.startsWith(T().ergebnis.laufKeinZuspiel.rueckpass()));
  assert.strictEqual(fb.good, true, 'Stern unverändert');
});

test('L3: zwei gleichwertige Räume – beide führen reproduzierbar zum sicheren Querpass (positive Lernlage)', () => {
  const ende = [];
  for (const n of ['oben', 'unten']) {
    const a = ziel('L3', n), { s, fb } = play(L.L3.s, a);
    assert.ok(angenommen(s, a.id), n); assert.ok(fb.good && fb.success, n);
    assert.strictEqual(s.ep.zuspiel.werte.richtung, 'quer', n);
    ende.push(JSON.stringify(E.carrier(s)));
  }
  assert.notStrictEqual(ende[0], ende[1], 'unterschiedliche Folgesituation');
});

test('L4 zu nah: kein Zuspiel, Grund aus dem Erklärzeitpunkt', () => {
  const { s } = play(L.L4.s, ziel('L4', 'zuNah'));
  assert.ok(!typen(s).includes('zuspiel')); assert.ok(['zuNah', 'besetzt'].includes(s.ep.zuspiel.grund));
});

test('L5: Passweg öffnet sich erst im Dribbling – Neuprüfung, zweite Gelegenheit, Zuspiel; höchstens 2 Blickpausen', () => {
  const { s } = play(L.L5.s, ziel('L5', 'spaeterOffen')), t = typen(s);
  assert.ok(t.indexOf('autoDribble') >= 0 && t.indexOf('blick') > t.indexOf('autoDribble'), t.join());
  assert.ok(t.includes('zuspiel') && angenommen(s, ziel('L5', 'spaeterOffen').id));
  assert.ok(t.filter((x) => x === 'blick').length <= Z.maxBlick);
});

test('Deterministisch: gleiche Lage + gleiches Laufziel = gleiche Szene', () => {
  for (const k of Object.keys(L)) for (const z of L[k].ziele) {
    const a = play(L[k].s, z.a), b = play(L[k].s, z.a);
    assert.strictEqual(JSON.stringify([a.s.players, a.s.ep.events, a.fb.say]), JSON.stringify([b.s.players, b.s.ep.events, b.fb.say]), k + '/' + z.name);
  }
});

test('M7: Auto-Zuspiel verbraucht keine Kinderentscheidung und löst nie „ohneBall“ aus (Mission 1, Musterweg mit (30/7))', () => {
  const s = E.newState(), m = E.newMission();
  let ctx = E.context(s, null); E.startAction(s, { kind: 'pass', id: 'b2' }); while (!s.ep.done) E.tick(s);
  let fb = E.feedback(s); E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
  assert.strictEqual(m.att, 1);
  ctx = E.context(s, { kind: 'pass', success: fb.success, team: 'blue' }); assert.strictEqual(ctx.type, 'ohneBall');
  E.startAction(s, { kind: 'run', id: 'b3', x: 30, y: 7 }); let n = 0; while (!s.ep.done && n++ < 4000) E.tick(s);
  fb = E.feedback(s); E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
  assert.ok(angenommen(s, 'b3'));
  assert.strictEqual(m.att, 2, 'genau eine Entscheidung (Freilaufen) gezählt');
  assert.ok(!m.done && m.att < m.maxAttack);
  const next = E.context(s, { kind: 'run', success: fb.success, team: 'blue' });
  assert.notStrictEqual(next.type, 'ohneBall'); assert.ok(['angriff', 'abschluss'].includes(next.type)); assert.strictEqual(E.carrier(s).id, 'b3');
});

test('Zuspielprüfung: Gründe in fester Reihenfolge; ein klarer Rückpass braucht einen Mehrwert', () => {
  const s = L.L2.s, c = E.carrier(s);
  const zr = E.zuspielPruefung(s, E.P(s, 'b3'));
  assert.ok(E.P(s, 'b3').x < c.x - Z.hinten);
  if (zr.pass) assert.ok(zr.werte.mehrwert); else assert.ok(zr.grund !== 'zone');
  const s2 = E.clone(s); E.carrier(s2).x = E.F.W - E.F.ZONE + 0.5;
  assert.strictEqual(E.zuspielPruefung(s2, E.P(s2, 'b3')).grund, 'zone');
});
