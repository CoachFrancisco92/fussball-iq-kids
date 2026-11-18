// Abweichungsbericht: vergleicht die aktuelle Engine mit der gültigen Referenz (referenz.js, Mission 1) Entscheidung für Entscheidung.
// Ändert KEINE Referenz. Aufruf: node tests/golden/diff.js [--json pfad] [--md pfad]
const fs = require('node:fs');
const E = require('../helpers/load.js');
const { traceAll, playMission, lcg, hash } = require('./trace.js');
const REF = require('./referenz.js');
const ref = require('./' + REF.file);

// Kinder-Abfolgen einzeln neu erzeugen (gleiche Logik wie trace.js), um Unterschiede zu zeigen
const T = require('./trace.js');
function seedLog(Eng, seed) {
  const rnd = lcg(seed);
  const childAction = (E2, s, ctx) => { // identisch zu trace.js
    const F = E2.F, c = E2.carrier(s), blues = E2.team(s, 'blue');
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) });
    const k = pick(ctx.actions);
    if (k === 'passen') { if (rnd() < 0.6) return { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id }; return Object.assign({ kind: 'pass' }, spot()); }
    if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot());
    if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
    if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot());
    if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
    return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
  };
  return playMission(Eng, childAction);
}

function loadRefEngine() {
  // Referenz-Engine v0.2.3 + Inhalte aus v0.2.4 sind verhaltensgleich (nachgewiesen) – wir nutzen dafür den Stand main
  const { execFileSync } = require('node:child_process');
  return null;
}

const now = traceAll(E);
const changes = [];
const play = (a) => JSON.stringify({ events: a.events, after: a.after, afterApply: a.afterApply, mission: a.mission, a: a.a });
const kindOf = (a) => (a.kind === 'pass' ? (a.id ? 'Pass zum Mitspieler' : 'Pass in den Raum') : { dribble: 'Dribbeln', shoot: 'Schuss', run: 'Freilaufen', press: 'Ball erobern', cover: 'Weg versperren' }[a.kind]);
function compareLogs(where, A, B) {
  let gameplay = false;
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const r = A[i], c = B[i];
    if (!r || !c) { gameplay = true; continue; }
    if (play(r) !== play(c)) gameplay = true;
    if (JSON.stringify(r) === JSON.stringify(c)) continue;
    changes.push({ where, step: i + 1, aktion: kindOf(r.a), a: r.a,
      vorher: { stern: r.ev.good, entscheidung: r.ev.rec.good, entscheidungWarum: r.ev.rec.why, ziel: r.ev.exe.good, zielWarum: r.ev.exe.why, gesagt: r.fb.say, hilfe: r.hint && r.hint.say },
      nachher: { stern: c.ev.good, entscheidung: c.ev.rec.good, entscheidungWarum: c.ev.rec.why, ziel: c.ev.exe.good, zielWarum: c.ev.exe.why, gesagt: c.fb.say, hilfe: c.hint && c.hint.say } });
  }
  return gameplay;
}
let gameplayChanged = [];
for (const k of Object.keys(ref.scripted)) if (compareLogs('Ablauf „' + k + '“', ref.scripted[k], now.scripted[k])) gameplayChanged.push(k);
if (compareLogs('Hilfe-Durchlauf', ref.hinted, now.hinted)) gameplayChanged.push('Hilfe-Durchlauf');

// Kinder-Abfolgen: Referenz-Log aus dem Stand main neu erzeugen (Referenz speichert nur Hashes)
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fiq-ref-'));
execFileSync('git', ['worktree', 'add', '-q', '--detach', tmp, REF.tag], { cwd: path.join(__dirname, '..', '..') });
let refSeedLogs;
try {
  const out = execFileSync(process.execPath, ['-e', `
    const E=require(${JSON.stringify(path.join(tmp, 'tests/helpers/load.js'))});
    const D=require(${JSON.stringify(__filename)}.replace('diff.js','diff-seeds.js'));
    process.stdout.write(JSON.stringify(D(E)));`], { maxBuffer: 1e9 });
  refSeedLogs = JSON.parse(out);
} finally { execFileSync('git', ['worktree', 'remove', '--force', tmp], { cwd: path.join(__dirname, '..', '..') }); }
const seedsChanged = [];
for (let seed = 1; seed <= 200; seed++) {
  const A = refSeedLogs[seed], B = seedLog(E, seed);
  if (hash(A) !== ref.seeds[seed]) throw new Error('Referenz-Log ' + seed + ' passt nicht zur Referenz');
  if (hash(B) !== now.seeds[seed]) throw new Error('aktueller Log ' + seed + ' inkonsistent');
  if (hash(A) === hash(B)) continue;
  seedsChanged.push(seed);
  if (compareLogs('Abfolge ' + seed, A, B)) gameplayChanged.push('Abfolge ' + seed);
}

// Ausstehende (zur Freigabe vorgelegte) Abweichungen für die Referenztests
const pending = { grund: process.env.GRUND || 'zur Freigabe vorgelegt, Referenzen noch NICHT aktualisiert', bericht: process.env.BERICHT || '', geaenderteEntscheidungen: changes.length, spielverlaufGeaendert: gameplayChanged, scripted: {}, hinted: null, seeds: {} };
for (const k of Object.keys(ref.scripted)) if (JSON.stringify(ref.scripted[k]) !== JSON.stringify(now.scripted[k])) pending.scripted[k] = { alt: hash(ref.scripted[k]), neu: hash(now.scripted[k]) };
if (JSON.stringify(ref.hinted) !== JSON.stringify(now.hinted)) pending.hinted = { alt: hash(ref.hinted), neu: hash(now.hinted) };
for (const s of seedsChanged) pending.seeds[s] = { alt: ref.seeds[s], neu: now.seeds[s] };

module.exports = { changes, gameplayChanged, seedsChanged, pending };
if (require.main === module) {
  const ji = process.argv.indexOf('--json'); if (ji > 0) fs.writeFileSync(process.argv[ji + 1], JSON.stringify(pending, null, 1) + '\n');
  const mi = process.argv.indexOf('--md'); if (mi > 0) fs.writeFileSync(process.argv[mi + 1] + '.raw.json', JSON.stringify(changes, null, 1));
  console.log(`Geänderte Entscheidungen: ${changes.length} · Abfolgen mit Abweichung: ${seedsChanged.length}/200 · feste Abläufe: ${Object.keys(pending.scripted).join(', ') || 'keine'} · Hilfe-Durchlauf: ${pending.hinted ? 'geändert' : 'gleich'} · Spielverlauf geändert: ${gameplayChanged.length ? gameplayChanged.join(', ') : 'nirgends'}`);
}
