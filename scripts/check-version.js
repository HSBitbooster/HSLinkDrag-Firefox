// Stellt sicher, dass Chrome- und Firefox-Version von HSLinkDrag dieselbe Versionsnummer haben
// (Vorgabe: beide Browser immer mit gleicher Version und gleichem Funktionsstand).
// Vergleicht manifest.json dieses Projekts mit dem Schwesterprojekt (Chrome-Version) im Nachbarordner
// ../../CHROME_AddOns/HSLinkDrag (anderer Ort: Umgebungsvariable HSLD_TWIN). Fehlt das Schwesterprojekt,
// z. B. bei einem Klon nur dieses Repositorys, gibt es nur eine Warnung.
// Aufruf: node scripts/check-version.js – läuft automatisch beim Paketbau.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TWIN = path.resolve(ROOT, process.env.HSLD_TWIN || '../../CHROME_AddOns/HSLinkDrag');

function version(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')).version;
}

const own = version(ROOT);
const problems = [];

const pkg = path.join(ROOT, 'package.json');
if (fs.existsSync(pkg)) {
  const pkgVersion = JSON.parse(fs.readFileSync(pkg, 'utf8')).version;
  if (pkgVersion !== own) problems.push(`package.json hat ${pkgVersion}, manifest.json ${own}`);
}

if (!fs.existsSync(path.join(TWIN, 'manifest.json'))) {
  console.warn(`Warnung: Chrome-Version nicht gefunden (${TWIN}) – Versionsabgleich übersprungen.`);
} else {
  const twin = version(TWIN);
  if (twin !== own) problems.push(`Firefox-Version hat ${own}, Chrome-Version ${twin} – beide müssen gleich sein`);
}

if (problems.length) {
  for (const p of problems) console.error('Versionsfehler: ' + p);
  process.exit(1);
}
console.log(`Version ${own} – Firefox-Version und Chrome-Version stimmen überein.`);
