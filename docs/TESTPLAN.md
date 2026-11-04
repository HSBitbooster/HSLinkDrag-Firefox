# HSLinkDrag für Firefox – Testprotokoll

Prüfling: HSLinkDrag 1.0.4 für Firefox (`dist/hslinkdrag-1.0.4.zip`); Runde 1–4 mit dem Stand 1.0.3.
Testseite: `test/testseite.html` über den lokalen Server (`npm run serve` →
`http://localhost:8765/test/testseite.html`), dazu `test/frame.html` (eingebettet) und
`test/csp.html` (strenge Content-Security-Policy).

Legende: ✅ bestanden · ❌ Fehler · ⬜ offen · 🤖 automatisiert geprüft

## So wird getestet

Erweiterung laden – eine der beiden Varianten:

Testserver (ohne Cache, damit nach Änderungen keine alten Testdateien erscheinen):

```bash
npm run serve
```

- **Mit web-ext** (eigenes, frisches Firefox-Profil, öffnet die Testseite direkt):

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
| E2E im echten Firefox (headless, Selenium) | `npm run test:e2e` | 🤖 ✅ 40/40 (1.0.4) |
| Versionsabgleich mit der Chrome-Version | `npm run check-version` | 🤖 ✅ beide 1.0.4 |

Abgedeckt im E2E-Test (echte Erweiterung, echte Tabs; Grenzen siehe unten):

| Fall | Ergebnis |
|---|---|
| Link nach rechts → neuer Tab im Vordergrund; nach links → Hintergrund | 🤖 ✅ |
| Unter Mindestdistanz → nichts | 🤖 ✅ |
| Bild ohne Link → Bild; Bild mit Link ohne SHIFT → Link, mit SHIFT → Bild | 🤖 ✅ |
| SVG-Link → Link, mit SHIFT → Grafik in der Anzeigeseite; Inline-SVG → Anzeigeseite; SVG im HTML-Link → Link | 🤖 ✅ |
| `javascript:`-Link, `file:`-Link, Stern im Knopf, `draggable`-Element → nichts | 🤖 ✅ |
| Seite bricht das Ziehen eines Links ab (wie Google) → öffnet trotzdem; Karussell mit eigenem Ziehen → nichts, Band verschiebt sich | 🤖 ✅ |
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
| Sprachwechsel ohne Neustart: Firefox-Sprache zur Laufzeit Englisch → Deutsch; Einstellungsseite und Symbol-Titel folgen nach einem Tabwechsel | 🤖 ✅ |

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
| T6 | Position „Am Ende“ | Neuer Tab ganz rechts | ✅ (Runde 2) |
| T7 | Ursprungstab in Tab-Gruppe (Rechtsklick auf Tab → „Tab zu neuer Gruppe hinzufügen“), Position rechts | Neuer Tab in derselben Gruppe | ✅ |
| T8 | Im Vordergrund geöffneten Tab schließen | Firefox springt zurück zum Ursprungstab | ✅ mit „Rechts“ und „Am Ende“ (Runde 2) |
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
| T20 | Alltagstest auf echten Websites – prüft, dass HSLinkDrag dort funktioniert **und** nichts stört: **a)** Google-Suche: ein Suchergebnis nach rechts ziehen · **b)** Wikipedia-Artikel: Link im Text nach links ziehen; ein Bild im Artikel ohne und mit SHIFT ziehen · **c)** GitHub-Projektseite (z. B. github.com/HSBitbooster/HSLinkDrag-Firefox): einen Dateinamen ziehen · **d)** Google-Bildersuche: ein Vorschaubild ziehen, danach ein Vorschaubild normal anklicken | a) Zielseite des Ergebnisses öffnet im Vordergrund · b) Artikel im Hintergrund; Bild ohne SHIFT → Bildbeschreibungsseite (Link), mit SHIFT → Bilddatei · c) Datei öffnet · d) Bild oder Link öffnet in neuem Tab; normales Klicken öffnet wie gewohnt die Vorschau. Überall: Klicken, Text markieren, Scrollen funktionieren unverändert | ✅ inkl. Google-Reiter (Runde 4) |
| T21 | Firefox-Sprache umstellen (Einstellungen → Allgemein → Sprache), **ohne** Neustart; offene HSLinkDrag-Einstellungsseite wieder anklicken; Rechtsklick auf das Symbol; Maus auf das Symbol (Tooltip); Add-on ausschalten („AUS“/„OFF“); einen Link ziehen (Hinweis) | Alles in der neuen Sprache. Das Symbol (Tooltip, Plakette) wechselt beim nächsten Tabwechsel, die Einstellungsseite beim Zurückkehren auf ihren Tab | ✅ ohne Neustart (Runde 3) |
| T22 | SVG-Link (Text und Kreis) ziehen | Link öffnet; kein zusätzlicher Klick im aktuellen Tab | ✅ |
| T23 | Verlinktes Bild ziehen, SHIFT **während** des Ziehens drücken/loslassen | Hinweis wechselt live zwischen „Link“ und „Bild“; beim Loslassen zählt der SHIFT-Zustand | ✅ |
| T24 | Verlinktes Bild ziehen, ESC drücken | Abbruch | ✅ |
| T25 | Link/Text/Bildlink/SVG aus beiden Frames (gleicher und **fremder** Ursprung) **heraus** auf die Seite ziehen, nach rechts **und** nach links | Öffnet; Richtung stimmt | ✅ |
| T27 | mailto-Link mit sichtbarer Adresse und „mailto:…“ als markierter Text | E-Mail-Programm (mit Betreff beim Text) | ✅ |
| T28 | Inline-SVG ohne Link (grünes „SVG“) ziehen | Anzeigeseite: Grafik grün mit weißer Schrift, fenstergroß; Klick = Originalgröße; „Als SVG-Datei speichern“ funktioniert | ✅ |
| T29 | SVG-Stern im Link ziehen, ohne / mit SHIFT | ohne: Link · mit: oranger Stern als Grafik | ✅ |
| T30 | SVG-Link (Kreis) mit SHIFT ziehen | blauer Kreis als Grafik | ✅ |
| T31 | Am Stern im Knopf ziehen | nichts | ✅ |
| T32 | SVG-Symbole auf echten Websites (GitHub nutzt fast nur SVG-Symbole): **a)** github.com-Projektseite: Knöpfe mit Symbol anklicken (z. B. „Star“, „Code“, Glocke) · **b)** am GitHub-Logo (Octocat, oben links) ziehen, ohne und mit SHIFT · **c)** an einem Symbol ziehen, das nicht in einem Knopf liegt (z. B. Ordner-Symbol in der Dateiliste) | a) Knöpfe funktionieren wie immer, es öffnet kein Tab · b) ohne SHIFT: Link zur GitHub-Startseite; mit SHIFT: das Logo als Grafik in der HSLinkDrag-Anzeigeseite · c) das Symbol öffnet als Grafik – ist es verlinkt, ohne SHIFT der Link und mit SHIFT die Grafik | ✅ (Runde 3) |
| T33 | In beiden Frames: SVG, SVG im Link, SVG-Link (Kreis und Text) – innerhalb und über den Rand hinaus, ohne/mit SHIFT | Öffnet wie auf der Seite; Richtung stimmt; SHIFT schaltet „Link“ ↔ „Bild“ | ✅ (Runde 3) |
| T34 | Beim Ziehen aus einem Frame heraus auf den Hinweis achten | Hinweis folgt dem Mauszeiger auch außerhalb des Frames, verschwindet nach dem Loslassen | ✅ |
| T35 | Testseite Abschnitt 5: Link, dessen Ziehen die Seite abbricht, nach rechts und links ziehen | Öffnet trotzdem; Richtung stimmt | ✅ (Runde 4) |
| T36 | Testseite Abschnitt 5: im Karussell an einem Link nach links ziehen; danach einen Karussell-Link normal anklicken | Band verschiebt sich, HSLinkDrag öffnet nichts; Klick öffnet den Link | ✅ (Runde 4) – am Ende des Karussells öffnet der Link, siehe Runde 4 |
| T37 | 1.0.4 – Testseite Abschnitt 1: „Zieh-Bild: diesen Link langsam ziehen“; danach ein Bild ohne Link; dann in den Einstellungen „Hinweis beim Ziehen anzeigen“ aus und erneut | Mit Hinweis: kein Zieh-Bild von Firefox (Linktext bzw. Bildvorschau) am Mauszeiger, nur der Hinweis. Ohne Hinweis: Zieh-Bild von Firefox wie gewohnt | ✅ (Runde 5) |
| F1 | Installation | Symbol erscheint direkt in der Symbolleiste (nicht nur im Puzzleteil-Menü) | ✅ |
| F2 | Rechtsklick auf das Symbol → „Einstellungen“ | Optionsseite öffnet sich in einem Tab | ✅ ohne Neustart (Runde 3) |
| F3 | `about:addons` → HSLinkDrag → Berechtigungen → „Auf Ihre Daten für alle Websites zugreifen“ ausschalten, Optionsseite öffnen | Roter Abschnitt „Zugriff auf Websites fehlt“; Knopf „Zugriff erlauben“ → Firefox fragt, danach verschwindet der Abschnitt und die Geste geht wieder (Seite neu laden) | ✅ (Runde 2) – Klick auf das Symbol erteilt vorübergehenden Zugriff, siehe Runde 1 |
| F4 | Testseite → „Testseite mit Content-Security-Policy“ → Link ziehen | Hinweis sieht **genauso** aus wie auf der normalen Testseite (dunkelgrauer Kasten, weiße Schrift – unabhängig vom Farbschema), Link öffnet | ✅ (Runde 2) |
| F5 | Link auf lokale Datei (`file://`) ziehen | Kein Hinweis, nichts passiert | ✅ |
| F6 | Text markieren, Teil davon in einem Link, **in** der Markierung ziehen | Suche nach dem markierten Text (nicht der Link) | ✅ |
| F7 | Text markieren, dann **außerhalb** der Markierung an einem Link ziehen | Link öffnet | ✅ (Runde 2) |
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

### Runde 2 – Manuell (Nachtest, 2026-11-04)

T6, T8 („Am Ende“), F3, F4, F7 bestanden; T21/F2 nach Neustart wie beschrieben.

| Befund | Ursache | Behebung |
|---|---|---|
| T33: SVG-Link (Text) fehlt im fremden Frame, im eigenen vorhanden | Beide Frames laden dieselbe `test/frame.html`; der fremde über `localhost`. Der Python-Testserver erlaubte Zwischenspeichern, Firefox zeigte die alte Fassung aus dem Cache | Eigener Testserver `scripts/serve.js` (`npm run serve`) mit `Cache-Control: no-store` |
| T21/F2: Firefox wechselt die Sprache heute ohne Neustart (Einstellungen, Add-on-Verwaltung), HSLinkDrag nicht | Recherche im Quelltext von Firefox 159: `i18n.getMessage()` bleibt bei der Sprache vom Start der Erweiterung (`initLocale`), `i18n.getUILanguage()` liefert die aktuelle Sprache; Firefox meldet Erweiterungen keinen Sprachwechsel und bietet keinen Befehl zum Neuladen der Texte (vgl. Bugzilla 1709652, 1781768) | Eigene Übersetzung `src/shared/i18n.js`: lädt die `messages.json` der aktuellen Firefox-Sprache selbst. Geprüft wird beim Zurückkehren auf die Einstellungsseite, beim Tabwechsel (Symbol-Titel, Plakette, Menüeintrag), beim Öffnen des Symbol-Menüs (`menus.onShown` + `menus.refresh`) und zu Beginn jeder Geste (Hinweis) |
| T20/T32 unklar beschrieben | – | Testbeschreibung mit konkreten Schritten |

### Runde 3 – Manuell (Nachtest, 2026-11-04)

T21/F2 (Sprachwechsel ohne Neustart), T33, T32 bestanden; T20 bis auf die Google-Reiter.

| Befund | Ursache | Behebung |
|---|---|---|
| ❌ T20: Googles Reiter „Bilder“, „Videos“, „News“ … lassen sich nicht ziehen | Diagnose in der Konsole des Nutzers: Google bricht das Ziehen dieser Links selbst ab (`dragstart` mit `preventDefault`) und hält `mousedown` an. Firefox startet dann keinen Drag; HSLinkDrag hielt sich bei von der Seite abgebrochenem Drag bisher raus | Rückfallweg: Bricht die Seite den Drag ab, geht die Geste als Maus-Geste weiter. Schutz für Seiten mit eigenem Ziehen (Karussell, Schieberegler): Verschiebt die Seite das gezogene Element, bricht HSLinkDrag ab. Testseite Abschnitt 5 und E2E-Test ergänzt (40/40) |

### Runde 4 – Manuell (Nachtest, 2026-11-04)

T20 (Google-Reiter), T35, T36 bestanden.

| Befund | Bewertung |
|---|---|
| T36: Steht das Karussell schon am Ende und man zieht weiter in diese Richtung, öffnet HSLinkDrag den Link; in die andere Richtung verschiebt sich wieder das Karussell | Erwartet: Das Element bewegt sich dann nicht, also greift die Schutzregel nicht. Vom Nutzer als in Ordnung bewertet, als bekannte Grenze im Konzept vermerkt |

**Damit sind alle Tests des Testprotokolls für den Stand 1.0.3 bestanden (T26 entfällt).**

### Runde 5 – Manuell (Version 1.0.4, 2026-11-04)

Neu in 1.0.4: Zieh-Bild des Browsers wird bei eingeschaltetem Hinweis ausgeblendet.
Vorher: Add-on in `about:debugging` neu laden, Testseite neu laden.
Geprüft (2026-11-04): T37 ✅; Gegenprobe T1, T9, T20 (Google-Reiter), F4 (CSP-Seite), F8 (Link in die Lesezeichen-Symbolleiste) ✅.

**Version 1.0.4: alle Tests bestanden.**
