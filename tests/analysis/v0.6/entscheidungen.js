// Konzept V0.6 – Bestandsaufnahme: Wie viel echte Entscheidung steckt in jeder Entscheidung der drei Missionen?
// Spielt jede Mission in jedem Durchlauf mit der Hilfe durch. An jeder Entscheidung werden viele mögliche Antworten
// eines Kindes (alle Aktionen × Ziele/Richtungen) bewertet UND ausgespielt (Klon der Lage, Engine unverändert).
//   node tests/analysis/v0.6/entscheidungen.js [--json datei]
// Nur Analyse – ändert nichts an Engine, Missionen oder Referenzen.
const E = require('../../helpers/load.js');
// Hilfe wie in der App (inkl. Verteidigung: erobern -> press, raum -> cover)
const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run', erobern: 'press', raum: 'cover' };
function hintAction(E, s, ctx) {
  const k = E.recommend(s, ctx.actions), h = E.hint(s, k), a = { kind: MAP[k] };
  if (h.ids) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal;
  return { a, hint: { k, say: h.say, goal: h.goal, ids: h.ids } };
}
const F = E.F;

const inField = (p) => ({ x: Math.max(0.3, Math.min(F.W - 0.3, p.x)), y: Math.max(0.3, Math.min(F.H - 0.3, p.y)) });
const polar = (o, deg, d) => inField({ x: o.x + Math.cos((deg * Math.PI) / 180) * d, y: o.y + Math.sin((deg * Math.PI) / 180) * d });

function candidates(s, ctx) {
  const c = E.carrier(s), out = [];
  const blues = E.team(s, 'blue');
  for (const k of ctx.actions) {
    if (k === 'schiessen') [0, 1].forEach((g) => out.push({ k, a: { kind: 'shoot', goal: g }, dir: 'Tor ' + (g ? 'unten' : 'oben') }));
    if (k === 'passen') {
      blues.filter((b) => b !== c).forEach((b) => out.push({ k, a: { kind: 'pass', id: b.id }, dir: 'zu ' + b.id }));
      for (let deg = -90; deg <= 90; deg += 30) for (const d of [4, 7, 10]) out.push({ k, a: Object.assign({ kind: 'pass' }, polar(c, deg, d)), dir: 'Raum ' + deg });
    }
    if (k === 'dribbeln') for (let deg = -150; deg <= 150; deg += 15) for (const d of [3, 5, 8]) out.push({ k, a: Object.assign({ kind: 'dribble' }, polar(c, deg, d)), dir: deg });
    if (k === 'freilaufen') {
      blues.filter((b) => b !== c).forEach((b) => { for (let deg = 0; deg < 360; deg += 30) for (const d of [3, 6]) out.push({ k, a: Object.assign({ kind: 'run', id: b.id }, polar(b, deg, d)), dir: b.id + ' ' + deg }); });
    }
    if (k === 'erobern') blues.forEach((b) => out.push({ k, a: { kind: 'press', id: b.id }, dir: b.id }));
    if (k === 'raum') {
      const goals = F.goals.blue;
      blues.forEach((b) => goals.forEach((g) => [0.3, 0.5, 0.7].forEach((f) => out.push({ k, a: { kind: 'cover', id: b.id, x: c.x + (g.x - c.x) * f, y: c.y + (g.y - c.y) * f }, dir: b.id + ' ' + (g.y < 12 ? 'oben' : 'unten') + f }))));
    }
  }
  return out;
}

function outcome(s, a) {
  const s2 = E.clone(s);
  E.startAction(s2, a);
  let n = 0; while (!s2.ep.done && n++ < 3000) E.tick(s2);
  const fb = E.feedback(s2);
  return { success: !!fb.success, goal: !!fb.goal, say: fb.say };
}

function analyse(id, durchlauf) {
  const s = E.newState(id, durchlauf), m = E.newMission(id, durchlauf), out = [];
  let last = null, prevSit = null, step = 0;
  for (let i = 0; !m.done && i < 20; i++) {
    const ctx = E.context(s, last);
    if (s.situation !== prevSit) { step = 0; prevSit = s.situation; } else step++;
    const cand = candidates(s, ctx).map((x) => { const ev = E.evaluate(s, x.a); const o = outcome(s, x.a); return { ...x, good: ev.good, rec: ev.rec.good, exe: ev.exe.good, ...o }; });
    const n = cand.length, star = cand.filter((x) => x.good).length;
    const byK = {}; for (const x of cand) { const b = (byK[x.k] = byK[x.k] || { n: 0, star: 0, recOk: 0 }); b.n++; if (x.good) b.star++; if (x.rec) b.recOk++; }
    // Richtungen mit Stern (Dribbeln: 30°-Sektoren), gute Aktionsarten
    const goodKinds = [...new Set(cand.filter((x) => x.good).map((x) => x.k))];
    const dribSectors = [...new Set(cand.filter((x) => x.good && x.k === 'dribbeln').map((x) => Math.round(x.dir / 30) * 30))].sort((a, b) => a - b);
    const matrix = { gutKlappt: 0, gutMisslingt: 0, schwachKlappt: 0, schwachMisslingt: 0, torOhneStern: 0, sternOhneErfolg: 0 };
    for (const x of cand) {
      if (x.good && x.success) matrix.gutKlappt++; else if (x.good) matrix.gutMisslingt++; else if (x.success) matrix.schwachKlappt++; else matrix.schwachMisslingt++;
      if (x.goal && !x.good) matrix.torOhneStern++;
    }
    const share = star / n;
    // Einordnung (bewusst grob, Schwellen im Konzept begründet)
    let art;
    if (ctx.actions.length === 1 && share >= 0.45) art = 'Routine';
    else if (share >= 0.6) art = 'Routine';
    else if (share < 0.08) art = 'Musterlösung';
    else art = 'echte Entscheidung';
    const h = hintAction(E, s, ctx), ho = outcome(s, h.a);
    out.push({ sit: s.situation, step, type: ctx.type, actions: ctx.actions, n, star, share: Math.round(share * 100), byK, goodKinds, dribSectors, matrix, art, hint: { k: h.hint.k, say: ho.say } });
    // mit der Hilfe weiterspielen
    E.startAction(s, h.a);
    let t = 0; while (!s.ep.done && t++ < 3000) E.tick(s);
    const fb = E.feedback(s);
    E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
    last = { kind: h.a.kind, success: fb.success, team: 'blue' };
  }
  return out;
}

if (require.main === module) {
  const t0 = Date.now(), result = {};
  const ids = ['welches-tor-ist-frei', 'freie-bahn', 'mission-1'];
  for (const id of ids) {
    const def = E.mission(id), runs = def.durchlaeufe ? def.durchlaeufe.length : 1;
    result[id] = [];
    for (let d = 0; d < runs; d++) result[id].push({ durchlauf: d + 1, folge: def.durchlaeufe ? def.durchlaeufe[d] : null, entscheidungen: analyse(id, d) });
  }
  // Zusammenfassung
  for (const id of ids) {
    console.log(`\n=== ${id}`);
    for (const r of result[id]) {
      console.log(`Durchlauf ${r.durchlauf}${r.folge ? ' (' + r.folge.join(' · ') + ')' : ''}: ${r.entscheidungen.length} Entscheidungen`);
      for (const e of r.entscheidungen) console.log(`  ${String(e.sit || '-').padEnd(4)} #${e.step} ${e.type.padEnd(12)} [${e.actions.join(',')}] ⭐ ${String(e.share).padStart(3)}% von ${e.n} → ${e.art.padEnd(18)} gut: ${e.goodKinds.join('/') || '–'}${e.dribSectors.length ? ' Richtungen ' + e.dribSectors.join(',') : ''} | gut&klappt ${e.matrix.gutKlappt} gut&misslingt ${e.matrix.gutMisslingt} schwach&klappt ${e.matrix.schwachKlappt} Tor ohne ⭐ ${e.matrix.torOhneStern} | Hilfe ${e.hint.k}: „${e.hint.say}“`);
    }
  }
  const all = ids.flatMap((id) => result[id].flatMap((r) => r.entscheidungen.map((e) => ({ id, ...e }))));
  const sum = {};
  for (const id of ids) { const xs = all.filter((e) => e.id === id); sum[id] = { entscheidungen: xs.length, routine: xs.filter((e) => e.art === 'Routine').length, echt: xs.filter((e) => e.art === 'echte Entscheidung').length, muster: xs.filter((e) => e.art === 'Musterlösung').length, rueckmeldungenVerschieden: new Set(xs.map((e) => e.hint.say)).size }; }
  console.log('\nZusammenfassung', JSON.stringify(sum, null, 1), `\nRechenzeit ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const j = process.argv.indexOf('--json'); if (j > 0) require('node:fs').writeFileSync(process.argv[j + 1], JSON.stringify(result, null, 1));
}
module.exports = { analyse, candidates, outcome, hintAction };
