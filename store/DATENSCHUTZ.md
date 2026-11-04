# HSLinkDrag für Firefox – Datenschutzerklärung / Privacy Policy

Stand / Last updated: 2026-11-04

*English version below.*

## Deutsch

HSLinkDrag ist eine Firefox-Erweiterung, die Links, Bilder, SVG-Grafiken und markierten
Text per Click & Drag in einem neuen Tab öffnet.

**HSLinkDrag erhebt, speichert und überträgt keine personenbezogenen Daten.** Es gibt
keine Analyse- oder Tracking-Funktionen, keine Werbung, keine Server des Entwicklers und
keinen nachgeladenen Code.

### Was lokal gespeichert wird

- **Einstellungen** (Zugrichtungen, Tab-Position, Suchmaschine, Mindestdistanz,
  ausgeschlossene Websites, Ein/Aus) werden mit `browser.storage.sync` in deinem
  Firefox-Profil gespeichert. Bist du mit einem Mozilla-Konto angemeldet und ist die
  Synchronisierung von Add-ons eingeschaltet, überträgt Firefox diese Einstellungen auf
  deine anderen Geräte – das erledigt Firefox, nicht HSLinkDrag; der Entwickler hat
  darauf keinen Zugriff.
- **SVG-Grafiken**, die du per Drag öffnest, werden vorübergehend mit
  `browser.storage.session` im Arbeitsspeicher des Browsers abgelegt, damit die
  Anzeigeseite der Erweiterung sie darstellen kann. Sie werden beim Beenden des Browsers
  gelöscht.

### Was beim Benutzen passiert

- Die Erweiterung reagiert nur auf deine eigene Ziehbewegung. Sie liest keine
  Seiteninhalte aus und überträgt nichts.
- Ziehst du markierten Text, öffnet HSLinkDrag eine Suche mit der von dir gewählten
  Suchmaschine (Google, DuckDuckGo, Bing oder die Firefox-Standardsuchmaschine). Dabei
  erhält die Suchmaschine – wie bei jeder Suche – den markierten Text. Für deren
  Datenverarbeitung gelten die Datenschutzbestimmungen der jeweiligen Suchmaschine.
- Geöffnete Links und Bilder werden ganz normal von Firefox geladen.

### Berechtigungen

- **storage:** Einstellungen und vorübergehend geöffnete SVG-Grafiken speichern.
- **search:** Suche mit der Firefox-Standardsuchmaschine, falls in den Einstellungen gewählt.
- **menus:** Eintrag „Einstellungen“ im Rechtsklick-Menü des Symbols.
- **Zugriff auf alle Websites:** nötig, damit die Ziehbewegung auf jeder Seite erkannt
  wird. Websites lassen sich in den Einstellungen ausschließen.

### Kontakt

Fragen zum Datenschutz über die Support-Seite des Add-ons:
https://github.com/HSBitbooster/HSLinkDrag-Firefox/issues

---

## English

HSLinkDrag is a Firefox extension that opens links, images, SVG graphics and selected
text in a new tab by click & drag.

**HSLinkDrag does not collect, store or transmit any personal data.** There is no
analytics or tracking, no advertising, no developer server and no remotely loaded code.

### What is stored locally

- **Settings** (drag directions, tab position, search engine, minimum distance, excluded
  websites, on/off) are stored with `browser.storage.sync` in your Firefox profile. If you
  are signed in to a Mozilla account with add-on sync turned on, Firefox transfers these
  settings to your other devices – this is done by Firefox, not by HSLinkDrag; the
  developer has no access to them.
- **SVG graphics** you open by dragging are kept temporarily in the browser's memory
  with `browser.storage.session` so the extension's viewer page can display them. They
  are deleted when the browser closes.

### What happens during use

- The extension only reacts to your own drag gesture. It does not read page content and
  transmits nothing.
- When you drag selected text, HSLinkDrag opens a search with the search engine you
  chose (Google, DuckDuckGo, Bing or Firefox's default search engine). As with any
  search, that search engine receives the selected text; its own privacy policy applies.
- Opened links and images are loaded by Firefox as usual.

### Permissions

- **storage:** store settings and temporarily opened SVG graphics.
- **search:** search with Firefox's default search engine, if selected in the settings.
- **menus:** "Settings" entry in the toolbar icon's context menu.
- **Access to all websites:** required so the drag gesture works on every page. Websites
  can be excluded in the settings.

### Contact

Privacy questions via the add-on's support page:
https://github.com/HSBitbooster/HSLinkDrag-Firefox/issues
