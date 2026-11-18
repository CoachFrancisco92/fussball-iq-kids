// Stellt das Auslieferungsverzeichnis _site zusammen – nur die App-Dateien, keine Tests/Doku.
// Aufruf: node scripts/build-site.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { files } = JSON.parse(fs.readFileSync(path.join(root, 'scripts/site-files.json'), 'utf8'));
const out = path.join(root, '_site');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of files) fs.copyFileSync(path.join(root, f), path.join(out, f));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
const v = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
console.log(`_site erstellt: ${files.length} Dateien, Version ${v}`);
