// Mission „Freie Bahn!“ im Browser (iPad-Größe, Touch): Auswahl, alle 5 Durchläufe über „Nochmal“, nur Dribbeln bzw.
// Schießen, gute und schlechte Dribblings mit Erklärung, V0.6a: Lernaufbau B3 → V1 → L4e → L4b, Kurzrückmeldung (P3) mit
// ↶ und 🔈, Lernergebnis je Situation (P4) mit „Nochmal“, breite Lücke außen herum, freies Tor in B5, Hilfe-Wege,
// nahtloser Situationswechsel. Zeichnet eine Mitschrift auf und vergleicht sie mit der Referenz (referenz.js → freieBahn.ui).
// Darunter die Vorlage aus Mission A:
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
const ID = 'freie-bahn';
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
  // V0.6a P3: nach guter Entscheidung (Situation läuft weiter) Kurzrückmeldung, dann automatisch die nächste Entscheidung
  const ergebnis = async () => {
    const t = Date.now(); let m;
    while (Date.now() - t < 25000) { if (errors.length) fail('JS-Fehler: ' + errors.join('; ')); m = await mode(); if (m === 'feedback' || m === 'kurz') break; await page.waitForTimeout(30); }
    if (m === 'feedback') return { art: 'voll', ...(await feedback()) };
    if (m !== 'kurz') fail('weder Rückmeldung noch Kurzrückmeldung: ' + m);
    const d0 = await page.evaluate(() => window.__fiq.dec);
    const k = { kurz: await text('#kurzText'), sheet: await page.isVisible('#feedback') };
    if (k.sheet) fail('Kurzrückmeldung zeigt das Rückmeldeblatt');
    if (!/^⭐ /.test(k.kurz)) fail('Kurzrückmeldung ohne Stern: ' + k.kurz);
    await waitMode('decide');
    const d1 = await page.evaluate(() => window.__fiq.dec);
    if (d1 !== d0 + 1) fail(`Automatischer Übergang überspringt Entscheidungen: ${d0} → ${d1}`);
    if (!(await page.isVisible('#kurzZurueck'))) fail('↶ Nochmal nicht sichtbar in der nächsten Entscheidung');
    k.said = await said(); log.push(k);
    return { art: 'kurz', ...k };
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
    if (plan.h.eng || plan.h.genau) fail('Hilfe ohne sicheren Weg: ' + plan.h.say);
    if ((plan.k === 'dribbeln' || plan.k === 'freilaufen') && plan.h.point) taps.push([plan.h.point.x, plan.h.point.y]); // Dribbel- bzw. Laufziel
    for (const t of taps) await field(...t);
    return plan;
  };
  const shoot = async (goal) => { await choose('Schießen'); await field(36, goal === 0 ? 6 : 18); };
  const pass = async (id) => { await choose('Passen'); const q = await page.evaluate((i) => { const p = FIQ.P(window.__fiq.S, i); return [p.x, p.y]; }, id); await field(...q); };
  const expectStar = (fb, star, what) => { if ((fb.fb[4] === '⭐') !== star) fail(`${what}: ${star ? '⭐' : '💭'} erwartet, ist ${fb.fb[4]} – ${fb.fb[0]}`); };
  const end = async (what) => { await waitMode('end'); log.push({ end: what, said: await said(), stars: await page.$$eval('#stars span', (x) => x.map((s) => (s.classList.contains('on') ? '★' : '☆')).join('')), score: await text('#endScore'), msg: await text('#endMsg') }); };

  const dribble = async (x, y) => { await choose('Dribbeln'); await field(x, y); };
  // V0.5.1: Nur Dribbeln möglich -> Aktion vorgewählt, keine Aktionsknöpfe, Hilfe sichtbar und nutzbar
  const onlyDribble = async (where) => {
    const o = await page.evaluate(() => ({ acts: window.__fiq.ctx.actions.slice(), sel: window.__fiq.sel && window.__fiq.sel.action }));
    const a = await actions();
    if (o.acts.join() !== 'dribbeln' || o.sel !== 'dribbeln' || a.length || !(await page.isVisible('#actions .hint')) || (await page.isVisible('#cancel'))) fail(`${where}: ${JSON.stringify(o)} Knöpfe ${a.join(', ')}`);
  };
  // Hilfe bis zum Tor dieser Situation (max. 6 Entscheidungen), nur ⭐; Zwischenschritte als Kurzrückmeldung
  const helpToGoal = async (sit) => {
    for (let i = 0; i < 6; i++) {
      await viaHint(); const r = await ergebnis();
      if (r.art === 'kurz') { const st = await state(); if (st.sit !== sit) fail(`${sit}: Situation wechselt nach Kurzrückmeldung`); continue; }
      expectStar(r, true, `${sit} Hilfe ${i + 1}`);
      if (!/^⭐💡 Geschafft/.test(r.lern)) fail(`${sit}: Lernergebnis „geschafft mit Hilfe“ erwartet, ist „${r.lern}“`);
      const goal = /(^|\s)Tor!/.test(r.said.join(' ')) /* Hotfix V0.6.1: gesprochen „Tor!“ */; const n = await next(); if (goal) return n;
      const st = await decision(sit + ' weiter'); if (st.sit !== sit) fail(`${sit}: Situation endet ohne Tor`);
    }
    fail(sit + ': kein Tor mit der Hilfe');
  };
  const dots = () => page.$$eval('#progress .dot', (d) => d.map((x) => x.textContent + (x.classList.contains('hilfe') ? '💡' : '') + (x.classList.contains('cur') ? '*' : '')).join(' '));

  // Start: drei Karten, „Freie Bahn!“ antippen (vorgelesen), starten
  log.push({ start: await page.$$eval('#missionList .mcard', (cs) => cs.map((c) => [c.dataset.id, c.querySelector('.num').textContent, c.querySelector('b').textContent, c.querySelector('small').textContent, c.classList.contains('sel')])) });
  await touch(`#missionList .mcard[data-id="${ID}"]`); const gew = await said(); log.push({ gewaehlt: gew });
  if (!/Freie Bahn!/.test(gew.join(' ')) || !/Schau, wo kein Roter ist/.test(gew.join(' '))) fail('Antippen liest nicht vor: ' + gew);
  await touch('#play');

  // Durchlauf 1 (B3 · V1 · L4e · L4b): Kurzrückmeldung mit ↶ und 🔈; enge Lücke nicht geschafft → „Nochmal“ → mit Hilfe
  let st = await decision('entscheiden'); if (st.sit !== 'B3') fail('Durchlauf 1 beginnt nicht mit B3');
  await onlyDribble('B3'); if (/[Pp]ass|Freund/.test(log[log.length - 1].said.join(' '))) fail('Ansage nennt Passen/Freund');
  if ((await dots()) !== '•* • • •') fail('Fortschritt je Situation: ' + (await dots()));
  await dribble(26, 12); let r = await ergebnis(); if (r.art !== 'kurz') fail('B3 nach vorn: Kurzrückmeldung erwartet');
  // 🔈 wiederholt die ganze Erklärung; ↶ macht die Entscheidung rückgängig (gleiche Lage, gleiche Entscheidung Nr.)
  await touch('#kurzHoeren'); const hoer = await said(); log.push({ kurzHoeren: hoer }); if (!hoer.join(' ').length) fail('🔈 spricht nichts');
  const dVor = await page.evaluate(() => window.__fiq.dec);
  await touch('#kurzZurueck'); await waitMode('decide');
  const zur = await state(); const start3 = await startOf('B3');
  if (JSON.stringify(zur.p) !== JSON.stringify(start3) || (await page.evaluate(() => window.__fiq.dec)) !== dVor - 1) fail('↶ stellt die vorige Entscheidung nicht wieder her');
  if (await page.isVisible('#kurz')) fail('↶ bleibt nach dem Rückgängigmachen sichtbar');
  log.push({ zurueck: await said() });
  await helpToGoal('B3');
  st = await decision('entscheiden'); if (st.sit !== 'V1') fail('V1 erwartet');
  if ((await dots()) !== '★💡 •* • •') fail('Fortschritt nach B3: ' + (await dots()));
  await helpToGoal('V1');
  st = await decision('entscheiden'); if (st.sit !== 'L4e') fail('L4e erwartet');
  await dribble(27, 12); r = await ergebnis(); if (r.art !== 'voll') fail('L4e durch die enge Lücke: volle Rückmeldung erwartet'); expectStar(r, false, 'L4e durch die enge Lücke');
  if (!/^🔁 Das üben wir nochmal/.test(r.lern)) fail('L4e: nicht geschafft erwartet: ' + r.lern);
  if (r.sitNochmal) fail('L4e: „Nochmal“ doppelt zu „Anders probieren“ (Situation hatte nur diese Entscheidung)');
  await touch('#fbRetry'); st = await decision('L4e nochmal');
  if (st.sit !== 'L4e' || JSON.stringify(st.p) !== JSON.stringify(await startOf('L4e'))) fail('„Nochmal“ startet L4e nicht in der Startaufstellung');
  await helpToGoal('L4e');
  st = await decision('entscheiden'); if (st.sit !== 'L4b') fail('L4b erwartet');
  // breite Lücke: sicher außen herum (erst seitlich, dann vorbei) – ohne Hilfe geschafft
  await dribble(22.3, 7.2); r = await ergebnis(); if (r.art !== 'kurz') fail('L4b seitlich: Kurzrückmeldung erwartet');
  await page.evaluate(() => 0); const c2 = await page.evaluate(() => { const c = FIQ.carrier(window.__fiq.S); return [c.x + 7, c.y]; });
  await dribble(...c2); r = await ergebnis();
  if (r.art === 'kurz') { /* Lücke geschafft, Abschluss folgt */ } else if (!/^⭐ Geschafft/.test(r.lern)) fail('L4b außen herum nicht geschafft: ' + r.lern);
  for (let i = 0; i < 4 && (await mode()) !== 'end'; i++) {
    if ((await mode()) === 'feedback') { const n = await next(); if (n === 'end') break; continue; }
    await viaHint(); r = await ergebnis(); if (r.art === 'voll') { if (!/Geschafft/.test(r.lern)) fail('L4b: Lernergebnis fehlt: ' + r.lern); }
  }
  await end('Durchlauf 1');
  const e1 = log[log.length - 1]; if (e1.stars !== '★★★★') fail('Durchlauf 1: 4 Sterne erwartet, ' + e1.stars);
  const liste = await page.$$eval('#endList li', (l) => l.map((x) => x.textContent.trim()));
  log.push({ endListe: liste });
  if (liste.length !== 4 || !/Platz vor dir.*⭐💡/.test(liste[0]) || !/Lücke oder außen herum.*⭐$/.test(liste[3])) fail('Endliste je Situation: ' + JSON.stringify(liste));
  console.log('✓ Durchlauf 1 (B3 · V1 · L4e · L4b): Kurzrückmeldung (Folge, 🔈, ↶ ohne Überspringen); enge Lücke nicht geschafft → „Anders probieren“; breite Lücke außen herum geschafft; ein Stern je Situation, 💡 bei Hilfe');

  // Durchlauf 2 (B3m · V1m · L4bm · L4em): V1m frontal in den Gegner 💭 mit Erklärung und „Nochmal“ – dann weiter mit der Hilfe
  await touch('#again');
  st = await decision('entscheiden'); if (st.sit !== 'B3m') fail('Durchlauf 2 beginnt nicht mit B3m'); await helpToGoal('B3m');
  st = await decision('entscheiden'); if (st.sit !== 'V1m') fail('V1m erwartet');
  await dribble(30, 12); r = await ergebnis(); expectStar(r, false, 'V1m in den Gegner');
  if (!/direkt auf einen Gegner/.test(r.said.join(' '))) fail('V1m: Erklärung fehlt: ' + r.said);
  if (!/^🔁/.test(r.lern)) fail('V1m: nicht geschafft erwartet: ' + r.lern);
  await next();
  for (const sit of ['L4bm', 'L4em']) { st = await decision('entscheiden'); if (st.sit !== sit) fail(sit + ' erwartet'); await helpToGoal(sit); }
  await end('Durchlauf 2');
  if (log[log.length - 1].stars !== '★☆★★') fail('Durchlauf 2: Sterne ' + log[log.length - 1].stars);
  console.log('✓ Durchlauf 2 (B3m · V1m · L4bm · L4em): in den Gegner 💭 mit Erklärung, Situation nicht geschafft (✓ statt ⭐)');

  // Durchlauf 3 (V1 · B5 · L4em · L4b): B5 aufs zugestellte Tor 💭 mit Erklärung
  await touch('#again');
  st = await decision('entscheiden'); if (st.sit !== 'V1') fail('Durchlauf 3 beginnt nicht mit V1'); await helpToGoal('V1');
  st = await decision('entscheiden'); if (st.sit !== 'B5') fail('B5 erwartet');
  for (let i = 0; i < 6; i++) { if ((await page.evaluate(() => window.__fiq.ctx.actions)).includes('schiessen')) break; await viaHint(); r = await ergebnis(); if (r.art === 'voll') { await next(); await decision('B5 weiter'); } }
  await choose('Schießen'); await field(36, 18); const f5 = await feedback(); expectStar(f5, false, 'B5 unteres Tor (zugestellt)');
  if (!/Rot 2/.test(f5.said.join(' '))) fail('B5: Erklärung fehlt: ' + f5.said); await next();
  for (const sit of ['L4em', 'L4b']) { st = await decision('entscheiden'); if (st.sit !== sit) fail(sit + ' erwartet'); await helpToGoal(sit); }
  await end('Durchlauf 3');
  console.log('✓ Durchlauf 3 (V1 · B5 · L4em · L4b): zugestelltes Tor 💭 mit Erklärung');

  // Durchläufe 4–5 mit der Hilfe; Rückkehr zu Durchlauf 1
  for (const [d, order] of [[4, ['B3m', 'V1m', 'L4e', 'L4bm']], [5, ['B5', 'V1', 'L4b', 'L4em']]]) {
    await touch('#again');
    for (const sit of order) { st = await decision('entscheiden'); if (st.sit !== sit) fail(`Durchlauf ${d}: ${sit} erwartet, ist ${st.sit}`); await helpToGoal(sit); }
    await end('Durchlauf ' + d);
    if (log[log.length - 1].stars !== '★★★★') fail(`Durchlauf ${d}: Sterne ${log[log.length - 1].stars}`);
  }
  // Endbildschirm: „Nochmal“ ohne Scrollen erreichbar (iPad quer)
  const again = await page.locator('#again').boundingBox(); if (!again || again.y + again.height > 768) fail('„Nochmal“ außerhalb des Bildschirms: ' + JSON.stringify(again));
  await touch('#again'); st = await decision('entscheiden'); if (st.sit !== 'B3') fail('Nach Durchlauf 5 nicht wieder B3');
  if (errors.length) fail('JS-Fehler: ' + errors.join('; '));
  console.log('✓ Durchläufe 4–5 mit der Hilfe: jede Situation endet mit Tor, nur ⭐; Rückkehr zu Durchlauf 1; keine JavaScript-Fehler' + (process.env.SLOW ? ` (CPU ${process.env.SLOW}× gedrosselt)` : ''));

  const wi = process.argv.indexOf('--write');
  if (wi > 0 && process.argv.indexOf('--pending-write') < 0) { fs.writeFileSync(process.argv[wi + 1], JSON.stringify(log, null, 1)); console.log('Mitschrift geschrieben:', process.argv[wi + 1]); }
  else {
    const ref = JSON.parse(fs.readFileSync(path.join(here, '..', 'golden', REF.freieBahn.ui), 'utf8'));
    // vorgelegte, noch nicht freigegebene Abweichungen: tests/golden/ui-freieBahn-abweichungen-*.json (--pending-write F erzeugt sie)
    console.log('✓ ' + vergleiche({ ref, log, gdir: path.join(here, '..', 'golden'), praefix: 'ui-freieBahn', refName: REF.freieBahn.ui }));
  }
  await ctx.close();
} catch (e) { console.error('✗ Freie Bahn:', e.message); if (process.env.DEBUG && globalThis.__log) console.error(JSON.stringify(globalThis.__log.slice(-4))); exit = 1; }
finally { await browser.close(); server.close(); process.exit(exit); }
