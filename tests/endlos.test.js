// Hotfix: Szenen müssen immer enden. Ursache in v0.2.4: Zwei Gegner unter Druck spielten sich den Ball sofort
// hin und zurück (Pass-Pingpong); weil das Szenenende wartet, solange der Ball fliegt, endete die Szene nie.
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
const { playMission, lcg } = require('./golden/trace.js');
const fixture = require('./fixtures/endlos-verteidigung.json');
const MAX = 15 / E.CFG.dt; // 15 s Spielzeit – reguläre Szenen dauern höchstens ~9 s

// Szene ablaufen lassen und dabei alle roten Pässe (von → zu) mitschreiben
function play(s, a) {
  E.startAction(s, a);
  const passes = []; let fl = null, i = 0;
  while (!s.ep.done && i++ < MAX) {
    E.tick(s);
    const f = s.ball.flight;
    if (f && f !== fl && f.team === 'red' && f.kind === 'pass') passes.push({ from: f.from, to: f.recv, t: s.ep.t, ende: s.ep.endT != null });
    fl = f;
  }
  return { done: s.ep.done, passes, t: s.ep.t };
}
// gültiger Zustand für die nächste Entscheidung: Ball liegt bei einem Spieler (oder Neustart), nichts fliegt mehr
function assertValidNext(s) {
  assert.strictEqual(s.ball.flight, null, 'kein Ball mehr in der Luft');
  assert.ok(s.ball.owner && E.P(s, s.ball.owner).team === s.poss, 'Ballbesitz eindeutig');
}
function assertNoPingPong(passes) {
  for (let k = 1; k < passes.length; k++) {
    const p = passes[k - 1], q = passes[k];
    assert.ok(!(q.from === p.to && q.to === p.from), `sofortiger Rückpass ${q.from}→${q.to} nach ${p.from}→${p.to}`);
  }
  const ende = passes.filter((p) => p.ende).map((p) => p.from);
  assert.strictEqual(new Set(ende).size, ende.length, `nach eingeleitetem Szenenende spielt jeder Gegner höchstens einmal ab: ${ende}`);
}

test('Regression: Pass von der Startposition auf 17/11 – Szene endet, Mission geht mit der Verteidigung weiter', () => {
  const s = E.newState(), m = E.newMission();
  const ctx = E.context(s, null);
  const r = play(s, { kind: 'pass', x: 17, y: 11 });
  assert.ok(r.done, `Szene endet (nach ${r.t.toFixed(1)} s)`);
  assert.ok(r.t < 5, 'endet zügig nach dem Abfangen');
  assert.deepStrictEqual(s.ep.events.filter((e) => e.type === 'intercepted').map((e) => e.by), ['r1'], 'Rot 1 fängt ab (wie bisher)');
  assertNoPingPong(r.passes);
  assertValidNext(s);
  assert.strictEqual(s.poss, 'red');
  // nächster Entscheidungspunkt ist gültig: Verteidigung mit Aktionen
  E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
  const next = E.context(s, { kind: 'pass', success: false, team: 'blue' });
  assert.ok(!m.done && next.actions.length >= 2, `nächste Entscheidung: ${next.type} ${next.actions}`);
  const r2 = play(s, { kind: 'press', id: 'b1' });
  assert.ok(r2.done, 'auch die folgende Verteidigungsszene endet');
});

test('Regression: Verteidigung „Weg versperren“ aus Kinder-Abfolge 12 – Szene endet ohne Pass-Pingpong', () => {
  for (const [x, y] of [[1, 1], [1, 5], [5, 5], [1, 13]]) {
    const s = E.clone(fixture.zustand);
    const r = play(s, { kind: 'cover', id: 'b1', x, y });
    assert.ok(r.done, `Szene endet (${x}/${y})`);
    assertNoPingPong(r.passes);
    assertValidNext(s);
  }
});

// Lagen aus echten Abläufen von Mission 1 sammeln (Angriff und Verteidigung)
function states(n) {
  const out = [], seen = new Set();
  for (let seed = 1; seed <= n; seed++) {
    const rnd = lcg(seed);
    playMission(E, (E2, s, ctx) => {
      const k0 = JSON.stringify(s.players.map((p) => [p.x.toFixed(2), p.y.toFixed(2)])) + s.poss;
      if (!seen.has(k0)) { seen.add(k0); out.push({ s: E2.clone(s), ctx }); }
      const F = E2.F, c = E2.carrier(s), blues = E2.team(s, 'blue'), pick = (a) => a[Math.floor(rnd() * a.length)], spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) }), k = pick(ctx.actions);
      if (k === 'passen') { if (rnd() < 0.6) return { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id }; return Object.assign({ kind: 'pass' }, spot()); }
      if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot()); if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
      if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot()); if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
      return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
    });
  }
  return out;
}

test('Wiederkehrende Gegneraktionen: jede Szene endet, kein sofortiger Rückpass, gültiger Folgezustand (Angriff und Verteidigung)', () => {
  let n = 0, red = 0;
  for (const { s, ctx } of states(60)) {
    const c = E.carrier(s), blues = E.team(s, 'blue'), acts = [];
    for (const k of ctx.actions) {
      if (k === 'passen') for (let x = 2; x < 35; x += 6) for (let y = 2; y < 23; y += 6) acts.push({ kind: 'pass', x, y });
      if (k === 'erobern') blues.forEach((b) => acts.push({ kind: 'press', id: b.id }));
      if (k === 'raum') for (const b of blues) for (let x = 1; x < 35; x += 8) for (let y = 1; y < 23; y += 8) acts.push({ kind: 'cover', id: b.id, x, y });
      if (k === 'dribbeln') acts.push({ kind: 'dribble', x: c.x + 5, y: c.y });
    }
    for (const a of acts) {
      const t = E.clone(s), r = play(t, a);
      assert.ok(r.done, `Szene endet nicht: ${JSON.stringify(a)}`);
      assertNoPingPong(r.passes);
      if (!t.ep.restart) assertValidNext(t);
      n++; red += r.passes.length;
    }
  }
  assert.ok(n > 3000 && red > 100, `${n} Szenen, ${red} rote Pässe geprüft`);
});

test('Hotfix bleibt deterministisch', () => {
  const a = E.clone(fixture.zustand), b = E.clone(fixture.zustand);
  play(a, { kind: 'cover', id: 'b1', x: 1, y: 1 }); play(b, { kind: 'cover', id: 'b1', x: 1, y: 1 });
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
});

test('Absicherung: Nach eingeleitetem Szenenende spielt ein Gegner, der schon abgespielt hat, nicht noch einmal ab', () => {
  // Lage aus Kinder-Abfolge 12: Rot 1 hat den Ball. Szenenende künstlich einleiten und Rot 1 als „hat schon abgespielt“ markieren.
  const s = E.clone(fixture.zustand);
  E.startAction(s, { kind: 'cover', id: 'b1', x: 1, y: 1 });
  s.ep.endT = s.ep.t + 0.6; s.ep.endPassers = [s.ball.owner];
  const owner = s.ball.owner; let i = 0;
  while (!s.ep.done && i++ < MAX) { E.tick(s); if (s.ball.flight && s.ball.flight.from === owner) assert.fail('Rot spielt trotz Szenenende erneut ab'); }
  assert.ok(s.ep.done); assertValidNext(s);
});
