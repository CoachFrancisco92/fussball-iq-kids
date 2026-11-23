// V0.5.1 im Browser: Sprachsteuerung, Navigation und Touch.
// Die Sprachausgabe wird nachgebaut (Dauer je Zeichen, protokolliert Start/Ende/Abbruch), damit sich prüfen lässt,
// was ein Kind wirklich zu Ende hört. Varianten: normal, „Safari“ (Ende wird nie gemeldet), verspätete Ereignisse.
//   node tests/e2e/navigation.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
}).listen(0);
const base = `http://localhost:${server.address().port}/`;
const fail = (m) => { throw new Error(m); };
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
let exit = 0;

/** Nachgebaute Sprachausgabe im Browser. cfg: {ms: Dauer je Zeichen, keinEnde: bool, spaet: ms} */
function fakeSpeech(cfg) {
  const log = []; window.__sp = { log, userAt: -1e9 };
  const mark = (ev) => { window.__sp.userAt = performance.now(); window.__sp.imTipp = true; setTimeout(() => { window.__sp.imTipp = false; }, 0); if (cfg.logInput) log.push({ e: 'input:' + ev.type, at: window.__sp.userAt }); };
  ['pointerdown', 'touchstart', 'mousedown', 'click'].forEach((e) => window.addEventListener(e, mark, true));
  class Utt { constructor(t) { this.text = t; } }
  const s = {
    speaking: false, pending: false, paused: false, q: [], cur: null,
    speak(u) { log.push({ e: 'speak', t: u.text, at: performance.now() }); s.q.push(u); s.pending = s.q.length > 0; if (!s.cur) s._next(); },
    _next() {
      s.cur = s.q.shift() || null; s.pending = s.q.length > 0; s.speaking = !!s.cur;
      if (!s.cur) return;
      const u = s.cur;
      log.push({ e: 'start', t: u.text, at: performance.now() });
      u._t = setTimeout(() => {
        log.push({ e: 'fertig', t: u.text, at: performance.now() });
        s.cur = null; s.speaking = false;
        if (!cfg.keinEnde) { if (cfg.spaet) setTimeout(() => u.onend && u.onend({}), cfg.spaet); else if (u.onend) u.onend({}); }
        // V0.6.2: Spricht onend sofort Neues (speak() startet es schon), darf die Nachbildung es nicht wieder verlieren
        // (wie ein echtes Sprachsystem: die neue Äußerung läuft weiter)
        if (!s.cur) s._next();
      }, Math.max(120, u.text.length * cfg.ms));
    },
    cancel() {
      const now = performance.now();
      log.push({ e: 'cancel', t: s.cur ? s.cur.text : null, at: now, nachTipp: now - window.__sp.userAt, imTipp: !!window.__sp.imTipp });
      const all = (s.cur ? [s.cur] : []).concat(s.q);
      if (s.cur) clearTimeout(s.cur._t);
      s.cur = null; s.q = []; s.speaking = false; s.pending = false;
      all.forEach((u) => setTimeout(() => u.onerror && u.onerror({ error: 'interrupted' }), cfg.spaet || 1));
    },
    resume() {}, pause() {},
    getVoices() { return [{ name: 'Anna', lang: 'de-DE' }]; },
    addEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: s, configurable: true });
  window.SpeechSynthesisUtterance = Utt;
}

async function open(viewport, cfg) {
  const ctx = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(fakeSpeech, cfg);
  await page.goto(base + 'index.html');
  const H = { ctx, page, errors, viewport };
  H.mode = () => page.evaluate(() => window.__fiq.mode);
  H.fiq = (k) => page.evaluate((key) => { const v = window.__fiq[key]; return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; }, k);
  H.waitMode = async (want, ms = 25000) => { const list = [].concat(want); const t = Date.now(); while (Date.now() - t < ms) { if (errors.length) fail('JS-Fehler: ' + errors.join('; ')); const m = await H.mode(); if (list.includes(m)) return m; await page.waitForTimeout(30); } fail(`Modus ${list} erwartet, ist ${await H.mode()}`); };
  H.until = async (fn, what, arg, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn, arg)) return; await page.waitForTimeout(30); } fail('nicht erreicht: ' + what); };
  H.box = async (sel) => page.locator(sel).first().boundingBox();
  H.touch = async (sel) => { const b = await H.box(sel); if (!b) fail(sel + ' nicht sichtbar'); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  H.field = async (x, y) => { const b = await page.$eval('#field', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, window.__fiq.view]; }); const k = b[2] / b[3].w; await page.touchscreen.tap(b[0] + (x - b[3].x0) * k, b[1] + (y - b[3].y0) * k); };
  H.text = (sel) => page.$eval(sel, (e) => (e.hidden ? '' : e.textContent.trim())).catch(() => '');
  H.log = () => page.evaluate(() => window.__sp.log.slice());
  H.now = () => page.evaluate(() => performance.now());
  H.ruhig = async (what, ms = 25000) => H.until(() => { const s = window.__fiq.speech; return !s.cur && !s.queue.length && !speechSynthesis.speaking; }, 'Sprache fertig: ' + what, undefined, ms);
  /** Sichtbar, im Bildschirm und nicht verdeckt (ohne Scrollen antippbar) */
  H.reachable = async (sel, scroll) => {
    if (scroll) await page.locator(sel).first().scrollIntoViewIfNeeded();
    const r = await page.evaluate((s) => { const e = document.querySelector(s); if (!e || e.hidden) return { ok: false, why: 'fehlt/versteckt' }; const b = e.getBoundingClientRect(); const cx = b.left + b.width / 2, cy = b.top + b.height / 2; const top = document.elementFromPoint(cx, cy); return { ok: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth && !!top && (top === e || e.contains(top)), b: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], vh: innerHeight }; }, sel);
    if (!r.ok) fail(`${sel} nicht ohne Scrollen antippbar (${H.viewport.width}×${H.viewport.height}): ${JSON.stringify(r)}`);
  };
  H.selectAndPlay = async (id) => { await H.touch(`#missionList .mcard[data-id="${id}"]`); await H.touch('#play'); };
  /** Ein Schritt mit der Hilfe (wie ein Kind, das 💡 nutzt) */
  H.hintStep = async () => {
    const plan = await page.evaluate(() => { const S = window.__fiq.S, c = window.__fiq.ctx; const k = FIQ.recommend(S, c.actions); return { k, h: FIQ.hint(S, k) }; });
    await H.touch('#actions .hint'); await H.until(() => !!window.__fiq.sel, 'Hilfe wählt Aktion');
    const t = [];
    if (plan.h.ids) t.push(await page.evaluate((i) => { const p = FIQ.P(window.__fiq.S, i); return [p.x, p.y]; }, plan.h.ids[0]));
    if (plan.h.point) t.push([plan.h.point.x, plan.h.point.y]);
    if (plan.h.goal != null) t.push([36, plan.h.goal === 0 ? 6 : 18]);
    for (let i = 0; i < t.length; i++) { await H.field(...t[i]); if (i < t.length - 1) await H.until(() => window.__fiq.sel && window.__fiq.sel.step === 2, 'Spieler gewählt'); }
    return plan;
  };
  /** V0.6a P3: mit der Hilfe weiterspielen, bis eine volle Rückmeldung kommt (Kurzrückmeldungen laufen selbst weiter) */
  H.hilfeBisRueckmeldung = async () => {
    let first = null;
    for (let i = 0; i < 8; i++) {
      const plan = await H.hintStep(); first = first || plan;
      const m = await H.waitMode(['feedback', 'kurz']);
      if (m === 'feedback') return first;
      await H.waitMode(['decide', 'feedback', 'end'], 15000);
      if ((await H.mode()) !== 'decide') return first;
    }
    fail('keine volle Rückmeldung');
  };
  H.look = async () => {
    const id = await page.evaluate(() => { const o = FIQ.passOptions(window.__fiq.S).sort((a, b) => b.margin - a.margin)[0]; return o && o.id; });
    if (id) { const p = await page.evaluate((i) => { const q = FIQ.P(window.__fiq.S, i); return [q.x, q.y]; }, id); await H.field(...p); } else await H.touch('#lookNone');
    await H.waitMode('decide', 20000);
  };
  /** Mission mit der Hilfe zu Ende spielen */
  H.playToEnd = async () => {
    for (let i = 0; i < 60; i++) {
      const m = await H.waitMode(['decide', 'look', 'feedback', 'kurz', 'end']);
      if (m === 'end') return;
      if (m === 'kurz') { await H.waitMode(['decide', 'look', 'feedback', 'end'], 15000); continue; }
      if (m === 'look') { await H.look(); continue; }
      if (m === 'feedback') { await H.touch('#fbNext'); await H.waitMode(['wechsel', 'decide', 'look', 'end']); continue; }
      await H.hintStep(); await H.waitMode(['feedback', 'kurz']);
    }
    fail('Mission endet nicht');
  };
  H.startPos = (id, run) => page.evaluate(([i, r]) => FIQ.newState(i, r).players.map((p) => [p.id, p.x, p.y]), [id, run]);
  H.pos = () => page.evaluate(() => window.__fiq.S.players.map((p) => [p.id, p.x, p.y]));
  H.close = async () => { if (errors.length) fail('JS-Fehler: ' + errors.join('; ')); await ctx.close(); };
  return H;
}

/** Jeder Abbruch einer laufenden Ansage muss in der Verarbeitung eines Antippens geschehen (nie durch Timer oder
 *  automatische Übergänge). Geprüft wird exakt: Abbruch innerhalb desselben Ereignis-Durchlaufs wie der Tipp. */
function nurNachTipp(log, what) {
  const bad = log.filter((x) => x.e === 'cancel' && x.t && !x.imTipp);
  if (bad.length) { if (process.env.DEBUG) { const i = log.indexOf(bad[0]); console.error(JSON.stringify(log.slice(Math.max(0, i - 8), i + 3), null, 0)); } fail(`${what}: Ansage ohne Antippen abgebrochen: ${JSON.stringify(bad.slice(0, 3))}`); }
}
const ganz = (log, text) => log.some((x) => x.e === 'fertig' && x.t === text) && !log.some((x) => x.e === 'cancel' && x.t === text);

const IPAD = { width: 1024, height: 768 };
try {
  // ------------------------------------------------------------------ 1. Sprache: Reihenfolge und Unterbrechungen
  {
    const H = await open(IPAD, { ms: 12 });
    const T = await H.page.evaluate(() => FIQ.texts('freie-bahn').bedienung);
    // dreifaches schnelles Antippen von „Los geht's“: genau ein Start
    await H.touch('#missionList .mcard[data-id="freie-bahn"]');
    const b = await H.box('#play');
    for (let i = 0; i < 3; i++) await H.page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await H.waitMode('decide');
    if ((await H.fiq('dec')) !== 0) fail('Mehrfach-Tipp auf „Los geht\'s“ startet mehrfach');
    await H.ruhig('Start');
    let log = await H.log();
    if (log.filter((x) => x.e === 'speak' && x.t === T.losGehts).length !== 1) fail('„Los geht\'s“ nicht genau einmal');
    if (!ganz(log, T.losGehts)) fail('„Los geht\'s“ wird nicht zu Ende gesprochen');
    const ctxSay = (await H.fiq('ctx')).say;
    if (!ganz(log, ctxSay)) fail('Anweisung wird nicht zu Ende gesprochen');
    const iL = log.findIndex((x) => x.e === 'fertig' && x.t === T.losGehts), iC = log.findIndex((x) => x.e === 'start' && x.t === ctxSay);
    if (!(iL >= 0 && iC > iL)) fail('Anweisung beginnt vor dem Ende von „Los geht\'s“');
    console.log('✓ Start: „Los geht\'s“ zu Ende gesprochen, danach die Anweisung; dreifaches Antippen startet einmal');

    // 🔈 liest die aktuell relevante Anweisung
    await H.touch('#repeat'); await H.ruhig('Wiederholen');
    log = await H.log();
    if (log.filter((x) => x.e === 'start').pop().t !== ctxSay) fail('🔈 liest nicht die aktuelle Anweisung');
    const plan = await H.hilfeBisRueckmeldung(); // Hilfe (Zwischenschritte als Kurzrückmeldung), bis zur vollen Rückmeldung
    await H.ruhig('Rückmeldung');
    await H.touch('#repeat'); await H.ruhig('Wiederholen Rückmeldung');
    log = await H.log();
    const fbSay = await H.fiq('relevant');
    if (log.filter((x) => x.e === 'start').pop().t !== fbSay || !/./.test(fbSay)) fail('🔈 in der Rückmeldung liest nicht die Erklärung');
    if (plan.k !== 'dribbeln') fail('Hilfe erwartet Dribbeln');
    console.log('✓ 🔈 wiederholt die aktuelle Anweisung bzw. die Erklärung der Rückmeldung');

    // Schnelles Mehrfach-Antippen von „Weiterspielen“: genau ein Schritt
    const d0 = await H.fiq('dec');
    const nb = await H.box('#fbNext');
    for (let i = 0; i < 3; i++) await H.page.touchscreen.tap(nb.x + nb.width / 2, nb.y + nb.height / 2);
    await H.waitMode(['decide', 'wechsel']);
    await H.page.waitForTimeout(300);
    if ((await H.fiq('dec')) !== d0 + 1) fail(`Mehrfach-Tipp auf „Weiterspielen“: dec ${d0} → ${await H.fiq('dec')}`);
    console.log('✓ Dreifaches Antippen von „Weiterspielen“ geht genau einen Schritt weiter');

    // bis zum Situationswechsel mit der Hilfe; dort nichts antippen: „Neue Situation“ ganz, danach die neue Anweisung
    for (let i = 0; i < 8; i++) {
      await H.waitMode('decide'); await H.hilfeBisRueckmeldung();
      const sit = (await H.fiq('S')).situation;
      await H.touch('#fbNext');
      await H.page.waitForTimeout(50);
      if ((await H.fiq('S')).situation !== sit) break;
    }
    if ((await H.mode()) !== 'wechsel') fail('Situationswechsel ohne Übergang: ' + (await H.mode()));
    const tWechsel = await H.now();
    await H.waitMode('decide'); await H.ruhig('Situationswechsel');
    log = await H.log();
    if (!ganz(log, T.neueSituation)) fail('„Neue Situation“ wird abgeschnitten');
    const iN = log.findLastIndex((x) => x.e === 'fertig' && x.t === T.neueSituation), ctx2 = (await H.fiq('ctx')).say;
    const iC2 = log.findLastIndex((x) => x.e === 'start' && x.t === ctx2);
    if (!(iC2 > iN)) fail('Neue Anweisung beginnt vor dem Ende von „Neue Situation“');
    // Bezugspunkt = Antippen von „Weiterspielen“ (Abbruch der Rückmeldung), sonst Beginn der Ansage
    const tS = log.findLast((x) => x.e === 'speak' && x.t === T.neueSituation).at;
    const cut = log.findLast((x) => x.e === 'cancel' && x.at <= tS && x.at >= tS - 150);
    const tN = cut ? cut.at : tS;
    if (log[iC2].at - tN < 1190) fail(`Neue Situation kürzer als 1,2 s sichtbar (${Math.round(log[iC2].at - tN)} ms)`);
    if (tN < tWechsel - 400) fail('Zeitmessung');
    nurNachTipp(log, 'Sprache');
    console.log('✓ Situationswechsel: „Neue Situation“ zu Ende gesprochen, dann die neue Anweisung; keine Ansage ohne Antippen abgebrochen');

    // Übersicht während des Übergangs „Anders probieren“: nichts läuft weiter
    await H.hilfeBisRueckmeldung();
    await H.touch('#fbRetry'); await H.touch('#home');
    const tHome = await H.now();
    await H.page.waitForTimeout(2500);
    log = await H.log();
    if ((await H.mode()) !== 'start' || !(await H.page.isVisible('#startScreen'))) fail('Übersicht während „Anders probieren“: ' + (await H.mode()));
    if (log.some((x) => x.e === 'speak' && x.at > tHome + 5)) fail('Nach 🏠 wird noch gesprochen: ' + JSON.stringify(log.filter((x) => x.e === 'speak' && x.at > tHome)));
    const sp = await H.fiq('speech'); if (sp.timers || sp.waiters || sp.cur || sp.queue.length) fail('Nach 🏠 laufen noch Aufträge: ' + JSON.stringify(sp));
    console.log('✓ 🏠 während „Anders probieren“: kein Geisterablauf, keine Ansage, keine offenen Timer');

    // Übersicht während des Situationswechsels
    await H.selectAndPlay('freie-bahn'); await H.waitMode('decide');
    for (let i = 0; i < 8; i++) {
      await H.waitMode('decide'); await H.hilfeBisRueckmeldung();
      const sit = (await H.fiq('S')).situation; await H.touch('#fbNext'); await H.page.waitForTimeout(30);
      if ((await H.fiq('S')).situation !== sit) break;
    }
    if ((await H.mode()) !== 'wechsel') fail('kein Situationswechsel erreicht');
    await H.touch('#home'); const tH2 = await H.now();
    await H.page.waitForTimeout(3000);
    log = await H.log();
    if ((await H.mode()) !== 'start' || log.some((x) => x.e === 'speak' && x.at > tH2 + 5)) fail('🏠 während Situationswechsel: Ablauf läuft weiter');
    console.log('✓ 🏠 während des Situationswechsels: Übergang abgebrochen, nichts nachträglich gesprochen');

    // Übersicht direkt nach dem Schau-Schritt (Mission 1)
    await H.selectAndPlay('mission-1'); await H.waitMode('look'); await H.ruhig('Schau-Frage');
    const id = await H.page.evaluate(() => FIQ.passOptions(window.__fiq.S).sort((a, b) => b.margin - a.margin)[0].id);
    const p = await H.page.evaluate((i) => { const q = FIQ.P(window.__fiq.S, i); return [q.x, q.y]; }, id);
    await H.field(...p); await H.until(() => window.__fiq.look && window.__fiq.look.done, 'Schau-Antwort');
    await H.touch('#home'); const tH3 = await H.now(); await H.page.waitForTimeout(3500);
    log = await H.log();
    if ((await H.mode()) !== 'start' || log.some((x) => x.e === 'speak' && x.at > tH3 + 5)) fail('🏠 nach dem Schau-Schritt: Ablauf läuft weiter');
    nurNachTipp(log, 'Sprache gesamt');
    console.log('✓ 🏠 nach dem Schau-Schritt: kein Wechsel ins Entscheiden hinter der Übersicht');
    await H.close();
  }

  // ------------------------------------------------------------------ 2. Safari: Ende wird nie gemeldet / Ereignisse kommen spät
  for (const v of [{ name: 'kein Ende-Ereignis', cfg: { ms: 12, keinEnde: true } }, { name: 'verspätete Ereignisse (1,5 s)', cfg: { ms: 12, spaet: 1500 } }]) {
    const H = await open(IPAD, v.cfg);
    const T = await H.page.evaluate(() => FIQ.texts('freie-bahn').bedienung);
    await H.selectAndPlay('freie-bahn'); await H.waitMode('decide');
    let tSwitch = null;
    for (let i = 0; i < 8; i++) {
      await H.waitMode('decide', 30000); await H.hilfeBisRueckmeldung();
      const sit = (await H.fiq('S')).situation; await H.touch('#fbNext'); await H.page.waitForTimeout(30);
      if ((await H.fiq('S')).situation !== sit) { tSwitch = await H.now(); break; }
    }
    if (tSwitch == null) fail(v.name + ': kein Situationswechsel');
    await H.waitMode('decide', 15000);
    const dt = (await H.now()) - tSwitch;
    const ctx = (await H.fiq('ctx')).say;
    await H.page.waitForTimeout(800);
    const log = (await H.log()).filter((x) => x.at >= tSwitch && x.e === 'start').map((x) => x.t);
    if (log[0] !== T.neueSituation || log.slice(1).some((t) => t !== ctx)) fail(`${v.name}: nach dem Wechsel gesprochen: ${JSON.stringify(log)}`);
    nurNachTipp(await H.log(), v.name);
    await H.touch('#home'); const tH = await H.now(); await H.page.waitForTimeout(3000);
    if ((await H.log()).some((x) => x.e === 'speak' && x.at > tH + 5)) fail(v.name + ': nach 🏠 wird noch gesprochen');
    console.log(`✓ Safari-Fall ${v.name}: App läuft weiter (Wechsel nach ${(dt / 1000).toFixed(1)} s), keine alte Ansage später, keine Abbrüche ohne Antippen`);
    await H.close();
  }

  // ------------------------------------------------------------------ 3. Navigation (iPad, Touch)
  {
    const H = await open(IPAD, { ms: 2 });
    // Hilfe bei nur einer Aktion: keine Aktionsknöpfe, Hilfe sichtbar und nutzbar
    await H.selectAndPlay('freie-bahn'); await H.waitMode('decide');
    if ((await H.page.$$('#actions .act:not(.hint)')).length || !(await H.page.isVisible('#actions .hint')) || (await H.page.isVisible('#cancel'))) fail('Einzelaktion: Aktionsleiste nicht wie erwartet');
    await H.reachable('#actions .hint');
    await H.touch('#actions .hint');
    if (!/^💡/.test(await H.text('#step'))) fail('Hilfe bei Einzelaktion ohne Wirkung');
    console.log('✓ Nur eine Aktion: keine Aktionsauswahl, kein „Zurück“, Hilfe sichtbar und per Touch nutzbar');

    // ↺ während der Mission: Abfrage, ✖ spielt weiter
    const run0 = await H.fiq('run');
    await H.touch('#restart');
    if (!(await H.page.isVisible('#confirm')) || !(await H.fiq('paused'))) fail('↺ öffnet keine Abfrage');
    await H.reachable('#confirmYes'); await H.reachable('#confirmNo');
    await H.touch('#confirmNo');
    if ((await H.page.isVisible('#confirm')) || (await H.mode()) !== 'decide') fail('✖ spielt nicht weiter');
    // Entscheidung, Animation läuft: ↺ hält an, ✖ setzt fort
    const plan = await H.page.evaluate(() => FIQ.hint(window.__fiq.S, 'dribbeln'));
    await H.field(plan.point.x, plan.point.y); await H.waitMode('anim');
    await H.touch('#restart');
    const b1 = await H.page.evaluate(() => [window.__fiq.S.ball.x, window.__fiq.S.ball.y]); await H.page.waitForTimeout(500);
    const b2 = await H.page.evaluate(() => [window.__fiq.S.ball.x, window.__fiq.S.ball.y]);
    if (JSON.stringify(b1) !== JSON.stringify(b2)) fail('Spiel läuft hinter der Abfrage weiter');
    await H.touch('#confirmNo');
    // V0.6a: gute Entscheidung in Freie Bahn → Kurzrückmeldung, danach automatisch die nächste Entscheidung
    if ((await H.waitMode(['feedback', 'kurz'])) === 'feedback') await H.touch('#fbNext');
    await H.waitMode(['decide', 'wechsel']);
    if ((await H.fiq('dec')) !== 1) fail('Ablauf nach ✖ falsch');
    // ✔: gleicher Durchlauf, von vorn
    await H.touch('#restart'); await H.touch('#confirmYes'); await H.waitMode('decide');
    if ((await H.fiq('dec')) !== 0 || (await H.fiq('run')) !== run0 || (await H.text('#score')) !== '0 : 0') fail('✔ startet nicht von vorn');
    if (JSON.stringify(await H.pos()) !== JSON.stringify(await H.startPos('freie-bahn', run0))) fail('✔: andere Aufstellung als der Durchlauf');
    // schnelles Doppel-Antippen von ✔ startet einmal
    await H.touch('#restart'); const cy = await H.box('#confirmYes');
    for (let i = 0; i < 2; i++) await H.page.touchscreen.tap(cy.x + cy.width / 2, cy.y + cy.height / 2);
    await H.waitMode('decide'); if ((await H.fiq('dec')) !== 0) fail('Doppel-✔');
    console.log('✓ ↺ Neu starten: kindersichere Abfrage, Spiel steht während der Abfrage; ✖ spielt weiter; ✔ = gleicher Durchlauf von vorn');

    // Missionsende: Wege
    await H.playToEnd();
    for (const s of ['#nextMission', '#again', '#same', '#home2', '#hl']) await H.reachable(s);
    if (!/Zusammen sind wir stark/.test(await H.text('#nextMission')) || (await H.page.isVisible('#endFinal'))) fail('„Nächste Mission“ falsch: ' + (await H.text('#nextMission')));
    // Genau so nochmal = gleicher Durchlauf
    await H.touch('#same'); await H.waitMode('decide');
    if ((await H.fiq('run')) !== run0 || JSON.stringify(await H.pos()) !== JSON.stringify(await H.startPos('freie-bahn', run0))) fail('„Genau so nochmal“ ist nicht derselbe Durchlauf');
    await H.playToEnd();
    // Nochmal = nächster Durchlauf, neue Situationen
    await H.touch('#again'); await H.waitMode('decide');
    if ((await H.fiq('run')) !== run0 + 1 || JSON.stringify(await H.pos()) !== JSON.stringify(await H.startPos('freie-bahn', run0 + 1))) fail('„Nochmal“ bringt nicht den nächsten Durchlauf');
    if ((await H.fiq('S')).situation === (await H.page.evaluate(() => FIQ.newState('freie-bahn', 0).situation))) fail('„Nochmal“: gleiche erste Situation');
    console.log('✓ Missionsende: „Genau so nochmal“ = gleicher Durchlauf, „Nochmal“ = nächster Durchlauf mit neuen Situationen');
    await H.playToEnd();
    // Nächste Mission direkt
    await H.touch('#nextMission'); await H.waitMode(['look', 'decide']);
    if ((await H.fiq('id')) !== 'mission-1' || (await H.fiq('dec')) !== 0) fail('„Nächste Mission“ startet nicht Mission 1');
    await H.playToEnd();
    if (await H.page.isVisible('#nextMission')) fail('Nach der letzten Mission wird eine nächste angeboten');
    if (!(await H.page.isVisible('#endFinal'))) fail('Kein erkennbarer Abschluss nach der letzten Mission');
    for (const s of ['#again', '#home2']) await H.reachable(s);
    if ((await H.page.isVisible('#same'))) fail('Mission 1 hat keine Durchläufe – „Genau so“ überflüssig');
    await H.ruhig('Abschluss');
    const fin = await H.page.evaluate(() => FIQ.texts('mission-1').bedienung.letzteMission);
    if (!(await H.log()).some((x) => x.e === 'start' && x.t.includes(fin))) fail('Abschluss nicht angesagt');
    await H.touch('#home2'); await H.waitMode('start');
    const played = await H.page.$$eval('#missionList .mcard.played', (cs) => cs.map((c) => c.dataset.id));
    if (played.join() !== 'freie-bahn,mission-1') fail('✓ auf den Karten: ' + played);
    console.log('✓ „Nächste Mission“ startet direkt die folgende; nach der letzten: Abschluss ohne Sprung zur ersten, „Nochmal“ und „Alle Missionen“; ✓ gespielt (nur Sitzung)');
    // Welches Tor → Freie Bahn
    await H.selectAndPlay('welches-tor-ist-frei'); await H.playToEnd();
    if (!/Freie Bahn/.test(await H.text('#nextMission'))) fail('Nach „Welches Tor“ nicht „Freie Bahn“');
    await H.touch('#nextMission'); await H.waitMode('decide');
    if ((await H.fiq('id')) !== 'freie-bahn' || (await H.fiq('run')) !== run0 + 2) fail('„Nächste Mission“ → Freie Bahn falsch');
    await H.touch('#home'); await H.waitMode('start');
    nurNachTipp(await H.log(), 'Navigation');
    console.log('✓ „Welches Tor ist frei?“ → „Nächste Mission“ → „Freie Bahn!“ (nächster eigener Durchlauf); 🏠 zurück zur Übersicht');
    await H.close();
  }

  // ------------------------------------------------------------------ 3b. Ansage dauert länger als erlaubt (sehr langsame Sprachausgabe)
  // „Anders probieren“: Höchstzeit (8 s) liegt über dem Wächter (≈ 6,9 s) -> der Wächter beendet die Ansage.
  // Szenen-Wiedergabe: ihre Höchstzeit greift. In beiden Fällen: alte Ansage beendet, neue sofort danach (nicht
  // verspätet), nichts überlappt, nichts Altes wird später fortgesetzt. (wennFertig-Höchstzeit selbst: tests/sprache.test.js)
  {
    const H = await open(IPAD, { ms: 320 });
    const T = await H.page.evaluate(() => FIQ.texts('freie-bahn').bedienung);
    await H.selectAndPlay('freie-bahn'); await H.waitMode('decide');
    { const c = await H.page.evaluate(() => { const c = FIQ.carrier(window.__fiq.S); return [c.x - 3, c.y]; }); await H.field(...c); } // zurück: 💭 (volle Rückmeldung)
    await H.waitMode('feedback');
    await H.touch('#fbRetry'); const tR = await H.now();
    await H.waitMode('decide', 15000); const tD = await H.now();
    const wd = await H.page.evaluate((t) => FIQSprache.dauer(t, 0.9), T.andersProbieren);
    if (tD - tR < wd - 50 || tD - tR > wd + 600) fail(`„Anders probieren“: Übergang nach ${Math.round(tD - tR)} ms statt beim Wächter (${wd} ms)`);
    await H.page.waitForTimeout(400);   // neue Anweisung beginnt planmäßig 80 ms nach dem Abbruch (Safari-Pause)
    let log = await H.log();
    const cutA = log.find((x) => x.e === 'cancel' && x.t === T.andersProbieren);
    const ctxSay = (await H.fiq('ctx')).say;
    const stC = log.find((x) => x.e === 'start' && x.t === ctxSay && x.at > tR);
    if (!cutA || !stC || stC.at - cutA.at > 200 || stC.at < cutA.at) fail('„Anders probieren“ (Wächter): alte Ansage nicht beendet oder neue verspätet ' + JSON.stringify({ cutA, stC }));
    if (log.some((x) => x.e === 'start' && x.t === T.andersProbieren && x.at > cutA.at)) fail('„Anders probieren“ wird später fortgesetzt');
    // Vergleichen: zweite Szene beginnt, während die Ansage der ersten noch läuft (Höchstzeit der Szenen-Wiedergabe)
    const p2 = await H.page.evaluate(() => { const c = FIQ.carrier(window.__fiq.S); return [c.x, c.y < 12 ? c.y + 5 : c.y - 5]; });
    await H.field(...p2); await H.waitMode('feedback');
    await H.touch('#fbCompare'); await H.waitMode('replay');
    await H.until(() => window.__fiq.replayIdx === 1, 'zweite Szene', undefined, 40000); const t1 = await H.now();
    await H.page.waitForTimeout(400);
    log = await H.log();
    const vor = log.find((x) => x.e === 'start' && /^Vorher: /.test(x.t)), jetzt = log.find((x) => x.e === 'start' && /^Jetzt: /.test(x.t));
    const cutV = log.find((x) => x.e === 'cancel' && x.t === (vor && vor.t));
    if (!vor || !jetzt || !cutV) fail('Szenen-Wiedergabe: ' + JSON.stringify({ vor: !!vor, jetzt: !!jetzt, cutV: !!cutV }));
    if (Math.abs(cutV.at - t1) > 250 || jetzt.at - cutV.at > 200 || jetzt.at < cutV.at) fail(`Szenen-Wiedergabe: Abbruch ${Math.round(cutV.at - t1)} ms, neue Ansage ${Math.round(jetzt.at - cutV.at)} ms danach`);
    if (log.some((x) => x.e === 'start' && x.t === vor.t && x.at > cutV.at)) fail('„Vorher“-Ansage später fortgesetzt');
    // nie zwei Ansagen gleichzeitig im Sprachsystem
    let cur = null; for (const x of log) { if (x.e === 'start') { if (cur) { fail('Überlappung: ' + cur + ' / ' + x.t); } cur = x.t; } if ((x.e === 'fertig' || x.e === 'cancel') && x.t) cur = null; }
    await H.touch('#skip'); await H.waitMode('feedback'); await H.touch('#home'); await H.waitMode('start');
    console.log(`✓ Zu lange Ansage: „Anders probieren“ (Wächter nach ${(wd / 1000).toFixed(1)} s) und Szenen-Wiedergabe (Höchstzeit) beenden die laufende Ansage, die neue folgt sofort (≤ 200 ms); kein Überlappen, nichts Altes später`);
    await H.close();
  }

  // ------------------------------------------------------------------ 3d. V0.6a P3 Kurzrückmeldung: Sprache und Übergänge
  {
    const H = await open(IPAD, { ms: 12 });
    await H.selectAndPlay('freie-bahn'); await H.waitMode('decide'); await H.ruhig('Start');
    const fwd = async () => { const c = await H.page.evaluate(() => { const c = FIQ.carrier(window.__fiq.S); return [c.x + 3.5, c.y]; }); await H.field(...c); };
    // (a) Kurzrückmeldung zu Ende gesprochen (mind. 1,2 s Bild), danach die nächste Anweisung; genau eine Entscheidung weiter
    await fwd(); await H.waitMode('kurz'); const tK = await H.now(); const k = await H.fiq('kurz');
    await H.waitMode('decide', 15000); const tD = await H.now(); await H.ruhig('nach Kurzrückmeldung');
    let log = await H.log();
    const kurzSay = log.find((x) => x.e === 'speak' && x.at >= tK - 50);
    if (!kurzSay || kurzSay.t !== k.tip) fail('Kurzrückmeldung spricht nicht den Kurzsatz: ' + JSON.stringify(kurzSay));
    if (!ganz(log, k.tip)) fail('Kurzrückmeldung wird abgeschnitten');
    const ctxSay = (await H.fiq('ctx')).say;
    const iF = log.findIndex((x) => x.e === 'fertig' && x.t === k.tip), iC = log.findIndex((x) => x.e === 'start' && x.t === ctxSay && x.at > tK);
    if (!(iC > iF)) fail('Nächste Anweisung beginnt vor dem Ende der Kurzrückmeldung');
    if (tD - tK < 1150) fail(`Folge kürzer als 1,2 s sichtbar (${Math.round(tD - tK)} ms)`);
    if ((await H.fiq('dec')) !== k.dec + 1) fail('Kurzrückmeldung überspringt eine Entscheidung');
    // (b) 🔈 an der Kurzrückmeldung: ganze Erklärung; Haupt-🔈 bleibt bei der aktuellen Anweisung
    await H.touch('#kurzHoeren'); await H.ruhig('Kurz hören');
    log = await H.log(); const last = log.filter((x) => x.e === 'start').pop().t;
    if (last === ctxSay || !last.length) fail('🔈 der Kurzrückmeldung wiederholt nicht die Erklärung: ' + last);
    await H.touch('#repeat'); await H.ruhig('Wiederholen');
    if ((await H.log()).filter((x) => x.e === 'start').pop().t !== ctxSay) fail('🔈 oben liest nicht die aktuelle Anweisung');
    // (c) ↶ in der nächsten Entscheidung: zurück zur vorigen Lage, „Anders probieren“ ganz, dann die Anweisung
    await H.touch('#kurzZurueck'); await H.waitMode('decide', 15000); await H.ruhig('nach ↶');
    if ((await H.fiq('dec')) !== k.dec) fail('↶ führt nicht zur vorigen Entscheidung');
    const T = await H.page.evaluate(() => FIQ.texts('freie-bahn').bedienung);
    if (!ganz(await H.log(), T.andersProbieren)) fail('↶: Ansage abgeschnitten');
    // (d) ↺ während der Kurzrückmeldung: Übergang wartet hinter der Abfrage; ✖ setzt fort, genau eine Entscheidung weiter
    await fwd(); await H.waitMode('kurz'); await H.touch('#restart');
    const d0 = await H.fiq('dec'); await H.page.waitForTimeout(2500);
    if ((await H.mode()) !== 'kurz' || (await H.fiq('dec')) !== d0) fail('Kurzrückmeldung läuft hinter der Abfrage weiter: ' + (await H.mode()));
    await H.touch('#confirmNo'); await H.waitMode('decide', 15000);
    if ((await H.fiq('dec')) !== d0 + 1) fail('Nach ✖: nicht genau eine Entscheidung weiter');
    // (e) 🏠 während der Kurzrückmeldung: kein Geisterübergang, keine Ansage, keine offenen Aufträge
    await H.touch('#home'); await H.waitMode('start'); await H.selectAndPlay('freie-bahn'); await H.waitMode('decide');
    await fwd(); await H.waitMode('kurz'); await H.touch('#home'); const tH = await H.now();
    await H.page.waitForTimeout(3000);
    log = await H.log();
    if ((await H.mode()) !== 'start' || log.some((x) => x.e === 'speak' && x.at > tH + 5)) fail('🏠 während Kurzrückmeldung: Ablauf läuft weiter');
    const sp = await H.fiq('speech'); if (sp.timers || sp.waiters || sp.cur || sp.queue.length) fail('Nach 🏠 laufen noch Aufträge: ' + JSON.stringify(sp));
    if (await H.page.isVisible('#kurz')) fail('Kurzrückmeldung bleibt in der Übersicht sichtbar');
    nurNachTipp(await H.log(), 'Kurzrückmeldung');
    console.log('✓ Kurzrückmeldung: Kurzsatz ganz, Folge ≥ 1,2 s, dann die nächste Anweisung (keine Entscheidung übersprungen); 🔈 Erklärung; ↶ zurück; ↺ hält an; 🏠 ohne Geisterablauf');
    await H.close();
  }

  // ------------------------------------------------------------------ 3c. Doppeltipp-Sperre: nur Geistertipps auf verschwundene Knöpfe
  {
    const H = await open(IPAD, { ms: 2 });
    const taps = () => H.fiq('taps');
    // (a) Geistertipp: „Los geht's“ verschwindet, Tipp 2 an derselben Stelle innerhalb 450 ms -> verworfen
    await H.touch('#missionList .mcard[data-id="freie-bahn"]');
    const pb = await H.box('#play'); const P = [pb.x + pb.width / 2, pb.y + pb.height / 2];
    await H.page.touchscreen.tap(...P); await H.page.touchscreen.tap(P[0] + 10, P[1] + 5);
    await H.waitMode('decide');
    let t = await taps(); if (t.ghost !== 1 || t.field !== 0 || (await H.mode()) !== 'decide') fail('Geistertipp nach „Los geht\'s“ nicht verworfen: ' + JSON.stringify(t));
    // (b) gleiche Stelle, aber nach mehr als 450 ms: bewusster Tipp -> verarbeitet
    await H.page.waitForTimeout(500); await H.page.touchscreen.tap(...P);
    t = await taps(); if (t.field !== 1) fail('Tipp nach 450 ms an derselben Stelle blockiert: ' + JSON.stringify(t));
    await H.touch('#home'); await H.waitMode('start');
    // (c) kurz nach dem verschwundenen Knopf, aber deutlich woanders (> 48 px): bewusster Tipp -> Dribbling startet
    await H.touch('#missionList .mcard[data-id="freie-bahn"]');
    const far = await H.page.evaluate(() => { const c = FIQ.newState('freie-bahn', window.__fiq.run + 0).players.find((p) => p.team === 'blue'); return [c.x + 4, c.y - 3]; });
    await H.page.touchscreen.tap(...P);
    const fb = await H.page.$eval('#field', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, window.__fiq.view]; }); const k = fb[2] / fb[3].w;
    const FP = [fb[0] + (far[0] - fb[3].x0) * k, fb[1] + (far[1] - fb[3].y0) * k];
    if (Math.hypot(FP[0] - P[0], FP[1] - P[1]) < 60) fail('Testaufbau: Zielpunkt zu nah am Knopf');
    await H.page.waitForTimeout(120); await H.page.touchscreen.tap(...FP);
    await H.waitMode(['anim', 'feedback', 'kurz']);
    // (d) Knopf bleibt sichtbar (gewählte Aktion / Hilfe), Feld-Tipp direkt daneben innerhalb 450 ms -> verarbeitet
    await H.touch('#home'); await H.waitMode('start');
    await H.selectAndPlay('mission-1'); await H.look();
    const nb = await H.page.evaluate(() => { const b = [...document.querySelectorAll('#actions .act:not(.hint)')].find((x) => /Dribbeln/.test(x.textContent)).getBoundingClientRect(); const c = document.getElementById('field').getBoundingClientRect(); return { bx: b.left + b.width / 2, by: b.top + 4, cb: c.bottom }; });
    const B = [nb.bx, nb.by], C = [nb.bx, nb.cb - 3];
    if (Math.hypot(C[0] - B[0], C[1] - B[1]) >= 48) fail('Testaufbau: Feldpunkt nicht innerhalb 48 px vom Knopf ' + JSON.stringify(nb));
    const before = await taps();
    await H.page.touchscreen.tap(...B); await H.page.waitForTimeout(60); await H.page.touchscreen.tap(...C);
    t = await taps();
    if ((await H.fiq('sel')).action !== 'dribbeln') fail('Aktionsknopf nicht gewählt');
    if (t.field !== before.field + 1 || t.ghost !== before.ghost) fail('Bewusster Feld-Tipp direkt neben dem gewählten Aktionsknopf blockiert: ' + JSON.stringify({ before, t }));
    // (e) Hilfe-Knopf bleibt sichtbar: Feld-Tipp daneben innerhalb 450 ms -> verarbeitet
    // erstes Antippen der Hilfe ändert den Hinweistext und damit das Layout -> danach messen, zweites Antippen prüfen
    const geo = () => H.page.evaluate(() => { const b = document.querySelector('#actions .hint').getBoundingClientRect(); const c = document.getElementById('field').getBoundingClientRect(); return { bx: b.left + b.width / 2, by: b.top + 4, cb: c.bottom, cl: c.left, cr: c.right }; });
    let hb = await geo(); await H.page.touchscreen.tap(hb.bx, hb.by); await H.page.waitForTimeout(300);
    hb = await geo();
    if (hb.bx < hb.cl || hb.bx > hb.cr || Math.hypot(0, hb.by - (hb.cb - 3)) >= 48) fail('Testaufbau Hilfe: ' + JSON.stringify(hb));
    const b2 = await taps();
    await H.page.touchscreen.tap(hb.bx, hb.by); await H.page.waitForTimeout(60); await H.page.touchscreen.tap(hb.bx, hb.cb - 3);
    t = await taps(); if (t.field !== b2.field + 1 || t.ghost !== b2.ghost) fail('Feld-Tipp nach „Hilfe“ blockiert: ' + JSON.stringify({ b2, t, hb }));
    await H.touch('#home'); await H.waitMode('start');
    console.log('✓ Doppeltipp-Sperre: verwirft nur Tipps auf einen gerade verschwundenen Knopf (≤ 450 ms, ≤ 48 px); bewusste Tipps danach (> 450 ms), woanders oder neben sichtbaren Knöpfen (Aktion, Hilfe) werden verarbeitet');
    await H.close();
  }

  // ------------------------------------------------------------------ 4. Smartphone hochkant und quer (Touch)
  for (const vp of [{ width: 390, height: 844, name: 'Handy hochkant' }, { width: 844, height: 390, name: 'Handy quer' }]) {
    const H = await open({ width: vp.width, height: vp.height }, { ms: 2 });
    // Startbildschirm mit drei Karten: auf kleinen Handys scrollbar (wie V0.5.0) – nach dem Scrollen per Touch erreichbar
    await H.reachable('#missionList .mcard[data-id="freie-bahn"]', true);
    await H.touch('#missionList .mcard[data-id="freie-bahn"]'); await H.reachable('#play', true); await H.touch('#play'); await H.waitMode('decide');
    for (const s of ['#actions .hint', '#restart', '#home', '#repeat']) await H.reachable(s);
    await H.touch('#restart'); await H.reachable('#confirmYes'); await H.reachable('#confirmNo'); await H.touch('#confirmNo');
    await H.page.waitForTimeout(500);   // Geistertipp-Schutz: kein Feld-Tipp innerhalb 450 ms an der Stelle des verschwundenen „Nein“-Knopfs
    // V0.6a: Kurzrückmeldung – ↶ und 🔈 in der nächsten Entscheidung ohne Scrollen erreichbar, Hilfe weiter erreichbar
    { const c = await H.page.evaluate(() => { const c = FIQ.carrier(window.__fiq.S); return [c.x + 3.5, c.y]; }); await H.field(...c); }
    await H.waitMode('kurz'); await H.waitMode('decide', 15000);
    for (const s of ['#kurzZurueck', '#kurzHoeren', '#actions .hint']) await H.reachable(s);
    await H.playToEnd();
    for (const s of ['#nextMission', '#again', '#same', '#home2']) await H.reachable(s);
    await H.touch('#nextMission'); await H.waitMode(['look', 'decide']);
    if ((await H.fiq('id')) !== 'mission-1') fail(vp.name + ': „Nächste Mission“');
    await H.touch('#restart'); await H.touch('#confirmYes'); await H.waitMode('look');
    await H.touch('#home'); await H.waitMode('start');
    console.log(`✓ ${vp.name}: Hilfe, ↺ mit Abfrage, Missionsende-Knöpfe ohne Scrollen per Touch erreichbar; „Nächste Mission“ und Neustart funktionieren`);
    await H.close();
  }
} catch (e) { console.error('✗ Navigation:', e.message); if (process.env.DEBUG) console.error(e.stack); exit = 1; }
finally { await browser.close(); server.close(); process.exit(exit); }
