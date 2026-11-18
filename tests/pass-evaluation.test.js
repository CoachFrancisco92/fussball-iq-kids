// E1: Pass in den Raum situationsbezogen bewerten · E2: Hilfe · E3: optionale Verteidigung · E5: missionsunabhängige Bewertung
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
require('./fixtures/test-mission-lernweg.js');
const { lcg } = require('./golden/trace.js');

function place(map, missionId) {
  const s = E.newState(missionId);
  for (const [id, [x, y]] of Object.entries(map)) { const p = E.P(s, id); p.x = p.tx = x; p.y = p.ty = y; }
  const c = E.carrier(s); s.ball.x = c.x; s.ball.y = c.y;
  return s;
}
function simulate(s, a) { const t = E.clone(s); E.startAction(t, a); while (!t.ep.done) E.tick(t); return t.ep.events.map((e) => e.type); }
// typische Lage: Blau 1 mit Ball, Blau 2 vorne oben, Blau 3 hinten unten
const base = { b1: [16, 12], b2: [22, 5], b3: [10, 19], r1: [21, 13], r2: [27, 9], r3: [17, 18] };

test('Erreichbarer Pass in den Raum: gute Entscheidung und gutes Ziel, kommt an', () => {
  const s = place(base);
  const to = { x: 25, y: 3 };
  const info = E.spacePassInfo(s, E.carrier(s), to);
  assert.strictEqual(info.status, 'frei'); assert.ok(info.reserve >= E.CFG.spaceReserve);
  const ev = E.evaluate(s, Object.assign({ kind: 'pass' }, to));
  assert.ok(ev.good && ev.rec.good && ev.exe.good, JSON.stringify(ev));
  assert.ok(simulate(s, Object.assign({ kind: 'pass' }, to)).includes('received'));
});

test('Nicht erreichbarer Pass in den Raum: Gegner zuerst am Ball → nicht gut, wird abgefangen', () => {
  const s = place(base);
  const to = { x: 28.5, y: 11 }; // direkt bei Rot 2
  const info = E.spacePassInfo(s, E.carrier(s), to);
  assert.ok(['gegnerZuerst', 'abgefangen', 'wegNah'].includes(info.status), info.status);
  assert.strictEqual(E.evaluate(s, Object.assign({ kind: 'pass' }, to)).exe.good, false);
  assert.ok(simulate(s, Object.assign({ kind: 'pass' }, to)).includes('intercepted'));
});

function findStatus(s, st, extra) {
  for (let x = 1.5; x < 35; x += 0.25) for (let y = 1.5; y < 23; y += 0.25) { const i = E.spacePassInfo(s, E.carrier(s), { x, y }); if (i.status === st && (!extra || extra(i))) return { x, y }; }
  return null;
}
test('Knapper, aber robuster Pass (Reserve 0,1–0,3 s): kommt an und wird gelobt – mit Hinweis „Knapp“', () => {
  const s = place(base);
  const to = findStatus(s, 'knapp', (i) => i.reserve < 0.2);
  assert.ok(to, 'knappe Lage gefunden');
  const ev = E.evaluate(s, Object.assign({ kind: 'pass' }, to));
  assert.strictEqual(ev.exe.good, true); assert.match(ev.exe.why, /^Knapp, aber/);
  assert.ok(simulate(s, Object.assign({ kind: 'pass' }, to)).includes('received'), 'kommt in der Simulation an');
  // auch wenn die Gegner 0,1 s schneller reagieren
  const r0 = E.CFG.redReact; E.CFG.redReact = r0 - 0.1;
  try { assert.ok(simulate(s, Object.assign({ kind: 'pass' }, to)).includes('received'), 'robust gegen 0,1 s'); } finally { E.CFG.redReact = r0; }
});

test('Zu knapper Pass (Reserve unter 0,1 s): kommt zwar an, wird aber nicht gelobt (Entscheidung ≠ Ergebnis)', () => {
  const s = place(base);
  const to = findStatus(s, 'zuKnapp', (i) => i.reserve > 0);
  assert.ok(to, 'zu knappe Lage gefunden');
  const ev = E.evaluate(s, Object.assign({ kind: 'pass' }, to));
  assert.strictEqual(ev.exe.good, false); assert.match(ev.exe.why, /^Zu knapp!/);
  assert.ok(simulate(s, Object.assign({ kind: 'pass' }, to)).includes('received'), 'kommt in der Simulation an');
});

test('Sicherer Rückpass in den Raum ist gut (keine Richtungsregel)', () => {
  const s = place(base);
  const to = { x: 9, y: 15 }; // hinter dem Ballführenden, Blau 3 läuft hin
  assert.ok(to.x < E.carrier(s).x);
  const info = E.spacePassInfo(s, E.carrier(s), to);
  assert.strictEqual(info.status, 'frei', JSON.stringify(info));
  assert.ok(E.evaluate(s, Object.assign({ kind: 'pass' }, to)).good);
});

test('Kein pauschaler Mindestabstand zum Gegner: sicherer Pass auch nahe an einem Gegner möglich', () => {
  // in echten Lagen einen Zielpunkt suchen, der < 3 m neben einem Gegner liegt und trotzdem sicher erreichbar ist
  let hit = null;
  for (const { s } of sampleStates(40)) {
    const c = E.carrier(s);
    for (let x = 1.5; x < 35 && !hit; x += 1) for (let y = 1.5; y < 23 && !hit; y += 1) {
      const to = { x, y }; if (E.dist(c, to) < 2) continue;
      const near = Math.min(...E.team(s, 'red').map((r) => E.dist(r, to)));
      if (near < 3 && E.spacePassInfo(s, c, to).status === 'frei') hit = { s, to, near };
    }
    if (hit) break;
  }
  assert.ok(hit, 'Lage gefunden');
  assert.ok(E.evaluate(hit.s, Object.assign({ kind: 'pass' }, hit.to)).exe.good, `gut trotz Gegner in ${hit.near.toFixed(1)} m`);
  assert.ok(simulate(hit.s, Object.assign({ kind: 'pass' }, hit.to)).includes('received'));
});

for (const [grenze, unten, oben] of [['spaceReserve', 'knapp', 'frei'], ['spaceReserveMin', 'zuKnapp', 'knapp']]) {
  test(`Bewertungsgrenze: Reserve knapp unter / über CFG.${grenze}`, () => {
    const s = place(base), c = E.carrier(s), g = E.CFG[grenze];
    const pts = [];
    for (let x = 1.5; x < 35; x += 0.25) for (let y = 1.5; y < 23; y += 0.25) { const i = E.spacePassInfo(s, c, { x, y }); if (i.lane > E.CFG.passLaneOk && Math.abs(i.reserve - g) < 0.03) pts.push(i); }
    assert.ok(pts.some((i) => i.reserve < g) && pts.some((i) => i.reserve >= g), 'Punkte auf beiden Seiten gefunden');
    for (const i of pts) assert.strictEqual(i.status, i.reserve >= g ? oben : unten);
  });
}

// Zustände aus echten Abläufen (Mission 1, 120 Kinder-Abfolgen)
function sampleStates(n) {
  const out = [];
  for (let seed = 1; seed <= n; seed++) {
    const rnd = lcg(seed); const s = E.newState(); const m = E.newMission(); let last = null;
    for (let i = 0; i < 6 && !m.done; i++) {
      const ctx = E.context(s, last); if (s.poss === 'blue') out.push({ s: E.clone(s), ctx });
      const c = E.carrier(s), b = E.team(s, 'blue'), k = ctx.actions[Math.floor(rnd() * ctx.actions.length)];
      const a = k === 'passen' ? (rnd() < 0.5 ? { kind: 'pass', id: b.find((x) => x !== c).id } : { kind: 'pass', x: rnd() * 36, y: rnd() * 24 }) : k === 'dribbeln' ? { kind: 'dribble', x: rnd() * 36, y: rnd() * 24 } : k === 'schiessen' ? { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 } : k === 'freilaufen' ? { kind: 'run', id: b.find((x) => x !== c).id, x: rnd() * 36, y: rnd() * 24 } : k === 'erobern' ? { kind: 'press', id: b[0].id } : { kind: 'cover', id: b[0].id, x: rnd() * 36, y: rnd() * 24 };
      E.startAction(s, a); while (!s.ep.done) E.tick(s); const fb = E.feedback(s); E.missionAfter(m, s, ctx.type); E.missionApply(m, s); last = { kind: a.kind, success: fb.success, team: 'blue' };
    }
  }
  return out;
}
const STATES = sampleStates(120);

test('Bewertung und Simulation passen zusammen: als gut bewertete Raum-Pässe („frei“, „knapp“) kommen immer an, „Gegner zuerst“/„abgefangen“ nie', () => {
  let checked = 0;
  for (const { s } of STATES.slice(0, 60)) {
    const c = E.carrier(s);
    for (let x = 3; x < 34; x += 4) for (let y = 3; y < 22; y += 4) {
      const to = { x, y }; if (E.dist(c, to) < 2) continue;
      const i = E.spacePassInfo(s, c, to); const ev = simulate(s, Object.assign({ kind: 'pass' }, to));
      if (i.ok) assert.ok(ev.includes('received'), JSON.stringify(i)); // „frei“ und „knapp, aber gut“
      if (i.status === 'gegnerZuerst' || i.status === 'abgefangen') assert.ok(ev.includes('intercepted'), JSON.stringify(i));
      checked++;
    }
  }
  assert.ok(checked > 1000, `${checked} Pässe geprüft`);
});

test('E5: gleiche Lage wird in jeder Mission gleich bewertet', () => {
  let n = 0;
  for (const { s, ctx } of STATES) {
    const t = E.clone(s); t.missionId = 'test-lernweg';
    const c = E.carrier(s), b = E.team(s, 'blue').filter((x) => x !== c);
    const actions = [{ kind: 'pass', id: b[0].id }, { kind: 'pass', x: c.x + 6, y: c.y - 4 }, { kind: 'pass', x: c.x - 5, y: c.y + 3 }, { kind: 'dribble', x: c.x + 5, y: c.y }];
    if (ctx.actions.includes('schiessen')) actions.push({ kind: 'shoot', goal: 0 }, { kind: 'shoot', goal: 1 });
    for (const a of actions) {
      const e1 = E.evaluate(s, a), e2 = E.evaluate(t, a);
      assert.deepStrictEqual([e2.good, e2.rec, e2.exe], [e1.good, e1.rec, e1.exe]); n++;
    }
  }
  assert.ok(n > 300);
});

test('E2: Hilfe empfiehlt nur sinnvolle Aktionen – und der Hilfe zu folgen wird immer als gut bewertet', () => {
  let n = 0;
  for (const { s, ctx } of STATES) for (const mid of ['mission-1', 'test-lernweg']) {
    const t = E.clone(s); t.missionId = mid;
    const good = E.goodActions(t, ctx.actions);
    if (!good.length) continue;
    const k = E.recommend(t, ctx.actions);
    assert.ok(good.includes(k), `${mid}: ${k} nicht sinnvoll (${good})`);
    const h = E.hint(t, k);
    const a = k === 'passen' ? (h.point ? { kind: 'pass', x: h.point.x, y: h.point.y } : { kind: 'pass', id: h.ids[0] }) : k === 'dribbeln' ? { kind: 'dribble', x: h.point.x, y: h.point.y } : { kind: 'shoot', goal: h.goal };
    const ev = E.evaluate(t, a);
    assert.ok(ev.good, `${mid}: Hilfe zu ${k} führt zu nicht guter Bewertung: ${ev.rec.why} / ${ev.exe.why}`);
    n++;
  }
  assert.ok(n > 100, `${n} Lagen`);
});

test('E2: Lernweg der Mission bestimmt die Empfehlung, andere gute Wege bleiben gut und werden genannt', () => {
  let found = 0;
  for (const { s, ctx } of STATES) {
    if (!(ctx.actions.includes('passen') && ctx.actions.includes('dribbeln'))) continue;
    const good = E.goodActions(s, ctx.actions);
    if (!(good.includes('passen') && good.includes('dribbeln'))) continue;
    const t = E.clone(s); t.missionId = 'test-lernweg';
    // Mission 1 wie v0.2.4: Passen vor Dribbeln, wenn ein Mitspieler frei steht. Ist nur der Pass in den Raum sinnvoll,
    // bleibt die Empfehlung Dribbeln (Raumpass ist dann gut, aber nicht der Lernweg der Mission 1).
    const sit = E.situation(s);
    assert.strictEqual(E.recommend(s, ctx.actions), sit.ok.mate ? 'passen' : 'dribbeln', 'Mission 1: Reihenfolge wie bisher');
    assert.strictEqual(E.recommend(t, ctx.actions), 'dribbeln', 'Lernweg Dribbeln');
    const h = E.hint(t, 'dribbeln');
    assert.ok(h.alsoGood && h.alsoGood.includes('passen'), 'Alternative wird genannt');
    assert.match(h.say, /Auch gut: Passen/);
    // die Alternative wird weiterhin als gut bewertet
    const hp = E.hint(t, 'passen');
    const ap = hp.point ? { kind: 'pass', x: hp.point.x, y: hp.point.y } : { kind: 'pass', id: hp.ids[0] };
    assert.ok(E.evaluate(t, ap).good, 'Pass bleibt gute Entscheidung');
    assert.ok(!E.hint(s, 'dribbeln').alsoGood, 'Mission 1 nennt keine Alternativen (unverändert)');
    found++;
  }
  assert.ok(found >= 3, `${found} Lagen mit zwei guten Wegen`);
});

test('E3: Mission ohne Verteidigungsphase endet mit dem Angriff (Tor, Ballverlust oder letzte Entscheidung)', () => {
  assert.deepStrictEqual(E.validateMission(E.mission('test-lernweg')), []);
  const bad = JSON.parse(JSON.stringify(E.mission('test-lernweg'))); bad.phasen.verteidigung = -1;
  assert.ok(E.validateMission(bad).length);
  const run = (steps) => { const s = E.newState('test-lernweg'), m = E.newMission('test-lernweg'); let i = 0, last = null; while (!m.done && i < 6) { const ctx = E.context(s, last); const a = steps[Math.min(i, steps.length - 1)]; E.startAction(s, a); while (!s.ep.done) E.tick(s); const fb = E.feedback(s); E.missionAfter(m, s, ctx.type); E.missionApply(m, s); last = { kind: a.kind, success: fb.success, team: 'blue' }; i++; } return { m, i }; };
  const loss = run([{ kind: 'pass', id: 'b3' }]); // abgefangen
  assert.ok(loss.m.done && loss.i === 1 && loss.m.def === 0, 'Ballverlust beendet die Mission');
  const goal = run([{ kind: 'pass', id: 'b2' }, { kind: 'run', id: 'b3', x: 23, y: 14 }, { kind: 'shoot', goal: 0 }]);
  assert.ok(goal.m.done && goal.i === 3 && goal.m.def === 0, 'Tor beendet die Mission');
  const out = run([{ kind: 'dribble', x: 10, y: 13 }, { kind: 'dribble', x: 6, y: 13 }, { kind: 'dribble', x: 3, y: 16 }]);
  assert.ok(out.m.done && out.i === 3 && !out.m.pending, 'nach maxAngriff Ende ohne Neustart');
  // Mission 1 unverändert: 4 + 2
  const m1 = E.newMission('mission-1'); assert.deepStrictEqual([m1.maxAttack, m1.defense], [4, 2]);
});

test('E6: Standardmission und Ladereihenfolge kommen aus index.html', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const order = [...html.matchAll(/<script src="missions\/([^"?]+)\.js/g)].map((m) => m[1]);
  assert.strictEqual(E.mission().id, order[0]);
  assert.deepStrictEqual(E.missions().slice(0, order.length).map((m) => m.id), order);
});

test('E5 strukturell: Bewertungsfunktionen lesen keine Missionseinstellungen', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'engine.js'), 'utf8');
  const body = (name) => { const i = src.indexOf(`function ${name}(`); let d = 0, j = src.indexOf('{', i); const st = j; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } return src.slice(st, j); };
  for (const f of ['evaluate', 'situation', 'spacePassInfo', 'bestSpacePass', 'spaceContest', 'passOptions', 'shotOptions', 'dribbleLane', 'runSpotScore']) {
    const b = body(f);
    assert.ok(b.length > 20, f);
    assert.doesNotMatch(b, /mission\(|helpOrder|\.hilfe|\.phasen|schauSchritt/, `${f} darf nicht von der Mission abhängen`);
  }
});

test('Begriffe widersprechen sich nicht: „steht frei“ (Mitspieler) vs. „freier Raum“ (dorthin laufen)', () => {
  const FREI = /Freund (steht|stand|war) frei|freien Freund|Freund stand freier|steht frei/;
  const T = E.texts(E.newState());
  let n = 0, keinerRaum = 0;
  for (const { s, ctx } of STATES) {
    const sit = E.situation(s), c = E.carrier(s), look = E.lookAnswer(s, null, 0);
    // Schau-Schritt „Keiner ist frei“ ist genau dann richtig, wenn kein Mitspieler frei steht
    assert.strictEqual(look.right, !sit.ok.mate);
    if (look.right && sit.ok.space) { assert.strictEqual(look.say, T.schau.richtigKeinerRaum); keinerRaum++; }
    const acts = [];
    if (ctx.actions.includes('passen')) {
      for (const b of E.team(s, 'blue')) if (b !== c) acts.push({ kind: 'pass', id: b.id });
      for (let x = 2; x < 35; x += 6) for (let y = 2; y < 23; y += 6) acts.push({ kind: 'pass', x, y });
    }
    if (ctx.actions.includes('dribbeln')) acts.push(Object.assign({ kind: 'dribble' }, E.hint(s, 'dribbeln').point));
    if (ctx.actions.includes('schiessen')) acts.push({ kind: 'shoot', goal: 0 }, { kind: 'shoot', goal: 1 });
    for (const a of acts) {
      const ev = E.evaluate(s, a), txt = ev.rec.why + ' ' + ev.exe.why;
      if (!sit.ok.mate) assert.doesNotMatch(txt, FREI, `kein Mitspieler steht frei, Text sagt es aber: ${txt}`);
      if (a.kind === 'pass' && !a.id) assert.notStrictEqual(ev.rec.why, T.erkennen.freund, 'Pass in den Raum wird nicht als „Freund frei“ gelobt');
      n++;
    }
  }
  assert.ok(n > 1000 && keinerRaum > 0, `${n} Bewertungen, ${keinerRaum} Lagen „keiner frei, aber Raum“`);
});

test('Rückmeldung nennt beim Ballverlust denselben Gegner wie das Ergebnis („Rot 1 hat den Ball …“ ↔ „Rot 1 war schneller“)', () => {
  let n = 0, fixed = 0;
  for (const { s, ctx } of STATES.slice(0, 30)) {
    if (!ctx.actions.includes('passen')) continue;
    for (let x = 2; x < 35; x += 4) for (let y = 2; y < 23; y += 4) {
      const a = { kind: 'pass', x, y }, t = E.clone(s); E.startAction(t, a); let k = 0; while (!t.ep.done && k++ < 3000) E.tick(t);
      assert.ok(t.ep.done, 'Ablauf endet');
      const fb = E.feedback(t), o = (fb.text.match(/Rot \d/) || [])[0], e = (fb.exe.why.match(/Rot \d/) || [])[0];
      if (!o || !e) continue;
      assert.strictEqual(e, o, fb.say); n++;
      if ((t.ep.eval.exe.why.match(/Rot \d/) || [])[0] !== o) { fixed++; assert.strictEqual(fb.exe.good, t.ep.eval.exe.good, 'Wertung unverändert'); }
    }
  }
  assert.ok(n > 200 && fixed > 0, `${n} Ballverluste, ${fixed} mit korrigiertem Namen`);
});
