// Konfiguration für web-ext (lint, run, build). Ins Paket kommt nur, was die Erweiterung
// zur Laufzeit braucht – keine Tests, Doku, Store-Material.
export default {
  artifactsDir: 'dist',
  ignoreFiles: [
    'docs', 'test', 'store', 'scripts', 'dist', 'node_modules',
    'README.md', 'CLAUDE.md', 'package.json', 'package-lock.json', 'web-ext-config.mjs',
    'icons/logo-original.png', 'icons/icon-48-off.png', 'icons/icon-128-off.png'
  ],
  build: { overwriteDest: true },
  run: {
    startUrl: ['http://localhost:8765/test/testseite.html']
  }
};
