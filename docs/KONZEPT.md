# HSLinkDrag für Firefox – Umsetzungskonzept

| | |
|---|---|
| **Status** | Version 1.0.3 – fertig und getestet: alle manuellen Tests (Runde 1–4) und automatischen Prüfungen bestanden (Unit-Tests 12/12, `web-ext lint` ohne Befund, E2E 40/40). **Bereit zur Einreichung bei addons.mozilla.org** (macht der Nutzer, siehe store/STORE-EINTRAG.md) |
| **Stand** | 2026-11-04 |
| **Name** | HSLinkDrag |
| **Vorlage** | Chrome-Erweiterung HSLinkDrag 1.0.3 (`../../CHROME_AddOns/HSLinkDrag`, github.com/HSBitbooster/HSLinkDrag) – Funktionsumfang 1:1 |
| **Plattform** | Mozilla Firefox ab Version 140 (aktuelle ESR) für Desktop, Manifest V3. Entwicklung unter Linux, getestet mit Firefox 159 |
| **Add-on-ID** | `hslinkdrag@hsbitbooster` (darf sich nach der ersten Veröffentlichung nie mehr ändern) |
| **Logo** | `icons/logo-original.png` (295 × 295 px, vom Nutzer geliefert) – daraus die Icon-Größen 16/32/48/128 |

---

## 1. Ziel

Die Chrome-Erweiterung HSLinkDrag wird für Firefox umgesetzt – mit demselben Verhalten,
denselben Einstellungen und derselben Optionsseite. Links, Bilder, SVG-Grafiken und
markierter Text öffnen sich per **Click & Drag** (anklicken, mit gedrückter Maustaste ein
Stück ziehen, loslassen) in einem neuen Tab. Die **Zugrichtung** (links/rechts) entscheidet
über Vorder- oder Hintergrund. Die Erweiterung wird auf addons.mozilla.org (AMO)
veröffentlicht, der Quelltext liegt öffentlich auf GitHub.

## 2. Anforderungen

Unverändert aus der Chrome-Version:

| Nr. | Anforderung |
|---|---|
| A1 | Link per Click & Drag in neuem Tab öffnen. |
| A2 | Zugrichtung (links/rechts) bestimmt Vordergrund/Hintergrund – **einstellbar**. |
| A3 | Position des neuen Tabs einstellbar: rechts vom Ursprungstab, links davon, am Ende aller Tabs. |
| A4 | Bild **ohne** Link per Click & Drag → Bild in neuem Tab öffnen (gleiche Regeln). |
| A5 | Markierter Text per Click & Drag → Suche in neuem Tab (Google, DuckDuckGo, Bing, Browser-Standard). |
| A6 | Ist der markierte Text eine gültige Internetadresse → Adresse öffnen statt suchen. |
| A7 | Ist der Link oder der markierte Text eine E-Mail-Adresse → Standard-E-Mail-Client öffnen. |
| A8 | Link auf einem Bild: SHIFT entscheidet, ob Link oder Bild geöffnet wird – **einstellbar**. |
| A9 | Optionsseite kompakt, aber mit verständlichem Erklärungstext zu jeder Option/Optionsgruppe. |
| A10 | ESC während des Ziehens bricht die Geste ab – es wird nichts geöffnet. |

Neu für Firefox:

| Nr. | Anforderung |
|---|---|
| A11 | Veröffentlichung auf addons.mozilla.org (signiert, öffentlich gelistet). |
| A12 | Quelltext öffentlich auf GitHub (MIT-Lizenz wie die Chrome-Version). |
| A13 | Umsetzungskonzept, Testprotokoll und Testseite wie bei der Chrome-Version. |

## 3. Portierung Chrome → Firefox

Grundsatz: Code und Dateistruktur bleiben so nah wie möglich an der Chrome-Version, damit
spätere Änderungen in beide Richtungen übertragbar sind. Abweichungen nur dort, wo
Firefox es verlangt oder sich anders verhält.

| Bereich | Chrome-Version | Firefox-Version | Grund |
|---|---|---|---|
| API-Namensraum | `chrome.*` | `browser.*` | Firefox-Standard (Promises); `chrome.*` ginge auch, `browser.*` ist eindeutiger |
| Hintergrund | Service-Worker (`importScripts`) | Event-Page: `background.scripts` = `settings.js` + `background.js` | Firefox unterstützt in MV3 keine Service-Worker als Hintergrund |
| Manifest | – | `browser_specific_settings.gecko`: ID, `strict_min_version` 140.0, `data_collection_permissions: none` | Pflicht für AMO; Datensammlungs-Angabe seit Ende 2025 Pflicht für neue Add-ons |
| Website-Zugriff | bei Installation erteilt | `host_permissions: <all_urls>`; der Nutzer kann ihn in Firefox entziehen → Optionsseite zeigt dann einen Hinweis mit Knopf „Zugriff erlauben“; nach der Installation öffnen sich die Einstellungen automatisch, falls er fehlt | Firefox behandelt Host-Berechtigungen in MV3 als vom Nutzer abschaltbar |
| Optionen im Symbol-Menü | Chrome hat „Optionen“ im Rechtsklick-Menü | eigener Menüeintrag „Einstellungen“ (`menus`, Kontext `action`), bei jedem Start neu angelegt (Titel in aktueller Sprache) | Firefox bietet dort nur „Erweiterung verwalten“ und merkt sich Menüeinträge samt Titel |
| Symbol in der Symbolleiste | angeheftet per Nutzer | `default_area: navbar` – erscheint direkt in der Symbolleiste | Firefox legt MV3-Symbole sonst ins Erweiterungen-Menü (Puzzleteil) |
| Standardsuche | `chrome.search.query` | `browser.search.query` (gleiches Vorgehen: leeren Tab an richtiger Stelle anlegen, darin suchen) | – |
| Tab-Gruppen | `chrome.tabs.group` | `browser.tabs.group` | Firefox kennt Tab-Gruppen seit 138 – daher Mindestversion 140 |
| Domain der Adresszeile in Frames | `location.ancestorOrigins` | Frame fragt einmal das Hintergrundskript (`topHost`, aus `sender.tab.url`) | Firefox kennt `ancestorOrigins` nicht |
| Hinweis am Mauszeiger | `<style>` im Shadow-DOM per `innerHTML` | Styles per CSSOM (`style.cssText`) | Firefox wendet die CSP der Seite auf eingefügte `<style>`-Elemente an; CSSOM ist davon frei. `innerHTML` beanstandet außerdem der AMO-Linter |
| Markierter Text | Markierung zählt, wenn der Drag im Textknoten beginnt oder kein Link gezogen wird | Markierung zählt nur, wenn die Maustaste **in** der Markierung gedrückt wurde (Rückfall: kein Element-Ziel und kein Link im Drag) | Firefox meldet als Startpunkt das Element, und bei teilweise markiertem Link zieht Firefox die Markierung auch beim Drücken außerhalb davon |
| Sprache der Texte | `chrome.i18n.getMessage` (Chrome wechselt die Sprache nur mit Neustart) | eigene Übersetzung `src/shared/i18n.js`: `messages.json` der aktuellen Firefox-Sprache (`i18n.getUILanguage()`) selbst laden; Content-Scripts erhalten die Texte vom Hintergrundskript | Firefox wechselt die Sprache ohne Neustart, `getMessage` bleibt aber bei der Sprache vom Start der Erweiterung, und Firefox meldet keinen Sprachwechsel |
| Von der Seite abgebrochener Drag | keine Geste | Maus-Geste als Rückfallweg, außer die Seite verschiebt das Element selbst | Google bricht das Ziehen seiner Reiterlinks ab (Nutzertest T20); in Firefox laufen die Mausereignisse danach weiter |
| Tab-Position „Am Ende“ | ohne `index` | `index` = Anzahl Tabs im Fenster | Firefox setzt Tabs mit `openerTabId` sonst neben den Ursprungstab |
| Maus-Geste für verlinkte Bilder und Frames | beginnt bei `dragstart` (nativer Drag wird abgebrochen) | beginnt schon bei `mousedown` (wie bei SVG) | Bricht man in Firefox einen begonnenen nativen Drag ab, kommen keine Mausereignisse mehr (`pointercancel`) – im Test nachgewiesen |
| Ziehen aus Frames heraus | Chrome leitet Mausereignisse an den Frame weiter | zusätzlich Pointer-Capture (`setPointerCapture`) beim Start der Geste im Frame | sichert die Zustellung auch außerhalb des Frames |
| Lokale Dateien | `file:`-Links/Bilder öffenbar (mit Datei-URL-Zugriff) | `file:` gilt als nicht öffenbar – die Erweiterung greift dort nicht ein | Firefox verbietet Erweiterungen, `file:`-Adressen in Tabs zu öffnen |
| Paket | `scripts/build-zip.sh` | `scripts/build-xpi.sh` (Unit-Tests + `web-ext lint` + `web-ext build`) | Firefox-Werkzeug `web-ext` |
| Store-Bilder | headless Chrome | headless Firefox (`scripts/store-images.sh`) | – |

Unverändert übernommen: Gestenerkennung (nativer Drag + Maus-Geste), Zielbestimmung,
Text-/URL-/E-Mail-Erkennung (`src/shared/detect.js`), Einstellungen und Datenmodell,
Optionsseite, SVG-Anzeigeseite, Tab-Reihenfolge, Ausschlussliste, Toolbar-Schalter,
Texte (nur Browser-Namen und Firefox-Hinweise angepasst).

## 4. Verhalten im Detail

### 4.1 Geste erkennen

Zwei Wege, eine Geste zu verfolgen:

- **Nativ** (Drag & Drop des Browsers: `dragstart`, `dragover`, `drop`, `dragend`) für
  Links, Bilder ohne Link und markierten Text im Hauptframe. `drop` wertet die horizontale
  Strecke `dx` aus; kommt kein `drop` (ESC, Loslassen außerhalb des Fensters) → nichts.
  Das Standardverhalten von Firefox beim Ablegen eines Links auf der Seite (Seite
  navigiert dorthin) wird per `preventDefault` unterdrückt.
- **Maus-Geste** (`mousedown`/`mousemove`/`mouseup`), beginnt schon beim Drücken der
  Maustaste:
  - **SVG-Grafiken und SVG-Links** – nicht nativ ziehbar.
  - **Verlinkte Bilder** – SHIFT muss beim Loslassen zuverlässig ankommen. Ein nativer
    Drag wird beim `dragstart` abgebrochen; die Maus-Geste läuft weiter.
  - **Alles in eingebetteten Frames** (Links, Bilder, Drücken in einer Markierung) – nur
    so funktioniert das Ziehen über den Frame-Rand hinaus mit korrekter Richtung, auch
    bei fremdem Ursprung. Pointer-Capture hält die Ereignisse beim Frame.
  - Rückfallweg: Hat die Seite den `mousedown` selbst behandelt, startet die Maus-Geste
    erst bei `dragstart` (wie in Chrome).
  - **Seite bricht den nativen Drag ab** (`dragstart` mit `preventDefault`, z. B. Googles
    Reiter „Bilder“, „Videos“): Firefox startet keinen Drag, die Geste geht als Maus-Geste
    weiter. Schutz für Seiten mit eigenem Ziehen (Karussell, Schieberegler, sortierbare
    Listen): Verschiebt die Seite das gezogene Element um mehr als 3 px, bricht HSLinkDrag
    die Geste ab und öffnet nichts.

  Nicht in Bedienelementen (Button, `role="button"`, Label, Formularfelder), nicht bei
  seiteneigenem Drag & Drop (`draggable="true"`), nicht wenn die Seite den `mousedown`
  verhindert. Während der Geste wird Textmarkierung per `selectstart` unterdrückt, ESC
  (`keydown`) bricht ab, der folgende `click` wird unterdrückt.

**Hinweis außerhalb eines Frames:** Verlässt der Zeiger den Frame, zeichnet der
übergeordnete Frame den Hinweis (per `postMessage`, Koordinaten umgerechnet).

**Richtung:** Nur das Vorzeichen von `dx` zählt; ist `|dx|` kleiner als die
Mindestdistanz (Standard 20 px), passiert nichts. Vertikale Bewegung wird ignoriert.

**Rückmeldung:** Hinweis am Mauszeiger („→ Vordergrund · Link“, „← Hintergrund · Bild“,
„✉ E-Mail-Programm“, „↔“ = noch nicht weit genug). Abschaltbar.

**Markierter Text:** Gilt nur, wenn die Maustaste innerhalb der Markierung gedrückt wurde;
sonst gilt das Element unter dem Mauszeiger (z. B. der Link), auch wenn anderswo Text
markiert ist.

**Ein/Aus & Ausschlussliste:** Nichts tun, wenn ausgeschaltet oder die Domain der Seite
in der Adresszeile (auch für Frames) auf der Ausschlussliste steht (inkl. Subdomains).

### 4.2 Zielbestimmung (Prioritätsreihenfolge)

| Prio | Situation beim Start | Ergebnis |
|---|---|---|
| 0 | Start in Eingabefeld, Textarea, editierbarem Bereich | nicht eingreifen |
| 0 | Drop auf Eingabefeld/editierbaren Bereich | nicht eingreifen (Text in Suchfeld ziehen bleibt möglich) |
| 1 | Markierter Text wird gezogen | Text-Logik (4.7) |
| 2 | Link mit `mailto:` | E-Mail-Client (4.8) |
| 3 | Link, der ein Bild/SVG enthält | Link oder Bild je nach SHIFT-Einstellung (4.6) |
| 4 | Normaler Link (`http`, `https`, `ftp`) | Link öffnen |
| 5 | Bild/SVG ohne Link | Bild öffnen (4.5) |
| – | `javascript:`-, leere, `#`- und `file:`-Links, `data:`/`blob:`-Bilder | nichts tun |

### 4.3 Richtung → Vordergrund/Hintergrund

Je Richtung: **Vordergrund · Hintergrund · Nichts tun**. Standard: rechts = Vordergrund,
links = Hintergrund.

### 4.4 Tab-Position

**Rechts vom Ursprungstab · Links davon · Am Ende**. Mehrere Tabs nacheinander nach rechts
reihen sich in Öffnungsreihenfolge ein (1, 2, 3); ein Tabwechsel setzt die Reihe zurück.
„Am Ende“ setzt den Index ausdrücklich ans Fensterende (Firefox würde den Tab sonst neben
den Ursprungstab setzen)
(gemerkt in `storage.session`). `openerTabId` wird gesetzt, damit Firefox beim Schließen
des neuen Tabs zum Ursprungstab zurückkehrt. Liegt der Ursprungstab in einer Tab-Gruppe,
kommt der neue Tab (außer „Am Ende“) in dieselbe Gruppe.

### 4.5 Bilder

- Angezeigte Quelle (`img.currentSrc`, berücksichtigt `srcset`/`<picture>`).
- `data:`/`blob:`-Bilder und `file:`-Bilder: ignoriert. CSS-Hintergrundbilder: nicht unterstützt.
- **Inline-SVG** wird in eine eigenständige SVG-Datei umgewandelt (Farben/Schrift aus dem
  Seiten-CSS, `<use href="#…">`-Sprites eingebettet, angezeigte Größe), in
  `storage.session` abgelegt (die neuesten 30, bis zum Browser-Neustart) und in
  `viewer/svg.html` gezeigt: dunkler Hintergrund, ans Fenster angepasst, Klick =
  Originalgröße, Knopf „Als SVG-Datei speichern“. Anzeige per `<img>` – Scripte in der
  SVG laufen nicht.

### 4.6 Link auf einem Bild + SHIFT

„Ohne SHIFT öffnen:“ **Link · Bild** (mit SHIFT jeweils das andere). Standard: Link.
Ausgewertet wird der SHIFT-Zustand beim Loslassen; der Hinweis wechselt live.

### 4.7 Markierter Text

Getrimmt, Zeilenumbrüche → Leerzeichen. Reihenfolge: E-Mail-Adresse → Internetadresse
(mit Schema, `www.`, `domain.tld` mit bekannter Endung, IPv4, `localhost[:port]`;
umschließende Klammern/Anführungszeichen und Satzzeichen werden entfernt) → sonst Suche
(Google, DuckDuckGo, Bing oder **Firefox-Standardsuchmaschine** über `browser.search.query`).

### 4.8 E-Mail

`mailto:`-Links und erkannte E-Mail-Adressen: Der Ursprungstab wird kurz auf die
`mailto:`-Adresse gesetzt; Firefox übergibt an das eingestellte E-Mail-Programm
(Einstellungen → Anwendungen → mailto), die Seite bleibt erhalten, kein neuer Tab. Die
Richtung ist egal, die Mindestdistanz gilt.

### 4.9 Wo die Erweiterung nicht funktioniert

Firefox lässt keine Erweiterungen zu auf: `about:`-Seiten (inkl. Neuer Tab), Seiten von
addons.mozilla.org und anderen Mozilla-Domains, Leseansicht, eingebauter PDF-Viewer,
Seiten anderer Erweiterungen. In privaten Fenstern nur, wenn der Nutzer es in der
Add-on-Verwaltung erlaubt.

## 5. Technische Architektur

- Manifest V3, reines JavaScript, **kein Build-Schritt** – direkt als temporäres Add-on
  ladbar. `package.json` nur für Entwicklungswerkzeuge (`web-ext`, Selenium für den E2E-Test).
- **Berechtigungen:** `storage`, `search`, `menus`, Host-Zugriff `<all_urls>`.
  Firefox zeigt bei der Installation „Auf Ihre Daten für alle Websites zugreifen“ – bei
  dieser Art Erweiterung unvermeidbar (die Geste muss auf jeder Seite bereitstehen).
- **Datensammlung:** keine (`data_collection_permissions: { required: ["none"] }`).
- **Sprachen:** Deutsch und Englisch (`_locales`), Standard Englisch. Firefox wechselt seine
  Sprache ohne Neustart; `browser.i18n.getMessage` bleibt aber bei der Sprache vom Start der
  Erweiterung, und es gibt kein Ereignis für den Wechsel (geprüft im Quelltext von Firefox 159:
  `getUILanguage()` liest `Services.locale.appLocaleAsBCP47` live, `getMessage` nutzt die bei
  `initLocale` gewählte Sprache; kein Beobachter für `intl:app-locales-changed`). Darum lädt
  `src/shared/i18n.js` die passende `messages.json` selbst und prüft die Sprache beim Zurückkehren
  auf die Einstellungsseite, beim Tabwechsel, beim Öffnen des Symbol-Menüs und zu Beginn jeder Geste.

| Komponente | Datei | Aufgabe |
|---|---|---|
| Manifest | `manifest.json` | Deklaration, Berechtigungen, Gecko-ID |
| Content-Script | `src/content/content.js` | Geste erkennen, Ziel bestimmen, Hinweis, Nachricht senden |
| Erkennung | `src/shared/detect.js` | URL-/E-Mail-Erkennung, Such-URLs (Node-testbar) |
| Einstellungen | `src/shared/settings.js` | Standardwerte, Laden (`storage.sync`), Ausschlussliste |
| Texte | `src/shared/i18n.js` | Texte in der aktuellen Firefox-Sprache, Sprachwechsel ohne Neustart |
| Hintergrundskript | `src/background.js` | Tabs öffnen (Position, Gruppe, Opener), Suche, `mailto:`, SVG ablegen, Toolbar-Schalter, Menüeintrag, Domain-Abfrage für Frames, Zugriffsprüfung |
| Optionsseite | `options/` | Einstellungen, Hinweis bei fehlendem Website-Zugriff |
| SVG-Anzeige | `viewer/` | Per Drag geöffnete Inline-SVG-Grafiken |
| Tests | `test/` | Unit-Tests, Testseite, Test-Frame, CSP-Testseite |
| Werkzeuge | `scripts/` | Testserver ohne Cache, Paket bauen, E2E-Test in Firefox, Store-Bilder |
| AMO | `store/` | Texte für den Eintrag, Datenschutzerklärung, Bilder |

## 6. Einstellungen

Gespeichert in `browser.storage.sync` (mit Firefox-Konto geräteübergreifend). Datenmodell
identisch zur Chrome-Version:

```js
{
  enabled:        true,          // globaler Ein/Aus-Schalter (Toolbar-Button)
  dirRight:       "foreground",  // "foreground" | "background" | "off"
  dirLeft:        "background",
  tabPosition:    "right",       // "right" | "left" | "end"
  imageLinkShift: "link",        // was OHNE Shift geöffnet wird: "link" | "image"
  searchEngine:   "google",      // "google" | "duckduckgo" | "bing" | "default"
  minDistance:    20,            // px (5–300)
  showOverlay:    true,          // Hinweis beim Ziehen anzeigen
  excludedDomains: []            // z. B. ["trello.com"]
}
```

Speichern sofort bei Änderung mit kurzer Bestätigung „Gespeichert ✓“. Neu gegenüber
Chrome: Abschnitt „Zugriff auf Websites fehlt“ (nur sichtbar, wenn Firefox den Zugriff
nicht erteilt hat) mit Knopf „Zugriff erlauben“.

## 7. Bekannte Grenzen / Risiken

- Seiten mit eigener Drag-&-Drop-Logik können kollidieren → Ausschlussliste.
- Seiten, die Ziehen per `draggable="false"` oder `user-drag: none` unterbinden, lösen bei
  normalen Links/Bildern kein `dragstart` aus. Bricht eine Seite den `dragstart` dagegen per
  Script ab, greift der Rückfallweg (4.1).
- Seiten mit eigenem Ziehen, die das Element dabei **nicht** verschieben, könnten mit dem
  Rückfallweg kollidieren → Ausschlussliste.
- Karussell am Ende angekommen: Zieht man weiter in diese Richtung, bewegt sich das Element
  nicht mehr, und HSLinkDrag öffnet den Link (Nutzertest T36, vom Nutzer akzeptiert).
- Loslassen außerhalb des Browserfensters öffnet nichts.
- Von der Seite in einen Frame hineinziehen öffnet nichts.
- Verlinkte Bilder, SVGs und alles in Frames lassen sich bei aktiver Erweiterung nicht
  nativ in andere Programme oder die Lesezeichen-Symbolleiste ziehen (Maus-Geste).
- Endungen, die zugleich Dateiendungen sind (`.md`, `.py`, `.zip` …), gelten ohne
  `www.`/Schema nicht als Adresse.
- Bereits vor der Installation offene Tabs brauchen einmal Neuladen.
- Ob Firefox unter Linux SHIFT während eines **nativen** Drags meldet, ist für die
  Funktion unerheblich: SHIFT wird nur bei verlinkten Bildern/SVGs gebraucht, und die
  laufen über die Maus-Geste.
- Ziehen über den Rand eines Frames mit **fremdem** Ursprung ist nicht automatisch
  prüfbar (Selenium stellt die Ereignisse dort nicht zu) → manueller Test T25/T33.

## 8. Veröffentlichung

1. **GitHub:** öffentliches Repository `HSBitbooster/HSLinkDrag-Firefox`, Branch `main`,
   Commits mit der GitHub-noreply-Adresse.
2. **AMO:** Paket `scripts/build-xpi.sh` → `dist/hslinkdrag-<version>.zip` im
   Entwickler-Hub (https://addons.mozilla.org/developers/) hochladen, „Auf dieser Website“
   (gelistet). Texte, Kategorien, Datenschutzerklärung und Prüfer-Hinweise:
   `store/STORE-EINTRAG.md`. Kein Quelltext-Upload nötig (nicht minifiziert, kein Build).
3. Die Anmeldung bei AMO und das Absenden macht der Nutzer selbst.

## 9. Entscheidungsprotokoll

| Datum | Entscheidung |
|---|---|
| 2026-11-04 | Auftrag: Chrome-Erweiterung HSLinkDrag 1.0.3 1:1 für Firefox umsetzen, mit Konzept, Testprotokoll und Testseite; Veröffentlichung auf AMO, Quelltext öffentlich auf GitHub. |
| 2026-11-04 | Versionsnummer bleibt 1.0.3 (gleicher Funktionsstand wie Chrome). Mindestversion Firefox 140 (ESR; Tab-Gruppen-API ab 138, Datensammlungs-Angabe ab 140). Add-on-ID `hslinkdrag@hsbitbooster`. |
| 2026-11-04 | Portierungsentscheidungen siehe Abschnitt 3: `browser.*`, Event-Page, CSSOM-Hinweis, Domain-Abfrage für Frames, Menüeintrag „Einstellungen“, Symbol direkt in der Symbolleiste, Hinweis bei fehlendem Website-Zugriff, `file:` ausgeschlossen. |
| 2026-11-04 | E2E-Test in Firefox 159 zeigte: Nach abgebrochenem nativem Bild-Drag kommen keine Mausereignisse mehr (`pointercancel`) → SHIFT bei verlinkten Bildern wirkungslos. Behebung: Maus-Geste für verlinkte Bilder und in Frames beginnt schon bei `mousedown`. Danach 33/33 bestanden. |
| 2026-11-04 | Automatischer E2E-Test (`npm run test:e2e`, Selenium + headless Firefox) ins Projekt übernommen; manuelle Tests bleiben für ESC, E-Mail-Programm, Tab-Gruppen, Toolbar-Symbol, private Fenster, Fremd-Frame über den Rand und echte Websites. |
| 2026-11-04 | GitHub-Repository: `HSBitbooster/HSLinkDrag-Firefox` (öffentlich, getrennt vom Chrome-Repository). |
| 2026-11-04 | Manueller Test Runde 1 (Nutzer, eigenes deutsches Profil): bestanden bis auf T6 („Am Ende“ wie „Rechts“) und F7 (teilweise markierter Link → Suche statt Link). Behoben: Index für „Am Ende“, Markierung zählt nur bei Druck in der Markierung, Menüeintrag bei jedem Start neu (Titel in aktueller Sprache), SVG-Link (Text) im Test-Frame. E2E-Test um diese Fälle erweitert (37/37). |
| 2026-11-04 | Kein Fehler, dokumentiert: Sprache der Erweiterung wechselt erst mit deren Neustart (Firefox-Verhalten); Klick auf das Symbol erteilt bei entzogenem Website-Zugriff vorübergehend Zugriff auf den Tab (Firefox-Verhalten). |
| 2026-11-04 | Nachtest Runde 2: T6, T8, F3, F4, F7 bestanden. T33: Fremd-Frame zeigte alte `frame.html` aus dem Cache → eigener Testserver `scripts/serve.js` mit `no-store`. Wunsch des Nutzers: Sprachwechsel ohne Neustart wie Firefox selbst → recherchiert (keine Firefox-Funktion dafür), umgesetzt mit eigener Übersetzung `src/shared/i18n.js`; E2E-Test für den Sprachwechsel (38/38). T20/T32 im Testprotokoll mit konkreten Schritten beschrieben. |
| 2026-11-04 | Nachtest Runde 3: Sprachwechsel ohne Neustart, T33, T32 bestanden. T20: Googles Reiterlinks („Bilder“, „Videos“ …) ließen sich nicht ziehen – Diagnose in der Konsole des Nutzers: Google bricht `dragstart` per `preventDefault` ab. Entscheidung: Rückfallweg als Maus-Geste, mit Schutz für Seiten mit eigenem Ziehen (Element verschoben → abbrechen). Testseite (Abschnitt 5) und E2E-Test (40/40) ergänzt. |
| 2026-11-04 | Nachtest Runde 4: T20 (Google-Reiter), T35, T36 bestanden. Karussell am Ende → Link öffnet: vom Nutzer akzeptiert, als bekannte Grenze vermerkt. Alle Tests bestanden; Version 1.0.3 bereit für addons.mozilla.org. Korrekturen werden auf Wunsch des Nutzers **nicht** in die Chrome-Version übernommen. |
