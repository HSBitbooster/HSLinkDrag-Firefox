// Einstellungen: Standardwerte, Laden, Ausschlussliste.
// Wird von Content-Script, Hintergrundskript und Optionsseite gemeinsam genutzt
// (klassisches Script, legt `HSLD.settings` global an; in Node via module.exports).
(function (root) {
  'use strict';

  const DEFAULTS = Object.freeze({
    enabled: true,               // globaler Ein/Aus-Schalter (Toolbar-Button)
    dirRight: 'foreground',      // 'foreground' | 'background' | 'off'
    dirLeft: 'background',
    tabPosition: 'right',        // 'right' | 'left' | 'end'
    imageLinkShift: 'link',      // was OHNE Shift geöffnet wird: 'link' | 'image'
    searchEngine: 'google',      // 'google' | 'duckduckgo' | 'bing' | 'default'
    minDistance: 20,             // px
    showOverlay: true,           // Hinweis beim Ziehen anzeigen
    excludedDomains: []          // z. B. ['trello.com']
  });

  const MIN_DISTANCE_RANGE = Object.freeze({ min: 5, max: 300 });

  function load() {
    return browser.storage.sync.get(DEFAULTS);
  }

  // Macht aus Freitext (eine Domain pro Zeile, auch mit Schema/Pfad) eine saubere Liste.
  function normalizeDomainList(input) {
    const lines = Array.isArray(input) ? input : String(input).split(/[\s,;]+/);
    const result = [];
    for (let line of lines) {
      line = line.trim().toLowerCase();
      if (!line) continue;
      line = line.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');  // Schema
      line = line.replace(/[/?#].*$/, '');                  // Pfad, Query, Fragment
      line = line.replace(/:\d+$/, '');                     // Port
      line = line.replace(/^\*\./, '').replace(/^\.+|\.+$/g, '');
      if (line && !result.includes(line)) result.push(line);
    }
    return result;
  }

  // Domain trifft auch alle Subdomains: 'google.com' schließt 'drive.google.com' ein.
  function isHostExcluded(host, domains) {
    host = String(host || '').toLowerCase().replace(/\.$/, '');
    if (!host) return false;
    return domains.some((d) => host === d || host.endsWith('.' + d));
  }

  const api = { DEFAULTS, MIN_DISTANCE_RANGE, load, normalizeDomainList, isHostExcluded };
  root.HSLD = Object.assign(root.HSLD || {}, { settings: api });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
