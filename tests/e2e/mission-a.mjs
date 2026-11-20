// Mission „Welches Tor ist frei?“ im Browser (iPad-Größe, Touch): Auswahl, alle 4 Durchläufe über „Nochmal“,
// Hilfe und gesprochene Rückmeldungen, A3 komplett (Pass → Annahme → Schuss), A5 beide Tore ⭐, Fehlschüsse mit Erklärung,
// nahtloser Situationswechsel (nächste Startaufstellung sofort sichtbar, angesagt). Zeichnet eine Mitschrift auf und
// vergleicht sie mit der Referenz (tests/golden/referenz.js → missionA.ui).
//   node tests/e2e/mission-a.mjs                 -> prüfen + vergleichen
//   node tests/e2e/mission-a.mjs --write F       -> Mitschrift nach F schreiben (Referenz bzw. vorgelegte Aufnahme erzeugen)
//   SLOW=6 node tests/e2e/mission-a.mjs          -> mit 6-fach gedrosselter CPU (langsames Gerät)
import { chromium } from 'playwright';
import { vergleiche } from '../helpers/ui-abweichungen.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const REF = createRequire(import.meta.url)('../golden/referenz.js');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
}).listen(0);
const base = `http://localhost:${server.address().port}/`;
const fail = (m) => { throw new Error(m); };
const ID = 'welches-tor-ist-frei';
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
let exit = 0;

try {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  if (process.env.SLOW) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.SLOW) }); }
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__said = [];
    if (true) { /* V0.5.1: nachgebaute Sprachausgabe, die jede Ansage im selben Moment beendet – die Mitschrift hält jede angeforderte Ansage fest, unabhängig vom Sprachsystem der Umgebung; Zeitverhalten prüft e2e/navigation.mjs */ const fake = { speaking: false, pending: false, paused: false, speak(u) { window.__said.push(u.text); if (u.onend) u.onend({}); }, cancel() {}, resume() {}, pause() {}, getVoices() { return []; }, addEventListener() {} }; Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true }); }
  });
  await page.goto(base + 'index.html');
  const mode = () => page.evaluate(() => window.__fiq.mode);
  const waitMode = async (m) => { const t = Date.now(); while (Date.now() - t < 25000) { if (errors.length) fail('JS-Fehler: ' + errors.join('; ')); if ((await mode()) === m) return; await page.waitForTimeout(40); } fail(`Modus ${m} erwartet, ist ${await mode()}`); };
  const until = async (fn, what, arg) => { const t = Date.now(); while (Date.now() - t < 4000) { if (await page.evaluate(fn, arg)) return; await page.waitForTimeout(40); } fail('nicht erreicht: ' + what); };
  const touch = async (sel) => { const b = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  const field = async (x, y) => { const b = await page.$eval('#field', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, window.__fiq.view]; }); const k = b[2] / b[3].w; await page.touchscreen.tap(b[0] + (x - b[3].x0) * k, b[1] + (y - b[3].y0) * k); };
  const text = (sel) => page.$eval(sel, (e) => (e.hidden ? '' : e.textContent.trim())).catch(() => '');
  const said = async () => /* V0.5.1: erst lesen, wenn die Sprachsteuerung alle angeforderten Ansagen gestartet hat */ (await page.waitForFunction(() => { const s = window.__fiq && window.__fiq.speech; return !s || (!s.cur && !s.queue.length); }, null, { timeout: 5000 }), page.evaluate(() => window.__said.splice(0)));
  const actions = () => page.$$eval('#actions .act:not(.hint)', (bs) => bs.map((b) => b.textContent.trim()));
  const state = () => page.evaluate(() => ({ sit: window.__fiq.S.situation, p: window.__fiq.S.players.map((p) => [p.id, +p.x.toFixed(2), +p.y.toFixed(2)]), carrier: FIQ.carrier(window.__fiq.S) && FIQ.carrier(window.__fiq.S).id }));
  const startOf = (id) => page.evaluate(([mid, sid]) => FIQ.mission(mid).situationen.find((x) => x.id === sid).start.spieler.map((p) => [p.id, p.x, p.y]), [ID, id]);
  const log = []; globalThis.__log = log;

  const decision = async (where) => { await waitMode('decide'); const st = await state(); log.push({ where, sit: st.sit, said: await said(), title: await text('#title'), tag: await text('#tag'), actions: await actions() }); return st; };
  const choose = async (label) => { if (!(await page.evaluate(() => !!window.__fiq.sel))) await touch(`#actions .act:not(.hint) >> text=${label}`); await until(() => !!window.__fiq.sel, 'Aktion gewählt'); };
  const feedback = async () => {
    await waitMode('feedback');
    const fb = { said: await said(), fb: [await text('#fbText'), await text('#fbTip'), await text('#fbRec'), await text('#fbExe'), await text('#fbStar')], lern: await text('#fbLern'), sitNochmal: await page.isVisible('#fbSit') };
    log.push(fb); return fb;
  };
  // Weiter: Bei Situationswechsel muss sofort die neue Startaufstellung zu sehen sein (kein Neustart-Bild), angesagt.
  const next = async () => {
    const before = await state();
    await touch('#fbNext');
    const m = await mode(); if (m === 'end') return 'end';
    const after = await state();
    if (after.sit !== before.sit) {
      const want = await startOf(after.sit);
      if (JSON.stringify(after.p) !== JSON.stringify(want)) fail(`Situationswechsel ${before.sit}→${after.sit}: Aufstellung ${JSON.stringify(after.p)} statt ${JSON.stringify(want)}`);
      if (!(await page.isHidden('#feedback'))) fail('Rückmeldung bleibt beim Situationswechsel stehen');
      const st = await text('#step');
      if (!/Neue Situation/.test(st)) fail('Situationswechsel nicht angezeigt: ' + st);
      log.push({ wechsel: [before.sit, after.sit], step: st });
    }
    return 'weiter';
  };
  const viaHint = async () => {
    const plan = await page.evaluate(() => { const S = window.__fiq.S, c = window.__fiq.ctx, k = FIQ.recommend(S, c.actions); return { k, h: FIQ.hint(S, k) }; });
    await touch('#actions .hint'); await until(() => !!window.__fiq.sel, 'Hilfe wählt Aktion');
    log.push({ hilfe: plan.k, said: await said() });
    const taps = []; if (plan.h.ids) taps.push(await page.evaluate((id) => { const q = FIQ.P(window.__fiq.S, id); return [q.x, q.y]; }, plan.h.ids[0]));
    if (plan.h.goal != null) taps.push([36, plan.h.goal === 0 ? 6 : 18]);
    if ((plan.k === 'dribbeln' || plan.k === 'freilaufen') && plan.h.point) taps.push([plan.h.point.x, plan.h.point.y]); // Dribbel- bzw. Laufziel
    for (const t of taps) await field(...t);
    return plan;
  };
  const shoot = async (goal) => { await choose('Schießen'); await field(36, goal === 0 ? 6 : 18); };
  const pass = async (id) => { await choose('Passen'); const q = await page.evaluate((i) => { const p = FIQ.P(window.__fiq.S, i); return [p.x, p.y]; }, id); await field(...q); };
  const expectStar = (fb, star, what) => { if ((fb.fb[4] === '⭐') !== star) fail(`${what}: ${star ? '⭐' : '💭'} erwartet, ist ${fb.fb[4]} – ${fb.fb[0]}`); };
  const end = async (what) => { await waitMode('end'); log.push({ end: what, said: await said(), stars: await page.$$eval('#stars span', (x) => x.map((s) => (s.classList.contains('on') ? '★' : '☆')).join('')), score: await text('#endScore'), msg: await text('#endMsg') }); };

  // Start: vorausgewählt, vorlesen, starten
  log.push({ start: await page.$$eval('#missionList .mcard', (cs) => cs.map((c) => [c.dataset.id, c.querySelector('.num').textContent, c.querySelector('b').textContent, c.querySelector('small').textContent, c.classList.contains('sel')])) });
  await touch(`#missionList .mcard[data-id="${ID}"]`); log.push({ gewaehlt: await said() });
  await touch('#play');

  // Ganze Situation mit der Hilfe; am Ende Lernergebnis „geschafft mit Hilfe“
  const hilfeSituation = async (sit) => {
    for (let i = 0; i < 6; i++) {
      await viaHint(); const fb = await feedback(); expectStar(fb, true, `${sit} Hilfe ${i + 1}`);
      const ende = !!fb.lern;
      if (ende && !/^⭐💡 Geschafft/.test(fb.lern)) fail(`${sit}: „geschafft mit Hilfe“ erwartet, ist „${fb.lern}“`);
      const n = await next(); if (n === 'end' || ende) return n;
      const st = await decision(sit + ' weiter'); if (st.sit !== sit) fail(`${sit}: Situation wechselt ohne Lernergebnis`);
    }
    fail(sit + ': Situation endet nicht mit der Hilfe');
  };
  const stars = () => log[log.length - 1].stars;

  // Durchlauf 1 (A1 · A2 · A3 · W1): Lernaufbau freies Tor → beide zu → nochmal schauen; W1 erst falsch (Wächter verschoben), „Nochmal“, dann mit Hilfe
  for (const sit of ['A1', 'A2']) {
    const st = await decision('entscheiden');
    if (st.sit !== sit) fail(`Durchlauf 1: ${sit} erwartet, ist ${st.sit}`);
    if (st.carrier !== 'b1') fail('Blau 1 hat nicht den Ball');
    await hilfeSituation(sit);
  }
  let st = await decision('entscheiden'); if (st.sit !== 'A3') fail('A3 erwartet');
  await pass('b2'); let fb = await feedback(); expectStar(fb, true, 'A3 Pass'); if (fb.lern) fail('A3: Lernergebnis schon nach dem Pass: ' + fb.lern); await next();
  st = await decision('nach Pass'); if (st.sit !== 'A3' || st.carrier !== 'b2') fail('A3: Blau 2 hat nach dem Pass nicht den Ball: ' + JSON.stringify(st));
  const acts = await actions(); if (!acts.some((a) => /Schießen/.test(a)) || acts.some((a) => /Freilaufen/.test(a))) fail('A3 nach dem Pass: ' + acts.join(', '));
  await viaHint(); fb = await feedback(); expectStar(fb, true, 'A3 Schuss Blau 2');
  if (!/^⭐ Geschafft: Beide Tore waren zu/.test(fb.lern)) fail('A3: Lernergebnis ohne Hilfe erwartet (Hilfe nur beim Schuss danach): ' + fb.lern);
  await next();
  st = await decision('entscheiden'); if (st.sit !== 'W1') fail('W1 erwartet');
  const w1 = log[log.length - 1]; if (!/Noch zu weit fürs Tor/.test(w1.title + ' ' + w1.said.join(' '))) fail('W1: Ansage „Noch zu weit fürs Tor“ fehlt');
  await choose('Dribbeln'); await field(31, 15); fb = await feedback(); expectStar(fb, true, 'W1 Dribbling Richtung unteres (vorher freies) Tor'); await next();
  st = await decision('W1 in der Schusszone'); if (st.sit !== 'W1') fail('W1: Situation endet nach dem Dribbling');
  await shoot(1); fb = await feedback(); expectStar(fb, false, 'W1 Schuss aufs vorher freie Tor');
  if (!/ist vor das untere Tor gelaufen/.test(fb.said.join(' ')) || !/Das obere Tor war frei/.test(fb.said.join(' '))) fail('W1: Ursache „Wächter verschoben“ fehlt: ' + fb.said);
  if (!/^🔁 Das üben wir nochmal: Nach dem Dribbeln nochmal schauen/.test(fb.lern) || !fb.sitNochmal) fail('W1: nicht geschafft mit „Nochmal“ erwartet: ' + fb.lern);
  await touch('#fbSit'); st = await decision('W1 nochmal');
  if (st.sit !== 'W1' || JSON.stringify(st.p) !== JSON.stringify(await startOf('W1'))) fail('„Nochmal“ startet W1 nicht in der Startaufstellung');
  await hilfeSituation('W1');
  await end('Durchlauf 1'); if (stars() !== '★★★★') fail('Durchlauf 1: ' + stars());
  console.log('✓ Durchlauf 1 (A1 · A2 · A3 · W1): ein Stern je Situation; A3 erst mit dem Schuss nach dem Pass geschafft; W1 Wächter verschoben erklärt, „Nochmal“ von vorn, dann geschafft');

  // Durchlauf 2 (A2 · A5 · A3m · W1m): A2 oben ⭐, A5 unten ⭐ (beide frei), A3m Schuss trotz zugestellter Tore 💭 (nicht geschafft)
  await touch('#again');
  st = await decision('entscheiden'); if (st.sit !== 'A2') fail('„Nochmal“ bringt nicht Durchlauf 2');
  await shoot(0); fb = await feedback(); expectStar(fb, true, 'A2 Tor oben'); if (!/^⭐ Geschafft/.test(fb.lern)) fail('A2: ' + fb.lern); await next();
  st = await decision('entscheiden'); if (st.sit !== 'A5') fail('A5 erwartet');
  await shoot(1); expectStar(await feedback(), true, 'A5 Tor unten'); await next();
  st = await decision('entscheiden'); if (st.sit !== 'A3m') fail('A3m erwartet');
  await shoot(1); const b3 = await feedback(); expectStar(b3, false, 'A3m Schuss trotz zugestellter Tore');
  if (!/Beide Tore waren zugestellt/.test(b3.said.join(' '))) fail('A3m Fehlschuss: Erklärung fehlt: ' + b3.said);
  if (!/^🔁/.test(b3.lern)) fail('A3m: nicht geschafft erwartet: ' + b3.lern);
  await next();
  st = await decision('entscheiden'); if (st.sit !== 'W1m') fail('W1m erwartet'); await hilfeSituation('W1m');
  await end('Durchlauf 2'); if (stars() !== '★★☆★') fail('Durchlauf 2: ' + stars());
  console.log('✓ Durchlauf 2 (A2 · A5 · A3m · W1m): beide freien Tore ⭐; Schuss trotz zugestellter Tore 💭 und nicht geschafft');

  // Durchlauf 3 (A4 · A1 · A3 · W1m): A4 in Rot 1 hineindribbeln (💭, Erklärung), A1 aufs zugestellte Tor 💭
  await touch('#again');
  st = await decision('entscheiden'); if (st.sit !== 'A4') fail('Durchlauf 3 beginnt nicht mit A4');
  await choose('Dribbeln'); await field(24, 9.5);
  const f4 = await feedback(); expectStar(f4, false, 'A4 in den Gegner');
  if (!/direkt auf einen Gegner/.test(f4.said.join(' '))) fail('A4: Erklärung fehlt: ' + f4.said);
  await next();
  st = await decision('entscheiden'); if (st.sit !== 'A1') fail('A1 erwartet');
  await shoot(0); const b1 = await feedback(); expectStar(b1, false, 'A1 Tor oben (zugestellt)');
  if (!/Rot 2 stand vor dem Tor/.test(b1.said.join(' ')) || !/Das andere Tor war frei/.test(b1.said.join(' '))) fail('A1 Fehlschuss: Erklärung fehlt: ' + b1.said);
  if ((b1.said.join(' ').match(/Rot 2 stand/g) || []).length !== 1) fail('A1: Ursache doppelt genannt: ' + b1.said);
  await next();
  for (const sit of ['A3', 'W1m']) { st = await decision('entscheiden'); if (st.sit !== sit) fail(sit + ' erwartet'); await hilfeSituation(sit); }
  await end('Durchlauf 3'); if (stars() !== '☆☆★★') fail('Durchlauf 3: ' + stars());
  console.log('✓ Durchlauf 3 (A4 · A1 · A3 · W1m): in den Gegner 💭 erklärt; geblockter Schuss erklärt (Ursache nur einmal)');

  // Durchläufe 4 und 5 mit der Hilfe; in 5 nimmt A4 den anderen guten Weg (Pass zu Blau 2)
  await touch('#again');
  for (const sit of ['A5', 'A2', 'A3m', 'W1']) { st = await decision('entscheiden'); if (st.sit !== sit) fail(`Durchlauf 4: ${sit} erwartet, ist ${st.sit}`); await hilfeSituation(sit); }
  await end('Durchlauf 4'); if (stars() !== '★★★★') fail('Durchlauf 4: ' + stars());
  await touch('#again');
  st = await decision('entscheiden'); if (st.sit !== 'A1') fail('Durchlauf 5 beginnt nicht mit A1'); await hilfeSituation('A1');
  st = await decision('entscheiden'); if (st.sit !== 'A4') fail('A4 erwartet');
  await pass('b2'); expectStar(await feedback(), true, 'A4 Pass zu Blau 2 (auch gut)'); await next();
  st = await decision('A4 weiter'); if (st.sit !== 'A4') fail('A4: Situation endet nach dem Pass'); await hilfeSituation('A4');
  for (const sit of ['A3m', 'W1m']) { st = await decision('entscheiden'); if (st.sit !== sit) fail(sit + ' erwartet'); await hilfeSituation(sit); }
  await end('Durchlauf 5'); if (stars() !== '★★★★') fail('Durchlauf 5: ' + stars());
  // Danach wieder Durchlauf 1
  await touch('#again'); st = await decision('entscheiden'); if (st.sit !== 'A1') fail('Nach Durchlauf 5 nicht wieder A1');
  if (errors.length) fail('JS-Fehler: ' + errors.join('; '));
  console.log('✓ Durchläufe 4–5 mit der Hilfe, A4 auch über den Pass ⭐; Rückkehr zu Durchlauf 1; keine JavaScript-Fehler' + (process.env.SLOW ? ` (CPU ${process.env.SLOW}× gedrosselt)` : ''));

  const wi = process.argv.indexOf('--write');
  if (wi > 0 && process.argv.indexOf('--pending-write') < 0) { fs.writeFileSync(process.argv[wi + 1], JSON.stringify(log, null, 1)); console.log('Mitschrift geschrieben:', process.argv[wi + 1]); }
  else {
    const ref = JSON.parse(fs.readFileSync(path.join(here, '..', 'golden', REF.missionA.ui), 'utf8'));
    // vorgelegte, noch nicht freigegebene Abweichungen: tests/golden/ui-missionA-abweichungen-*.json (--pending-write F erzeugt sie)
    console.log('✓ ' + vergleiche({ ref, log, gdir: path.join(here, '..', 'golden'), praefix: 'ui-missionA', refName: REF.missionA.ui }));
  }
  await ctx.close();
} catch (e) { console.error('✗ Mission A:', e.message); if (process.env.DEBUG && globalThis.__log) console.error(JSON.stringify(globalThis.__log.slice(-4))); exit = 1; }
finally { await browser.close(); server.close(); process.exit(exit); }
