# HSLinkDrag für Firefox – Testprotokoll

Prüfling: HSLinkDrag 1.0.3 für Firefox (`dist/hslinkdrag-1.0.3.zip`).
Testseite: `test/testseite.html` über den lokalen Server (`npm run serve` →
`http://localhost:8765/test/testseite.html`), dazu `test/frame.html` (eingebettet) und
`test/csp.html` (strenge Content-Security-Policy).

Legende: ✅ bestanden · ❌ Fehler · ⬜ offen · 🤖 automatisiert geprüft

## So wird getestet

Erweiterung laden – eine der beiden Varianten:

- **Mit web-ext** (eigenes, frisches Firefox-Profil, öffnet die Testseite direkt):

  ```bash
  npm run serve
  ```

  in einem zweiten Terminal:

  ```bash
  npm start
  ```

- **Im eigenen Firefox:** `about:debugging#/runtime/this-firefox` → „Temporäres Add-on
  laden …“ → `manifest.json` dieses Ordners wählen. Bleibt bis zum Neustart von Firefox.

## Automatisierte Prüfungen (2026-11-04, Firefox 159.0, Linux)

| Prüfung | Befehl | Ergebnis |
|---|---|---|
| Unit-Tests: Erkennung URL/E-Mail/Suche, Such-URLs, Ausschlussliste, öffenbare Protokolle | `npm test` | 🤖 ✅ 10/10 |
| Mozilla-Linter (wie bei der AMO-Prüfung) | `npm run lint` | 🤖 ✅ 0 Fehler, 0 Warnungen, 0 Hinweise |
| E2E im echten Firefox (headless, Selenium) | `npm run test:e2e` | 🤖 ✅ 37/37 (Runde 1) |

Abgedeckt im E2E-Test (echte Erweiterung, echte Tabs; Grenzen siehe unten):

| Fall | Ergebnis |
|---|---|
| Link nach rechts → neuer Tab im Vordergrund; nach links → Hintergrund | 🤖 ✅ |
| Unter Mindestdistanz → nichts | 🤖 ✅ |
| Bild ohne Link → Bild; Bild mit Link ohne SHIFT → Link, mit SHIFT → Bild | 🤖 ✅ |
| SVG-Link → Link, mit SHIFT → Grafik in der Anzeigeseite; Inline-SVG → Anzeigeseite; SVG im HTML-Link → Link | 🤖 ✅ |
| `javascript:`-Link, `file:`-Link, Stern im Knopf, `draggable`-Element → nichts | 🤖 ✅ |
| Seite mit strenger CSP: Hinweis formatiert (position: fixed), Link öffnet | 🤖 ✅ |
| Text → Google-Suche; `www.heise.de` → Adresse; `node.js` → Suche; Teil eines Linktexts markiert → Suche | 🤖 ✅ |
| F7: Markierung an anderer Stelle bzw. Teil des Linktexts markiert, am Link **außerhalb** der Markierung gezogen → Link | 🤖 ✅ |
| Frame gleicher Ursprung: Link und SVG-Link (Text) im Frame; Link, SVG-Link und Bildlink mit SHIFT **aus dem Frame heraus**, Richtung stimmt | 🤖 ✅ |
| Frame fremder Ursprung (innerhalb des Frames): Link, SVG-Link, Bildlink mit SHIFT | 🤖 ✅ |
| Optionsseite lädt, kein Zugriffs-Hinweis, Texte übersetzt | 🤖 ✅ |
| Ausgeschaltet → nichts | 🤖 ✅ |
| Position „Links“; Position „Am Ende“ (hinter weiteren Tabs); Reihenfolge 1, 2, 3 bei Position „Rechts“ | 🤖 ✅ |
| Ausschlussliste `127.0.0.1` → Seite und Frame von `localhost` inaktiv (Domain der Adresszeile zählt) | 🤖 ✅ |
| Firefox-Standardsuchmaschine | 🤖 ✅ |

Grenzen der Automatisierung: Selenium erzeugt in Firefox echte `dragstart`/`dragover`,
aber kein `drop` – das Drop wird nachgestellt (Maus-Gesten laufen vollständig echt).
Über den Rand eines Frames mit fremdem Ursprung stellt Selenium keine Ereignisse zu.
Deshalb sind die folgenden Tests von Hand nötig.

## Manuelle Tests im echten Firefox

Nummern wie in der Chrome-Version (T1–T34), Firefox-spezifische Tests mit „F“.

| Nr. | Test | Erwartet | Ergebnis |
|---|---|---|---|
| T1 | Link nach rechts ziehen | Neuer Tab rechts, im Vordergrund | ✅ |
| T2 | Link nach links ziehen | Neuer Tab rechts, im Hintergrund | ✅ |
| T3 | 3 Links nacheinander nach links (Hintergrund) | Reihenfolge 1, 2, 3 rechts vom Ursprungstab | ✅ |
| T4 | Danach anderen Tab anklicken, zurück, erneut ziehen | Neuer Tab wieder direkt rechts vom Ursprungstab | ✅ |
| T5 | Position „Links“ | Neuer Tab links vom Ursprungstab | ✅ |
| T6 | Position „Am Ende“ | Neuer Tab ganz rechts | ❌ → behoben in Runde 1, erneut prüfen ⬜ |
| T7 | Ursprungstab in Tab-Gruppe (Rechtsklick auf Tab → „Tab zu neuer Gruppe hinzufügen“), Position rechts | Neuer Tab in derselben Gruppe | ✅ |
| T8 | Im Vordergrund geöffneten Tab schließen | Firefox springt zurück zum Ursprungstab | ✅ mit „Rechts“; mit „Am Ende“ ⬜ (nach Behebung von T6) |
| T9 | Verlinktes Bild ziehen, beim Loslassen SHIFT halten | Bild statt Link; Hinweis wechselt live | ✅ |
| T10 | ESC während des Ziehens (Link) | Nichts geöffnet, Hinweis verschwindet | ✅ |
| T11 | Loslassen außerhalb des Browserfensters | Nichts geöffnet | ✅ |
| T12 | mailto-Link ziehen | E-Mail-Programm öffnet sich, Seite bleibt, kein leerer Tab | ✅ |
| T13 | Markierte E-Mail-Adresse ziehen | wie T12 | ✅ |
| T14 | Suchmaschine Google / DuckDuckGo / Bing | Suche in jeweiliger Maschine | ✅ |
| T15 | Suchmaschine „Firefox-Standardsuchmaschine“ | Suche mit der in Firefox eingestellten Suchmaschine, Tab an richtiger Position | ✅ |
| T16 | Toolbar-Symbol klicken | Symbol grau + „AUS“, Gesten wirkungslos; erneut klicken → aktiv | ✅ |
| T17 | Ausschlussliste `localhost` | Auf Testseite keine Geste; Hinweis erscheint nicht | ✅ |
| T18 | Link im iframe ziehen, im Frame loslassen | Funktioniert | ✅ |
| T19 | Privates Fenster (vorher in `about:addons` → HSLinkDrag → „In privaten Fenstern ausführen: Erlauben“) | Tab öffnet im privaten Fenster | ✅ |
| T20 | Echte Seiten: Google-Ergebnisse, Wikipedia, GitHub, Bildersuche | Links/Bilder öffnen wie erwartet | ✅ (mit Vorbehalt) |
| T21 | Optionsseite auf Englisch (Firefox-Sprache Englisch) | Englische Texte | ✅ – Sprache wechselt erst nach Neustart des Add-ons (Firefox-Verhalten, siehe Runde 1); Menüeintrag behoben, erneut prüfen ⬜ |
| T22 | SVG-Link (Text und Kreis) ziehen | Link öffnet; kein zusätzlicher Klick im aktuellen Tab | ✅ |
| T23 | Verlinktes Bild ziehen, SHIFT **während** des Ziehens drücken/loslassen | Hinweis wechselt live zwischen „Link“ und „Bild“; beim Loslassen zählt der SHIFT-Zustand | ✅ |
| T24 | Verlinktes Bild ziehen, ESC drücken | Abbruch | ✅ |
| T25 | Link/Text/Bildlink/SVG aus beiden Frames (gleicher und **fremder** Ursprung) **heraus** auf die Seite ziehen, nach rechts **und** nach links | Öffnet; Richtung stimmt | ✅ |
| T27 | mailto-Link mit sichtbarer Adresse und „mailto:…“ als markierter Text | E-Mail-Programm (mit Betreff beim Text) | ✅ |
| T28 | Inline-SVG ohne Link (grünes „SVG“) ziehen | Anzeigeseite: Grafik grün mit weißer Schrift, fenstergroß; Klick = Originalgröße; „Als SVG-Datei speichern“ funktioniert | ✅ |
| T29 | SVG-Stern im Link ziehen, ohne / mit SHIFT | ohne: Link · mit: oranger Stern als Grafik | ✅ |
| T30 | SVG-Link (Kreis) mit SHIFT ziehen | blauer Kreis als Grafik | ✅ |
| T31 | Am Stern im Knopf ziehen | nichts | ✅ |
| T32 | Echte Seiten mit SVG-Symbolen (GitHub, Wikipedia-Diagramme) | Grafik öffnet sinnvoll; Klicks auf Knöpfe/Symbole funktionieren unverändert | ✅ (mit Vorbehalt) |
| T33 | In beiden Frames: SVG, SVG im Link, SVG-Link (Kreis und Text) – innerhalb und über den Rand hinaus, ohne/mit SHIFT | Öffnet wie auf der Seite; Richtung stimmt; SHIFT schaltet „Link“ ↔ „Bild“ | ✅ – SVG-Link (Text) fehlte in den Frames, ergänzt; nur dieser Fall ⬜ |
| T34 | Beim Ziehen aus einem Frame heraus auf den Hinweis achten | Hinweis folgt dem Mauszeiger auch außerhalb des Frames, verschwindet nach dem Loslassen | ✅ |
| F1 | Installation | Symbol erscheint direkt in der Symbolleiste (nicht nur im Puzzleteil-Menü) | ✅ |
| F2 | Rechtsklick auf das Symbol → „Einstellungen“ | Optionsseite öffnet sich in einem Tab | ✅ – Menütitel wechselte nicht mit der Sprache, behoben ⬜ |
| F3 | `about:addons` → HSLinkDrag → Berechtigungen → „Auf Ihre Daten für alle Websites zugreifen“ ausschalten, Optionsseite öffnen | Roter Abschnitt „Zugriff auf Websites fehlt“; Knopf „Zugriff erlauben“ → Firefox fragt, danach verschwindet der Abschnitt und die Geste geht wieder (Seite neu laden) | ✅ – siehe Runde 1 (Klick auf das Symbol erteilt vorübergehenden Zugriff) |
| F4 | Testseite → „Testseite mit Content-Security-Policy“ → Link ziehen | Hinweis sieht **genauso** aus wie auf der normalen Testseite (dunkelgrauer Kasten, weiße Schrift – unabhängig vom Farbschema), Link öffnet | ✅ |
| F5 | Link auf lokale Datei (`file://`) ziehen | Kein Hinweis, nichts passiert | ✅ |
| F6 | Text markieren, Teil davon in einem Link, **in** der Markierung ziehen | Suche nach dem markierten Text (nicht der Link) | ✅ |
| F7 | Text markieren, dann **außerhalb** der Markierung an einem Link ziehen | Link öffnet | ❌ → behoben in Runde 1, erneut prüfen ⬜ |
| F8 | Link in die Lesezeichen-Symbolleiste oder auf die Tableiste ziehen | Firefox-Verhalten bleibt (Lesezeichen anlegen bzw. Tab öffnen), HSLinkDrag öffnet nichts zusätzlich | ✅ |
| F9 | Link in die Adressleiste ziehen | Firefox lädt die Adresse im aktuellen Tab, HSLinkDrag öffnet nichts zusätzlich | ✅ |
| F10 | Firefox neu starten, Erweiterung war ausgeschaltet | Symbol bleibt grau mit „AUS“ | ✅ (mit temporärem Add-on geprüft) |

## Ergebnisse

### Runde 0 – Automatisiert (2026-11-04)

| Befund | Ursache | Behebung |
|---|---|---|
| ❌ Verlinktes Bild mit SHIFT öffnete den Link | Firefox stellt nach einem abgebrochenen nativen Bild-Drag keine Mausereignisse mehr zu (`pointercancel`); die SHIFT-Taste beim Loslassen kam nie an | Maus-Geste für verlinkte Bilder und in Frames beginnt schon bei `mousedown` |
| ✅ alle übrigen Fälle | – | – |

Nach der Behebung: 33/33 bestanden.

### Runde 1 – Manuell (2026-11-04, eigenes Firefox-Profil, temporär geladen)

Alle Tests außer T6 und F7 bestanden; T20 und T32 mit Vorbehalt.

| Befund | Ursache | Behebung |
|---|---|---|
| ❌ T6 „Am Ende“ öffnet wie „Rechts“ | Ohne Index setzt Firefox einen Tab mit `openerTabId` direkt neben den Ursprungstab (Chrome: ans Ende) | Bei „Am Ende“ wird der Index ausdrücklich auf das Fensterende gesetzt; E2E-Test ergänzt |
| ❌ F7 Teil eines Linktexts markiert, am Link außerhalb der Markierung gezogen → Suche statt Link | Firefox zieht bei einem teilweise markierten Link die Markierung (ohne `text/uri-list`), auch wenn außerhalb davon gedrückt wurde | Markierter Text zählt nur noch, wenn die Maustaste **in** der Markierung gedrückt wurde; E2E-Tests ergänzt |
| T21/F2: Menüeintrag heißt immer „Einstellungen“ | Firefox merkt sich Menüeinträge samt Titel; das erneute Anlegen schlug fehl, weil der Eintrag schon existierte | Eintrag wird bei jedem Start und jeder Installation gelöscht und mit aktuellem Titel neu angelegt |
| T21: Sprache (Optionsseite, „AUS“/„OFF“) wechselt erst nach Neuladen des Add-ons | Firefox legt die Sprache einer Erweiterung bei deren Start fest; ein Sprachwechsel von Firefox verlangt ohnehin einen Neustart | kein Fehler – im normalen Betrieb startet das Add-on mit Firefox neu |
| T33: SVG-Link (Text) fehlte in den Frames | Testseite unvollständig | in `test/frame.html` ergänzt, E2E-Test ergänzt |
| F3: Zugriff entzogen, Klick auf das Symbol (aus/ein) → Gesten gehen wieder | Firefox-Verhalten: Ein Klick auf das Symbol einer Erweiterung ohne Website-Zugriff erteilt ihr **vorübergehend** Zugriff auf den aktuellen Tab (wie „Einmal erlauben“ im Erweiterungen-Menü); er endet mit Neuladen/Verlassen der Seite | kein Fehler, gewollt von Firefox |
| F4: kein farblicher Unterschied | Erwartet: Der Hinweis sieht auf der CSP-Seite genauso aus wie überall – genau das prüft der Test | Testbeschreibung präzisiert |

### Runde 2 – Manuell (Nachtest)

Erneut prüfen: T6, T8 mit „Am Ende“, T21/F2 (Menüeintrag nach Sprachwechsel und Neustart), T33 (SVG-Link (Text) in beiden Frames), F7.
*Noch offen.*
