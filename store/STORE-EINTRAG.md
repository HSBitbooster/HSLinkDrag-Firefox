# addons.mozilla.org (AMO) – Texte zum Kopieren

Einreichung im Entwickler-Hub: https://addons.mozilla.org/de/developers/addon/submit/
(Anmeldung mit dem Mozilla-Konto – macht der Nutzer selbst). Inhalte in den grauen Kästen
1:1 kopieren. Name und Kurzbeschreibung im Paket kommen aus `_locales/*/messages.json`.

Paket bauen: `npm run build` → `dist/hslinkdrag-<version>.zip` (aktuell `dist/hslinkdrag-1.0.4.zip`;
bricht ab, wenn die Chrome-Version eine andere Versionsnummer hat)
Bilder: `store/images/` (neu erzeugen: `scripts/store-images.sh`)

---

## Schritt 1 – Vertrieb

**„Auf dieser Website“** (On this site) – die Erweiterung wird auf AMO gelistet und von
Mozilla signiert.

## Schritt 2 – Hochladen

- Datei `dist/hslinkdrag-<version>.zip` hochladen.
- Kompatibilität: nur **Firefox** (Desktop) anhaken, **nicht** Firefox für Android
  (Mausgesten, auf Android nicht getestet).
- Die automatische Prüfung sollte ohne Fehler und Warnungen durchlaufen (lokal identisch:
  `npm run lint`).

## Schritt 3 – Quelltext

Frage „Benötigen die Prüfer Ihren Quelltext?“ → **Nein**. Der Code ist weder minifiziert
noch gebündelt oder generiert; das Paket enthält den Quelltext unverändert.

## Schritt 4 – Beschreibung (Describe Add-on)

Standardsprache des Eintrags ist Englisch (`default_locale: en`). Danach auf der Seite
„Produktseite bearbeiten“ über die Sprachauswahl **Deutsch** hinzufügen und die deutschen
Texte eintragen.

**Name:** `HSLinkDrag` (aus dem Paket)

**Add-on-URL:** `hslinkdrag` → https://addons.mozilla.org/firefox/addon/hslinkdrag/
(falls vergeben: `hslinkdrag-firefox`)

### Zusammenfassung (Summary, max. 250 Zeichen)

Englisch:
```
Open links, images, SVG graphics and selected text in a new tab with a short drag – the drag direction decides foreground or background. Selected text is searched, web addresses are opened, email addresses start your mail app.
```

Deutsch:
```
Links, Bilder, SVG-Grafiken und markierten Text mit einer kurzen Ziehbewegung in einem neuen Tab öffnen – die Zugrichtung entscheidet über Vorder- oder Hintergrund. Markierter Text wird gesucht, Adressen geöffnet, E-Mail-Adressen ans Mailprogramm.
```

### Beschreibung – Englisch

```
Open links, images, SVG graphics and selected text in a new tab with a short mouse movement.

How it works: press the mouse button on an element, drag a little to the right or left, release.

• Drag right: new tab in the foreground
• Drag left: new tab in the background – you stay on the page
  (both directions configurable, including "do nothing")

FEATURES
• Open links – including links in SVG graphics and embedded frames
• Open images and SVG graphics, even when they are not linked
• Linked images: SHIFT on release decides whether the link or the image opens
• Drag selected text to search with Google, DuckDuckGo, Bing or Firefox's default search engine
• If the selected text is a web address (e.g. "www.example.com"), it is opened directly
• Email links and selected email addresses open your email client
• New tab position: right or left of the current tab, or at the end
• Several tabs line up in the order you opened them and stay in the tab group
• A hint next to the mouse pointer shows what will happen on release
• Press ESC while dragging to cancel
• Adjustable minimum distance – no accidental opening
• Exclusion list for websites with their own drag & drop
• Turn on/off with one click on the toolbar icon; right-click the icon for the settings
• Input fields are left alone: dragging text into search boxes works as usual

PRIVACY
HSLinkDrag collects no data, has no ads or tracking and loads no remote code. Firefox stores the settings in your browser profile.

User interface in English and German. Open source (MIT): https://github.com/HSBitbooster/HSLinkDrag-Firefox
```

### Beschreibung – Deutsch

```
Links, Bilder, SVG-Grafiken und markierten Text mit einer kurzen Mausbewegung in einem neuen Tab öffnen.

So geht's: Element anklicken, mit gedrückter Maustaste ein Stück nach rechts oder links ziehen, loslassen.

• Nach rechts ziehen: neuer Tab im Vordergrund
• Nach links ziehen: neuer Tab im Hintergrund – du bleibst auf der Seite
  (beide Richtungen frei einstellbar, auch „nichts tun“)

FUNKTIONEN
• Links öffnen – auch Links in SVG-Grafiken und in eingebetteten Frames
• Bilder und SVG-Grafiken öffnen, auch wenn sie nicht verlinkt sind
• Verlinkte Bilder: SHIFT beim Loslassen entscheidet, ob der Link oder das Bild geöffnet wird
• Markierten Text ziehen: Suche mit Google, DuckDuckGo, Bing oder der Firefox-Standardsuchmaschine
• Ist der markierte Text eine Internetadresse (z. B. „www.example.com“), wird sie direkt geöffnet
• E-Mail-Links und markierte E-Mail-Adressen öffnen dein E-Mail-Programm
• Position des neuen Tabs: rechts oder links vom aktuellen Tab oder am Ende
• Mehrere Tabs reihen sich in Öffnungsreihenfolge ein und bleiben in der Tab-Gruppe
• Hinweis am Mauszeiger zeigt vorab, was beim Loslassen passiert
• ESC während des Ziehens bricht ab
• Mindestdistanz einstellbar – kein versehentliches Öffnen
• Ausschlussliste für Websites mit eigenem Drag & Drop
• Ein-/Ausschalten mit einem Klick auf das Symbol in der Symbolleiste; Rechtsklick darauf öffnet die Einstellungen
• Eingabefelder bleiben unberührt: Text in Suchfelder ziehen funktioniert wie gewohnt

DATENSCHUTZ
HSLinkDrag sammelt keine Daten, enthält keine Werbung und kein Tracking und lädt keinen Code nach. Die Einstellungen speichert Firefox in deinem Browserprofil.

Oberfläche auf Deutsch und Englisch. Quelloffen (MIT): https://github.com/HSBitbooster/HSLinkDrag-Firefox
```

### Weitere Felder

| Feld | Wert |
|---|---|
| Ist experimentell | nein |
| Erfordert Bezahlung / Abo | nein |
| Kategorien (max. 2) | **Tabs**, **Suchwerkzeuge** (Search Tools) |
| Schlagwörter (Tags) | `tabs`, `drag`, `links`, `search`, `productivity` (sofern angeboten) |
| Support-E-Mail | leer lassen oder eine öffentliche Kontaktadresse (nicht die private Gmail-Adresse veröffentlichen) |
| Support-Website | `https://github.com/HSBitbooster/HSLinkDrag-Firefox/issues` |
| Homepage | `https://github.com/HSBitbooster/HSLinkDrag-Firefox` |
| Lizenz | **MIT License** |
| Datenschutzerklärung | „Dieses Add-on hat eine Datenschutzerklärung“ anhaken und den Text aus `store/DATENSCHUTZ.md` einfügen |

### Hinweise für die Prüfer (Notes to Reviewer)

```
HSLinkDrag opens links, images, inline SVG graphics and selected text in a new tab when the user drags them a short distance with the mouse; the drag direction (left/right) decides foreground or background.

No build step, no minification, no bundler, no third-party libraries, no remote code. All files in the package are the original source. Public repository: https://github.com/HSBitbooster/HSLinkDrag-Firefox

Permissions:
- storage: user settings (storage.sync); inline SVG graphics the user chose to open are kept temporarily in storage.session so the extension's own viewer page (viewer/svg.html) can display them.
- search: only when the user selects "Firefox default search engine" – then search.query() runs in the newly created tab.
- menus: one "Settings" entry in the toolbar button's context menu (contexts: ["action"]).
- host permission <all_urls> / content script on all pages: the drag gesture must be available on every page without a prior click. The content script only reacts to the user's own drag gesture; it does not read, collect or transmit page content. Users can exclude websites in the settings.

No data collection (data_collection_permissions: none).

How to test: install, open any web page (e.g. https://en.wikipedia.org), press the mouse button on a link, drag about 100 px to the right and release → new tab in the foreground; drag to the left → new tab in the background. Select some text and drag it → web search. A hint next to the mouse pointer shows what will happen. Settings: right-click the toolbar icon → "Settings".
```

## Schritt 5 – Bilder (nach dem Absenden: „Produktseite bearbeiten“ → Bilder)

| Feld | Datei |
|---|---|
| Symbol | `icons/icon-128.png` (wird auch aus dem Paket übernommen) |
| Screenshots Englisch (1280 × 800) | `store/images/en-1-foreground.png` … `en-4-settings.png` |
| Screenshots Deutsch (1280 × 800) | `store/images/de-1-vordergrund.png` … `de-4-einstellungen.png` |

Werbekacheln (`kachel-de.png`, `tile-en.png`) braucht AMO nicht – nur für spätere Zwecke.

## Versionshinweise (Release Notes) für 1.0.4

Englisch:
```
First Firefox release – same version and features as HSLinkDrag 1.0.4 for Chrome.
```

Deutsch:
```
Erste Firefox-Version – gleiche Version und gleicher Funktionsumfang wie HSLinkDrag 1.0.4 für Chrome.
```

## Nach der Veröffentlichung

- Link zur AMO-Seite in `README.md` und `docs/KONZEPT.md` (Status) eintragen.
- Neue Versionen: Version in `manifest.json` **und** `package.json` erhöhen, `npm run build`,
  im Entwickler-Hub „Neue Version hochladen“.
