// Konzept V0.6 – Plausibilitätsprüfung der drei Beispielsituationen mit der unveränderten Engine.
// Die Situationen werden als Test-Missionen nur in diesem Skript registriert (keine Änderung an missions/ oder Referenzen).
// Je Situation: erste Entscheidung vermessen (Anteil ⭐, gute Aktionsarten/Richtungen, ⭐ mit überspieltem Gegner)
// und typische Kinder-Wege ganz durchspielen (Bewertung, Ergebnis, Rückmeldung, Lage danach).
//   node tests/analysis/v0.6/beispiele.js
const E = require('../../helpers/load.js');
const { candidates, outcome, hintAction } = require('./entscheidungen.js');
const F = E.F;

const lage = (spieler) => ({ ballbesitz: 'b1', spieler: Object.entries(spieler).map(([id, [x, y]]) => ({ id, x, y })) });
function registriere(id, situationen, extra = {}) {
  const def = Object.assign({
    id, nummer: 90, titel: id, untertitel: 'Konzept V0.6 (nur Analyse)', lernwelt: 1, art: 'lernen', symbol: '🧪',
    lernziele: ['Analyse'], einfuehrung: 'Analyse',
    situationen: situationen.map(([sid, sp, ph]) => Object.assign({ id: sid, start: lage(sp) }, ph ? { phasen: ph } : {})),
    durchlaeufe: [situationen.map(([sid]) => sid)],
    phasen: { maxAngriff: 4, verteidigung: 0, abschlussNachGrenze: true }, schauSchritt: [],
    hilfe: { reihenfolge: ['schiessen', 'dribbeln', 'passen'], alternativenNennen: false }, texte: {},
  }, extra);
  globalThis.FIQ_MISSIONS = (globalThis.FIQ_MISSIONS || []).filter((m) => m.id !== id).concat([def]);
  const err = E.validateMission ? E.validateMission(def) : null;
  if (err && err.length) console.log('  Missionsprüfung:', JSON.stringify(err));
  return def;
}
const fmt = (p) => `(${p.x.toFixed(1)}|${p.y.toFixed(1)})`;
const lageText = (s) => s.players.map((p) => p.id + fmt(p)).join(' ');
const shotInfo = (s) => E.shotOptions(s).map((o) => `Tor ${o.goal ? 'unten' : 'oben'} ${o.margin > 0.15 ? 'frei' : 'zu'}(${o.margin.toFixed(2)})`).join(', ');
const passInfo = (s) => E.passOptions(s).map((o) => `${o.id} ${o.margin > 0.2 ? 'frei' : 'zu'}(${o.margin.toFixed(2)})`).join(', ');

function ersteEntscheidung(id, sit) {
  const s = E.newState(id, 0); const ctx = E.context(s, null);
  const c0 = E.carrier(s), reds0 = E.team(s, 'red').map((r) => ({ id: r.id, x: r.x }));
  const cand = candidates(s, ctx).map((x) => ({ ...x, ev: E.evaluate(s, x.a) }));
  const star = cand.filter((x) => x.ev.good);
  let beat = 0;
  for (const x of star.filter((y) => y.k === 'dribbeln')) {
    const s2 = E.clone(s); E.startAction(s2, x.a); let n = 0; while (!s2.ep.done && n++ < 3000) E.tick(s2);
    const c = E.carrier(s2); if (c && c.team === 'blue' && reds0.some((r) => r.x > c0.x && c.x > E.P(s2, r.id).x + 0.3)) beat++;
  }
  const sectors = [...new Set(star.filter((x) => x.k === 'dribbeln').map((x) => Math.round(x.dir / 30) * 30))].sort((a, b) => a - b);
  console.log(`  Lage: ${lageText(s)} | Kontext ${ctx.type} [${ctx.actions}] „${ctx.say}“`);
  console.log(`  Erste Entscheidung: ⭐ ${star.length}/${cand.length} (${Math.round((100 * star.length) / cand.length)} %), gut: ${[...new Set(star.map((x) => x.k))].join('/')}${sectors.length ? ', Dribbel-Richtungen ' + sectors.join('°,') + '°' : ''}${star.some((x) => x.k === 'dribbeln') ? `, davon Gegner überspielt ${beat}` : ''}`);
  if (ctx.actions.includes('passen')) console.log(`  Passwege: ${passInfo(s)}`);
  if (c0.x >= F.W - F.ZONE - 0.3) console.log(`  Tore: ${shotInfo(s)}`);
}

/** Kinder-Weg: Liste von Wahlfunktionen (E, s, ctx) -> Aktion; danach Hilfe bis Situationsende. */
function weg(id, name, plan) {
  const s = E.newState(id, 0), m = E.newMission(id, 0), lines = [];
  let last = null;
  for (let i = 0; !m.done && i < 8; i++) {
    const ctx = E.context(s, last);
    const a = plan[i] ? plan[i](E, s, ctx) : hintAction(E, s, ctx).a;
    const ev = E.evaluate(s, a);
    E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s);
    const fb = E.feedback(s), c = E.carrier(s);
    lines.push(`    ${i + 1}. ${ctx.type}: ${a.kind}${a.id ? '→' + a.id : ''}${a.x != null ? ' nach ' + fmt(a) : ''}${a.goal != null ? ' Tor ' + (a.goal ? 'unten' : 'oben') : ''} ${ev.good ? '⭐' : '💭'} ${fb.success ? 'klappt' : 'misslingt'} – „${fb.say}“${c && c.team === 'blue' && !fb.goal ? ` | danach: ${lageText(s)}${c.x >= F.W - F.ZONE - 0.3 ? ' | ' + shotInfo(s) : ''}` : ''}`);
    E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
    last = { kind: a.kind, success: fb.success, team: 'blue' };
    if (m.next || s.situation !== id + '-x' && i > 0 && m.done) break;
  }
  console.log(`  Weg „${name}“:\n${lines.join('\n')}`);
}
const drib = (x, y) => () => ({ kind: 'dribble', x, y });
const rel = (dx, dy) => (E2, s) => { const c = E2.carrier(s); return { kind: 'dribble', x: c.x + dx, y: c.y + dy }; };
const shoot = (g) => (E2, s, ctx) => (ctx.actions.includes('schiessen') ? { kind: 'shoot', goal: g } : hintAction(E2, s, ctx).a);
const pass = (id) => () => ({ kind: 'pass', id });

// ---------------------------------------------------------------- 1. „Welches Tor ist frei?“ – Schau nochmal, wenn du ankommst
console.log('\n=== Beispiel 1: „Schau nochmal!“ (Welches Tor ist frei?)');
registriere('bsp-tor', [['W1', { b1: [26, 12.5], b2: [21, 19], r1: [23.5, 9.5], r2: [33.6, 12.4] }]], { hilfe: { reihenfolge: ['dribbeln', 'schiessen', 'passen'], alternativenNennen: false } });
ersteEntscheidung('bsp-tor', 'W1');
weg('bsp-tor', 'Hilfe', []);
weg('bsp-tor', 'nach unten rein, dann unten schießen (vorher freies Tor)', [rel(5, 2.5), shoot(1)]);
weg('bsp-tor', 'nach unten rein, nochmal schauen, oben schießen', [rel(5, 2.5), shoot(0)]);
weg('bsp-tor', 'geradeaus rein, dann oben', [rel(5, 0), shoot(0)]);
weg('bsp-tor', 'Pass zu Blau 2', [pass('b2')]);
weg('bsp-tor', 'direkt draufhalten (außerhalb der Zone gibt es kein Schießen) – Dribbling in Rot 1', [(E2, s) => ({ kind: 'dribble', x: 23.5, y: 9.5 })]);

// ---------------------------------------------------------------- 2. „Freie Bahn!“ – Vorbei, und zwar auf die freie Seite
console.log('\n=== Beispiel 2: „Vorbei – auf die freie Seite!“ (Freie Bahn!)');
registriere('bsp-bahn', [['V1', { b1: [23.5, 12], r1: [27, 12], r2: [34.6, 16.6] }]], { hilfe: { reihenfolge: ['dribbeln', 'schiessen'], alternativenNennen: false } });
ersteEntscheidung('bsp-bahn', 'V1');
weg('bsp-bahn', 'oben vorbei, dann oben schießen', [rel(7, -3.5), shoot(0)]);
weg('bsp-bahn', 'oben vorbei, dann unten schießen', [rel(7, -3.5), shoot(1)]);
weg('bsp-bahn', 'unten vorbei, dann unten schießen', [rel(7, 3.5), shoot(1)]);
weg('bsp-bahn', 'unten vorbei, dann oben schießen', [rel(7, 3.5), shoot(0)]);
weg('bsp-bahn', 'geradeaus in den Gegner', [rel(6, 0)]);
weg('bsp-bahn', 'kleiner Schritt zur Seite', [rel(1, -2)]);
weg('bsp-bahn', 'zurück', [rel(-4, 0)]);

// Lücke: ausreichend vs. zu eng aus derselben Entfernung (Entscheidung nicht umgehbar)
console.log('\n=== Beispiel 2b: Lücke – breit genug oder zu eng? (gleiche Entfernung)');
registriere('bsp-luecke-eng', [['L1', { b1: [15.5, 12], r1: [18.5, 10.6], r2: [18.5, 13.4] }]], { hilfe: { reihenfolge: ['dribbeln', 'schiessen'], alternativenNennen: false } });
ersteEntscheidung('bsp-luecke-eng', 'L1');
weg('bsp-luecke-eng', 'durch die enge Lücke', [rel(8, 0)]);
weg('bsp-luecke-eng', 'außen oben herum', [rel(6, -5)]);
registriere('bsp-luecke-breit', [['L2', { b1: [15.5, 12], r1: [18.5, 8.5], r2: [18.5, 15.5] }]], { hilfe: { reihenfolge: ['dribbeln', 'schiessen'], alternativenNennen: false } });
ersteEntscheidung('bsp-luecke-breit', 'L2');
weg('bsp-luecke-breit', 'durch die breite Lücke', [rel(8, 0)]);

// Hauptvorschlag „Freie Bahn!“: Lücke oder außen? – nah dran (nicht umgehbar), mit Torwächter für einen echten Abschluss
console.log('\n=== Beispiel 2c: „Lücke oder außen?“ mit Torwächter (Hauptvorschlag Freie Bahn)');
for (const [sid, r1, r2] of [['L3-eng', [18.5, 10.6], [18.5, 13.4]], ['L3-breit', [18.5, 8.6], [18.5, 15.4]]]) {
  const id = 'bsp-' + sid;
  registriere(id, [[sid, { b1: [15.5, 12], r1, r2, r3: [34.6, 7.4] }, { maxAngriff: 4 }]], { hilfe: { reihenfolge: ['dribbeln', 'schiessen'], alternativenNennen: false } });
  console.log('  -- ' + sid);
  ersteEntscheidung(id, sid);
  weg(id, 'durch die Lücke', [rel(8, 0)]);
  weg(id, 'außen oben, mit Abstand', [rel(3.5, -6.5)]);
  weg(id, 'außen unten, mit Abstand', [rel(3.5, 6.5)]);
  weg(id, 'außen oben, zu eng am Gegner', [rel(6, -5)]);
  weg(id, 'kurzer Schritt nach vorn (ausweichen der Entscheidung)', [rel(2, 0)]);
}

// ---------------------------------------------------------------- 3. 3 gegen 3 – Locken und abspielen (2 gegen 1 herausspielen)
console.log('\n=== Beispiel 3: „Lock ihn an – dann spiel ab!“ (3 gegen 3)');
registriere('bsp-3g3', [['S1', { b1: [17.5, 12.5], b2: [30, 6], b3: [24, 19.5], r1: [20.5, 10.5], r2: [33, 7.5], r3: [27, 18] }]], {
  art: 'spiel', lernwelt: 2, phasen: { maxAngriff: 5, verteidigung: 0, abschlussNachGrenze: true }, hilfe: { reihenfolge: ['schiessen', 'passen', 'dribbeln'], alternativenNennen: false },
});
ersteEntscheidung('bsp-3g3', 'S1');
weg('bsp-3g3', 'Hilfe', []);
weg('bsp-3g3', 'sofort Pass zu Blau 2', [pass('b2')]);
weg('bsp-3g3', 'sofort Pass zu Blau 3', [pass('b3')]);
weg('bsp-3g3', 'an Rot 1 vorbei, dann Pass zu Blau 2, dann Schuss', [rel(8, 0.5), pass('b2')]);
weg('bsp-3g3', 'an Rot 1 vorbei, dann selbst weiter dribbeln', [rel(8, 0.5), rel(5, -1)]);
weg('bsp-3g3', 'an Rot 1 vorbei, dann Pass zu Blau 3', [rel(8, 0.5), pass('b3')]);
weg('bsp-3g3', 'geradeaus in Rot 1', [(E2, s) => ({ kind: 'dribble', x: 20.5, y: 10.5 })]);
