// V0.6a P5: Bildschirmfotos der neuen Darstellung (iPad quer, Handy quer) – nur zur Sichtprüfung, kein Test.
// Aufruf: node tests/analysis/v0.6/bildschirm.mjs <ausgabeordner>
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const out = process.argv[2] || '/tmp'; fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
/** Szene: Mission mit vorangestelltem Durchlauf starten, Schritte ausführen, Foto */
async function szene(vp, name, mission, durchlauf, schritte) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { const f = { speaking: false, pending: false, paused: false, speak(u) { setTimeout(() => u.onend && u.onend({}), 300); }, cancel() {}, resume() {}, pause() {}, getVoices() { return []; }, addEventListener() {} }; Object.defineProperty(window, 'speechSynthesis', { value: f, configurable: true }); });
  await page.goto(base + 'index.html');
  await page.evaluate(([m, d]) => { FIQ.mission(m).durchlaeufe.unshift(d); }, [mission, durchlauf]);
  const H = {
    page,
    mode: () => page.evaluate(() => window.__fiq.mode),
    async wait(m) { for (let i = 0; i < 800; i++) { if ([].concat(m).includes(await H.mode())) return; await page.waitForTimeout(25); } throw new Error(name + ': Modus ' + m + ' / ' + (await H.mode())); },
    async tap(sel) { await page.locator(sel).first().scrollIntoViewIfNeeded(); const b = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); },
    async field(x, y) { const b = await page.$eval('#field', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, window.__fiq.view]; }); const k = b[2] / b[3].w; await page.touchscreen.tap(b[0] + (x - b[3].x0) * k, b[1] + (y - b[3].y0) * k); },
    choose: async (lbl) => { if (!(await page.evaluate(() => !!window.__fiq.sel))) await H.tap(`#actions .act:not(.hint) >> text=${lbl}`); },
  };
  await H.tap(`#missionList .mcard[data-id="${mission}"]`); await H.tap('#play'); await H.wait('decide');
  await schritte(H);
  await page.screenshot({ path: path.join(out, `${vp.n}-${name}.png`) });
  await ctx.close();
}
for (const vp of [{ n: 'ipad', width: 1180, height: 820 }, { n: 'handy', width: 844, height: 390 }]) {
  await szene(vp, '1-B3-entscheiden', 'freie-bahn', ['B3', 'V1'], async () => {});
  await szene(vp, '2-B3-kurz', 'freie-bahn', ['B3', 'V1'], async (H) => { await H.field(26, 12); await H.wait('kurz'); await H.page.waitForTimeout(200); });
  await szene(vp, '3-V1-vorbei', 'freie-bahn', ['V1', 'B3'], async (H) => { await H.field(26, 8.2); await H.wait(['kurz', 'feedback']); await H.page.waitForTimeout(150); });
  await szene(vp, '4-L4e-zu-eng', 'freie-bahn', ['L4e', 'L4b'], async (H) => { await H.field(27, 12); await H.wait('feedback'); await H.page.waitForTimeout(200); });
  await szene(vp, '5-L4b-durch', 'freie-bahn', ['L4b', 'L4e'], async (H) => { await H.field(27, 12); await H.wait(['kurz', 'feedback']); await H.page.waitForTimeout(700); });
  await szene(vp, '6-W1-waechter', 'welches-tor-ist-frei', ['W1', 'A1'], async (H) => {
    await H.choose('Dribbeln'); await H.field(31, 15); await H.wait('feedback'); await H.tap('#fbNext'); await H.wait('decide');
    await H.choose('Schießen'); await H.field(36, 18); await H.wait('feedback'); await H.page.waitForTimeout(200);
  });
  // V0.6.2: Folge-Moment (W1 nach dem Dribbling, A3 nach dem Pass) und Rückmeldung ohne kleineres Feld
  await szene(vp, '8-W1-folge', 'welches-tor-ist-frei', ['W1', 'A1'], async (H) => { await H.choose('Dribbeln'); await H.field(31, 15); await H.wait('folge'); await H.page.waitForTimeout(500); });
  await szene(vp, '9-W1-nach-folge', 'welches-tor-ist-frei', ['W1', 'A1'], async (H) => { await H.choose('Dribbeln'); await H.field(31, 15); await H.wait('feedback'); await H.page.waitForTimeout(300); });
  await szene(vp, '10-W1-schau-nochmal', 'welches-tor-ist-frei', ['W1', 'A1'], async (H) => { await H.choose('Dribbeln'); await H.field(31, 15); await H.wait('feedback'); await H.tap('#fbNext'); await H.wait('decide'); await H.page.waitForTimeout(300); });
  await szene(vp, '11-L4b-folge', 'freie-bahn', ['L4b', 'L4e'], async (H) => { await H.field(27, 12); await H.wait('folge'); await H.page.waitForTimeout(400); });
  await szene(vp, '7-ende', 'freie-bahn', ['B3', 'V1'], async (H) => {
    for (let i = 0; i < 80 && (await H.mode()) !== 'end'; i++) {
      await H.wait(['decide', 'feedback', 'kurz', 'end', 'wechsel']); if ((await H.mode()) === 'wechsel' || (await H.mode()) === 'kurz') { await H.page.waitForTimeout(100); continue; } const m = await H.mode();
      if (m === 'feedback') { await H.tap('#fbNext'); await H.wait(['decide', 'wechsel', 'end']); continue; }
      if (m !== 'decide') continue;
      const h = await H.page.evaluate(() => { const S = window.__fiq.S, k = FIQ.recommend(S, window.__fiq.ctx.actions); return FIQ.hint(S, k); });
      if (h.point) await H.field(h.point.x, h.point.y); else await H.field(36, h.goal === 0 ? 6 : 18);
      await H.wait(['kurz', 'feedback']);
    }
    await H.wait('end'); await H.page.waitForTimeout(300);
  });
}
await browser.close(); server.close();
console.log('Bilder in', out);
