// Lädt App-Inhalte und Engine in Node in derselben Reihenfolge wie index.html
// (eine Quelle für App und Tests – E6): alle <script>-Einträge außer app.js.
// Damit ist die Standardmission (erste registrierte) in App und Tests dieselbe.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"/g)].map((m) => m[1]).filter((f) => f !== 'app.js');
for (const f of scripts) require(path.join(root, f));
module.exports = globalThis.FIQ;
