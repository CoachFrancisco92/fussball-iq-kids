// Mission „Welches Tor ist frei?“ (Meilenstein 2): Daten, Bewertung je Situation, Hilfe-Wege, vollständige Abläufe,
// gesprochene Rückmeldungen, Situationswechsel, Robustheit A3 und Referenzaufnahme (tests/golden/referenz.js → missionA).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs'), path = require('node:path');
const E = require('./helpers/load.js');
const { traceMissionA, play, STYLES, ID } = require('./golden/mission-a.js');
const { hash } = require('./golden/trace.js');
const REF = require('./golden/referenz.js');

const M = E.mission(ID);
const sitStart = (id) => M.situationen.find((x) => x.id === id).start;
// V0.6a: nicht jede Situation beginnt einen Durchlauf – dann eine Testmission mit genau dieser Situation (gleiche Einstellungen)
const inst = (id) => {
  const d = M.durchlaeufe.findIndex((x) => x[0] === id);
  if (d >= 0) return { mid: ID, d };
  const mid = 'a-einzel-' + id;
  if (!globalThis.FIQ_MISSIONS.some((x) => x.id === mid)) globalThis.FIQ_MISSIONS.push(Object.assign({}, M, { id: mid, situationen: [M.situationen.find((x) => x.id === id)], durchlaeufe: [[id]] }));
  return { mid, d: 0 };
};
const stateAt = (id) => { const { mid, d } = inst(id); const s = E.newState(mid, d); assert.strictEqual(s.situation, id); return s; };
const missionAt = (id) => { const { mid, d } = inst(id); return E.newMission(mid, d); };
const run = (s, a) => { const ev = E.evaluate(s, a); E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s); assert.ok(s.ep.done, 'Szene endet'); return { ev, fb: E.feedback(s), goal: s.ep.events.some((e) => e.type === 'goal') }; };

test('Mission A: gültig, A1–A5 + A3m/W1/W1m (V0.6a), 2 gegen 2, keine Verteidigung, Engine-Standard bleibt Mission 1', () => {
  assert.deepStrictEqual(E.validateMission(M), []);
  assert.deepStrictEqual(M.situationen.map((x) => x.id), ['A1', 'A2', 'A3', 'A3m', 'A4', 'A5', 'W1', 'W1m'], 'A4 seit Meilenstein 4, A3m/W1/W1m seit V0.6a');
  for (const x of M.situationen) assert.deepStrictEqual(x.start.spieler.map((p) => p.id).sort(), ['b1', 'b2', 'r1', 'r2']);
  assert.strictEqual(M.phasen.verteidigung, 0);
  assert.strictEqual(E.mission().id, 'mission-1', 'Standardmission der Engine unverändert');
  assert.deepStrictEqual([M.lernwelt, M.nummer], [1, 2]);
});

test('Rotation (V0.6a): 4 Situationen je Durchlauf im Lernaufbau Tor wählen → andere Lösung → nochmal schauen, aufeinanderfolgende Durchläufe beginnen anders, deterministisch', () => {
  const D = M.durchlaeufe, ziel = (id) => M.situationen.find((x) => x.id === id).lernziel, rang = { torWaehlen: 0, andereLoesung: 1, nochmalSchauen: 2 };
  for (const d of D) {
    assert.strictEqual(d.length, 4); assert.strictEqual(new Set(d).size, 4, 'keine Wiederholung in einem Durchlauf');
    const r = d.map((id) => rang[ziel(id)]); assert.deepStrictEqual(r, [0, 0, 1, 2], `Lernaufbau ${d}`);
  }
  assert.deepStrictEqual(D[0], ['A1', 'A2', 'A3', 'W1'], 'erster Durchlauf = freigegebene Progression');
  for (const x of M.situationen) assert.ok(D.flat().includes(x.id), x.id + ' kommt vor');
  for (let n = 1; n < D.length; n++) assert.notStrictEqual(D[n][0], D[n - 1][0], 'aufeinanderfolgende Durchläufe beginnen anders');
  for (let n = 0; n < 9; n++) assert.deepStrictEqual(E.newMission(ID, n).sit.order, D[n % D.length]);
  for (let n = 0; n < D.length; n++) assert.notDeepStrictEqual(D[n], D[(n + 1) % D.length], 'kein Durchlauf gleicht dem vorigen');
});

test('A1: Tor oben zugestellt – Schuss unten ⭐ und Tor; Schuss oben geblockt mit verständlicher Erklärung; Hilfe zeigt Tor unten', () => {
  let s = stateAt('A1');
  const ctx = E.context(s, null); assert.strictEqual(ctx.type, 'abschluss'); assert.deepStrictEqual(ctx.actions, ['schiessen', 'passen']);
  assert.strictEqual(E.recommend(s, ctx.actions), 'schiessen'); assert.strictEqual(E.hint(s, 'schiessen').goal, 1);
  const good = run(s, { kind: 'shoot', goal: 1 }); assert.ok(good.fb.good && good.goal);
  s = stateAt('A1'); const bad = run(s, { kind: 'shoot', goal: 0 });
  assert.deepStrictEqual([bad.ev.rec.good, bad.ev.exe.good, bad.fb.good, bad.goal], [true, false, false, false], 'Entscheidung gut, Ziel falsch');
  assert.match(bad.fb.say, /Geblockt! Rot 2 stand vor dem Tor/); assert.match(bad.fb.say, /Das andere Tor war frei/);
});

test('A2: Tor unten zugestellt – Spiegelbild von A1', () => {
  let s = stateAt('A2');
  assert.strictEqual(E.hint(s, 'schiessen').goal, 0);
  const good = run(s, { kind: 'shoot', goal: 0 }); assert.ok(good.fb.good && good.goal);
  s = stateAt('A2'); const bad = run(s, { kind: 'shoot', goal: 1 });
  assert.deepStrictEqual([bad.ev.rec.good, bad.ev.exe.good, bad.fb.good], [true, false, false]);
  assert.match(bad.fb.say, /Geblockt! Rot 2 stand vor dem Tor\..*Das andere Tor war frei/);
});

test('A3: beide Tore zu – Pass zu Blau 2 ⭐, Ballannahme in der Torzone, Blau 2 schießt aufs freie Tor ⭐ und trifft (kein Freilaufen dazwischen)', () => {
  const s = stateAt('A3'), m = missionAt('A3');
  assert.strictEqual(m.sit.order[0], 'A3');
  const sit = E.situation(s);
  assert.ok(sit.shots.every((o) => o.margin <= E.CFG.shotLaneOk), 'beide Tore zugestellt');
  let ctx = E.context(s, null);
  assert.strictEqual(E.recommend(s, ctx.actions), 'passen'); assert.deepStrictEqual(E.hint(s, 'passen').ids, ['b2']);
  for (const goal of [0, 1]) { const ev = E.evaluate(s, { kind: 'shoot', goal }); assert.deepStrictEqual([ev.rec.good, ev.good], [false, false], `Schuss Tor ${goal} ist keine gute Entscheidung`); }
  const p = run(s, { kind: 'pass', id: 'b2' });
  assert.ok(p.fb.good && p.fb.success, 'Pass kommt an');
  assert.strictEqual(E.carrier(s).id, 'b2', 'Blau 2 hat den Ball');
  E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
  assert.strictEqual(s.situation, 'A3', 'Situation läuft weiter');
  ctx = E.context(s, { kind: 'pass', success: true, team: 'blue' });
  assert.strictEqual(ctx.type, 'abschluss', 'Blau 2 steht in der Torzone → Abschluss statt Freilaufen');
  assert.strictEqual(E.recommend(s, ctx.actions), 'schiessen');
  const goal = E.hint(s, 'schiessen').goal;
  const sh = run(s, { kind: 'shoot', goal }); assert.ok(sh.fb.good && sh.goal, 'Tor nach Pass');
  // Falsch: Schuss trotz zugestellter Tore → Erklärung nennt den Pass
  const s2 = stateAt('A3'); const bad = run(s2, { kind: 'shoot', goal: 1 });
  assert.match(bad.fb.say, /Beide Tore waren zugestellt\. Ein Pass zu einem freien Freund wäre besser gewesen/);
});

test('A5: beide Tore frei – beide Schüsse ⭐ und Tor (gleich gut); Hilfe zeigt ein freies Tor', () => {
  for (const goal of [0, 1]) {
    const s = stateAt('A5'); const r = run(s, { kind: 'shoot', goal });
    assert.deepStrictEqual([r.ev.rec.good, r.ev.exe.good, r.fb.good, r.goal], [true, true, true, true], `Tor ${goal}`);
    assert.match(r.fb.say, /Toooor!/);
  }
  const s = stateAt('A5'), h = E.hint(s, 'schiessen');
  assert.ok([0, 1].includes(h.goal)); assert.strictEqual(h.say, 'Vor diesem Tor steht kein Gegner im Weg.');
});

test('A4: noch zu weit fürs Tor – Hilfe: in die Schusszone dribbeln ⭐, dann aufs freie Tor schießen ⭐ und treffen', () => {
  const s = stateAt('A4'), m = missionAt('A4');
  let ctx = E.context(s, null);
  assert.strictEqual(ctx.type, 'angriff'); assert.deepStrictEqual(ctx.actions, ['passen', 'dribbeln']);
  assert.match(ctx.say, /Noch zu weit fürs Tor/);
  assert.strictEqual(E.recommend(s, ctx.actions), 'dribbeln', 'Lernweg: erst näher ran');
  const h = E.hint(s, 'dribbeln'); assert.ok(!h.eng && !h.genau);
  const d = run(s, { kind: 'dribble', x: h.point.x, y: h.point.y });
  assert.ok(d.fb.good, d.fb.say);
  E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
  assert.strictEqual(s.situation, 'A4');
  ctx = E.context(s, { kind: 'dribble', success: true, team: 'blue' });
  assert.strictEqual(ctx.type, 'abschluss', 'nach dem Dribbling in der Schusszone');
  const g = E.hint(s, 'schiessen').goal, sh = run(s, { kind: 'shoot', goal: g });
  assert.ok(sh.fb.good && sh.goal);
});

test('A4: andere Entscheidungen – Pass zu Blau 2 ist auch gut (mehrere gute Wege); in Rot 1 dribbeln, zurück dribbeln und Schuss von weit sind 💭', () => {
  const s = stateAt('A4'), X = E.texts(s).ausfuehren;
  assert.ok(E.evaluate(s, { kind: 'pass', id: 'b2' }).good, 'Pass ⭐');
  assert.strictEqual(E.evaluate(s, { kind: 'dribble', x: 24, y: 9.5 }).exe.why, X.inGegner);
  assert.deepStrictEqual(E.evaluate(s, { kind: 'dribble', x: 22, y: 12 }).exe, { good: false, why: X.dribbelNachVorn });
  assert.ok(!E.context(s, null).actions.includes('schiessen'), 'außerhalb der Zone kein Schuss');
});

test('A4: auch der Weg über den Pass zu Blau 2 (danach Hilfe) endet mit Torschuss ⭐ – die Situation bricht nicht nach der Vorbereitung ab', () => {
  const { mid, d } = inst('A4');
  const r = play(E, d, (E2, s, ctx, i) => (i === 0 ? { kind: 'pass', id: 'b2' } : STYLES.hilfe(E2, s, ctx)), mid);
  const a4 = r.out.filter((x) => x.sit === 'A4');
  assert.strictEqual(a4[0].a.kind, 'pass'); assert.ok(a4.every((x) => x.fb.good), JSON.stringify(a4.map((x) => x.a.kind)));
  assert.ok(a4[a4.length - 1].events.includes('goal'), 'Tor am Ende');
});

test('A4 Robustheit: jeder Spieler ±0,5 m und ±1 m (x und y) – Hilfe: Dribbeln ⭐ → Schuss ⭐ → Tor', () => {
  const base = M.situationen.find((x) => x.id === 'A4').start.spieler; let k = 0; const fail = [];
  for (let i = 0; i < base.length; i++) for (const ax of ['x', 'y']) for (const d of [-1, -0.5, 0.5, 1]) {
    const sp = base.map((p) => ({ ...p })); sp[i][ax] += d;
    const id = 'a4-rob-' + k++;
    globalThis.FIQ_MISSIONS.push(Object.assign({}, M, { id, nummer: 81, situationen: [{ id: 'A4', start: { ballbesitz: 'b1', spieler: sp } }], durchlaeufe: undefined }));
    const s = E.newState(id, 0), log = []; let last = null;
    for (let n = 0; n < 4; n++) { const ctx = E.context(s, last), key = E.recommend(s, ctx.actions), h = E.hint(s, key);
      const a = key === 'dribbeln' ? { kind: 'dribble', x: h.point.x, y: h.point.y } : key === 'schiessen' ? { kind: 'shoot', goal: h.goal } : { kind: 'pass', id: h.ids[0] };
      const r = run(s, a); log.push(a.kind + (r.fb.good ? '⭐' : '💭') + (r.goal ? '⚽' : '')); last = { kind: a.kind, success: r.fb.success, team: 'blue' }; if (r.goal) break; }
    if (log.join(' ') !== 'dribble⭐ shoot⭐⚽') fail.push(`${sp[i].id} ${ax} ${d}: ${log.join(' ')}`);
  }
  assert.deepStrictEqual(fail, []);
});

test('Vollständige Durchläufe mit der Hilfe: alle 5 Durchläufe enden nach 4 Situationen mit 4 Toren, nur ⭐', () => {
  for (let d = 0; d < M.durchlaeufe.length; d++) {
    const r = play(E, d, STYLES.hilfe);
    assert.ok(r.done); assert.deepStrictEqual(r.score, { blue: 4, red: 0 });
    assert.ok(r.out.every((x) => x.fb.good), `Durchlauf ${d}`);
    assert.deepStrictEqual([...new Set(r.out.map((x) => x.sit))], M.durchlaeufe[d]);
    const je = {}; r.out.forEach((x) => { je[x.sit] = (je[x.sit] || 0) + 1; });
    for (const [sid, n] of Object.entries(je)) assert.strictEqual(n, /^(A3|A4|W1)/.test(sid) ? 2 : 1, `${sid}: A3, A4 und W1 brauchen je 2 Entscheidungen, sonst 1`);
  }
});

test('Situationswechsel: nach Tor und nach Ballverlust sofort die nächste Situation in ihrer Startaufstellung; Spielstand bleibt; Ansage-Merker gesetzt', () => {
  for (const style of ['hilfe', 'falschesTor', 'immerPass']) for (let d = 0; d < M.durchlaeufe.length; d++) {
    const r = play(E, d, STYLES[style]);
    for (let i = 0; i < r.out.length - 1; i++) {
      const x = r.out[i], nextSit = r.out[i + 1].sit;
      if (nextSit === x.sit) continue;
      assert.strictEqual(x.mission.note, 'situation', `${style}/${d}: Wechsel angesagt`);
      const L = sitStart(nextSit);
      assert.deepStrictEqual(x.afterApply.p, L.spieler.map((p) => [p.id, p.x, p.y]), `${style}/${d}: Startaufstellung ${nextSit}`);
      assert.strictEqual(x.afterApply.ball, 'b1'); assert.strictEqual(x.afterApply.poss, 'blue');
    }
    assert.ok(r.done);
  }
});

test('Ansagen und Texte: neutrale Abschluss-Ansage, Merksatz, Einführung; Mission 1 behält ihre Texte', () => {
  const s = stateAt('A1');
  assert.strictEqual(E.context(s, null).say, 'Welches Tor ist frei? Schießen oder passen?');
  assert.match(M.einfuehrung, /Vor welchem Tor steht kein Roter\?/);
  assert.match(E.texts(s).ende.merksatz, /hilft dir ein Freund/);
  const s1 = E.newState('mission-1'); s1.players.find((p) => p.id === 'b1').x = 31;
  const say1 = E.context(s1, null).say; assert.ok(!/Schießen oder passen\?/.test(say1), 'Mission 1 unverändert: ' + say1);
});

test('Robustheit A3: jede Abweichung ±0,5 m (x/y, je Spieler) erhält Pass → Abschluss → Tor; ±1 m: genau 2 dokumentierte Übergänge', () => {
  const { flow, base } = require('./analysis/a3-robustheit.js');
  const L = sitStart('A3').spieler, cfg = L.flatMap((p) => [p.x, p.y]);
  assert.deepStrictEqual(base, cfg, 'Analyse prüft die konfigurierte Startlage');
  assert.ok(flow(cfg).ok);
  const ids = ['b1', 'b2', 'r1', 'r2'], other = [];
  for (let i = 0; i < 4; i++) for (const ax of [0, 1]) for (const d of [-1, -0.5, 0.5, 1]) {
    const pos = cfg.slice(); pos[2 * i + ax] += d; const r = flow(pos);
    if (Math.abs(d) === 0.5) assert.ok(r.ok, `${ids[i]} ${ax ? 'y' : 'x'} ${d}: ${r.log}`);
    else if (!r.ok) other.push(`${ids[i]} ${ax ? 'y' : 'x'} ${d}: ${r.log}`);
  }
  assert.deepStrictEqual(other, [
    // Blau 2 außerhalb der Torzone: erst Freilaufen, dann Tor. V0.6c (vorgelegt, docs/v0.6c.md): Nach dem Freilaufen spielt
    // Blau 2 den Freigelaufenen an (statt selbst in die Zone zu dribbeln); der dribbelt in die Zone und trifft.
    'b2 x -1: abschluss:pass⭐ ohneBall:run⭐ angriff:dribble⭐ abschluss:shoot1⭐⚽',
    'r1 x -1: abschluss:pass💭 abschluss:shoot1⭐⚽', // Rot 1 näher am Passweg: Pass „zu eng“, kommt aber an
  ]);
});

// Vorgelegte, noch nicht freigegebene Abweichungen (tests/golden/missionA-abweichungen-*.json, erzeugt mit
// `node tests/golden/mission-a.js --abweichungen …`): Der Test ist nur grün, wenn GENAU diese auftreten (Altwert = Referenz, Neuwert = jetzt).
const pendingA = { styles: {}, seeds: {} };
for (const f of fs.readdirSync(path.join(__dirname, 'golden')).filter((n) => /^missionA-abweichungen-.*\.json$/.test(n))) {
  const p = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden', f), 'utf8')); Object.assign(pendingA.styles, p.styles); Object.assign(pendingA.seeds, p.seeds);
}
test(`Referenzaufnahme Mission A (${REF.missionA.file}): Hilfe, 5 feste Spielweisen × 4 Durchläufe, 200 Kinder-Abfolgen unverändert (bis auf vorgelegte Abweichungen)`, () => {
  const ref = require('./golden/' + REF.missionA.file);
  assert.strictEqual(hash(ref), REF.missionA.hash, REF.missionA.file + ' wurde verändert');
  const now = JSON.parse(JSON.stringify(traceMissionA(E))); // wie gespeichert (ohne undefined-Felder)
  for (const k of Object.keys(ref.styles)) {
    const p = pendingA.styles[k];
    if (!p) assert.deepStrictEqual(now.styles[k], ref.styles[k], `Spielweise ${k}`);
    else assert.deepStrictEqual([hash(ref.styles[k]), hash(now.styles[k])], [p.alt, p.neu], `Spielweise ${k}: anders als vorgelegt`);
  }
  const diff = Object.keys(ref.seeds).filter((k) => ref.seeds[k] !== now.seeds[k]);
  assert.deepStrictEqual(diff, Object.keys(pendingA.seeds).filter((k) => diff.includes(k)), 'nicht vorgelegte Abweichungen');
  assert.deepStrictEqual(Object.keys(pendingA.seeds).filter((k) => !diff.includes(k)), [], 'vorgelegte Abweichungen treten nicht mehr auf');
  for (const k of Object.keys(pendingA.seeds)) assert.deepStrictEqual([ref.seeds[k], now.seeds[k]], [pendingA.seeds[k].alt, pendingA.seeds[k].neu], `Abfolge ${k}`);
});

test('Gemischte Kinder-Abfolgen: jede Szene endet, jeder Durchlauf endet nach höchstens 12 Entscheidungen, Stern = Bewertung vor der Aktion', () => {
  const { childAction } = require('./golden/mission-a.js');
  const mixed = (seed) => { let x = (seed * 0x9e3779b9) >>> 0; return () => { x = (x + 0x6d2b79f5) >>> 0; let t = Math.imul(x ^ (x >>> 15), 1 | x); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  for (let seed = 1; seed <= 300; seed++) {
    const rnd = mixed(seed), r = play(E, seed % 4, (E2, s, ctx) => childAction(E2, s, ctx, rnd));
    assert.ok(r.done && r.out.length <= 12, `Abfolge ${seed}: ${r.out.length}`);
    for (const x of r.out) { assert.ok(x.ticks < 3000, 'Szene endet'); assert.strictEqual(x.fb.good, x.ev.good, `Abfolge ${seed}`); }
  }
});
