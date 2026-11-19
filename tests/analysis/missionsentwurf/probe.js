// Schnelle Lageprüfung (kein Test): node probe.js '<JSON-Spielerliste>' [ballbesitz]
// Gibt Kontext, Schuss-/Pass-Reserven, Hilfe und die Bewertung beider Schüsse aus.
const H = require('./harness.js');
const { E, r2 } = H;
const sp = JSON.parse(process.argv[2]);
const bb = process.argv[3] || 'b1';
const id = 'probe';
const def = { id, start: { ballbesitz: bb, spieler: sp }, neustart: { red: { ballbesitz: sp.find((p) => p.id[0] === 'r').id, spieler: sp }, blue: { ballbesitz: bb, spieler: sp } }, phasen: { maxAngriff: 3, verteidigung: 0 } };
console.log('validate', H.register(def).errors);
const s = E.newState(id); const ctx = E.context(s, null);
console.log('ctx', ctx.type, ctx.actions);
const sit = E.situation(s);
console.log('shots', sit.shots.map((o) => r2(o.margin) + (o.hit ? ' hit ' + o.hit.id : '')), 'passes', sit.passes.map((o) => o.id + ' ' + r2(o.margin)), 'dBest', r2(sit.dBest), 'space', !!sit.space, 'ok', JSON.stringify(sit.ok));
const k = E.recommend(s, ctx.actions); const h = E.hint(s, k); console.log('hilfe', k, JSON.stringify(h));
for (const a of [{ kind: 'shoot', goal: 0 }, { kind: 'shoot', goal: 1 }]) { if (!ctx.actions.includes('schiessen')) break; const r = H.play(id, (s2, c, i) => (i === 0 ? a : H.hintAction(s2, c)), { verbose: true }); console.log(JSON.stringify(a)); console.log(H.fmtSteps(r)); }
