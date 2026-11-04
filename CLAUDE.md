# HSLinkDrag für Firefox

Firefox-Erweiterung (Manifest V3, ab Firefox 140): Links, Bilder und markierten Text per
Click & Drag in neuem Tab öffnen; Zugrichtung bestimmt Vorder-/Hintergrund.
1:1-Umsetzung der Chrome-Erweiterung in `../../CHROME_AddOns/HSLinkDrag`.

- Umsetzungskonzept, Unterschiede zu Chrome, Entscheidungsprotokoll, Status: [docs/KONZEPT.md](docs/KONZEPT.md)
- Testprotokoll (automatisch + manuelle Checkliste): [docs/TESTPLAN.md](docs/TESTPLAN.md)
- Installation, Bedienung, Projektstruktur, Befehle: [README.md](README.md)
- addons.mozilla.org: Texte [store/STORE-EINTRAG.md](store/STORE-EINTRAG.md), Paket `npm run build`,
  Bilder `scripts/store-images.sh`. Bei neuen Funktionen Store-Texte und Bilder mitpflegen.
- Kommunikation mit dem Nutzer auf Deutsch.
- Git: Branch `main`, Remote `origin` = https://github.com/HSBitbooster/HSLinkDrag-Firefox (**öffentlich**).
  Nach jedem fertigen, getesteten Schritt committen und pushen. Commits nur mit der
  GitHub-noreply-Adresse (lokal in `.git/config` gesetzt), nie mit der Gmail-Adresse.

## Arbeitsregeln

- Jede getroffene Entscheidung in `docs/KONZEPT.md` → Abschnitt 9 (Entscheidungsprotokoll)
  eintragen und die betroffenen Abschnitte nachziehen; Status oben aktuell halten.
- Änderungen am Verhalten möglichst auch in der Chrome-Version nachziehen (und umgekehrt);
  Firefox-spezifische Abweichungen stehen in `docs/KONZEPT.md` Abschnitt 3.
- Kein Build-Schritt: reines JavaScript, direkt als temporäres Add-on ladbar. `browser.*`-APIs.
- Gemeinsamer Code in `src/shared/` als klassische Scripts (Namespace `HSLD`), weil
  Content-Scripts keine ES-Module laden können; zusätzlich `module.exports` für Node-Tests.
- Keine `innerHTML`-Zuweisungen in Erweiterungscode (AMO-Linter, Seiten-CSP).
- Neue Texte immer in beiden Sprachen: `_locales/de` und `_locales/en`.
  Texte immer über `HSLD.i18n.t()` (`src/shared/i18n.js`), nicht `browser.i18n.getMessage` –
  sonst folgen sie keinem Sprachwechsel ohne Neustart.
- Vor jedem Commit: `npm test`, `npm run lint`, `npm run test:e2e` (alle grün).
- Add-on-ID `hslinkdrag@hsbitbooster` nie ändern; Version in `manifest.json` und `package.json` gleich halten.
- Testseite über `.claude/launch.json` („testseite“, Port 8765) bzw. `npm run serve` (Testserver ohne Cache)
  → `http://localhost:8765/test/testseite.html`.
