// Paket D (Meilenstein 3b, E1/E2/E4/E6): Dribbelbewertung = Vorausrechnung des tatsächlich ausgeführten Wegs mit Toleranz,
// Erklärung nach Ursache, Dribbelhilfe Richtung Tor. Eigenschaften über viele Lagen, unabhängig von Referenzaufnahmen.
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
const { lagen, sim, probeState, ENTWURF, MAP, segDist, cap } = require('./helpers/dribbel-lagen.js');
const T = E.texts(E.newState('mission-1')).ausfuehren;
const L = lagen(E, { seeds: 40 });
const ziele = (s, step = 30, dists = [2, 4, 6, 8, 11]) => { const c = E.carrier(s), out = []; for (let a = 0; a < 360; a += step) for (const d of dists) { const r = (a * Math.PI) / 180; out.push({ x: c.x + Math.cos(r) * d, y: c.y + Math.sin(r) * d, d, a }); } return out; };
const dribble = (p) => ({ kind: 'dribble', x: p.x, y: p.y });

test('Lagen: Mission 1, Mission A und alle Entwurfslagen enthalten', () => {
  for (const k of ['M1', 'MA', ...Object.keys(ENTWURF)]) assert.ok(L.some((l) => l.src === k), k);
  assert.ok(L.length >= 30, 'Lagen: ' + L.length);
});

test('Bewertung und Hilfe verändern die Lage nicht (Spielverlauf bleibt unberührt)', () => {
  for (const l of L) {
    const before = JSON.stringify(l.s);
    E.hint(l.s, 'dribbeln'); for (const z of ziele(l.s, 90, [4, 9])) E.evaluate(l.s, dribble(z));
    assert.strictEqual(JSON.stringify(l.s), before, l.src);
  }
});

test('E1: ⭐ nur, wenn das Ziel UND mindestens 3 von 4 Nachbarzielen (±0,5 m) in der Simulation den Ball behalten – nie ⭐ mit Ballverlust', () => {
  let stars = 0, knapp = 0;
  for (const l of L) {
    const c = E.carrier(l.s);
    for (const z of ziele(l.s)) {
      const ev = E.evaluate(l.s, dribble(z)), t = cap(E, c, z), main = sim(E, l.s, t);
      const kept = [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].filter(([dx, dy]) => !sim(E, l.s, cap(E, c, { x: t.x + dx, y: t.y + dy })).lost).length;
      assert.strictEqual(ev.exe.good, !main.lost && kept >= 3, `${l.src} (${z.x.toFixed(1)}|${z.y.toFixed(1)})`);
      if (ev.exe.good) stars++;
      if (!main.lost && kept < 3) { knapp++; assert.match(ev.exe.why, /^Das war knapp – (Rot|Ein Gegner)/); }
    }
  }
  assert.ok(stars > 500 && knapp > 0, `⭐ ${stars}, knapp ${knapp}`);
});

test('E4: Erklärung nennt die tatsächliche Ursache – „direkt auf einen Gegner“ nur bei Ballverlust mit Weg < 1 m am Gegner', () => {
  const seen = { frei: 0, knapp: 0, direkt: 0, dazwischen: 0 };
  for (const l of L) {
    const c = E.carrier(l.s), reds = E.team(l.s, 'red');
    for (const z of ziele(l.s)) {
      const ev = E.evaluate(l.s, dribble(z)), t = cap(E, c, z), main = sim(E, l.s, t);
      const into = reds.some((r) => { const sd = segDist(r, c, t); return sd.t > 0.02 && sd.d < 1; });
      if (ev.exe.why === T.inGegner) { seen.direkt++; assert.ok(main.lost && into, `${l.src}: „direkt“ ohne Ballverlust/Gegner im Weg`); }
      else if (/^Dribbel weiter weg vo/.test(ev.exe.why)) { seen.dazwischen++; assert.ok(main.lost && !into); }
      else if (/^Das war knapp/.test(ev.exe.why)) { seen.knapp++; assert.ok(!main.lost); }
      else { seen.frei++; assert.strictEqual(ev.exe.why, T.freierRaum); assert.ok(!main.lost); }
    }
  }
  for (const k of Object.keys(seen)) assert.ok(seen[k] > 0, `Fall ${k} kommt vor: ${JSON.stringify(seen)}`);
});

test('E2: Ein Tipp über 8 m wird bewertet wie der tatsächlich ausgeführte 8-m-Weg', () => {
  for (const l of L.filter((_, i) => i % 2 === 0)) {
    const c = E.carrier(l.s);
    for (const z of ziele(l.s, 30, [11, 14])) {
      const a = E.evaluate(l.s, dribble(z)), b = E.evaluate(l.s, dribble(cap(E, c, z)));
      assert.deepStrictEqual([a.exe.good, a.exe.why], [b.exe.good, b.exe.why], l.src);
    }
  }
});

test('Bewusst schlechte und zweifelhafte Dribblings (Entwurfslagen)', () => {
  // B4: Gegner frontal 6 m vor dem Ball – geradewegs hindurch ist schlecht, außen vorbei gut
  const b4 = probeState(E, ENTWURF.B4);
  const durch = E.evaluate(b4, { kind: 'dribble', x: 25, y: 12 });
  assert.deepStrictEqual([durch.exe.good, durch.exe.why], [false, T.inGegner]);
  assert.ok(E.evaluate(b4, { kind: 'dribble', x: 23, y: 6 }).exe.good, 'außen vorbei');
  // B2: zwei Gegner – mitten durch die Lücke und außen herum sind beide gut (mehrere sinnvolle Wege)
  const b2 = probeState(E, ENTWURF.B2);
  assert.ok(E.evaluate(b2, { kind: 'dribble', x: 20, y: 12 }).exe.good, 'durch die Lücke');
  assert.ok(E.evaluate(b2, { kind: 'dribble', x: 19, y: 22 }).exe.good, 'außen herum');
  assert.strictEqual(E.evaluate(b2, { kind: 'dribble', x: 19, y: 7.5 }).exe.why, T.inGegner, 'in den Gegner');
  // Tipp weit ins Aus: wird aufs Feld und auf 8 m gekappt, bewertet wie ausgeführt
  const a = E.evaluate(b2, { kind: 'dribble', x: 60, y: -20 }), c = E.carrier(b2);
  assert.deepStrictEqual(a.exe, E.evaluate(b2, dribble(cap(E, c, { x: 60, y: -20 }))).exe);
  // Rückwärts ohne Not (B3: Verfolger hinten, vorn alles frei) – heute noch ⭐, wird mit E3 neu entschieden
  const b3 = probeState(E, ENTWURF.B3);
  assert.ok(E.evaluate(b3, { kind: 'dribble', x: 18, y: 4 }).exe.good, 'quer ohne Gegner: sicher (Raumgewinn-Regel E3 noch offen)');
});

test('E6: Hilfe zeigt nur ⭐-Ziele, robust bei ungenauem Tippen (≥ 3 von 4 Nachbarzielen ±0,5 m ebenfalls ⭐), gewinnt Raum', () => {
  let n = 0, fwd = 0;
  for (const l of L) {
    const h = E.hint(l.s, 'dribbeln'); if (!h.point) continue;
    const ev = E.evaluate(l.s, dribble(h.point));
    if (!ev.exe.good) continue; // kein sicheres Ziel in dieser Lage: Ausweg-Hilfe (bisherige Suche), selten
    n++;
    const nb = [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].filter(([dx, dy]) => E.evaluate(l.s, { kind: 'dribble', x: h.point.x + dx, y: h.point.y + dy }).exe.good).length;
    assert.ok(nb >= 3, `${l.src}: Nachbarn ${nb}/4`);
    if (h.point.x > E.carrier(l.s).x + 1) fwd++;
  }
  assert.ok(n >= L.length * 0.9, `Hilfe mit ⭐-Ziel in ${n} von ${L.length} Lagen`);
  assert.ok(fwd >= n * 0.9, `Hilfe nach vorn in ${fwd} von ${n}`);
});

test('E6: Hilfe-Weg in B1–B5 führt ohne Abdriften zur Seitenlinie in höchstens 4 Entscheidungen zum Tor (nur ⭐)', () => {
  for (const k of ['B1', 'B2', 'B3', 'B4', 'B5']) {
    const s = probeState(E, ENTWURF[k], { reihenfolge: ['dribbeln', 'schiessen'] }); let last = null, goal = false, i = 0;
    for (; i < 6 && !goal; i++) {
      const ctx = E.context(s, last), key = E.recommend(s, ctx.actions), h = E.hint(s, key), a = { kind: MAP[key] };
      if (h.point) { a.x = h.point.x; a.y = h.point.y; assert.ok(h.point.y > 2 && h.point.y < E.F.H - 2, `${k}: Seitenlinie (${h.point.y.toFixed(1)})`); }
      if (h.goal != null) a.goal = h.goal;
      assert.ok(E.evaluate(s, a).good, `${k}: Hilfe ⭐ (Schritt ${i + 1})`);
      E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s);
      goal = s.ep.events.some((e) => e.type === 'goal'); last = { kind: a.kind, success: E.feedback(s).success, team: 'blue' };
    }
    assert.ok(goal && i <= 4, `${k}: Tor nach ${i} Entscheidungen`);
  }
});

test('E6: A4 mit dem Lernweg von „Welches Tor ist frei?“ – Dribbeln ⭐ → Schuss ⭐ → Tor in der Startlage und bei ±0,5 m je Spieler', () => {
  const hilfe = E.mission('welches-tor-ist-frei').hilfe;
  const run = (sp) => { const s = probeState(E, sp, hilfe), log = []; let last = null;
    for (let i = 0; i < 4; i++) { const ctx = E.context(s, last), key = E.recommend(s, ctx.actions), h = E.hint(s, key), a = { kind: MAP[key] }; if (h.ids && h.ids.length) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal;
      const ev = E.evaluate(s, a); E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s); const g = s.ep.events.some((e) => e.type === 'goal'); log.push(a.kind + (ev.good ? '⭐' : '💭') + (g ? '⚽' : '')); last = { kind: a.kind, success: E.feedback(s).success, team: 'blue' }; if (g) break; }
    return log.join(' '); };
  assert.strictEqual(run(ENTWURF.A4), 'dribble⭐ shoot⭐⚽');
  for (let i = 0; i < ENTWURF.A4.length; i++) for (const ax of ['x', 'y']) for (const d of [-0.5, 0.5]) {
    const sp = ENTWURF.A4.map((p) => ({ ...p })); sp[i][ax] += d;
    assert.strictEqual(run(sp), 'dribble⭐ shoot⭐⚽', `${sp[i].id} ${ax} ${d}`);
  }
});
