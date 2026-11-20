// V0.5.1: zentrale Sprachsteuerung (sprache.js) mit nachgebauter Sprachausgabe und eigener Uhr.
// Geprüft wird das Verhalten, das das Kind hört: Reihenfolge, Unterbrechungen, veraltete Ansagen,
// fehlende/verspätete Ereignisse (Safari) und das Beenden aller Aufträge.
const test = require('node:test');
const assert = require('node:assert');
const FIQSprache = require('../sprache.js');

/** Uhr mit Timern, die nur über tick() fortschreitet. */
function uhr() {
  let t = 0, id = 0;
  const timers = new Map();
  return {
    now: () => t,
    setTimeout: (fn, ms) => { const k = ++id; timers.set(k, { at: t + ms, fn }); return k; },
    clearTimeout: (k) => { timers.delete(k); },
    tick(ms) {
      const end = t + ms;
      for (;;) {
        let next = null;
        for (const [k, v] of timers) if (v.at <= end && (!next || v.at < next[1].at || (v.at === next[1].at && k < next[0]))) next = [k, v];
        if (!next) break;
        timers.delete(next[0]); t = next[1].at; next[1].fn();
      }
      t = end;
    },
    get pending() { return timers.size; },
  };
}

/** Nachgebaute Sprachausgabe: spricht 10 ms je Zeichen; Ereignisse lassen sich unterdrücken oder verzögern. */
function synth(clock, opts) {
  opts = opts || {};
  const log = [];
  const s = {
    speaking: false, pending: false, paused: !!opts.paused, q: [], cur: null, log,
    speak(u) { log.push(['speak', u.text, clock.now()]); s.q.push(u); s.pending = s.q.length > 0; if (!s.cur && !s.paused) s._next(); },
    _next() {
      s.cur = s.q.shift() || null; s.pending = s.q.length > 0; s.speaking = !!s.cur;
      if (!s.cur) return;
      const u = s.cur;
      log.push(['start', u.text, clock.now()]);
      u._t = clock.setTimeout(() => {
        log.push(['fertig', u.text, clock.now()]);
        s.cur = null; s.speaking = false;
        const fire = () => { if (u.onend) u.onend({}); };
        if (opts.keinEnde && opts.keinEnde(u.text)) { /* Safari: Ende wird nicht gemeldet */ }
        else if (opts.spaet) clock.setTimeout(fire, opts.spaet);
        else fire();
        s._next();
      }, u.text.length * 10);
    },
    cancel() {
      log.push(['cancel', s.cur ? s.cur.text : null, clock.now()]);
      const all = (s.cur ? [s.cur] : []).concat(s.q);
      if (s.cur) clock.clearTimeout(s.cur._t);
      s.cur = null; s.q = []; s.speaking = false; s.pending = false;
      all.forEach((u) => clock.setTimeout(() => u.onerror && u.onerror({ error: 'interrupted' }), 1));
    },
    resume() { log.push(['resume', null, clock.now()]); if (s.paused) { s.paused = false; if (!s.cur) s._next(); } },
    getVoices() { return [{ name: 'Test', lang: 'de-DE' }]; },
  };
  return s;
}
class Utt { constructor(t) { this.text = t; } }

function setup(opts) {
  const clock = uhr();
  const sy = synth(clock, opts);
  const events = [];
  const sp = FIQSprache.erstelle({ synth: sy, Utterance: Utt, now: clock.now, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, pickVoice: (v) => v[0], log: (e, t) => events.push([e, t]) });
  const gesprochen = () => sy.log.filter((e) => e[0] === 'start').map((e) => e[1]);
  const fertig = () => sy.log.filter((e) => e[0] === 'fertig').map((e) => e[1]);
  const abgebrochen = () => sy.log.filter((e) => e[0] === 'cancel' && e[1]).map((e) => e[1]);
  return { clock, sy, sp, events, gesprochen, fertig, abgebrochen };
}

test('Automatische Ansagen werden angehängt und nie unterbrochen (Reihenfolge bleibt)', () => {
  const { clock, sp, gesprochen, fertig, abgebrochen } = setup();
  sp.sage('Los geht\'s!', { art: 'ansage' });
  sp.sage('Wohin dribbelst du?', { art: 'anweisung' });
  sp.sage('Neue Situation!', { art: 'ansage' });
  clock.tick(5000);
  assert.deepStrictEqual(gesprochen(), ['Los geht\'s!', 'Wohin dribbelst du?', 'Neue Situation!']);
  assert.deepStrictEqual(fertig(), gesprochen(), 'alle Ansagen zu Ende gesprochen');
  assert.deepStrictEqual(abgebrochen(), []);
});

test('Antippen (sofort) unterbricht die laufende Ansage und verwirft die Warteschlange', () => {
  const { clock, sp, gesprochen, abgebrochen } = setup();
  sp.sage('Erste lange Anweisung für das Kind.', { art: 'anweisung' });
  sp.sage('Zweite Ansage', { art: 'ansage' });
  clock.tick(50);
  sp.sage('Tippe dorthin.', { art: 'anweisung', sofort: true });
  clock.tick(3000);
  assert.deepStrictEqual(abgebrochen(), ['Erste lange Anweisung für das Kind.']);
  assert.deepStrictEqual(gesprochen(), ['Erste lange Anweisung für das Kind.', 'Tippe dorthin.']);
});

test('Nach einem Abbruch wartet die neue Ansage kurz (Safari verschluckt sonst cancel+speak)', () => {
  const { clock, sp, sy } = setup();
  sp.sage('Etwas Langes läuft gerade noch.');
  clock.tick(20);
  sp.sage('Neu', { sofort: true });
  const c = sy.log.find((e) => e[0] === 'cancel'), s = sy.log.find((e) => e[0] === 'speak' && e[1] === 'Neu');
  assert.ok(!s, 'nicht im selben Moment wie cancel');
  clock.tick(100);
  const s2 = sy.log.find((e) => e[0] === 'speak' && e[1] === 'Neu');
  assert.ok(s2 && s2[2] - c[2] >= FIQSprache.PAUSE_NACH_ABBRUCH);
});

test('Erste Ansage ohne laufende Sprache: synchron (iOS-Freischaltung im Tipp-Ereignis), ohne cancel', () => {
  const { sp, sy } = setup();
  sp.sage('Freie Bahn! Tippe auf Los geht\'s!', { sofort: true });
  assert.deepStrictEqual(sy.log.map((e) => e[0]), ['speak', 'start']);
});

test('Phasenwechsel: noch nicht begonnene Ansagen der alten Phase werden nie nachträglich gesprochen', () => {
  const { clock, sp, gesprochen } = setup();
  sp.sage('Rückmeldung zur Entscheidung.', { art: 'rueckmeldung' });
  sp.sage('Alte Anweisung', { art: 'anweisung' });
  sp.phase();
  sp.sage('Neue Anweisung', { art: 'anweisung' });
  clock.tick(5000);
  assert.deepStrictEqual(gesprochen(), ['Rückmeldung zur Entscheidung.', 'Neue Anweisung']);
});

test('Optionale Hinweise werden verworfen, wenn gerade gesprochen wird, und weichen neuen Ansagen', () => {
  const { clock, sp, gesprochen } = setup();
  sp.sage('Anweisung läuft', { art: 'anweisung' });
  sp.sage('Hinweis A', { art: 'hinweis' });
  clock.tick(5000);
  assert.deepStrictEqual(gesprochen(), ['Anweisung läuft']);
  sp.sage('Hinweis B', { art: 'hinweis' });
  clock.tick(5000);
  assert.deepStrictEqual(gesprochen(), ['Anweisung läuft', 'Hinweis B'], 'frei -> Hinweis wird gesprochen');
});

test('Übergang wartet auf das Satzende, frühestens nach min, spätestens nach max', () => {
  const { clock, sp } = setup();
  let at = null;
  sp.sage('Neue Situation! Schau genau hin.', { art: 'ansage' }); // 32 Zeichen = 320 ms
  sp.wennFertig(() => { at = clock.now(); }, { min: 100, max: 5000 });
  clock.tick(200); assert.strictEqual(at, null, 'Ansage läuft noch');
  clock.tick(1000); assert.strictEqual(at, 320, 'genau am Satzende');
  at = null;
  sp.wennFertig(() => { at = clock.now(); }, { min: 700, max: 5000 });
  clock.tick(2000); assert.strictEqual(at, 1900, 'ohne Ansage: nach min');
});

test('Übergang mit min länger als die Ansage: wartet min ab', () => {
  const { clock, sp } = setup();
  let at = null;
  sp.sage('Kurz', { art: 'ansage' });
  sp.wennFertig(() => { at = clock.now(); }, { min: 1200, max: 8000 });
  clock.tick(3000);
  assert.strictEqual(at, 1200);
});

test('Safari meldet kein Ende: Wächter beendet die Ansage, die App macht weiter, nichts Altes wird später gesprochen', () => {
  const { clock, sp, sy, events, gesprochen } = setup({ keinEnde: () => true });
  let weiter = false;
  sp.sage('Neue Situation! Schau genau hin.', { art: 'ansage' });
  sp.wennFertig(() => { weiter = true; sp.phase(); sp.sage('Wohin dribbelst du?', { art: 'anweisung' }); }, { min: 1200, max: 20000 });
  const wd = FIQSprache.dauer('Neue Situation! Schau genau hin.', 0.9);
  clock.tick(wd - 1); assert.ok(!weiter, 'vor Ablauf des Wächters wird gewartet');
  clock.tick(2); assert.ok(weiter, 'Wächter löst den Übergang aus');
  assert.ok(events.some((e) => e[0] === 'waechter'));
  assert.ok(sy.log.some((e) => e[0] === 'cancel'), 'Sprachsystem wird sicher zurückgesetzt');
  clock.tick(30000);
  assert.deepStrictEqual(gesprochen(), ['Neue Situation! Schau genau hin.', 'Wohin dribbelst du?']);
  assert.strictEqual(sp._zustand().cur, null, 'hängt nicht');
});

test('Verspätetes Ende-Ereignis einer abgebrochenen Ansage beendet nicht die nächste', () => {
  const { clock, sp, gesprochen, fertig } = setup({ spaet: 2000 });
  sp.sage('Erste Ansage.');
  clock.tick(10);
  sp.sage('Zweite Ansage nach Antippen, recht lang.', { sofort: true });
  sp.sage('Dritte');
  clock.tick(300);  // Zweite läuft (400 ms). Ein spätes onend der Ersten darf sie nicht beenden.
  assert.strictEqual(sp._zustand().cur, 'Zweite Ansage nach Antippen, recht lang.');
  clock.tick(10000);
  assert.deepStrictEqual(gesprochen(), ['Erste Ansage.', 'Zweite Ansage nach Antippen, recht lang.', 'Dritte']);
  assert.ok(fertig().includes('Dritte'));
});

test('Abbrechen (Übersicht/Neustart/Missionswechsel) beendet Sprache, Warteschlange, Timer und Übergänge', () => {
  const { clock, sp, gesprochen } = setup();
  let fired = 0;
  sp.sage('Neue Situation!', { art: 'ansage' });
  sp.sage('Danach', { art: 'anweisung' });
  sp.wennFertig(() => fired++, { min: 500, max: 3000 });
  sp.nach(800, () => fired++);
  sp.abbrechen();
  assert.deepStrictEqual(sp._zustand(), { epoch: sp._zustand().epoch, queue: [], cur: null, timers: 0, waiters: 0, halted: false, deferred: 0 });
  clock.tick(30000);
  assert.strictEqual(fired, 0, 'kein Geisterablauf');
  assert.deepStrictEqual(gesprochen(), ['Neue Situation!'], 'nichts danach gesprochen');
});

test('Wiederholen liest die zuletzt relevante Anweisung/Rückmeldung, nicht Hinweise', () => {
  const { clock, sp, gesprochen } = setup();
  sp.sage('Wohin dribbelst du?', { art: 'anweisung' });
  clock.tick(1000);
  sp.sage('Tippe zuerst unten auf einen Knopf.', { art: 'hinweis', sofort: true });
  clock.tick(1000);
  assert.strictEqual(sp.relevant, 'Wohin dribbelst du?');
  sp.wiederholen();
  clock.tick(1000);
  assert.strictEqual(gesprochen().pop(), 'Wohin dribbelst du?');
  sp.sage('Super, Tor!', { art: 'rueckmeldung' });
  assert.strictEqual(sp.relevant, 'Super, Tor!');
  sp.sage('Antwort', { art: 'rueckmeldung', merken: false });
  assert.strictEqual(sp.relevant, 'Super, Tor!');
  sp.merke('Wer ist frei?');
  assert.strictEqual(sp.relevant, 'Wer ist frei?');
});

test('Anhalten (Neustart-Abfrage): fällige Übergänge warten, laufen nach „weiter“ einmal', () => {
  const { clock, sp } = setup();
  let n = 0;
  sp.wennFertig(() => n++, { min: 500, max: 5000 });
  sp.halt();
  clock.tick(3000);
  assert.strictEqual(n, 0);
  sp.weiter();
  clock.tick(10);
  assert.strictEqual(n, 1);
  clock.tick(10000);
  assert.strictEqual(n, 1, 'nicht doppelt (min und max)');
});

test('Ton aus: nichts wird gesprochen, Übergänge laufen trotzdem weiter', () => {
  const { clock, sp, gesprochen } = setup();
  sp.ein(false);
  let ok = false;
  sp.sage('Neue Situation!', { art: 'ansage' });
  sp.wennFertig(() => { ok = true; }, { min: 200, max: 5000 });
  clock.tick(300);
  assert.ok(ok); assert.deepStrictEqual(gesprochen(), []);
});

test('Sprachsystem im Pause-Zustand (iOS nach Hintergrund): wird vor dem Sprechen fortgesetzt', () => {
  const { clock, sp, sy, gesprochen } = setup({ paused: true });
  sp.sage('Hallo');
  clock.tick(500);
  assert.ok(sy.log.some((e) => e[0] === 'resume'));
  assert.deepStrictEqual(gesprochen(), ['Hallo']);
});

test('Sehr lange Texte werden an Satzgrenzen geteilt, kurze bleiben unverändert', () => {
  assert.deepStrictEqual(FIQSprache.teile('Kurz. Text!'), ['Kurz. Text!']);
  const lang = Array.from({ length: 12 }, (_, i) => `Satz Nummer ${i + 1} mit ein paar Wörtern.`).join(' ');
  const t = FIQSprache.teile(lang);
  assert.ok(t.length > 1 && t.every((x) => x.length <= FIQSprache.MAX_TEIL));
  assert.strictEqual(t.join(' '), lang);
  // Alle heutigen Texte der Referenz-Mitschriften sind kürzer: sie bleiben eine Ansage
  const fs = require('node:fs'), path = require('node:path');
  const REF = require('./golden/referenz.js');
  const said = [];
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (Array.isArray(o.said)) said.push(...o.said); Object.values(o).forEach(walk); } };
  for (const f of [REF.ui, REF.missionA && REF.missionA.ui, REF.freieBahn && REF.freieBahn.ui].filter(Boolean)) walk(JSON.parse(fs.readFileSync(path.join(__dirname, 'golden', f), 'utf8')));
  assert.ok(said.length > 100);
  for (const s of said) assert.deepStrictEqual(FIQSprache.teile(s), [s]);
});

test('Schnelles Mehrfach-Antippen: nur die letzte Ansage wird gesprochen, keine Stauung', () => {
  const { clock, sp, gesprochen } = setup();
  for (let i = 0; i < 6; i++) { sp.sage(`Tipp ${i}`, { sofort: true }); clock.tick(15); }
  clock.tick(3000);
  assert.strictEqual(gesprochen().pop(), 'Tipp 5');
  assert.ok(gesprochen().length <= 2, `höchstens erste und letzte beginnen: ${gesprochen()}`);
  assert.strictEqual(sp._zustand().cur, null);
});

// ---------------------------------------------------------------- V0.5.1 Nachprüfung: Höchstzeit von wennFertig()
const LANG = 'Das ist eine sehr lange Antwort im Schau-Schritt, die viel länger dauert als die Höchstzeit des Übergangs erlaubt, damit das Sicherheitsnetz greift.'; // < 200 Zeichen: eine Ansage

test('Höchstzeit erreicht, Ansage läuft noch: sie wird beendet, bevor der Übergang die neue Phase beginnt', () => {
  const { clock, sp, sy, events, gesprochen, fertig } = setup();
  let at = null;
  sp.sage(LANG, { art: 'rueckmeldung' });              // 10 ms je Zeichen ≈ 1,5 s
  sp.wennFertig(() => { at = clock.now(); sp.phase(); sp.sage('Jetzt entscheide!', { art: 'anweisung' }); }, { min: 200, max: 1000 });
  clock.tick(999); assert.strictEqual(at, null);
  clock.tick(1);
  assert.strictEqual(at, 1000, 'Übergang genau zur Höchstzeit');
  const c = sy.log.find((e) => e[0] === 'cancel');
  assert.ok(c && c[1] === LANG && c[2] === 1000, 'alte Ansage zur Höchstzeit beendet');
  assert.ok(events.some((e) => e[0] === 'hoechstzeit-abbruch'));
  clock.tick(10000);
  assert.deepStrictEqual(gesprochen(), [LANG, 'Jetzt entscheide!'], 'keine Wiederaufnahme, keine Doppelung');
  const s = sy.log.find((e) => e[0] === 'speak' && e[1] === 'Jetzt entscheide!');
  assert.ok(s[2] >= 1000 + FIQSprache.PAUSE_NACH_ABBRUCH && s[2] <= 1000 + FIQSprache.PAUSE_NACH_ABBRUCH + 1, 'neue Anweisung sofort nach der Safari-Pause, nicht verspätet');
  assert.ok(!fertig().includes(LANG), 'alte Ansage nicht zu Ende gelaufen');
});

test('Höchstzeit mit Safari ohne Ende-Ereignis: kein Überlappen, kein spätes Wiederauftauchen', () => {
  const { clock, sp, sy, gesprochen } = setup({ keinEnde: () => true });
  sp.sage('Neue Situation! Schau genau hin.', { art: 'ansage' });
  sp.wennFertig(() => { sp.phase(); sp.sage('Wohin dribbelst du?', { art: 'anweisung' }); }, { min: 200, max: 1500 });
  clock.tick(1500);
  // Zur Höchstzeit ist die Ansage im Sprachsystem schon fertig (320 ms), das Ende wurde aber nie gemeldet:
  // die App hält sie noch für laufend -> sie wird abgeräumt, die neue Anweisung kommt sofort.
  clock.tick(100);
  assert.deepStrictEqual(gesprochen(), ['Neue Situation! Schau genau hin.', 'Wohin dribbelst du?']);
  // gleichzeitig spricht das (nachgebaute) Sprachsystem nie zwei Ansagen: jede beginnt erst nach dem Ende der vorigen
  const starts = sy.log.filter((e) => e[0] === 'start'), ends = sy.log.filter((e) => e[0] === 'fertig' || (e[0] === 'cancel' && e[1]));
  starts.slice(1).forEach((st, i) => assert.ok(ends.some((en) => en[2] <= st[2] && en[1] === starts[i][1]), `Überlappung bei ${st[1]}`));
  clock.tick(60000);
  assert.deepStrictEqual(gesprochen(), ['Neue Situation! Schau genau hin.', 'Wohin dribbelst du?'], 'nichts Altes später');
  assert.strictEqual(sp._zustand().cur, null);
});

test('Höchstzeit während einer geteilten Ansage: auch der wartende Rest wird verworfen', () => {
  const { clock, sp, gesprochen } = setup();
  const teil = 'Ein Satz mit einigen Wörtern für das Kind.';
  const lang = Array.from({ length: 8 }, () => teil).join(' ');   // > 200 Zeichen -> 2 Teile
  assert.strictEqual(FIQSprache.teile(lang).length, 2);
  sp.sage(lang, { art: 'rueckmeldung' });
  sp.wennFertig(() => { sp.phase(); sp.sage('Weiter geht es.'); }, { min: 0, max: 500 });
  clock.tick(20000);
  assert.deepStrictEqual(gesprochen(), [FIQSprache.teile(lang)[0], 'Weiter geht es.']);
});

test('Höchstzeit während der Neustart-Abfrage: erst nach „weiter“, dann mit sauberem Abbruch', () => {
  const { clock, sp, sy, gesprochen } = setup();
  let n = 0;
  sp.sage(LANG, { art: 'rueckmeldung' });
  sp.wennFertig(() => { n++; sp.sage('Neu'); }, { min: 100, max: 500 });
  sp.halt();
  clock.tick(800);
  assert.strictEqual(n, 0, 'Abfrage offen: Übergang wartet');
  sp.weiter();
  assert.strictEqual(n, 1);
  assert.ok(sy.log.some((e) => e[0] === 'cancel' && e[1] === LANG));
  clock.tick(10000);
  assert.deepStrictEqual(gesprochen(), [LANG, 'Neu']);
});

test('Übergang vor der Höchstzeit (Ansage regulär zu Ende): kein Abbruch', () => {
  const { clock, sp, sy } = setup();
  let n = 0;
  sp.sage('Kurze Ansage', { art: 'ansage' });
  sp.wennFertig(() => n++, { min: 100, max: 5000 });
  clock.tick(10000);
  assert.strictEqual(n, 1);
  assert.ok(!sy.log.some((e) => e[0] === 'cancel'), 'nichts abgebrochen');
});

test('vorrang() (Szenen-Wiedergabe nach Höchstzeit): beendet Laufendes, sonst nichts', () => {
  const { clock, sp, sy, gesprochen } = setup();
  sp.vorrang();
  assert.ok(!sy.log.some((e) => e[0] === 'cancel'), 'nichts läuft -> kein Abbruch');
  sp.sage(LANG, { art: 'ansage' });
  clock.tick(300);
  sp.vorrang();
  sp.sage('Jetzt: zweite Szene', { art: 'ansage' });
  clock.tick(10000);
  assert.deepStrictEqual(gesprochen(), [LANG, 'Jetzt: zweite Szene']);
  assert.ok(sy.log.some((e) => e[0] === 'cancel' && e[1] === LANG));
});

test('Tippen überspringt genau einen Erzähl-Übergang und verwirft seine Ansage ohne Nachlauf', () => {
  const { clock, sp, gesprochen, abgebrochen } = setup();
  let n = 0;
  sp.sage('Eine lange Erklärung für den Szenenwechsel.', { art: 'ansage' });
  sp.wennFertig(() => { n++; sp.phase(); sp.sage('Neue Entscheidung', { art: 'anweisung' }); }, { min: 1200, max: 12000 });
  clock.tick(50);
  assert.strictEqual(sp.ueberspringen(), true, 'Tippen auf Erzählung funktioniert');
  assert.strictEqual(n, 1, 'neue Phase sofort');
  assert.strictEqual(sp.ueberspringen(), false, 'kein zweiter Übergang ohne Wartenden');
  clock.tick(16000);
  assert.strictEqual(n, 1, 'abgebrochene Timer springen nicht erneut');
  assert.ok(abgebrochen().includes('Eine lange Erklärung für den Szenenwechsel.'));
  assert.deepStrictEqual(gesprochen(), ['Eine lange Erklärung für den Szenenwechsel.', 'Neue Entscheidung']);
  assert.strictEqual(sp._zustand().waiters, 0);
});

test('Erzähl-Überspringen ist während Pause und bei unklaren Mehrfach-Übergängen gesperrt', () => {
  const { clock, sp } = setup();
  let n = 0;
  sp.wennFertig(() => n++, { min: 500, max: 12000 });
  sp.halt();
  assert.strictEqual(sp.ueberspringen(), false, 'Neustart-Abfrage muss Vorrang behalten');
  sp.weiter();
  assert.strictEqual(sp.ueberspringen(), true);
  assert.strictEqual(n, 1);
  sp.wennFertig(() => n++, { min: 500, max: 12000 });
  sp.wennFertig(() => n++, { min: 500, max: 12000 });
  assert.strictEqual(sp.ueberspringen(), false, 'zwei unabhängige Übergänge dürfen nicht erraten werden');
  clock.tick(13000);
  assert.strictEqual(n, 3, 'reguläre Übergänge bleiben intakt');
});
