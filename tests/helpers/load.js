// Lädt App-Inhalte und Engine in Node in derselben Reihenfolge wie index.html:
// Textkatalog → alle Missionsdateien → Engine.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', '..');
require(path.join(root, 'content/texte.js'));
for (const f of fs.readdirSync(path.join(root, 'missions')).filter((f) => f.endsWith('.js')).sort()) require(path.join(root, 'missions', f));
require(path.join(root, 'engine.js'));
module.exports = globalThis.FIQ;
