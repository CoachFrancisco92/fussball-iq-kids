// V0.6.2 Paket „Wahrnehmung“ (freigegeben 20.11.2026, Maßnahmen 1–3 aus docs/qs-kindertest-v0.6.0.md):
// (1) Ansagen passen zur Lage, (2) neue Möglichkeiten werden korrekt benannt, (3) Folge-Moment nur bei bedeutsamer
// Veränderung. Ohne vorweggenommene Lösung, Bewertung unverändert. Belege unabhängig an der Simulation nachgerechnet.
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');

const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run', erobern: 'press', raum: 'cover' };
const lcg = (seed) => { let x = (seed * 2654435761) >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; };
function hilfe(s, ctx) {
  const k = E.recommend(s, ctx.actions), h = E.hint(s, k), a = { kind: MAP[k] };
  if (h.ids) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal;
  if ((a.kind === 'press' || a.kind === 'cover') && !a.id) a.id = E.team(s, 'blue')[0].id;
  return a.kind === 'run' && !a.id ? null : a;
}
function kind(s, ctx, rnd) {
  const F = E.F, c = E.carrier(s), blues = E.team(s, 'blue'), pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const k = pick(ctx.actions), mit = blues.filter((b) => b !== c), spot = () => ({ x: 2 + rnd() * (F.W - 4), y: 1 + rnd() * (F.H - 2) });
  if (k === 'passen') return mit.length ? { kind: 'pass', id: pick(mit).id } : Object.assign({ kind: 'pass' }, spot());
  if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot());
  if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
  if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(mit).id }, spot());
  if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
  return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
}
const frei = (s) => { const c = E.carrier(s); return c && c.team === 'blue' ? E.shotOptions(s).filter((o) => o.margin > E.CFG.shotLaneOk).map((o) => o.goal) : []; };

/** Alle Entscheidungen gemischter Abfolgen (Hilfe + Kinder) in allen Missionen, mit Lage vor jeder Entscheidung */
const ALLE = [];
for (const id of ['mission-1', 'welches-tor-ist-frei', 'freie-bahn']) {
  const n = (E.mission(id).durchlaeufe || [0]).length;
  for (let seed = 1; seed <= 40; seed++) {
    const d = seed % n, s = E.newState(id, d), m = E.newMission(id, d), rnd = lcg(seed);
    let last = null, prev = null;
    for (let i = 0; !m.done && i < 32; i++) {
      const ctx = E.context(s, last), vor = E.clone(s);
      const a = (rnd() < 0.5 && hilfe(s, ctx)) || kind(s, ctx, rnd);
      E.startAction(s, a); let t = 0; while (!s.ep.done && t++ < 3000) E.tick(s);
      const fb = E.feedback(s), fo = E.folge(s), nach = E.clone(s);
      const x = { id, ctx, a, vor, nach, fb, fo, ep: s.ep, prevVor: prev && prev.vor.situation === vor.situation && prev.vor.poss === 'blue' ? prev.vor : null };
      ALLE.push(x); prev = x;
      E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
      last = { kind: a.kind, success: fb.success, team: 'blue' };
    }
  }
}

test(`Maßnahme 1: Ansage passt zur Lage (${ALLE.length} Entscheidungen, 3 Missionen)`, () => {
  const fehler = []; let hinten = 0, nochmal = 0;
  for (const x of ALLE) {
    const s = x.vor, c = E.carrier(s), T = E.texts(s).kontext;
    if (x.ctx.say === T.angriffHinten.say) {
      hinten++;
      const nah = E.team(s, 'red').filter((r) => E.dist(r, c) < 4.5);
      if (!nah.length || nah.some((r) => r.x >= c.x - 0.3)) fehler.push(`${x.id}: „hinter dir“, aber ein naher Roter steht nicht hinter dem Ball`);
    }
    if (x.ctx.say === T.angriffDruck.say && /vorbei/.test(x.ctx.say)) {
      const nah = E.team(s, 'red').filter((r) => E.dist(r, c) < 4.5);
      if (!nah.some((r) => r.x >= c.x - 0.3)) fehler.push(`${x.id}: „an ihm vorbei“, aber alle nahen Roten stehen hinter dem Ball`);
    }
    if (x.ctx.type === 'abschluss') {
      const nochmalAnsage = x.ctx.say === T.abschlussNochmal.say;
      // unabhängig: freie Tore zu Beginn der vorigen Entscheidung (gleiche Situation, Blau am Ball) vs. jetzt
      const geaendert = !!(x.prevVor && E.carrier(x.prevVor) && E.carrier(x.prevVor).team === 'blue' && frei(x.prevVor).join() !== frei(s).join());
      if (nochmalAnsage !== geaendert) fehler.push(`${x.id}: „Schau nochmal“ = ${nochmalAnsage}, Torlage verändert = ${geaendert}`);
      if (nochmalAnsage) nochmal++;
    }
  }
  assert.deepStrictEqual(fehler.slice(0, 10), []);
  assert.ok(hinten > 0 && nochmal > 0, `beide neuen Ansagen kommen vor (${hinten}/${nochmal})`);
});

test('Keine vorweggenommene Lösung: Ansagen und Folge-Moment nennen vor der Entscheidung kein bestimmtes Tor und keine Wertung', () => {
  for (const id of ['mission-1', 'welches-tor-ist-frei', 'freie-bahn']) {
    const K = E.texts(id).kontext;
    for (const [k, v] of Object.entries(K)) assert.doesNotMatch(v.say + ' ' + v.title, /obere|untere|oben|unten|links|rechts/i, `${id} ${k}`);
  }
  for (const x of ALLE) if (x.fo.bedeutsam) {
    assert.deepStrictEqual(Object.keys(x.fo).sort(), ['bedeutsam', 'gegner', 'gruende', 'tore'], 'Folge-Moment trägt keine Wertung frei/zu');
  }
  assert.strictEqual(E.texts('mission-1').folge.schau, 'Schau!');
});

test('Maßnahme 3: Folge-Moment genau bei bedeutsamer Veränderung (unabhängig nachgerechnet), nie bei Tor', () => {
  const fehler = []; let n = 0;
  for (const x of ALLE) {
    const tor = x.ep.events.some((e) => e.type === 'goal');
    const vor = E.carrier(x.vor), nach = E.carrier(x.nach);
    const toreGeaendert = !tor && vor && vor.team === 'blue' && nach && nach.team === 'blue' && frei(x.vor).join() !== frei(x.nach).join();
    const ueberwunden = !tor && x.fb.ursachen.some((u) => u.typ === 'ueberspielt' || u.typ === 'lueckeDurch');
    const verlust = x.ep.events.find((e) => (e.type === 'steal' || e.type === 'intercepted') && x.nach.players.find((p) => p.id === e.by).team === 'red');
    const verlustBewegt = !tor && vor && vor.team === 'blue' && verlust && (() => { const a = x.vor.players.find((p) => p.id === verlust.by), b = x.nach.players.find((p) => p.id === verlust.by); return Math.hypot(a.x - b.x, a.y - b.y) >= 1; })();
    const soll = !!(toreGeaendert || ueberwunden || verlustBewegt);
    if (x.fo.bedeutsam !== soll) fehler.push(`${x.id} ${x.a.kind}: Folge-Moment ${x.fo.bedeutsam}, erwartet ${soll} (${x.fo.gruende})`);
    if (tor && x.fo.bedeutsam) fehler.push('Folge-Moment trotz Tor');
    if (x.fo.bedeutsam) {
      n++;
      for (const g of x.fo.gegner) { const a = x.vor.players.find((p) => p.id === g.id); if (Math.abs(a.x - g.von.x) > 1e-9 || Math.abs(a.y - g.von.y) > 1e-9) fehler.push('Spur beginnt nicht an der Position vor der Aktion'); }
      for (const g of x.fo.tore) if (frei(x.vor).includes(g) === frei(x.nach).includes(g)) fehler.push('markiertes Tor hat sich nicht verändert');
    }
  }
  assert.deepStrictEqual(fehler.slice(0, 10), []);
  const anteil = n / ALLE.length;
  assert.ok(anteil > 0.03 && anteil < 0.5, `Folge-Moment nicht mechanisch: ${(anteil * 100).toFixed(0)} % der Entscheidungen`);
});

test('Routine ohne Veränderung bekommt keinen Folge-Moment; Kernsituationen bekommen ihn (Hilfe-Wege)', () => {
  const einzel = (mid, sid) => { const m = E.mission(mid), id = 'w-' + mid + sid; if (!globalThis.FIQ_MISSIONS.some((x) => x.id === id)) globalThis.FIQ_MISSIONS.push(Object.assign({}, m, { id, situationen: [m.situationen.find((x) => x.id === sid)], durchlaeufe: [[sid]] })); return E.newState(id, 0); };
  const erst = (mid, sid) => { const s = einzel(mid, sid), a = hilfe(s, E.context(s, null)); E.startAction(s, a); let t = 0; while (!s.ep.done && t++ < 3000) E.tick(s); return E.folge(s); };
  for (const [mid, sid, grund] of [['welches-tor-ist-frei', 'W1', 'toreVeraendert'], ['welches-tor-ist-frei', 'A3', 'toreVeraendert'], ['freie-bahn', 'V1', 'ueberwunden'], ['freie-bahn', 'L4b', 'ueberwunden']]) {
    const f = erst(mid, sid); assert.ok(f.bedeutsam && f.gruende.includes(grund), `${sid}: ${JSON.stringify(f)}`);
  }
  for (const [mid, sid] of [['freie-bahn', 'B3'], ['freie-bahn', 'B5'], ['welches-tor-ist-frei', 'A4']]) assert.strictEqual(erst(mid, sid).bedeutsam, false, sid + ': Routine-Dribbling ohne Veränderung');
  for (const sid of ['A1', 'A2', 'A5']) assert.strictEqual(erst('welches-tor-ist-frei', sid).bedeutsam, false, sid + ': Tor');
});

test('Maßnahme 2: „Nach deinem Dribbling/Pass war das … Tor frei/zu“ stimmt mit der Simulation überein und kommt erst nach der Entscheidung', () => {
  let n = 0;
  for (const x of ALLE) {
    const m = x.fb.say.match(/(?:Nach deinem (?:Dribbling|Pass)|Jetzt) war das (obere|untere) Tor (frei|zu)/);
    if (!m) continue;
    n++;
    assert.strictEqual(x.a.kind, 'shoot', 'nur als Rückmeldung zum Schuss (rückblickend)');
    assert.ok(x.prevVor, 'es gab eine vorige Entscheidung');
    const g = m[1] === 'obere' ? 0 : 1;
    assert.strictEqual(x.a.goal, g);
    assert.strictEqual(frei(x.vor).includes(g), m[2] === 'frei');
    assert.notStrictEqual(frei(x.prevVor).join(), frei(x.vor).join(), 'Torlage hat sich tatsächlich verändert');
  }
  assert.ok(n > 5, `Sätze kommen vor (${n})`);
});

test('Bewertung unverändert: Stern = Bewertung vor der Aktion; Folge-Moment und Ansagen ändern keine Simulation', () => {
  // Angriff: Stern = Vorausbewertung; Abwehr (Weg versperren) wird wie bisher am Ausgang bewertet – dort belegen die
  // Referenzläufe (golden), dass sich nichts ändert.
  const abw = ALLE.filter((x) => !['cover', 'press'].includes(x.a.kind) && x.fb.good !== E.evaluate(x.vor, x.a).good);
  assert.strictEqual(abw.length, 0);
  const s = E.newState('freie-bahn', 0), t = E.clone(s);
  E.context(s, null); E.folge(s); assert.deepStrictEqual(JSON.stringify(s), JSON.stringify(t), 'context()/folge() ändern den Zustand nicht');
});

// PO 20.11.2026: keine unbelegten Aussagen über das Denken oder Wahrnehmen des Kindes – Rückmeldungen beschreiben
// Spielsituation und gewählte Handlung („Nach deinem Dribbling war das obere Tor frei. Gut gewählt!“).
const UNTERSTELLT = /\b(hast|habt)\b[^.!?]*\b(gesehen|erkannt|geschaut|gemerkt|bemerkt|gedacht|verstanden|entdeckt|gefunden|überlegt)\b/i;
test('Rückmeldungen und Lernergebnisse unterstellen kein Sehen, Erkennen oder Denken des Kindes', () => {
  const fehler = new Set();
  for (const x of ALLE) for (const t of [x.fb.say, x.fb.text, x.fb.tip]) if (UNTERSTELLT.test(t)) fehler.add(t);
  for (const id of ['mission-1', 'welches-tor-ist-frei', 'freie-bahn']) {
    const L = E.texts(id).lern, U = E.texts(id).ursache;
    for (const t of [...Object.values(L.geschafft), ...Object.values(L.nochNicht)]) if (UNTERSTELLT.test(t)) fehler.add(t);
    for (const t of [U.toreVeraendert('deinem Dribbling', 'obere'), U.toreVeraendertJetzt('obere'), U.waechterErkannt('Rot 2', 'untere'), U.anderesTorZu('Rot 2')]) if (UNTERSTELLT.test(t)) fehler.add(t);
  }
  assert.deepStrictEqual([...fehler], []);
  // „Gut gewählt!“ nur bei guter Entscheidung (sonst keine unpassende positive Bewertung)
  for (const x of ALLE) if (/Gut gewählt|gewählt!/.test(x.fb.say)) assert.ok(x.fb.good, 'Lob ohne Stern: ' + x.fb.say);
});
