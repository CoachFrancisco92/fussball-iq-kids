// V0.6a – Prüfung der vorgeschlagenen Lernaufbauten und der Ursachen-Erkennungen mit der unveränderten Engine.
// Nur Analyse: Situationen werden als Test-Missionen im Skript registriert; keine Änderung an missions/ oder Referenzen.
//   node tests/analysis/v0.6/v06a-pruefung.js
const E = require('../../helpers/load.js');
const { candidates, hintAction } = require('./entscheidungen.js');
const F = E.F;

const lage = (sp) => ({ ballbesitz: 'b1', spieler: Object.entries(sp).map(([id, [x, y]]) => ({ id, x, y })) });
function reg(id, sits, extra = {}) {
  const def = Object.assign({ id, nummer: 92, titel: id, untertitel: 'x', lernwelt: 1, art: 'lernen', symbol: 'x', lernziele: ['x'], einfuehrung: 'x',
    situationen: sits.map(([sid, sp, ph]) => Object.assign({ id: sid, start: lage(sp) }, ph ? { phasen: ph } : {})), durchlaeufe: [sits.map(([s]) => s)],
    phasen: { maxAngriff: 5, verteidigung: 0, abschlussNachGrenze: true }, schauSchritt: [], hilfe: { reihenfolge: ['dribbeln', 'schiessen'], alternativenNennen: false }, texte: {} }, extra);
  globalThis.FIQ_MISSIONS = (globalThis.FIQ_MISSIONS || []).filter((m) => m.id !== id).concat([def]);
}
const run = (s, a) => { E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s); return E.feedback(s); };
const ahead = (s, c) => E.team(s, 'red').filter((r) => r.x > c.x + 0.3);

// --- Ursachen-Erkennung (Prototyp, nur Analyse): jede Aussage wird aus Zuständen vor/nach der Aktion belegt
function seg(p, q, a, b) { // schneiden sich die Strecken p-q und a-b?
  const o = (u, v, w) => Math.sign((v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x));
  return o(p, q, a) !== o(p, q, b) && o(a, b, p) !== o(a, b, q);
}
function ursachen(before, after, a, fb) {
  const out = [];
  const c0 = E.carrier(before), c1 = E.carrier(after);
  const kept = c1 && c1.team === 'blue' && c1.id === c0.id;
  if (a.kind === 'dribble') {
    const path = { from: { x: c0.x, y: c0.y }, to: kept ? { x: c1.x, y: c1.y } : { x: a.x, y: a.y } };
    // überspielt: Roter stand im Kegel ±60° vor dem Ball (≤ 7 m), danach hinter dem Ball, Ball behalten
    // streng: Blau ist an der Ausgangsposition des Roten vorbei (x) UND der Rote steht danach hinter dem Ball
    if (kept) for (const r of E.team(before, 'red')) {
      const dx = r.x - c0.x, dy = r.y - c0.y, d = Math.hypot(dx, dy);
      if (dx > 0 && d <= 7 && Math.abs(Math.atan2(dy, dx)) <= Math.PI / 3 && c1.x > r.x + 0.3 && E.P(after, r.id).x < c1.x - 0.3) out.push({ typ: 'ueberspielt', gegner: r.id });
    }
    // Lücke: Weg kreuzt die Verbindung zweier Roter (beide vor dem Ball, ≤ 8 m)
    const rs = E.team(before, 'red').filter((r) => r.x > c0.x && Math.hypot(r.x - c0.x, r.y - c0.y) <= 8);
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      if (seg(path.from, path.to, rs[i], rs[j])) {
        const w = Math.hypot(rs[i].x - rs[j].x, rs[i].y - rs[j].y);
        const lostTo = !kept && c1 && [rs[i].id, rs[j].id].includes(c1.id);
        out.push({ typ: kept ? 'lueckeDurch' : lostTo ? 'lueckeZuEng' : 'luecke', breite: +w.toFixed(1), gegner: [rs[i].id, rs[j].id] });
      }
    }
    // Gegner hinter dir: kein Roter im Kegel ±60° vor dem Ball innerhalb 8 m, aber ein Roter hinter dem Ball innerhalb 5 m
    const vorn = E.team(before, 'red').some((r) => { const dx = r.x - c0.x, dy = r.y - c0.y; return dx > 0 && Math.hypot(dx, dy) <= 8 && Math.abs(Math.atan2(dy, dx)) <= Math.PI / 3; });
    const hinten = E.team(before, 'red').find((r) => r.x <= c0.x && Math.hypot(r.x - c0.x, r.y - c0.y) <= 5);
    if (kept && !vorn && hinten && c1.x > c0.x + 1) out.push({ typ: 'gegnerHinterDir', gegner: hinten.id });
  }
  // Torwächter verschoben: Schuss auf geblockt Tor, das bei der vorigen Entscheidung frei war
  if (a.kind === 'shoot' && before._vorher) {
    const jetzt = E.shotOptions(before).find((o) => o.goal === a.goal), vorher = before._vorher.find((o) => o.goal === a.goal);
    const anderes = E.shotOptions(before).find((o) => o.goal !== a.goal);
    if (vorher && vorher.margin > 0.15 && jetzt.margin <= 0.15) out.push({ typ: 'waechterVerschoben', tor: a.goal, anderesFrei: anderes.margin > 0.15 });
  }
  // Passweg jetzt frei: vorher zu, nach dem eigenen Dribbling frei
  if (a.kind === 'dribble' && kept) {
    const pv = E.passOptions(before), pn = E.passOptions(after);
    for (const o of pn) { const v = pv.find((x) => x.id === o.id); if (v && v.margin <= 0.2 && o.margin > 0.2) out.push({ typ: 'passwegFrei', freund: o.id, vorherGegner: v.hit || null }); }
  }
  return out;
}

function sequenz(id, sits, plaene = {}) {
  const res = [];
  for (let k = 0; k < sits.length; k++) {
    const s = E.newState(id, 0); // Situation k: aus Durchlauf mit nur dieser Situation (siehe registriere je Situation)
    res.push(s);
  }
  return res;
}

function vermesse(id, label) {
  const s = E.newState(id, 0), ctx = E.context(s, null), c0 = E.carrier(s);
  const cand = candidates(s, ctx).map((x) => ({ ...x, ev: E.evaluate(s, x.a) }));
  const star = cand.filter((x) => x.ev.good);
  const klass = { durchLuecke: 0, aussen: 0, ueberspielt: 0, kurzOhne: 0, sonst: 0 };
  for (const x of star) {
    if (x.k !== 'dribbeln') { klass.sonst++; continue; }
    const s2 = E.clone(s); const fb = run(s2, x.a); const u = ursachen(s, s2, x.a, fb);
    if (u.some((y) => y.typ === 'lueckeDurch')) klass.durchLuecke++;
    else if (u.some((y) => y.typ === 'ueberspielt')) klass.aussen++;
    else klass.kurzOhne++;
    if (u.some((y) => y.typ === 'ueberspielt')) klass.ueberspielt++;
  }
  // Hilfe-Weg: Anzahl Entscheidungen, davon ohne Roten vor dem Ball (Kandidat für Anschlussbewegung)
  const h = E.newState(id, 0), m = E.newMission(id, 0); let last = null, n = 0, frei = 0;
  while (!m.done && n < 10) { const cx = E.context(h, last); const c = E.carrier(h); if (n > 0 && cx.type !== 'abschluss' && !ahead(h, c).some((r) => Math.hypot(r.x - c.x, r.y - c.y) < 6)) frei++; const a = hintAction(E, h, cx).a; const fb = run(h, a); E.missionAfter(m, h, cx.type); E.missionApply(m, h); last = { kind: a.kind, success: fb.success, team: 'blue' }; n++; }
  console.log(`  ${label.padEnd(10)} ⭐ ${String(star.length).padStart(2)}/${cand.length} (${Math.round((100 * star.length) / cand.length)} %) | ⭐ durch die Lücke ${klass.durchLuecke}, außen/vorbei ${klass.aussen}, ohne Überspielen ${klass.kurzOhne} | Hilfe-Weg ${n} Entscheidungen, davon ${frei} ohne Roten < 6 m vorn`);
  return { star: star.length, n: cand.length, klass };
}

// Robustheit: jede Spielerposition ±0,5 m (4 Richtungen) – Eigenschaft muss halten
function robust(id, base, sid, eigenschaft, extra) {
  let ok = 0, tot = 0;
  for (const pid of Object.keys(base)) for (const [dx, dy] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
    const sp = JSON.parse(JSON.stringify(base)); sp[pid] = [sp[pid][0] + dx, sp[pid][1] + dy];
    reg(id + '-rob', [[sid, sp]], extra); tot++;
    if (eigenschaft(id + '-rob')) ok++;
  }
  reg(id, [[sid, base]], extra);
  return `${ok}/${tot}`;
}

// ================================================================ 1. „Freie Bahn!“: B3 · V1 · L3-eng · L3-breit
console.log('\n=== Freie Bahn: B3 · V1 · L3-eng · L3-breit (je mit Torwächter)');
const FB = {
  'B3w': { b1: [22.5, 12], r1: [20, 12], r2: [34.6, 16.6] },                       // Gegner hinter dir, näher am Tor (Vorschlag); Wächter unten
  'V1': { b1: [23.5, 12], r1: [27, 12], r2: [34.6, 16.6] },                         // an einem vorbei; Wächter unten
  'L3e': { b1: [15.5, 12], r1: [18.5, 10.6], r2: [18.5, 13.4], r3: [34.6, 7.4] },   // Lücke 2,8 m; Wächter oben
  'L3b': { b1: [15.5, 12], r1: [18.5, 8.6], r2: [18.5, 15.4], r3: [34.6, 7.4] },    // Lücke 6,8 m
  'L3b2': { b1: [15.5, 12], r1: [18.5, 9.2], r2: [18.5, 14.8], r3: [34.6, 7.4] },   // Lücke 5,6 m (Variante)
  'L4e': { b1: [21, 12], r1: [24, 10.8], r2: [24, 13.2], r3: [34.6, 7.4] },         // enge Lücke 2,4 m, näher am Tor (Vorschlag)
  'L4b': { b1: [21, 12], r1: [24, 8.6], r2: [24, 15.4], r3: [34.6, 7.4] },          // breite Lücke näher am Tor
};
const ex = { hilfe: { reihenfolge: ['dribbeln', 'schiessen'], alternativenNennen: false } };
const fbRes = {};
for (const [sid, sp] of Object.entries(FB)) { reg('fb-' + sid, [[sid, sp]], ex); fbRes[sid] = vermesse('fb-' + sid, sid); }
// Fachliche Präzisierung (PO, Punkt 7): bei der breiten Lücke dürfen sichere Außenwege gut sein – folgt die Bewertung der Geometrie?
console.log('  Außenwege in der breiten Lücke (L3b), alle Dribbelziele mit Stern außerhalb der Lücke:');
{
  reg('fb-L3b', [['L3b', FB.L3b]], ex);
  const s = E.newState('fb-L3b', 0), ctx = E.context(s, null);
  const outside = [];
  for (const x of candidates(s, ctx)) { if (x.k !== 'dribbeln') continue; const ev = E.evaluate(s, x.a); const s2 = E.clone(s); const fb = run(s2, x.a); const u = ursachen(s, s2, x.a, fb); if (ev.good && !u.some((y) => y.typ.startsWith('luecke'))) outside.push(`${x.dir}°→(${x.a.x.toFixed(1)}|${x.a.y.toFixed(1)})${u.some((y) => y.typ === 'ueberspielt') ? ' überspielt' : ''}`); }
  console.log('    ' + (outside.join(', ') || 'keine'));
}
// Robustheit der Kerneigenschaften
const engOk = (id) => { const s = E.newState(id, 0), ctx = E.context(s, null); const st = candidates(s, ctx).filter((x) => x.k === 'dribbeln'); let durchGut = 0, aussenGut = 0; for (const x of st) { const ev = E.evaluate(s, x.a); if (!ev.good) continue; const s2 = E.clone(s); const fb = run(s2, x.a); const u = ursachen(s, s2, x.a, fb); if (u.some((y) => y.typ === 'lueckeDurch')) durchGut++; else if (u.some((y) => y.typ === 'ueberspielt')) aussenGut++; } return durchGut === 0 && aussenGut > 0; };
const breitOk = (id) => { const s = E.newState(id, 0), ctx = E.context(s, null); for (const x of candidates(s, ctx).filter((y) => y.k === 'dribbeln')) { const ev = E.evaluate(s, x.a); if (!ev.good) continue; const s2 = E.clone(s); const fb = run(s2, x.a); if (ursachen(s, s2, x.a, fb).some((y) => y.typ === 'lueckeDurch')) return true; } return false; };
const v1Ok = (id) => { const s = E.newState(id, 0), ctx = E.context(s, null); let beat = 0; for (const x of candidates(s, ctx).filter((y) => y.k === 'dribbeln')) { const ev = E.evaluate(s, x.a); if (!ev.good) continue; const s2 = E.clone(s); const fb = run(s2, x.a); if (ursachen(s, s2, x.a, fb).some((y) => y.typ === 'ueberspielt')) beat++; } return beat >= 4; };
console.log(`  Robustheit ±0,5 m: L3e „durch nie ⭐, außen ⭐“ ${robust('fb-L3e', FB.L3e, 'L3e', engOk, ex)} | L3b „durch ⭐“ ${robust('fb-L3b', FB.L3b, 'L3b', breitOk, ex)} | V1 „≥ 4 ⭐ überspielen“ ${robust('fb-V1', FB.V1, 'V1', v1Ok, ex)} | L4e ${robust('fb-L4e', FB.L4e, 'L4e', engOk, ex)} | L4b ${robust('fb-L4b', FB.L4b, 'L4b', breitOk, ex)}`);

// ================================================================ 2. „Welches Tor ist frei?“: A1 · A2 · A3 · W1
console.log('\n=== Welches Tor ist frei?: W1 „Schau nochmal!“ – Robustheit der Kerneigenschaft');
const W1 = { b1: [26, 12.5], b2: [21, 19], r1: [23.5, 9.5], r2: [33.6, 13.0] }; // Rot 2 klar näher am unteren Tor (12,4 lag zu nah an der Mitte)
const exA = { hilfe: { reihenfolge: ['dribbeln', 'schiessen', 'passen'], alternativenNennen: false } };
// Eigenschaft: nach dem Dribbling nach unten in die Zone ist das untere Tor zu (Wächter verschoben), das obere frei;
// und am Anfang war das untere Tor aus der Zielposition gesehen frei (sonst ist es keine Veränderung)
const w1Ok = (id) => {
  const s = E.newState(id, 0), c = E.carrier(s);
  const ziel = { kind: 'dribble', x: c.x + 5, y: c.y + 2.5 };
  // „vorher“: Torlage, wenn Blau 1 schon am Ziel stünde und Rot 2 noch nicht reagiert hätte
  const v = E.clone(s); E.carrier(v).x = ziel.x; E.carrier(v).y = ziel.y; const vorher = E.shotOptions(v);
  const fb = run(s, ziel); if (!fb.success) return false;
  const nach = E.shotOptions(s);
  const u = nach.find((o) => o.goal === 1), o = nach.find((x) => x.goal === 0), uv = vorher.find((x) => x.goal === 1);
  return uv.margin > 0.15 && u.margin <= 0.15 && o.margin > 0.15;
};
reg('a-W1', [['W1', W1]], exA);
console.log(`  „unten war frei → nach dem Dribbling zu, oben frei“: Grundlage ${w1Ok('a-W1') ? 'ja' : 'nein'}, Robustheit ±0,5 m ${robust('a-W1', W1, 'W1', w1Ok, exA)}`);
vermesse('a-W1', 'W1');

// ================================================================ 3. Ursachen auf allen Wegen: belegbare Aussagen (Beispiele)
console.log('\n=== Ursachen-Erkennung: Beispiele aus echten Wegen');
const beispiele = [
  ['fb-V1', 'V1 oben vorbei', (E2, s) => { const c = E2.carrier(s); return { kind: 'dribble', x: c.x + 7, y: c.y - 3.5 }; }],
  ['fb-V1', 'V1 in den Gegner', (E2, s) => ({ kind: 'dribble', x: 30, y: 12 })],
  ['fb-L3e', 'L3e durch die Lücke', (E2, s) => { const c = E2.carrier(s); return { kind: 'dribble', x: c.x + 8, y: c.y }; }],
  ['fb-L3e', 'L3e außen oben', (E2, s) => { const c = E2.carrier(s); return { kind: 'dribble', x: c.x + 3.5, y: c.y - 6.5 }; }],
  ['fb-L3b', 'L3b durch die Lücke', (E2, s) => { const c = E2.carrier(s); return { kind: 'dribble', x: c.x + 8, y: c.y }; }],
  ['fb-B3w', 'B3 nach vorn', (E2, s) => { const c = E2.carrier(s); return { kind: 'dribble', x: c.x + 8, y: c.y }; }],
];
for (const [id, name, f] of beispiele) {
  const s = E.newState(id, 0); const a = f(E, s); const b = E.clone(s); const fb = run(s, a);
  console.log(`  ${name.padEnd(22)} ${fb.success ? 'klappt' : 'misslingt'} – Ursachen: ${JSON.stringify(ursachen(b, s, a, fb))}`);
}
{ // W1: Schuss unten nach Dribbling unten -> Wächter verschoben; vorher = Torlage bei der vorigen Entscheidung aus Zielsicht
  const s = E.newState('a-W1', 0), c = E.carrier(s); const a1 = { kind: 'dribble', x: c.x + 5, y: c.y + 2.5 };
  const v = E.clone(s); E.carrier(v).x = a1.x; E.carrier(v).y = a1.y; const vorher = E.shotOptions(v);
  run(s, a1); const b = E.clone(s); b._vorher = vorher; const a2 = { kind: 'shoot', goal: 1 }; const fb = run(s, a2);
  console.log(`  ${'W1 unten rein, unten'.padEnd(22)} ${fb.success ? 'klappt' : 'misslingt'} – Ursachen: ${JSON.stringify(ursachen(b, s, a2, fb))}`);
}
{ // 3 gegen 3 S1: nach dem Dribbling ist der Passweg zu Blau 2 frei
  reg('s1', [['S1', { b1: [17.5, 12.5], b2: [30, 6], b3: [24, 19.5], r1: [20.5, 10.5], r2: [33, 7.5], r3: [27, 18] }]], { art: 'spiel', lernwelt: 2, hilfe: { reihenfolge: ['schiessen', 'passen', 'dribbeln'], alternativenNennen: false } });
  const s = E.newState('s1', 0); const a = { kind: 'dribble', x: 25.5, y: 13 }; const b = E.clone(s); const fb = run(s, a);
  console.log(`  ${'S1 an Rot 1 vorbei'.padEnd(22)} ${fb.success ? 'klappt' : 'misslingt'} – Ursachen: ${JSON.stringify(ursachen(b, s, a, fb))}`);
}

// ================================================================ 4. Erster Durchlauf alt gegen neu (alle Entscheidungen, Hilfe-Weg)
const { analyse } = require('./entscheidungen.js');
const A = E.mission('welches-tor-ist-frei').situationen.reduce((o, x) => Object.assign(o, { [x.id]: Object.fromEntries(x.start.spieler.map((p) => [p.id, [p.x, p.y]])) }), {});
function durchlauf(id, sits, extra) { reg(id, sits, extra); return analyse(id, 0); }
const zus = (xs) => ({ n: xs.length, routine: xs.filter((e) => e.art === 'Routine').length, echt: xs.filter((e) => e.art === 'echte Entscheidung').length, muster: xs.filter((e) => e.art === 'Musterlösung').length });
const vorherFB = analyse('freie-bahn', 0), vorherA = analyse('welches-tor-ist-frei', 0);
const neuFB = durchlauf('fb-neu', [['B3w', FB.B3w], ['V1', FB.V1], ['L4e', FB.L4e], ['L4b', FB.L4b]], ex);
const neuA = durchlauf('a-neu', [['A1', A.A1], ['A2', A.A2], ['A3', A.A3], ['W1', W1]], exA);
console.log('\n=== Erster Durchlauf alt → neu (Hilfe-Weg, jede Entscheidung vermessen)');
console.log(`  Freie Bahn:   alt ${JSON.stringify(zus(vorherFB))}  →  neu ${JSON.stringify(zus(neuFB))}`);
console.log(`  Welches Tor:  alt ${JSON.stringify(zus(vorherA))}  →  neu ${JSON.stringify(zus(neuA))}`);
for (const e of neuFB.concat(neuA)) console.log(`    ${String(e.sit).padEnd(4)} #${e.step} ${e.type.padEnd(10)} ⭐ ${String(e.share).padStart(3)} % ${e.art.padEnd(18)} gute Arten ${e.goodKinds.join('/')} ${e.dribSectors.length ? 'Richtungen ' + e.dribSectors.join(',') : ''}`);

// ================================================================ 5. Widerspruchsfreiheit der Ursachen über alle Antworten
console.log('\n=== Ursachen: Widerspruchsprüfung über alle Antworten der neuen ersten Durchläufe');
{
  const zaehl = {}; let widerspruch = 0, gepruft = 0;
  for (const [id, sids] of [['fb-neu', ['B3w', 'V1', 'L4e', 'L4b']], ['a-neu', ['A1', 'A2', 'A3', 'W1']]]) {
    for (const sid of sids) {
      reg('w-' + sid, [[sid, (FB[sid] || A[sid] || W1)]], id === 'fb-neu' ? ex : exA);
      const s = E.newState('w-' + sid, 0), ctx = E.context(s, null);
      for (const x of candidates(s, ctx)) {
        const b = E.clone(s), s2 = E.clone(s); const fb = run(s2, x.a); const u = ursachen(b, s2, x.a, fb); gepruft++;
        for (const y of u) {
          zaehl[y.typ] = (zaehl[y.typ] || 0) + 1;
          // Gegenproben: Aussage darf dem Ergebnis nicht widersprechen
          if ((y.typ === 'ueberspielt' || y.typ === 'lueckeDurch' || y.typ === 'gegnerHinterDir' || y.typ === 'passwegFrei') && !fb.success) widerspruch++;
          if (y.typ === 'lueckeZuEng' && fb.success) widerspruch++;
        }
      }
    }
  }
  console.log(`  ${gepruft} Antworten geprüft, Ursachen gefunden: ${JSON.stringify(zaehl)}, Widersprüche zum Ergebnis: ${widerspruch}`);
}

// ================================================================ 6. Bewährungsszene (Pilot) für „Welches Tor ist frei?“: 3 gegen 3, unangekündigt
console.log('\n=== Bewährungsszene „Gewusel vor dem Tor“ (3 gegen 3, Pilot für Welches Tor ist frei?)');
const BW = { b1: [31, 13], b2: [27.5, 6], b3: [26.5, 19.5], r1: [29, 14.5], r2: [34.4, 16.8], r3: [30.5, 7.2] };
const exB = { art: 'lernen', hilfe: { reihenfolge: ['schiessen', 'passen', 'dribbeln'], alternativenNennen: false } };
reg('bw', [['BW', BW]], exB);
{
  const s = E.newState('bw', 0), ctx = E.context(s, null);
  const cand = candidates(s, ctx).map((x) => ({ ...x, ev: E.evaluate(s, x.a) }));
  console.log(`  Kontext ${ctx.type} [${ctx.actions}] | Tore: ${E.shotOptions(s).map((o) => (o.goal ? 'unten ' : 'oben ') + o.margin.toFixed(2)).join(', ')} | Passwege: ${E.passOptions(s).map((o) => o.id + ' ' + o.margin.toFixed(2)).join(', ')} | ⭐ ${cand.filter((x) => x.ev.good).length}/${cand.length}: ${cand.filter((x) => x.ev.good).map((x) => x.dir).join(', ')}`);
  for (const [name, a] of [['oben schießen', { kind: 'shoot', goal: 0 }], ['unten schießen', { kind: 'shoot', goal: 1 }], ['Pass zu Blau 2', { kind: 'pass', id: 'b2' }], ['Pass zu Blau 3', { kind: 'pass', id: 'b3' }]]) { const s2 = E.clone(s); const ev = E.evaluate(s2, a); const fb = run(s2, a); console.log(`    ${name.padEnd(16)} ${ev.good ? '⭐' : '💭'} ${fb.success ? 'klappt' : 'misslingt'} – „${fb.say}“`); }
  const bwOk = (id) => { const t = E.newState(id, 0); const o = E.shotOptions(t); return o.find((x) => x.goal === 0).margin > 0.15 && o.find((x) => x.goal === 1).margin <= 0.15 && E.evaluate(t, { kind: 'shoot', goal: 0 }).good; };
  console.log(`  Robustheit „oben frei und ⭐, unten zu“ ±0,5 m: ${robust('bw', BW, 'BW', bwOk, exB)}`);
}
module.exports = { ursachen };
