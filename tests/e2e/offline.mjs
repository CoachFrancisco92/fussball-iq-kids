// Offline-Test mit echtem Service Worker: Werden alle Dateien (inkl. Texte und Missionen) zwischengespeichert,
// und startet die App ohne Netz vollständig? Ausgeliefert wird das Paket aus _site (wie auf GitHub Pages).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
execFileSync(process.execPath, [path.join(root, 'scripts/build-site.mjs')], { stdio: 'pipe' });
const site = path.join(root, '_site');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(site, p), (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
}).listen(0);
const base = `http://localhost:${server.address().port}/`;
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const expected = JSON.parse(fs.readFileSync(path.join(root, 'scripts/site-files.json'), 'utf8')).files.filter((f) => f !== 'sw.js');

let exit = 0;
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
try {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + 'index.html');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // ab jetzt kontrolliert der Service Worker die Seite
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cached = await page.evaluate(async () => { const out = []; for (const k of await caches.keys()) { const c = await caches.open(k); for (const r of await c.keys()) out.push(k + ' ' + new URL(r.url).pathname + new URL(r.url).search); } return out; });
  const cacheName = `fiq-v${version}`;
  for (const f of expected) {
    const needQuery = f.endsWith('.js');
    const hit = cached.some((e) => e.startsWith(cacheName + ' ') && e.includes('/' + f + (needQuery ? `?v=${version}` : '')));
    if (!hit) throw new Error(`nicht im Offline-Cache ${cacheName}: ${f}`);
  }
  console.log(`✓ Offline-Cache ${cacheName} enthält alle ${expected.length} Dateien (inkl. Texte und Missionen)`);
  await ctx.setOffline(true);
  await page.reload();
  const state = await page.evaluate(() => ({ v: window.FIQ && window.FIQ.VERSION, texte: !!window.FIQ_TEXTE, missionen: (window.FIQ_MISSIONS || []).map((m) => m.id), titel: document.getElementById('mTitle').textContent }));
  if (state.v !== version || !state.texte || !state.missionen.includes('mission-1') || !state.titel) throw new Error('Offline unvollständig geladen: ' + JSON.stringify(state));
  await page.click('#play');
  await page.waitForFunction(() => window.__fiq && window.__fiq.mode === 'look', null, { timeout: 5000 });
  if (errors.length) throw new Error('JS-Fehler offline: ' + errors.join('; '));
  console.log(`✓ Ohne Netz: App ${state.v} startet, Texte und Mission „${state.titel}“ geladen, Spiel beginnt`);
  await ctx.close();
} catch (e) { console.error('✗ Offline-Test:', e.message); exit = 1; }
finally { await browser.close(); server.close(); fs.rmSync(site, { recursive: true, force: true }); process.exit(exit); }
