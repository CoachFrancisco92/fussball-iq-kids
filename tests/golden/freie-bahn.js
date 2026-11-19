// Aufzeichnung für Mission „Freie Bahn!“ (Meilenstein 4): alle 5 Durchläufe mit Hilfe, feste Spielweisen (gute und
// schlechte Dribbelentscheidungen), 200 erzeugte Kinder-Abfolgen. Grundlage der Referenz tests/golden/<referenz.freieBahn.file>.
//   node tests/golden/freie-bahn.js --write tests/golden/freie-bahn.vX.Y.Z.json       (nur nach Freigabe bzw. Erstaufnahme)
//   node tests/golden/freie-bahn.js --abweichungen tests/golden/freieBahn-abweichungen-<paket>.json
const { hash, lcg } = require('./trace.js');
const { play, hintAction, childAction } = require('./mission-a.js');
const ID = 'freie-bahn';
// Feste Spielweisen eines Kindes; im Abschluss (nur „Schießen“) schießt jede Spielweise wie angegeben bzw. mit der Hilfe
const toward = (E, s, dx, dy) => { const c = E.carrier(s); return { kind: 'dribble', x: c.x + dx, y: c.y + dy }; };
const dribbleOr = (f) => (E, s, ctx) => (ctx.actions.includes('dribbeln') ? f(E, s, ctx) : hintAction(E, s, ctx));
const nearestRed = (E, s) => { const c = E.carrier(s); return E.team(s, 'red').slice().sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0]; };
const STYLES = {
  hilfe: (E, s, ctx) => hintAction(E, s, ctx),
  inDenGegner: dribbleOr((E, s) => { const r = nearestRed(E, s); return { kind: 'dribble', x: r.x, y: r.y }; }),
  rueckwaerts: dribbleOr((E, s) => toward(E, s, -4, 0)),
  quer: dribbleOr((E, s) => toward(E, s, 0, E.carrier(s).y < 12 ? 4 : -4)),
  kurz: dribbleOr((E, s) => toward(E, s, 2, 0)),
  lang: dribbleOr((E, s) => toward(E, s, 14, 0)), // über 8 m: ausgeführt werden 8 m
  falschesTor: (E, s, ctx) => (ctx.actions.includes('schiessen') ? { kind: 'shoot', goal: E.shotOptions(s).sort((a, b) => a.margin - b.margin)[0].goal } : hintAction(E, s, ctx)),
};
function traceFreieBahn(E) {
  const n = E.mission(ID).durchlaeufe.length, styles = {}, seeds = {};
  for (const [k, f] of Object.entries(STYLES)) styles[k] = Array.from({ length: n }, (_, d) => play(E, d, f, ID));
  for (let seed = 1; seed <= 200; seed++) { const rnd = lcg(seed); seeds[seed] = hash(play(E, seed % n, (E2, s, ctx) => childAction(E2, s, ctx, rnd), ID)); }
  return { styles, seeds };
}
module.exports = { traceFreieBahn, STYLES, ID };

if (require.main === module) {
  const fs = require('node:fs'), E = require('../helpers/load.js');
  const i = process.argv.indexOf('--write'), j = process.argv.indexOf('--abweichungen');
  if (i > 0) { fs.writeFileSync(process.argv[i + 1], JSON.stringify(traceFreieBahn(E), null, 1)); console.log('geschrieben:', process.argv[i + 1]); }
  else if (j > 0) {
    const REF = require('./referenz.js'), ref = require('./' + REF.freieBahn.file);
    const now = JSON.parse(JSON.stringify(traceFreieBahn(E))), out = { grund: process.env.GRUND || 'zur Freigabe vorgelegt', bericht: process.env.BERICHT || '', styles: {}, seeds: {} };
    for (const k of Object.keys(ref.styles)) if (JSON.stringify(ref.styles[k]) !== JSON.stringify(now.styles[k])) out.styles[k] = { alt: hash(ref.styles[k]), neu: hash(now.styles[k]) };
    for (const k of Object.keys(ref.seeds)) if (ref.seeds[k] !== now.seeds[k]) out.seeds[k] = { alt: ref.seeds[k], neu: now.seeds[k] };
    fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1) + '\n');
    console.log(`Freie Bahn: Spielweisen geändert ${Object.keys(out.styles).length}, Kinder-Abfolgen geändert ${Object.keys(out.seeds).length}/200`);
  } else { console.error('Aufruf: node tests/golden/freie-bahn.js --write <datei> | --abweichungen <datei>'); process.exit(1); }
}
