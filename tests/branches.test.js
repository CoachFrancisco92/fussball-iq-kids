// Viele ungünstige und ungewöhnliche Entscheidungsketten (Review V0.2.1, Punkt D).
// Die Engine bleibt zufallsfrei – nur der TEST erzeugt mit festem Startwert viele verschiedene Abfolgen.
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
const F = E.F;

function lcg(seed) { let x = seed >>> 0; return () => ((x = (1664525 * x + 1013904223) >>> 0) / 4294967296); }

/** Wählt eine Aktion wie ein Kind, das oft „falsch“ oder unerwartet tippt. */
function childAction(s, ctx, rnd) {
  const c = E.carrier(s);
  const blues = E.team(s, 'blue');
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) }); // auch außerhalb des Feldes
  const k = pick(ctx.actions);
  if (k === 'passen') {
    const r = rnd();
    if (r < 0.6) { const others = blues.filter((b) => b !== c); return { kind: 'pass', id: pick(others).id }; }
    return Object.assign({ kind: 'pass' }, spot());
  }
  if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot());
  if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
  if (k === 'freilaufen') { const others = blues.filter((b) => b !== c); return Object.assign({ kind: 'run', id: pick(others).id }, spot()); }
  if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
  return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
}

function checkState(s, label) {
  for (const p of s.players) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${label}: Position ungültig`);
    assert.ok(p.x >= 0 && p.x <= F.W && p.y >= 0 && p.y <= F.H, `${label}: ${p.id} außerhalb des Feldes`);
  }
  assert.ok(!!s.ball.owner !== !!s.ball.flight || s.poss === null, `${label}: Ball hat genau einen Besitzer oder ist unterwegs`);
  if (s.ball.owner) assert.strictEqual(E.P(s, s.ball.owner).team, s.poss, `${label}: Ballbesitz stimmt nicht`);
}

test('200 zufällige Kinder-Abfolgen: jede Mission endet sauber in 2–6 Entscheidungen', () => {
  let possChanges = 0, redGoals = 0, outOfBounds = 0, totalDefense = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const rnd = lcg(seed);
    const s = E.newState();
    const m = E.newMission();
    let last = null, n = 0;
    while (!m.done) {
      n++;
      assert.ok(n <= 6, `Seed ${seed}: mehr als 6 Entscheidungen`);
      const ctx = E.context(s, last);
      const a = childAction(s, ctx, rnd);
      const before = s.poss;
      E.startAction(s, a);
      let t = 0;
      while (!s.ep.done) { E.tick(s); t++; assert.ok(t < 3000, `Seed ${seed}: Episode endet nicht (${JSON.stringify(a)})`); }
      const fb = E.feedback(s);
      assert.ok(fb.text && fb.tip && fb.say, `Seed ${seed}: Rückmeldung unvollständig`);
      if (s.poss && s.poss !== before) possChanges++;
      if (fb.goal === 'red') redGoals++;
      if (a.x != null && (a.x < 0 || a.x > F.W || a.y < 0 || a.y > F.H)) outOfBounds++;
      if (ctx.type === 'verteidigung') totalDefense++;
      E.missionAfter(m, s, ctx.type);
      E.missionApply(m, s);
      checkState(s, `Seed ${seed}, Schritt ${n}`);
      last = { kind: a.kind, success: fb.success, team: 'blue' };
    }
    assert.ok(n >= 2, `Seed ${seed}: Mission zu kurz`);
  }
  // Die Abfolgen sollen die schwierigen Fälle wirklich abdecken
  assert.ok(possChanges > 100, 'genug Ballbesitzwechsel getestet');
  assert.ok(redGoals > 5, 'Gegentore kommen vor');
  assert.ok(outOfBounds > 50, 'Ziele außerhalb des Feldes getestet');
  assert.ok(totalDefense > 200, 'Verteidigungsentscheidungen getestet');
});

test('Jede Mission enthält Angriff und Verteidigung – auch bei lauter Fehlentscheidungen', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const rnd = lcg(seed * 7);
    const s = E.newState(); const m = E.newMission(); let last = null; const types = new Set();
    while (!m.done) {
      const ctx = E.context(s, last); types.add(ctx.type === 'verteidigung' ? 'def' : 'att');
      const a = childAction(s, ctx, rnd);
      E.startAction(s, a); while (!s.ep.done) E.tick(s);
      const fb = E.feedback(s); E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
      last = { kind: a.kind, success: fb.success, team: 'blue' };
    }
    assert.ok(types.has('att') && types.has('def'), `Seed ${seed}: ${[...types]}`);
  }
});

test('Mehrere Fehlpässe hintereinander nach „Anders probieren“ ergeben identische Ergebnisse', () => {
  const s0 = E.newState();
  const results = [];
  for (let i = 0; i < 3; i++) {
    const s = E.clone(s0);
    E.startAction(s, { kind: 'pass', id: 'b3' }); while (!s.ep.done) E.tick(s);
    results.push(JSON.stringify(s.players.map((p) => [p.x.toFixed(3), p.y.toFixed(3)])) + s.ball.owner);
  }
  assert.strictEqual(new Set(results).size, 1);
});

test('Schau-Schritt: Situation ohne freien Mitspieler wird erkannt', () => {
  const s = E.newState();
  // Gegner direkt in beide Passwege stellen
  for (const [id, x, y] of [['r1', 19, 9.5], ['r3', 16.5, 16], ['r2', 22, 7]]) { const p = E.P(s, id); p.x = p.tx = x; p.y = p.ty = y; }
  const free = E.passOptions(s).filter((o) => o.margin > E.CFG.passLaneOk);
  assert.strictEqual(free.length, 0, 'keiner frei');
  assert.strictEqual(E.situation(s).ok.pass, false);
  // Ein Pass wird dann nicht als „gute Idee“ gewertet, wenn eine andere Aktion möglich wäre
  const ev = E.evaluate(s, { kind: 'pass', id: 'b2' });
  assert.ok(ev.rec.why.length > 0);
});
