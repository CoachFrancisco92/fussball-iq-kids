// Neue, zusätzliche Testreihen (Meilenstein 1). Die bisherigen 200 Kinder-Abfolgen (tests/golden/trace.js, lcg(1…200))
// bleiben als historische Referenz unverändert. Befund: Dort ist die erste Zufallszahl jeder Abfolge 0,24–0,31 –
// bei zwei Aktionen wird als erste Entscheidung also IMMER die erste angebotene Aktion („Passen“) gewählt.
// Diese Reihen prüfen deshalb mit gestreuten Startwerten und gezielt gewählten ersten Aktionen – nur über
// Eigenschaften (keine Referenzaufnahme), damit keine geänderte Bewertung „mitgeschluckt“ wird.
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
require('./fixtures/test-mission-lernweg.js');
require('./fixtures/test-mission-situationen.js');
const { lcg } = require('./golden/trace.js');
// gleiche „Kinder“-Wahl wie tests/golden/trace.js (dort nicht exportiert; trace.js bleibt unverändert)
function childAction(E, s, ctx, rnd) {
  const F = E.F, c = E.carrier(s), blues = E.team(s, 'blue');
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) });
  const k = pick(ctx.actions);
  if (k === 'passen') { if (rnd() < 0.6) return { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id }; return Object.assign({ kind: 'pass' }, spot()); }
  if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot());
  if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
  if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot());
  if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
  return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
}

// Gestreute Startwerte: splitmix32-Mischung, danach dieselbe LCG wie bisher
function mixed(seed) { let z = (seed * 0x9e3779b9) >>> 0; z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0; z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0; return lcg((z ^ (z >>> 16)) >>> 0); }

const MISSIONEN = ['mission-1', 'test-lernweg', 'test-situationen'];
const inField = (p) => p.x >= 0 && p.x <= E.F.W && p.y >= 0 && p.y <= E.F.H;

/** Eine Abfolge spielen; first(s, ctx) darf die erste Entscheidung vorgeben. Prüft Invarianten je Entscheidung. */
function run(id, rnd, durchlauf, first, stats) {
  const s = E.newState(id, durchlauf), m = E.newMission(id, durchlauf);
  let last = null, i = 0;
  while (!m.done && i < 16) {
    const ctx = E.context(s, last);
    assert.ok(ctx.actions.length >= 1 && ctx.actions.length <= 3, 'höchstens drei Aktionen');
    const a = (i === 0 && first) ? first(s, ctx) : childAction(E, s, ctx, rnd);
    const key = ctx.type + ':' + a.kind + (a.kind === 'pass' ? (a.id ? '→Mitspieler' : '→Raum') : '');
    stats.pairs[key] = (stats.pairs[key] || 0) + 1;
    if (i === 0) stats.first[a.kind] = (stats.first[a.kind] || 0) + 1;
    if (s.poss === 'blue') { const rk = E.recommend(s, ctx.actions); assert.ok(ctx.actions.includes(rk), `Hilfe empfiehlt ${rk}, angeboten: ${ctx.actions}`); }
    const before = E.evaluate(E.clone(s), a);
    E.startAction(s, a); const atStart = s.ep.eval;
    let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s);
    assert.ok(s.ep.done, `Szene endet nicht (${id}, ${JSON.stringify(a)})`);
    const fb = E.feedback(s);
    // Stern und Wertungen = Bewertung beim Start der Aktion (unabhängig vom Ergebnis)
    assert.strictEqual(fb.good, atStart.good, 'Stern = Bewertung beim Start');
    assert.strictEqual(fb.rec.good, atStart.rec.good); assert.strictEqual(fb.exe.good, atStart.exe.good);
    // Befund (dokumentiert): In der Verteidigung plant Rot sein Ziel-Tor erst beim Start neu. Eine Bewertung VOR dem
    // Start (so zeichnen die Referenzabläufe `ev` auf) kann dann abweichen. Das Kind bekommt immer die Startbewertung.
    if (before.good !== atStart.good) { assert.ok(s.ep.startPoss === 'red' && ['cover', 'press'].includes(a.kind), `Bewertung vor/beim Start weicht ab: ${JSON.stringify(a)}`); stats.vorStart = (stats.vorStart || 0) + 1; }
    assert.ok(typeof fb.say === 'string' && fb.say.length > 0, 'Rückmeldung wird gesprochen');
    assert.ok(s.players.every(inField), 'alle Spieler im Feld');
    E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
    if (s.ep) assert.ok(s.ball.flight === null, 'Ball liegt nach der Szene bei einem Spieler');
    last = { kind: a.kind, success: fb.success, team: 'blue' }; i++; stats.n++;
  }
  assert.ok(m.done, `Mission ${id} endet`);
}

test('Gestreute Startwerte: erste Entscheidung deckt alle angebotenen Aktionen ab; Invarianten halten (3 Missionen × 300 Abfolgen)', () => {
  for (const id of MISSIONEN) {
    const stats = { first: {}, pairs: {}, n: 0 };
    for (let seed = 1; seed <= 300; seed++) run(id, mixed(seed), seed % 5, null, stats);
    const firstCtx = E.context(E.newState(id, 0), null).actions;
    const want = { passen: 'pass', dribbeln: 'dribble', schiessen: 'shoot' };
    // Situationsmissionen beginnen je Durchlauf mit anderer Lage: über alle Durchläufe zählen
    const offered = new Set(id === 'test-situationen' ? ['schiessen', 'passen', 'dribbeln'] : firstCtx);
    for (const k of offered) assert.ok((stats.first[want[k]] || 0) >= 30, `${id}: erste Aktion ${k} nur ${stats.first[want[k]] || 0}-mal`);
    console.log(`# ${id}: ${stats.n} Entscheidungen · erste Aktion ${JSON.stringify(stats.first)} · Bewertung vor/beim Start verschieden: ${stats.vorStart || 0}`);
  }
});

test('Zum Vergleich: die bisherigen Abfolgen lcg(1…200) wählen in Mission 1 als erste Aktion immer „Passen“ (bekannte Lücke, Referenz bleibt)', () => {
  const stats = { first: {}, pairs: {}, n: 0 };
  for (let seed = 1; seed <= 200; seed++) run('mission-1', lcg(seed), 0, null, stats);
  assert.deepStrictEqual(Object.keys(stats.first), ['pass']);
});

test('Gezielte erste Aktionen in Mission 1: jeder Pass, Pass in den Raum, Dribbeln in 8 Richtungen, danach je 4 gestreute Fortsetzungen', () => {
  const s0 = E.newState('mission-1'), c = E.carrier(s0);
  const firsts = [];
  for (const b of E.team(s0, 'blue')) if (b !== c) firsts.push({ kind: 'pass', id: b.id });
  for (const [x, y] of [[20, 4], [22, 12], [18, 20], [8, 6], [10, 18]]) firsts.push({ kind: 'pass', x, y });
  for (let k = 0; k < 8; k++) for (const d of [3, 7]) firsts.push({ kind: 'dribble', x: c.x + d * Math.cos(k * Math.PI / 4), y: c.y + d * Math.sin(k * Math.PI / 4) });
  const stats = { first: {}, pairs: {}, n: 0 };
  firsts.forEach((a, i) => { for (let j = 0; j < 4; j++) run('mission-1', mixed(1000 + i * 10 + j), 0, () => a, stats); });
  assert.strictEqual(Object.values(stats.first).reduce((x, y) => x + y, 0), firsts.length * 4);
  // Befund: Zufällige Kinder erreichen in Mission 1 selten die Torschusszone (Abschluss kaum abgedeckt) → eigener Test unten
  for (const k of ['ohneBall:run', 'verteidigung:press', 'verteidigung:cover', 'angriff:dribble', 'angriff:pass→Raum', 'angriff:pass→Mitspieler'])
    assert.ok((stats.pairs[k] || 0) >= 5, `Folgeentscheidung ${k} zu selten (${stats.pairs[k] || 0})`);
});

test('Gezielte erste Aktionen in Situationsmissionen: Schießen auf beide Tore und Passen in T1/T2, Dribbeln in T3', () => {
  const stats = { first: {}, pairs: {}, n: 0 };
  const firsts = [[0, { kind: 'shoot', goal: 0 }], [0, { kind: 'shoot', goal: 1 }], [0, { kind: 'pass', id: 'b2' }], [1, { kind: 'shoot', goal: 0 }], [1, { kind: 'shoot', goal: 1 }], [1, { kind: 'pass', x: 27, y: 4 }], [2, { kind: 'dribble', x: 30, y: 12 }], [2, { kind: 'dribble', x: 19, y: 12 }], [2, { kind: 'dribble', x: 22, y: 20 }]];
  firsts.forEach(([d, a], i) => { for (let j = 0; j < 5; j++) run('test-situationen', mixed(5000 + i * 10 + j), d, () => a, stats); });
  assert.ok(stats.first.shoot && stats.first.pass && stats.first.dribble);
});

test('Gezielt im Abschluss von Mission 1: über den Hilfe-Weg in die Torschusszone, dann jede angebotene Aktion als Entscheidung', () => {
  const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run', erobern: 'press', raum: 'cover' };
  const viaHint = (s, ctx) => { const k = E.recommend(s, ctx.actions), h = E.hint(s, k), a = { kind: MAP[k] };
    if (h.ids && h.ids.length) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal; return a; };
  const s = E.newState('mission-1'), m = E.newMission('mission-1'); let last = null, ctx;
  for (let i = 0; i < 6 && !m.done; i++) {
    ctx = E.context(s, last); if (ctx.type === 'abschluss') break;
    const a = viaHint(s, ctx); E.startAction(s, a); while (!s.ep.done) E.tick(s); const fb = E.feedback(s);
    E.missionAfter(m, s, ctx.type); E.missionApply(m, s); last = { kind: a.kind, success: fb.success, team: 'blue' };
  }
  assert.strictEqual(ctx.type, 'abschluss', 'Hilfe-Weg erreicht den Abschluss');
  const firsts = [{ kind: 'shoot', goal: 0 }, { kind: 'shoot', goal: 1 }, ...E.team(s, 'blue').filter((b) => b !== E.carrier(s)).map((b) => ({ kind: 'pass', id: b.id })), { kind: 'pass', x: 28, y: 20 }];
  let shots = 0;
  for (const a of firsts) for (let j = 0; j < 4; j++) {
    const t = E.clone(s), mm = JSON.parse(JSON.stringify(m)), stats = { first: {}, pairs: {}, n: 0 };
    // Fortsetzung wie run(), aber ab dieser Lage
    let lst = last, i = 0; const rnd = mixed(9000 + shots * 7 + j);
    while (!mm.done && i < 12) {
      const cx = E.context(t, lst), act = i === 0 ? a : childAction(E, t, cx, rnd);
      E.startAction(t, act); const st = t.ep.eval; let n = 0; while (!t.ep.done && n++ < 3000) E.tick(t);
      assert.ok(t.ep.done); const fb = E.feedback(t); assert.strictEqual(fb.good, st.good);
      E.missionAfter(mm, t, cx.type); E.missionApply(mm, t); lst = { kind: act.kind, success: fb.success, team: 'blue' }; i++;
    }
    assert.ok(mm.done); if (a.kind === 'shoot') shots++;
  }
  assert.strictEqual(shots, 8);
});
