// Texte, die einem Sprachwechsel in Firefox ohne Neustart folgen.
// browser.i18n.getMessage bleibt bei der Sprache, mit der die Erweiterung gestartet wurde,
// und Firefox meldet Erweiterungen keinen Sprachwechsel. getUILanguage() liefert dagegen die
// aktuelle Firefox-Sprache – darum wird die passende messages.json selbst geladen.
// Wird von Content-Script, Hintergrundskript, Optionsseite und SVG-Anzeige genutzt
// (klassisches Script, legt `HSLD.i18n` global an; in Node via module.exports).
(function (root) {
  'use strict';

  const LOCALES = ['de', 'en'];  // muss zu _locales/ passen
  const DEFAULT_LOCALE = 'en';   // wie default_locale im Manifest

  let current = null;  // { locale, messages }
  let pending = null;  // { locale, promise }

  // 'de-AT' → 'de', 'fr' → 'en' (Standardsprache)
  function pickLocale(uiLanguage) {
    const lang = String(uiLanguage || '').toLowerCase().replace('_', '-');
    if (LOCALES.includes(lang)) return lang;
    const base = lang.split('-')[0];
    return LOCALES.includes(base) ? base : DEFAULT_LOCALE;
  }

  function locale() {
    return pickLocale(browser.i18n.getUILanguage());
  }

  function readMessages(loc) {
    if (!LOCALES.includes(loc)) return Promise.reject(new Error('unbekannte Sprache ' + loc));
    return fetch(browser.runtime.getURL(`_locales/${loc}/messages.json`)).then((r) => r.json());
  }

  // Content-Scripts dürfen Dateien der Erweiterung nicht per fetch lesen (nicht web-zugänglich);
  // sie bekommen die Texte vom Hintergrundskript (Auftrag 'messages', src/background.js).
  function requestMessages(loc) {
    const isContentScript = typeof browser.tabs === 'undefined';
    return isContentScript ? browser.runtime.sendMessage({ action: 'messages', locale: loc }) : readMessages(loc);
  }

  // Lädt die Texte der aktuellen Firefox-Sprache. Ergebnis: true, wenn sich die Sprache
  // seit dem letzten Laden geändert hat (dann sollte die Oberfläche neu beschriftet werden).
  async function load() {
    const wanted = locale();
    if (current && current.locale === wanted) return false;
    if (!pending || pending.locale !== wanted) {
      pending = { locale: wanted, promise: requestMessages(wanted) };
    }
    try {
      const messages = await pending.promise;
      if (!messages || typeof messages !== 'object') throw new Error('keine Texte');
      if (locale() !== wanted) return load();  // während des Ladens erneut umgeschaltet
      const changed = current !== null;
      current = { locale: wanted, messages };
      return changed;
    } catch (e) {
      pending = null;
      return false;  // Rückfall auf browser.i18n.getMessage
    }
  }

  function t(key) {
    const entry = current && current.messages[key];
    if (entry && typeof entry.message === 'string') return entry.message;
    try {
      return browser.i18n.getMessage(key) || key;
    } catch (e) {
      return key;  // Erweiterung wurde neu geladen, Kontext ungültig
    }
  }

  const api = { LOCALES, pickLocale, locale, load, t, readMessages };
  root.HSLD = Object.assign(root.HSLD || {}, { i18n: api });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
