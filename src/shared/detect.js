// Erkennung für markierten Text: E-Mail-Adresse, Internetadresse oder Suchbegriff.
// Reine Funktionen ohne Browser-APIs, damit sie in Node getestet werden können
// (test/detect.test.js). Legt `HSLD.detect` global an.
(function (root) {
  'use strict';

  // Bewusst kuratierte Liste: Endungen, die gleichzeitig gängige Dateiendungen sind
  // (.md, .py, .rs, .sh, .so, .zip, .mov), fehlen absichtlich, damit z. B. „readme.md“
  // gesucht und nicht als Adresse geöffnet wird. Mit Schema oder „www.“ geht trotzdem alles.
  const KNOWN_TLDS = new Set((
    // generisch
    'com net org edu gov mil int info biz name pro aero coop museum mobi asia tel travel jobs cat ' +
    'app dev io ai co me tv cc ws fm am gg ly to xyz online site website shop store tech blog cloud ' +
    'news live digital media network systems solutions agency studio design email group company ' +
    'center world today space life page link click zone top club social wiki academy games art ' +
    'shopping berlin hamburg koeln bayern nrw ruhr saarland wien swiss ' +
    // Länder
    'de at ch li lu eu nl be fr it es pt uk ie dk se no fi is pl cz sk hu ro bg gr hr si ba me mk al ' +
    'ee lv lt by ua ru tr cy mt mc sm va ad us ca mx br ar cl pe uy ve au nz jp cn hk tw kr in id th ' +
    'vn my sg ph pk il ae sa qa za eg ma ng ke'
  ).split(/\s+/));

  const DOMAIN_RE = /^(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+(\p{L}{2,63})$/u;
  const EMAIL_RE = /^[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+\p{L}{2,63}$/u;
  const WRAPPERS = [['(', ')'], ['[', ']'], ['{', '}'], ['<', '>'], ['"', '"'], ["'", "'"],
    ['„', '“'], ['“', '”'], ['‚', '‘'], ['‘', '’'], ['«', '»'], ['»', '«']];
  // file: fehlt bewusst: Firefox verbietet Erweiterungen, lokale Dateien in Tabs zu öffnen.
  const OPENABLE_PROTOCOLS = ['http:', 'https:', 'ftp:'];
  const SEARCH_URLS = {
    google: 'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    bing: 'https://www.bing.com/search?q='
  };

  function count(s, ch) {
    return s.split(ch).length - 1;
  }

  // Entfernt umschließende Klammern/Anführungszeichen und abschließende Satzzeichen.
  // Unausgeglichene schließende Klammern werden entfernt, ausgeglichene bleiben
  // (z. B. https://de.wikipedia.org/wiki/Test_(Begriffsklärung)).
  function cleanCandidate(s) {
    let prev;
    do {
      prev = s;
      for (const [open, close] of WRAPPERS) {
        if (s.length >= 2 && s.startsWith(open) && s.endsWith(close)) s = s.slice(1, -1).trim();
      }
      s = s.replace(/[.,;:!?]+$/, '');
      s = s.replace(/["'“”‘’«»>]+$/, '').replace(/^["'„“”‚‘’«»<]+/, '');
      while (s.endsWith(')') && count(s, '(') < count(s, ')')) s = s.slice(0, -1);
      while (s.endsWith(']') && count(s, '[') < count(s, ']')) s = s.slice(0, -1);
      if (s.startsWith('(') && !s.includes(')')) s = s.slice(1);
      if (s.startsWith('[') && !s.includes(']')) s = s.slice(1);
    } while (s !== prev);
    return s;
  }

  function parseUrl(s) {
    try {
      return new URL(s);
    } catch (e) {
      return null;
    }
  }

  function toMailto(s) {
    if (/^mailto:/i.test(s)) {
      const rest = s.slice(7);
      let address = rest.split('?')[0];
      try {
        address = decodeURIComponent(address);
      } catch (e) { /* unverändert prüfen */ }
      return EMAIL_RE.test(address) ? 'mailto:' + rest : null;
    }
    return EMAIL_RE.test(s) ? 'mailto:' + s : null;
  }

  function toUrl(s) {
    if (/^(https?|ftp):\/\//i.test(s)) {
      const url = parseUrl(s);
      return url && url.hostname ? url.href : null;
    }
    if (/^localhost(?::\d{1,5})?(?:[/?#]|$)/i.test(s)) {
      const url = parseUrl('http://' + s);
      return url ? url.href : null;
    }
    const ip = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::\d{1,5})?(?:[/?#]|$)/.exec(s);
    if (ip) {
      if (ip.slice(1, 5).some((n) => Number(n) > 255)) return null;
      const url = parseUrl('http://' + s);
      return url ? url.href : null;
    }
    const host = s.split(/[/?#]/)[0].replace(/:\d{1,5}$/, '');
    if (host.includes('@') || host.includes(':')) return null;
    const domain = DOMAIN_RE.exec(host);
    if (!domain) return null;
    // Mit „www.“ reicht eine gültige Domain, ohne muss die Endung bekannt sein.
    if (!/^www\./i.test(s) && !KNOWN_TLDS.has(domain[1].toLowerCase())) return null;
    const url = parseUrl('https://' + s);
    return url ? url.href : null;
  }

  // Ergebnis: {type:'email', url} | {type:'url', url} | {type:'search', query} | null
  function classifyText(raw) {
    const text = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    const candidate = cleanCandidate(text);
    if (candidate && !/\s/.test(candidate)) {
      const mail = toMailto(candidate);
      if (mail) return { type: 'email', url: mail };
      const url = toUrl(candidate);
      if (url) return { type: 'url', url };
    }
    return { type: 'search', query: text };
  }

  function isOpenableUrl(href) {
    const url = parseUrl(href);
    return !!url && OPENABLE_PROTOCOLS.includes(url.protocol);
  }

  // Liefert null für 'default' (Firefox-Standardsuche läuft über browser.search).
  function searchUrl(engine, query) {
    if (engine === 'default') return null;
    return (SEARCH_URLS[engine] || SEARCH_URLS.google) + encodeURIComponent(query);
  }

  const api = { classifyText, cleanCandidate, isOpenableUrl, searchUrl, KNOWN_TLDS };
  root.HSLD = Object.assign(root.HSLD || {}, { detect: api });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
