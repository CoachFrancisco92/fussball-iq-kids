// Hotfix V0.6.1 – Regressionstest Toraussprache im Browser (iPad-Größe, Touch, nachgebaute Sprachausgabe):
// Angezeigt wird „Toooor!“ (Rückmeldung) bzw. „TOOOR!“ (Torbanner); gesprochen wird „Tor!“ – in der Rückmeldung,
// bei 🔈 (Wiederholen) und bei „Szenen ansehen“ (Wiedergabe spricht den Ergebnistext). Nie ein gedehntes „Tooor“.
//   node tests/e2e/aussprache.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
}).listen(0);
const base = `http://localhost:${server.address().port}/`;
const fail = (m) => { throw new Error(m); };
const GEDEHNT = /to{2,}r/i;
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
let exit = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__said = [];
    const fake = { speaking: false, pending: false, paused: false, speak(u) { window.__said.push(u.text); if (u.onend) u.onend({}); }, cancel() {}, resume() {}, pause() {}, getVoices() { return []; }, addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    // Torbanner festhalten (blendet nach 1,8 s aus)
    new MutationObserver(() => { const b = document.getElementById('goalBanner'); if (b && /show/.test(b.className)) window.__banner = b.textContent; }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await page.goto(base + 'index.html');
  const mode = () => page.evaluate(() => window.__fiq.mode);
  const waitMode = async (m, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (errors.length) fail('JS-Fehler: ' + errors.join('; ')); if ([].concat(m).includes(await mode())) return mode(); await page.waitForTimeout(25); } fail(`Modus ${m} nicht erreicht (${await mode()})`); };
  const touch = async (sel) => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); const b = await l.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  const field = async (x, y) => { const b = await page.$eval('#field', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, window.__fiq.view]; }); const k = b[2] / b[3].w; await page.touchscreen.tap(b[0] + (x - b[3].x0) * k, b[1] + (y - b[3].y0) * k); };
  const said = async () => { await page.waitForFunction(() => { const s = window.__fiq && window.__fiq.speech; return !s || (!s.cur && !s.queue.length); }, null, { timeout: 5000 }); return page.evaluate(() => window.__said.splice(0)); };
  const alleGesagt = [];
  const sammle = async () => { const s = await said(); alleGesagt.push(...s); return s; };
  const hilfeSchritt = async () => {
    const h = await page.evaluate(() => { const S = window.__fiq.S, k = FIQ.recommend(S, window.__fiq.ctx.actions); return { k, h: FIQ.hint(S, k) }; });
    const lbl = { schiessen: 'Schießen', passen: 'Passen', dribbeln: 'Dribbeln' }[h.k];
    if (!(await page.evaluate(() => !!window.__fiq.sel))) await touch(`#actions .act:not(.hint) >> text=${lbl}`);
    if (h.h.ids) { const p = await page.evaluate((id) => { const q = FIQ.P(window.__fiq.S, id); return [q.x, q.y]; }, h.h.ids[0]); await field(...p); } else if (h.h.point) await field(h.h.point.x, h.h.point.y); else if (h.h.goal != null) await field(36, h.h.goal === 0 ? 6 : 18); else await touch(`#actions .act:not(.hint) >> text=${lbl}`);
  };

  // „Welches Tor ist frei?“, Durchlauf 1 beginnt mit A1: Schuss aufs freie Tor (Hilfe)
  await touch('#missionList .mcard[data-id="welches-tor-ist-frei"]'); await touch('#play');
  await waitMode('decide'); await sammle();
  await hilfeSchritt(); await waitMode('feedback');
  const fbText = await page.$eval('#fbText', (e) => e.textContent);
  if (!/Toooor!/.test(fbText)) fail('Anzeige: „Toooor!“ fehlt in der Rückmeldung: ' + fbText);
  const banner = await page.evaluate(() => window.__banner || '');
  if (!/^TOOOR!/.test(banner)) fail('Anzeige: Torbanner „TOOOR!“ fehlt: ' + banner);
  const s1 = (await sammle()).join(' ');
  if (!/(^|\s)Tor!/.test(s1)) fail('Gesprochen: „Tor!“ fehlt: ' + s1);
  console.log('✓ Rückmeldung: angezeigt „' + fbText.trim() + '“, gesprochen „' + s1 + '“');
  // 🔈 wiederholt die gesprochene Fassung
  await touch('#repeat'); const s2 = (await sammle()).join(' ');
  if (!/(^|\s)Tor!/.test(s2)) fail('🔈: „Tor!“ fehlt: ' + s2);
  console.log('✓ 🔈 wiederholt „Tor!“');
  // Rest der Mission mit der Hilfe, dann „Szenen ansehen“ (Wiedergabe spricht die Ergebnistexte)
  await touch('#fbNext');
  for (let i = 0, t0 = Date.now(); Date.now() - t0 < 120000 && (await mode()) !== 'end'; i++) {
    const m = await waitMode(['decide', 'feedback', 'end', 'wechsel', 'look']);
    if (m === 'feedback') { await sammle(); await touch('#fbNext'); continue; }
    if (m === 'decide') { await sammle(); await hilfeSchritt(); await waitMode(['feedback', 'end']); continue; }
    await page.waitForTimeout(50);
  }
  await waitMode('end'); await sammle();
  await touch('#hl'); await waitMode('end', 90000);
  const s3 = await sammle();
  if (!s3.some((x) => /(^|\s)Tor!/.test(x))) fail('Szenen ansehen: „Tor!“ nicht gesprochen: ' + s3.join(' | '));
  console.log('✓ „Szenen ansehen“ spricht „Tor!“');
  const gedehnt = alleGesagt.filter((x) => GEDEHNT.test(x));
  if (gedehnt.length) fail('Gesprochen wurde ein gedehntes Tor: ' + gedehnt.join(' | '));
  if (errors.length) fail('JS-Fehler: ' + errors.join('; '));
  console.log(`✓ ${alleGesagt.length} Ansagen der ganzen Mission: kein gedehntes „Tooor“ gesprochen; keine JavaScript-Fehler`);
} catch (e) { console.error('✗ ' + e.message); exit = 1; }
await browser.close(); server.close();
process.exit(exit);
