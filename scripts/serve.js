// Testserver für test/testseite.html (Port 8765, nur lokal). Schickt „Cache-Control: no-store“,
// damit der Browser nach Änderungen keine alten Testdateien zeigt – auch nicht im Frame, der über
// die zweite Adresse (localhost ↔ 127.0.0.1) geladen wird. Start: npm run serve
'use strict';
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8765;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

// Ergebnis: der Server, oder null, wenn der Port schon belegt ist (dann läuft wohl schon einer).
function startServer(port = PORT) {
  const server = http.createServer((req, res) => {
    let file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) {
      res.writeHead(404, { 'Cache-Control': 'no-store' }).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.once('error', () => resolve(null));
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

module.exports = { startServer, PORT };

if (require.main === module) {
  startServer().then((server) => {
    if (!server) {
      console.error(`Port ${PORT} ist schon belegt – läuft der Testserver bereits?`);
      process.exitCode = 1;
      return;
    }
    console.log(`Testseite: http://localhost:${PORT}/test/testseite.html  (Beenden: Strg+C)`);
  });
}
