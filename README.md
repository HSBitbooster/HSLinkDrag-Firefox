# HSLinkDrag für Firefox

Firefox-Erweiterung: Links, Bilder, SVG-Grafiken und markierten Text per **Click & Drag**
in einem neuen Tab öffnen. Die Zugrichtung (links/rechts) bestimmt, ob der Tab im
Vorder- oder Hintergrund geöffnet wird.

Firefox-Umsetzung der Chrome-Erweiterung [HSLinkDrag](https://github.com/HSBitbooster/HSLinkDrag-Chrome)
mit gleichem Funktionsumfang. Benötigt Firefox 140 oder neuer.

## Installation

- **Aus dem Add-on-Verzeichnis:** addons.mozilla.org → „HSLinkDrag“ → „Zu Firefox hinzufügen“.
- **Zum Ausprobieren aus dem Quelltext:** `about:debugging#/runtime/this-firefox` →
  **„Temporäres Add-on laden …“** → `manifest.json` dieses Ordners wählen. Bleibt bis zum
  Neustart von Firefox aktiv.

Bereits beim Installieren offene Tabs müssen einmal neu geladen werden. In privaten
Fenstern läuft HSLinkDrag nur, wenn es in `about:addons` → HSLinkDrag →
„In privaten Fenstern ausführen“ erlaubt ist.

## Bedienung

| Aktion | Ergebnis (Standardeinstellung) |
|---|---|
| Link/Bild/markierten Text nach **rechts** ziehen | Neuer Tab im **Vordergrund** |
| … nach **links** ziehen | Neuer Tab im **Hintergrund** |
| Verlinktes Bild oder SVG ziehen, beim Loslassen **SHIFT** halten | Bild statt Link öffnen |
| Markierte Internetadresse ziehen | Adresse öffnen statt suchen |
| E-Mail-Link oder markierte E-Mail-Adresse ziehen | E-Mail-Programm öffnet sich |
| **ESC** während des Ziehens | Abbruch |
| Klick auf das Symbol in der Symbolleiste | Erweiterung an/aus |
| Rechtsklick auf das Symbol → **Einstellungen** | Einstellungen |

## Projektstruktur

```
manifest.json            Erweiterungs-Manifest (MV3, Gecko-ID, Mindestversion)
src/background.js        Hintergrundskript: Tabs öffnen, Suche, E-Mail, Toolbar-Schalter, Menü
src/content/content.js   Geste erkennen, Hinweis am Mauszeiger
src/shared/settings.js   Standardwerte, Ausschlussliste
src/shared/detect.js     Erkennung URL / E-Mail / Suche, Such-URLs
src/shared/i18n.js       Texte in der aktuellen Firefox-Sprache (Sprachwechsel ohne Neustart)
options/                 Einstellungsseite
viewer/                  Anzeigeseite für per Drag geöffnete SVG-Grafiken
_locales/de, _locales/en Texte Deutsch/Englisch
icons/                   Icons (logo-original.png ist die Quelle)
test/                    Unit-Tests, Testseite, Test-Frame, CSP-Testseite
scripts/                 Testserver, Paket bauen, E2E-Test in Firefox, Store-Bilder
store/                   Texte für addons.mozilla.org, Datenschutzerklärung, Bilder
docs/KONZEPT.md          Umsetzungskonzept, Unterschiede zu Chrome, Entscheidungen, Status
docs/TESTPLAN.md         Testprotokoll (automatisch + manuell)
web-ext-config.mjs       Einstellungen für web-ext (Paketinhalt, Startseite)
```

Die Erweiterung selbst hat **keinen Build-Schritt** (reines JavaScript). `package.json`
enthält nur Entwicklungswerkzeuge.

## Entwicklung und Tests

Voraussetzungen: Node.js ≥ 18, Firefox.

```bash
npm install
```

Unit-Tests (Erkennung URL/E-Mail/Suche, Ausschlussliste):

```bash
npm test
```

Mozilla-Linter (dieselben Regeln wie bei der Prüfung auf addons.mozilla.org):

```bash
npm run lint
```

Automatischer Test im echten Firefox (headless; baut das Paket, startet einen eigenen
Testserver, ca. 2 Minuten):

```bash
npm run test:e2e
```

Manuelle Tests: Testserver starten (ohne Cache, Port 8765) und `docs/TESTPLAN.md` abarbeiten.

```bash
npm run serve
```

In einem zweiten Terminal Firefox mit frischem Profil und geladener Erweiterung starten
(öffnet die Testseite, lädt die Erweiterung bei Codeänderungen automatisch neu):

```bash
npm start
```

## Paket für addons.mozilla.org

Führt Unit-Tests und Linter aus und baut `dist/hslinkdrag-<version>.zip`:

```bash
npm run build
```

Store-Bilder neu erzeugen (headless Firefox) → `store/images/`:

```bash
scripts/store-images.sh
```

Alle Texte für den Eintrag im Entwickler-Hub: `store/STORE-EINTRAG.md`,
Datenschutzerklärung: `store/DATENSCHUTZ.md`.

## Icons neu erzeugen

```bash
cd icons && for s in 16 32 48; do convert logo-original.png -filter Lanczos -resize ${s}x${s} icon-$s.png; convert logo-original.png -filter Lanczos -resize ${s}x${s} -colorspace Gray -channel A -evaluate multiply 0.6 +channel icon-$s-off.png; done
```

```bash
cd icons && convert logo-original.png -filter Lanczos -resize 96x96 -background none -gravity center -extent 128x128 icon-128.png
```

## Datenschutz

HSLinkDrag sammelt keine Daten, enthält keine Werbung und kein Tracking und lädt keinen
Code nach. Details: [store/DATENSCHUTZ.md](store/DATENSCHUTZ.md).

## Lizenz

MIT – siehe [LICENSE](LICENSE). Nutzung, Änderung und Weitergabe erlaubt, solange der
Urheberhinweis erhalten bleibt; keine Gewährleistung.
