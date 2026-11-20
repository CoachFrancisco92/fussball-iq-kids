// V0.6a P2: Rückmeldungen mit Ursachen. Jede genannte Ursache wird unabhängig an der Simulation nachgeprüft
// (Lage vorher, Ereignisse, Lage nachher); Sätze passen zur Bewertung; kein „Manchmal klappt es nicht“.
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');

const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run', erobern: 'press', raum: 'cover' };
function hintAction(s, ctx) {
  const k = E.recommend(s, ctx.actions), h = E.hint(s, k), a = { kind: MAP[k] };
  if (h.ids) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal;
  if ((a.kind === 'press' || a.kind === 'cover') && !a.id) a.id = E.team(s, 'blue')[0].id;
  return a.kind === 'run' && !a.id ? null : a; // Hilfe ohne Laufweg („überall eng“) → Kinder-Entscheidung
}
function childAction(s, ctx, rnd) { // wie tests/golden/trace.js (mit Verteidigung)
  const F = E.F, c = E.carrier(s), blues = E.team(s, 'blue'), pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) });
  const k = pick(ctx.actions), mit = blues.filter((b) => b !== c);
  if (k === 'passen') return rnd() < 0.6 && mit.length ? { kind: 'pass', id: pick(mit).id } : Object.assign({ kind: 'pass' }, spot());
  if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot());
  if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
  if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(mit).id }, spot());
  if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
  return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
}

const lcg = (seed) => { let x = (seed * 2654435761) >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; };
const MISSIONEN = ['mission-1', 'welches-tor-ist-frei', 'freie-bahn'];

/** Spielt eine Mission mit gemischten Kinder-Entscheidungen; liefert je Entscheidung Lage vorher/nachher und Rückmeldung. */
function sammle(missionId, seed) {
  const n = E.mission(missionId).durchlaeufe ? E.mission(missionId).durchlaeufe.length : 1;
  const d = seed % n, s = E.newState(missionId, d), m = E.newMission(missionId, d), rnd = lcg(seed), out = [];
  let last = null;
  for (let i = 0; !m.done && i < 32; i++) {
    const ctx = E.context(s, last);
    const a = (rnd() < 0.35 && hintAction(s, ctx)) || childAction(s, ctx, rnd);
    const vor = E.clone(s);
    E.startAction(s, a); let t = 0; while (!s.ep.done && t++ < 3000) E.tick(s);
    const fb = E.feedback(s);
    const prev = out.length ? out[out.length - 1] : null;
    out.push({ missionId, ctx: ctx.type, a, vor, nach: E.clone(s), ep: s.ep, fb, prevVor: prev && prev.vor.situation === vor.situation ? prev.vor : null });
    E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
    last = { kind: a.kind, success: fb.success, team: 'blue' };
  }
  return out;
}
const SAMMLUNG = [];
for (const id of MISSIONEN) for (let seed = 1; seed <= 60; seed++) SAMMLUNG.push(...sammle(id, seed));

const pos = (st, id) => st.players.find((p) => p.id === id);
const ev = (x, t) => x.ep.events.filter((e) => e.type === t);
const frei = (st) => { const c = st.players.find((p) => p.id === st.ball.owner); return c && c.team === 'blue' ? E.shotOptions(st).filter((o) => o.margin > E.CFG.shotLaneOk).map((o) => o.goal) : []; };
const ballBei = (st) => st.players.find((p) => p.id === st.ball.owner) || null;

/** Unabhängige Prüfung je Ursachentyp – true oder Begründung des Widerspruchs */
const PRUEF = {
  // V0.6.2: Gegner stand vor dem Ball, steht danach hinter dem Ball; Blau hat Raum nach vorn gewonnen (auch wenn der Rote entgegenkam)
  ueberspielt: (x, u) => { const c0 = pos(x.vor, x.ep.vorher.carrier), r0 = pos(x.vor, u.gegner), c1 = ballBei(x.nach), r1 = pos(x.nach, u.gegner);
    return (r0.x > c0.x && c1 && c1.id === c0.id && c1.x > c0.x + 1 && r1.x < c1.x && !ev(x, 'steal').length) || 'Gegner stand nicht vor dem Ball oder ist nicht hinter dem Ball'; },
  // V0.6.2: freie Tore unabhängig nachgerechnet – zu Beginn der vorigen Entscheidung (gleiche Situation) und jetzt
  toreVeraendert: (x, u) => { if (!x.prevVor) return 'keine vorige Entscheidung'; const vor = frei(x.prevVor), jetzt = frei(x.vor);
    return (vor.join() !== jetzt.join() && jetzt.includes(u.tor) && x.a.goal === u.tor) || `Torlage vorher ${vor} / jetzt ${jetzt}`; },
  torJetztZu: (x, u) => { if (!x.prevVor) return 'keine vorige Entscheidung'; const vor = frei(x.prevVor), jetzt = frei(x.vor);
    return (vor.includes(u.tor) && !jetzt.includes(u.tor) && x.a.goal === u.tor && !ev(x, 'goal').length) || `Torlage vorher ${vor} / jetzt ${jetzt}`; },
  lueckeDurch: (x, u) => { const c1 = ballBei(x.nach), c0 = pos(x.vor, x.ep.vorher.carrier);
    const [A, B] = u.paar.map((id) => pos(x.vor, id));
    return (c1 && c1.id === c0.id && A.x > c0.x && B.x > c0.x && Math.abs(Math.hypot(A.x - B.x, A.y - B.y) - u.breite) < 0.06) || 'kein Ballbehalt oder Paar nicht vor dem Ball'; },
  lueckeZuEng: (x, u) => (ev(x, 'steal').some((e) => u.paar.includes(e.by)) || 'Ballverlust nicht durch das Paar'),
  gegnerHinterDir: (x, u) => { const c0 = pos(x.vor, x.ep.vorher.carrier), r = pos(x.vor, u.gegner), c1 = ballBei(x.nach);
    return (r.x <= c0.x && c1 && c1.id === c0.id && c1.x > c0.x + 1) || 'Gegner war nicht hinter dem Ball oder kein Raumgewinn'; },
  passwegFrei: (x, u) => { const vp = x.ep.vorher.passes.find((p) => p.id === u.freund), jetzt = E.passOptions(x.nach).find((p) => p.id === u.freund);
    return (vp.margin <= E.CFG.passLaneOk && jetzt.margin > E.CFG.passLaneOk) || 'Passweg war vorher nicht zu oder ist jetzt nicht frei'; },
  waechterVerschoben: (x, u) => { const alt = x.ep.vorher.prev[u.gegner], jetzt = pos(x.vor, u.gegner);
    const blocker = x.ep.vorher.shots.find((o) => o.goal === u.tor);
    return (blocker.hit === u.gegner && Math.hypot(alt[0] - jetzt.x, alt[1] - jetzt.y) >= 1 && x.a.goal === u.tor && !ev(x, 'goal').length) || 'Wächter nicht verschoben oder Tor gefallen'; },
  waechterErkannt: (x, u) => { const alt = x.ep.vorher.prev[u.gegner], jetzt = pos(x.vor, u.gegner), mein = x.ep.vorher.shots.find((o) => o.goal === u.tor);
    return (Math.hypot(alt[0] - jetzt.x, alt[1] - jetzt.y) >= 1 && mein.margin > E.CFG.shotLaneOk && x.a.goal === u.tor) || 'Wächter nicht verschoben oder gewähltes Tor nicht frei'; },
  anderesTorZu: (x, u) => { const o = x.ep.vorher.shots.find((s) => s.goal !== x.a.goal), m = x.ep.vorher.shots.find((s) => s.goal === x.a.goal);
    return (o.hit === u.gegner && o.margin <= E.CFG.shotLaneOk && m.margin > E.CFG.shotLaneOk) || 'anderes Tor nicht durch diesen Gegner zu'; },
  freundDribbelt: (x, u) => ((ev(x, 'autoDribble').length && ballBei(x.nach) && ballBei(x.nach).id === u.freund) || 'Freund hat nicht gedribbelt'),
  gegnerMitgelaufen: (x, u) => { const a = pos(x.vor, u.gegner), b = pos(x.nach, u.gegner); return Math.hypot(a.x - b.x, a.y - b.y) >= 1 || 'Gegner hat sich nicht bewegt'; },
  gegnerSchoss: (x) => (ev(x, 'redShot').length > 0 || 'kein Schuss der Roten'),
};

test(`Jede genannte Ursache ist durch die Simulation belegt (${MISSIONEN.length} Missionen × 60 gemischte Abfolgen)`, () => {
  const fehler = [], typen = {};
  for (const x of SAMMLUNG) for (const u of x.fb.ursachen) {
    typen[u.typ] = (typen[u.typ] || 0) + 1;
    const p = PRUEF[u.typ]; if (!p) { fehler.push('unbekannte Ursache ' + u.typ); continue; }
    const r = p(x, u); if (r !== true) fehler.push(`${x.missionId} ${u.typ} ${JSON.stringify(u)}: ${r}`);
  }
  assert.deepStrictEqual(fehler.slice(0, 10), []);
  if (process.env.ZAEHLEN) console.log('Ursachen geprüft:', JSON.stringify(typen), 'Entscheidungen:', SAMMLUNG.length);
  for (const t of ['ueberspielt', 'lueckeDurch', 'gegnerHinterDir', 'waechterErkannt', 'anderesTorZu']) assert.ok(typen[t] > 0, `Ursache ${t} kommt in den Abfolgen vor`);
});

test('Lob nur bei Stern, Kritik nur ohne Stern; Entscheidung, Ausführung und Ergebnis getrennt; kein „Manchmal klappt es nicht“', () => {
  const TU = E.texts(E.newState('mission-1', 0)).ursache, T = E.texts(E.newState('mission-1', 0)).rueckmeldung || {};
  const fehler = [];
  for (const x of SAMMLUNG) {
    const say = x.fb.say;
    if (/Manchmal klappt es nicht/.test(say)) fehler.push('Manchmal: ' + say);
    if (/\bSuper\b/.test(say) && !x.fb.good) fehler.push('Lob ohne Stern: ' + say);
    if ((/ war zu eng\.|ist vor das (obere|untere) Tor gelaufen\.(?! Du hast das freie Tor gewählt)/.test(say)) && x.fb.good) fehler.push('Kritik trotz Stern: ' + say);
    if (/vorbei!|breit genug|hast das freie|Gut gewählt|gewählt!/.test(say) && !x.fb.good) fehler.push('Lobende Ursache ohne Stern: ' + say);
    if (/war das (obere|untere) Tor zu\./.test(say) && x.fb.good) fehler.push('Kritik trotz Stern: ' + say);
    if (x.fb.good && !x.fb.success && !/trotzdem eine gute Idee/.test(say)) fehler.push('gute Entscheidung ohne Erfolg nicht als solche benannt: ' + say);
  }
  assert.deepStrictEqual(fehler.slice(0, 10), []);
  assert.ok(TU && T);
});

// Mission 1 enthält unverändert längere Sätze aus V0.5 (Bericht: Risiko); geprüft werden die Lernmissionen.
test('Lernmissionen: Sätze bleiben kurz und kindgerecht (Richtwert: höchstens 4 Sätze, keine Fachbegriffe)', () => {
  const zuLang = [], fach = [];
  for (const x of SAMMLUNG) {
    if (/Manchmal|Meter|Kegel/.test(x.fb.say)) fach.push(x.fb.say);
    if (x.missionId === 'mission-1') continue;
    const n = x.fb.say.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    if (n > 4) zuLang.push(x.fb.say);
    if (/Passwinkel|Abstand von|Meter|Kegel|Wahrscheinlich/i.test(x.fb.say)) fach.push(x.fb.say);
  }
  assert.deepStrictEqual([...new Set(zuLang)].slice(0, 5), []);
  assert.deepStrictEqual(fach, []);
});

test('Ursachen ändern nichts an der Bewertung: Stern = Bewertung vor der Aktion, Probe-Rechnungen ohne Schnappschuss', () => {
  for (const x of SAMMLUNG) assert.strictEqual(x.fb.good, E.evaluate(x.vor, x.a).good);
  const s = E.newState('freie-bahn', 0); E.evaluate(s, { kind: 'dribble', x: 30, y: 12 });
  assert.ok(!(s.ep && s.ep.vorher), 'evaluate legt keinen Schnappschuss an');
});
