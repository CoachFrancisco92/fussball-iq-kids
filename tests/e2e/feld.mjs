// V0.6.2 Spielfeld: In allen Missionen und auf iPad/Handy (hoch und quer) sind alle vier Minitore vollständig im
// sichtbaren Spielfeld und tatsächlich gezeichnet (Torfarbe im Canvas an jeder Torposition); Feldgröße beim
// Entscheiden = mit Rückmeldung (Lernmissionen); Simulation/Feldkoordinaten unverändert (Tore an den Engine-Positionen).
//   node tests/e2e/feld.mjs
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
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
const GERAETE = [['iPad quer', { width: 1180, height: 820 }, 2], ['iPad hoch', { width: 820, height: 1180 }, 2], ['Handy quer', { width: 844, height: 390 }, 3], ['Handy hoch', { width: 390, height: 844 }, 3]];
let exit = 0;
try {
  for (const [name, vp, dsf] of GERAETE) {
    for (const mission of ['mission-1', 'welches-tor-ist-frei', 'freie-bahn']) {
      const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: dsf });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => { const f = { speaking: false, pending: false, paused: false, speak(u) { setTimeout(() => u.onend && u.onend({}), 150); }, cancel() {}, resume() {}, pause() {}, getVoices() { return []; }, addEventListener() {} }; Object.defineProperty(window, 'speechSynthesis', { value: f, configurable: true }); });
      await page.goto(base + 'index.html');
      const tap = async (s) => { const l = page.locator(s).first(); await l.scrollIntoViewIfNeeded(); const b = await l.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
      const mode = () => page.evaluate(() => window.__fiq.mode);
      await tap(`#missionList .mcard[data-id="${mission}"]`); await tap('#play');
      for (let i = 0; i < 500 && !['decide', 'look'].includes(await mode()); i++) await page.waitForTimeout(20);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => {
        const v = window.__fiq.view, cv = document.getElementById('field'), c = cv.getBoundingClientRect(), k = c.width / v.w, dp = cv.width / c.width;
        const F = FIQ.F, g = cv.getContext('2d');
        const tore = [...F.goals.blue.map((t) => ({ t, links: t.x - 1.1, rechts: t.x, farbe: [37, 99, 235] })), ...F.goals.red.map((t) => ({ t, links: t.x, rechts: t.x + 1.1, farbe: [225, 29, 72] }))];
        return { k, tore: tore.map(({ t, links, rechts, farbe }) => {
          const px = (x) => (x - v.x0) * k, py = (y) => (y - v.y0) * k;
          const innen = px(links) >= 0 && px(rechts) <= c.width && py(t.y - F.GOAL_W / 2) >= 0 && py(t.y + F.GOAL_W / 2) <= c.height;
          // Torrahmen-Farbe im Canvas entlang der Torlinie suchen
          const x0 = Math.max(0, Math.round(px(links) * dp) - 2), y0 = Math.max(0, Math.round(py(t.y - F.GOAL_W / 2) * dp) - 2);
          const w = Math.max(1, Math.round((rechts - links) * k * dp) + 4), h = Math.max(1, Math.round(F.GOAL_W * k * dp) + 4);
          const d = g.getImageData(x0, y0, Math.min(w, cv.width - x0), Math.min(h, cv.height - y0)).data;
          let treffer = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - farbe[0]) < 40 && Math.abs(d[i + 1] - farbe[1]) < 40 && Math.abs(d[i + 2] - farbe[2]) < 40) treffer++;
          return { innen, treffer, x: t.x, y: t.y };
        }) };
      });
      const fehlend = r.tore.filter((t) => !t.innen || t.treffer < 8);
      if (fehlend.length) fail(`${name} ${mission}: Tor nicht vollständig sichtbar/gezeichnet ${JSON.stringify(fehlend)}`);
      if (errors.length) fail(`${name} ${mission}: JS-Fehler ${errors.join('; ')}`);
      console.log(`✓ ${name} ${mission}: alle 4 Minitore vollständig sichtbar und gezeichnet (${r.k.toFixed(1)} px/m)`);
      await ctx.close();
    }
  }
} catch (e) { console.error('✗ ' + e.message); exit = 1; }
await browser.close(); server.close();
process.exit(exit);
