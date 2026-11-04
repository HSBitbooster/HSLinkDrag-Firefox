// Erkennt die Click-&-Drag-Geste auf Links, Bildern, SVG-Grafiken und markiertem Text,
// zeigt den Hinweis am Mauszeiger und schickt den Auftrag an das Hintergrundskript.
// Ablauf und Regeln: docs/KONZEPT.md, Abschnitt 4.
//
// Zwei Wege, eine Geste zu verfolgen:
// - nativ (Drag & Drop des Browsers): Links, Bilder, markierter Text im Hauptframe.
// - Maus (mousedown/mousemove/mouseup):
//   · verlinkte Bilder/SVGs, weil SHIFT während eines nativen Drags unter Linux nicht
//     zuverlässig gemeldet wird,
//   · SVG-Grafiken und SVG-Links, die gar nicht nativ ziehbar sind,
//   · alles in eingebetteten Frames: Per Pointer-Capture bekommt der Frame, in dem der
//     Klick begann, die Mausereignisse auch dann, wenn der Zeiger den Frame verlässt.
//     Ein nativer Drop außerhalb des Frames ist dagegen bei fremdem Ursprung gesperrt.
(function () {
  'use strict';

  const { settings: S, detect: D, i18n: I } = globalThis.HSLD;

  const MOUSE_START_THRESHOLD = 5;   // px, ab hier wird aus einem Klick eine Geste
  const PAGE_MOVE_TOLERANCE = 3;     // px, so weit darf die Seite ein gezogenes Element verschieben
  const OVERLAY_LEAVE_DELAY = 60;    // ms, Hinweis ausblenden, wenn der Drag den Frame verlässt
  const MAX_STYLED_SVG_NODES = 5000; // größere SVGs ohne übernommene Seiten-Styles
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';
  // Seiten-CSS, das beim Öffnen einer SVG-Grafik in die Elemente übernommen wird.
  const SVG_STYLE_PROPS = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity',
    'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'color', 'visibility',
    'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline'];
  const IS_FRAME = window !== window.top;
  const RELAY_KEY = '__hslinkdragOverlay';  // postMessage-Schlüssel für den Hinweis aus Frames

  let settings = { ...S.DEFAULTS };
  let drag = null;   // nativer Drag
  let mouse = null;  // Maus-Geste
  let lastMouseDown = null;
  let lastPointer = null;  // {id, target} des letzten Drückens der linken Maustaste
  let overlay = null;
  let relayed = false;  // Hinweis wird gerade vom übergeordneten Frame gezeichnet
  let leaveTimer = 0;

  S.load().then((s) => { settings = s; }).catch(() => {});
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      settings[key] = newValue === undefined ? S.DEFAULTS[key] : newValue;
    }
  });

  // ---------- Hilfsfunktionen ----------

  // Texte in der aktuellen Firefox-Sprache (src/shared/i18n.js). Zu Beginn jeder Geste wird
  // geprüft, ob die Sprache inzwischen gewechselt hat.
  const msg = I.t;
  function refreshTexts() {
    I.load().catch(() => {});
  }
  refreshTexts();

  function send(request) {
    try {
      browser.runtime.sendMessage(request).catch(() => {});
    } catch (e) {
      // Erweiterung wurde aktualisiert/neu geladen – Seite muss neu geladen werden.
    }
  }

  function asElement(node) {
    return node && node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  }

  function isEditable(node) {
    const el = asElement(node);
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    return el.isContentEditable || !!el.closest('input, textarea, select');
  }

  // Bei eingebetteten Frames zählt die Domain der Seite in der Adresszeile. Firefox kennt
  // location.ancestorOrigins nicht, darum fragt der Frame einmal das Hintergrundskript.
  let topHostName = location.hostname;
  if (IS_FRAME) {
    const ancestors = location.ancestorOrigins;
    if (ancestors && ancestors.length) {
      try {
        topHostName = new URL(ancestors[ancestors.length - 1]).hostname;
      } catch (e) { /* weiter mit eigenem Host */ }
    } else {
      try {
        browser.runtime.sendMessage({ action: 'topHost' })
          .then((host) => { if (typeof host === 'string' && host) topHostName = host; })
          .catch(() => {});
      } catch (e) { /* Erweiterung neu geladen */ }
    }
  }

  function isActive() {
    return settings.enabled && !S.isHostExcluded(topHostName, settings.excludedDomains || []);
  }

  function linkHref(el) {
    const raw = el.getAttribute('href') ?? el.getAttributeNS(XLINK_NS, 'href');  // ältere SVGs: xlink:href
    if (raw === null) return null;
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === '#' || /^javascript:/i.test(trimmed)) return null;
    // SVG-Links liefern ein SVGAnimatedString statt eines Strings.
    if (typeof el.href === 'string') return el.href;
    try {
      return new URL(trimmed, document.baseURI).href;
    } catch (e) {
      return null;
    }
  }

  // Bild-Teil eines Ziels: {url} für <img>, {svg} (Element) für Inline-SVG.
  function imageOf(img, svg) {
    if (img) {
      const src = img.currentSrc || img.src;
      return src && D.isOpenableUrl(src) ? { url: src } : null;
    }
    return svg ? { svg } : null;
  }

  // Elemente mit draggable="true" (außer Links/Bilder) gehören zur eigenen
  // Drag-&-Drop-Logik der Seite (z. B. sortierbare Listen) – dort nicht eingreifen.
  function isPageDraggable(path) {
    for (const node of path) {
      if (!(node instanceof Element)) continue;
      if (node.localName === 'a' || node.localName === 'img') return false;
      if (node.getAttribute('draggable') === 'true') return true;
    }
    return false;
  }

  // ---------- Ziel bestimmen (Konzept 4.2) ----------

  function linkTarget(link, image) {
    const href = linkHref(link);
    if (href && /^mailto:/i.test(href)) return { kind: 'mail', url: href };
    const linkUrl = href && D.isOpenableUrl(href) ? href : null;
    if (linkUrl && image) return { kind: 'linkimage', linkUrl, image };
    if (linkUrl) return { kind: 'link', url: linkUrl };
    if (image) return { kind: 'image', image };
    return null;
  }

  // Läuft den Ereignispfad nach oben: erstes <img>, äußerstes <svg>, erster Link.
  function elementTarget(path) {
    let img = null;
    let svg = null;
    for (const node of path) {
      if (!(node instanceof Element)) continue;
      if (!img && !svg && node instanceof HTMLImageElement) img = node;
      if (!img && node instanceof SVGSVGElement) svg = node;
      if (node instanceof SVGAElement || node.matches('a[href], area[href]')) {
        // Ein SVG-Link liegt innerhalb seiner Grafik: das äußerste <svg> kommt erst danach.
        if (node instanceof SVGAElement) svg = node.ownerSVGElement ? outermostSvg(node) : svg;
        return linkTarget(node, imageOf(img, svg));
      }
    }
    const image = imageOf(img, svg);
    return image ? { kind: 'image', image } : null;
  }

  function outermostSvg(el) {
    let svg = el.ownerSVGElement;
    while (svg && svg.ownerSVGElement) svg = svg.ownerSVGElement;
    return svg;
  }

  function selectionTarget(selectedText) {
    const result = D.classifyText(selectedText);
    if (!result) return null;
    if (result.type === 'email') return { kind: 'mail', url: result.url };
    if (result.type === 'url') return { kind: 'address', url: result.url };
    return { kind: 'search', query: result.query };
  }

  function resolveDragTarget(e) {
    const path = e.composedPath();
    const source = path[0];
    if (isEditable(source)) return null;

    // Markierter Text zählt nur, wenn die Maustaste in der Markierung gedrückt wurde. Firefox
    // meldet als Startpunkt das Element (z. B. den Link) und zieht bei einem teilweise
    // markierten Link selbst dann die Markierung, wenn man außerhalb davon am Link zieht.
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : '';
    const hasSelection = selectedText.trim() !== '';
    const inSelection = lastMouseDown
      ? pointInSelection(selection, lastMouseDown.x, lastMouseDown.y)
      : source.nodeType === Node.TEXT_NODE;
    if (hasSelection && inSelection) return selectionTarget(selectedText);

    if (isPageDraggable(path)) return null;
    const target = elementTarget(path);
    if (target) return target;
    // Markierung, deren Ziehen knapp neben dem markierten Text (z. B. Zeilenzwischenraum) begann.
    const types = e.dataTransfer ? Array.from(e.dataTransfer.types) : [];
    return hasSelection && !types.includes('text/uri-list') ? selectionTarget(selectedText) : null;
  }

  function pointInSelection(selection, x, y) {
    for (let i = 0; i < selection.rangeCount; i++) {
      for (const r of selection.getRangeAt(i).getClientRects()) {
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
      }
    }
    return false;
  }

  // Maus-Gesten beginnen schon beim Drücken der Maustaste: SVG-Grafiken sind nicht nativ
  // ziehbar, und bricht man in Firefox einen bereits begonnenen nativen Drag ab, kommen
  // keine Mausereignisse mehr an (pointercancel). Darum ebenso bei verlinkten Bildern und
  // in Frames (dort auch für Links, Bilder und das Drücken in einer Textmarkierung).
  // In Bedienelementen (z. B. Symbol in einem Button) nicht eingreifen.
  function mouseDownTarget(e) {
    const path = e.composedPath();
    if (isEditable(path[0]) || isPageDraggable(path)) return null;
    const source = asElement(path[0]);
    if (source && source.closest('button, [role="button"], label, input, select, textarea, [contenteditable]')) {
      return null;
    }
    if (IS_FRAME) {
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString() : '';
      if (selectedText.trim() !== '' && pointInSelection(selection, e.clientX, e.clientY)) {
        return selectionTarget(selectedText);
      }
    }
    const target = elementTarget(path);
    if (!target) return null;
    const hasSvg = path.some((node) => node instanceof SVGElement);
    return hasSvg || target.kind === 'linkimage' || IS_FRAME ? target : null;
  }

  // ---------- SVG-Grafik in eigenständige Datei umwandeln ----------

  function serializeSvg(svg) {
    const clone = svg.cloneNode(true);
    const originals = [svg, ...svg.querySelectorAll('*')];
    const copies = [clone, ...clone.querySelectorAll('*')];

    // Farben usw. kommen bei Inline-SVG oft aus dem CSS der Seite.
    if (originals.length <= MAX_STYLED_SVG_NODES) {
      originals.forEach((orig, i) => {
        const computed = getComputedStyle(orig);
        const style = copies[i].style;
        for (const prop of SVG_STYLE_PROPS) {
          if (!style.getPropertyValue(prop)) style.setProperty(prop, computed.getPropertyValue(prop));
        }
      });
    }

    // <use href="#symbol"> verweist oft auf ein Symbol-Sprite außerhalb der Grafik.
    const root = svg.getRootNode();
    const defs = document.createElementNS(SVG_NS, 'defs');
    const pending = [...clone.querySelectorAll('use')];
    const copied = new Set();
    while (pending.length) {
      const use = pending.shift();
      const href = use.getAttribute('href') || use.getAttributeNS(XLINK_NS, 'href') || '';
      if (!href.startsWith('#')) continue;
      const id = href.slice(1);
      if (copied.has(id) || clone.querySelector('#' + CSS.escape(id))) continue;
      const ref = (root.getElementById ? root.getElementById(id) : null) || document.getElementById(id);
      if (!ref) continue;
      const refCopy = ref.cloneNode(true);
      defs.appendChild(refCopy);
      copied.add(id);
      pending.push(...refCopy.querySelectorAll('use'));
    }
    if (defs.childNodes.length) clone.insertBefore(defs, clone.firstChild);

    // Angezeigte Größe übernehmen (ersetzt z. B. width="100%").
    const rect = svg.getBoundingClientRect();
    if (rect.width && rect.height) {
      if (!clone.hasAttribute('viewBox') && clone.hasAttribute('width') && clone.hasAttribute('height')) {
        const w = parseFloat(clone.getAttribute('width'));
        const h = parseFloat(clone.getAttribute('height'));
        if (w && h) clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }
      clone.setAttribute('width', Math.round(rect.width));
      clone.setAttribute('height', Math.round(rect.height));
    }
    clone.setAttribute('xmlns', SVG_NS);
    return new XMLSerializer().serializeToString(clone);
  }

  // ---------- Auswertung ----------

  // Link auf Bild: Ohne SHIFT gilt die Einstellung, mit SHIFT das Gegenteil (Konzept 4.6).
  function effectiveKind(target, shift) {
    if (target.kind !== 'linkimage') return target.kind;
    const withoutShift = settings.imageLinkShift === 'image' ? 'image' : 'link';
    if (!shift) return withoutShift;
    return withoutShift === 'image' ? 'link' : 'image';
  }

  // 'foreground' | 'background' | 'off' | null (unter Mindestdistanz)
  function directionMode(dx) {
    const min = Number(settings.minDistance) || S.DEFAULTS.minDistance;
    if (Math.abs(dx) < min) return null;
    return dx > 0 ? settings.dirRight : settings.dirLeft;
  }

  function imageRequest(image, active) {
    if (image.url) return { action: 'open', url: image.url, active };
    return { action: 'openSvg', svg: serializeSvg(image.svg), active };
  }

  // E-Mail ignoriert die Richtungseinstellung, braucht aber die Mindestdistanz.
  function buildRequest(target, kind, mode) {
    if (kind === 'mail') return mode === null ? null : { action: 'mail', url: target.url };
    if (mode !== 'foreground' && mode !== 'background') return null;
    const active = mode === 'foreground';
    if (kind === 'search') {
      const url = D.searchUrl(settings.searchEngine, target.query);
      return url ? { action: 'open', url, active } : { action: 'search', query: target.query, active };
    }
    if (kind === 'image') return imageRequest(target.image, active);
    if (target.kind === 'linkimage') return { action: 'open', url: target.linkUrl, active };
    return { action: 'open', url: target.url, active };
  }

  function finish(target, dx, shift) {
    const request = buildRequest(target, effectiveKind(target, shift), directionMode(dx));
    if (request) send(request);
  }

  // ---------- Hinweis am Mauszeiger ----------

  function overlayText(kind, mode, dx) {
    if (kind === 'mail') return (mode === null ? '↔ ' : '') + '✉ ' + msg('overlayMail');
    const what = msg({ link: 'kindLink', image: 'kindImage', search: 'kindSearch', address: 'kindAddress' }[kind]);
    if (mode === null) return '↔ ' + what;
    if (mode === 'off') return (dx > 0 ? '→ ' : '← ') + msg('overlayDisabled');
    const where = msg(mode === 'foreground' ? 'overlayForeground' : 'overlayBackground');
    return (dx > 0 ? '→ ' : '← ') + where + ' · ' + what;
  }

  function showOverlay(text, x, y) {
    if (!settings.showOverlay) return;
    if (!overlay) {
      // Styles per CSSOM statt <style>/innerHTML: Firefox wendet die CSP der Seite auch auf
      // vom Content-Script eingefügte Style-Elemente an, CSSOM-Zuweisungen sind davon frei.
      const host = document.createElement('hslinkdrag-overlay');
      host.style.cssText = 'all:initial;position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none';
      const box = document.createElement('div');
      box.style.cssText = 'font:600 12px/1.4 system-ui,sans-serif;color:#fff;background:rgba(32,33,36,.92);' +
        'padding:4px 9px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3)';
      host.attachShadow({ mode: 'closed' }).appendChild(box);
      overlay = { host, box };
    }
    if (!overlay.host.isConnected) (document.body || document.documentElement).appendChild(overlay.host);
    overlay.box.textContent = text;
    const w = overlay.box.offsetWidth;
    const h = overlay.box.offsetHeight;
    const left = Math.min(x + 16, window.innerWidth - w - 4);
    const top = Math.min(y + 18, window.innerHeight - h - 4);
    overlay.host.style.transform = `translate(${Math.max(4, left)}px, ${Math.max(4, top)}px)`;
  }

  // Verlässt der Zeiger einen Frame, zeichnet der übergeordnete Frame den Hinweis
  // (per postMessage, Koordinaten werden dort umgerechnet), sonst klebt er am Frame-Rand.
  function displayOverlay(text, x, y) {
    if (!settings.showOverlay) return;
    const outside = x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight;
    if (IS_FRAME && outside) {
      if (overlay && overlay.host.isConnected) overlay.host.remove();
      window.parent.postMessage({ [RELAY_KEY]: { text, x, y, width: window.innerWidth } }, '*');
      relayed = true;
      return;
    }
    if (relayed) hideRelayed();
    showOverlay(text, x, y);
  }

  function hideRelayed() {
    window.parent.postMessage({ [RELAY_KEY]: { hide: true } }, '*');
    relayed = false;
  }

  function previewOverlay(target, dx, shift, x, y) {
    displayOverlay(overlayText(effectiveKind(target, shift), directionMode(dx), dx), x, y);
  }

  function hideOverlay() {
    clearTimeout(leaveTimer);
    if (overlay && overlay.host.isConnected) overlay.host.remove();
    if (relayed) hideRelayed();
  }

  // Hinweis aus einem eingebetteten Frame: Frame-Element über event.source finden und
  // dessen Koordinaten (inkl. Rahmen, Innenabstand, Zoom) in die eigenen umrechnen.
  window.addEventListener('message', (e) => {
    const data = e.data && typeof e.data === 'object' ? e.data[RELAY_KEY] : null;
    if (!data || !e.source) return;
    const frame = Array.from(document.querySelectorAll('iframe, frame')).find((f) => f.contentWindow === e.source);
    if (!frame) return;
    if (data.hide) {
      hideOverlay();
      return;
    }
    const rect = frame.getBoundingClientRect();
    const style = getComputedStyle(frame);
    const padLeft = parseFloat(style.paddingLeft) || 0;
    const padTop = parseFloat(style.paddingTop) || 0;
    const innerWidth = frame.clientWidth - padLeft - (parseFloat(style.paddingRight) || 0);
    const scale = data.width ? innerWidth / data.width : 1;
    displayOverlay(String(data.text),
      rect.left + frame.clientLeft + padLeft + data.x * scale,
      rect.top + frame.clientTop + padTop + data.y * scale);
  });

  // ---------- Native Gesten ----------

  window.addEventListener('dragstart', (e) => {
    // Auf einer SVG-Grafik läuft schon eine Maus-Geste (seit mousedown). Sie hat Vorrang:
    // Der native Drag eines umgebenden Links kennt die enthaltene SVG nicht.
    if (mouse) {
      e.preventDefault();
      if (!mouse.active) capturePointer();
      mouse.active = true;
      return;
    }
    drag = null;
    hideOverlay();
    if (!isActive()) return;
    const target = resolveDragTarget(e);
    if (!target) return;
    if (target.kind === 'linkimage' || IS_FRAME) {
      // Nativen Drag verhindern und als Maus-Geste weiterverfolgen (Gründe siehe oben). Nur noch
      // Rückfallweg: Normalerweise läuft die Maus-Geste hier schon seit mousedown (siehe oben).
      e.preventDefault();
      const start = lastMouseDown || { x: e.clientX, y: e.clientY };
      startMouse(target, start.x, start.y, true);
      return;
    }
    refreshTexts();
    drag = { target, startX: e.clientX, source: asElement(e.composedPath()[0]) };
  }, true);

  // Hat die Seite das Ziehen selbst abgebrochen (z. B. Google bei den Reitern „Bilder“, „Videos“),
  // startet Firefox keinen Drag – die Geste geht dann als Maus-Geste weiter. Bewegt die Seite
  // das Element dabei selbst (eigenes Ziehen, z. B. Karussell), wird sie abgebrochen (pageMoved).
  window.addEventListener('dragstart', (e) => {
    if (!e.defaultPrevented || !drag) return;
    const { target, source } = drag;
    drag = null;
    const start = lastMouseDown || { x: e.clientX, y: e.clientY };
    startMouse(target, start.x, start.y, true, source);
  }, false);

  function onDragOver(e) {
    if (!drag) return;
    clearTimeout(leaveTimer);
    if (isEditable(e.composedPath()[0])) {
      hideOverlay();  // Eingabefeld: Browser-Standard (z. B. Text einfügen)
      return;
    }
    e.preventDefault();  // Drop erlauben, sonst kommt kein „drop“-Ereignis
    previewOverlay(drag.target, e.clientX - drag.startX, e.shiftKey, e.clientX, e.clientY);
  }
  window.addEventListener('dragenter', onDragOver, true);
  window.addEventListener('dragover', onDragOver, true);

  // Zieht der Drag über einen Frame, kommt hier kein weiteres „dragover“ – Hinweis ausblenden.
  window.addEventListener('dragleave', () => {
    if (!drag) return;
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(hideOverlay, OVERLAY_LEAVE_DELAY);
  }, true);

  window.addEventListener('drop', (e) => {
    if (!drag) return;
    const gesture = drag;
    drag = null;
    hideOverlay();
    if (isEditable(e.composedPath()[0])) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    finish(gesture.target, e.clientX - gesture.startX, e.shiftKey);
  }, true);

  // Ohne vorheriges „drop“ (ESC, Loslassen außerhalb des Fensters) passiert nichts.
  window.addEventListener('dragend', () => {
    drag = null;
    hideOverlay();
  }, true);

  // ---------- Maus-Gesten ----------

  // watch: Element, dessen Position überwacht wird – verschiebt die Seite es während der Geste,
  // zieht sie selbst (Karussell, Schieberegler), und HSLinkDrag hält sich raus.
  function startMouse(target, x, y, active, watch = null) {
    refreshTexts();
    mouse = { target, startX: x, startY: y, active, lastX: x, lastY: y, shift: false, watch: null };
    if (watch && watch.isConnected) {
      const r = watch.getBoundingClientRect();
      mouse.watch = { el: watch, left: r.left, top: r.top };
    }
    if (active) capturePointer();
  }

  function pageMoved(gesture) {
    const w = gesture.watch;
    if (!w || !w.el.isConnected) return false;
    const r = w.el.getBoundingClientRect();
    return Math.abs(r.left - w.left) > PAGE_MOVE_TOLERANCE || Math.abs(r.top - w.top) > PAGE_MOVE_TOLERANCE;
  }

  // In Frames: Die Mausereignisse sollen beim Frame bleiben, auch wenn der Zeiger ihn verlässt
  // (Richtung und Loslassen werden in Frame-Koordinaten ausgewertet). Im Hauptframe unnötig.
  function capturePointer() {
    if (!IS_FRAME || !lastPointer) return;
    const el = asElement(lastPointer.target);
    try {
      if (el && el.isConnected) el.setPointerCapture(lastPointer.id);
    } catch (e) { /* Zeiger nicht mehr gedrückt */ }
  }

  function cancelMouse() {
    if (!mouse) return;
    mouse = null;
    hideOverlay();
  }

  function previewMouse() {
    previewOverlay(mouse.target, mouse.lastX - mouse.startX, mouse.shift, mouse.lastX, mouse.lastY);
  }

  // Nach einer Geste darf der Klick (Loslassen über demselben Link) nicht navigieren.
  function suppressNextClick() {
    const block = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('click', block, true);
    setTimeout(() => window.removeEventListener('click', block, true), 0);
  }

  function releasedOutsideWindow(e) {
    if (IS_FRAME) return false;  // Frame: Loslassen außerhalb ist gewollt
    return e.clientX < 0 || e.clientY < 0 || e.clientX > window.innerWidth || e.clientY > window.innerHeight;
  }

  window.addEventListener('pointerdown', (e) => {
    if (e.button === 0) lastPointer = { id: e.pointerId, target: e.composedPath()[0] };
  }, true);

  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) lastMouseDown = { x: e.clientX, y: e.clientY };
  }, true);

  // Bubble-Phase: Hat die Seite den Klick selbst übernommen (z. B. Diagramm verschieben), nicht eingreifen.
  window.addEventListener('mousedown', (e) => {
    cancelMouse();
    if (e.button !== 0 || e.defaultPrevented || !isActive()) return;
    const target = mouseDownTarget(e);
    if (target) startMouse(target, e.clientX, e.clientY, false);
  }, false);

  // Während einer Maus-Geste keine Textmarkierung beginnen.
  window.addEventListener('selectstart', (e) => {
    if (mouse) e.preventDefault();
  }, true);

  window.addEventListener('mousemove', (e) => {
    if (!mouse) return;
    if (!(e.buttons & 1)) {
      cancelMouse();
      return;
    }
    if (pageMoved(mouse)) {
      cancelMouse();
      return;
    }
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
    mouse.shift = e.shiftKey;
    if (!mouse.active) {
      if (Math.hypot(e.clientX - mouse.startX, e.clientY - mouse.startY) < MOUSE_START_THRESHOLD) return;
      mouse.active = true;
      capturePointer();
    }
    previewMouse();
  }, true);

  window.addEventListener('mouseup', (e) => {
    if (!mouse || e.button !== 0) return;
    const gesture = mouse;
    mouse = null;
    hideOverlay();
    if (!gesture.active || pageMoved(gesture)) return;
    suppressNextClick();
    if (releasedOutsideWindow(e)) return;
    finish(gesture.target, e.clientX - gesture.startX, e.shiftKey);
  }, true);

  function onKey(e) {
    if (!mouse || !mouse.active) return;
    if (e.key === 'Escape' && e.type === 'keydown') {
      e.preventDefault();
      e.stopImmediatePropagation();
      cancelMouse();
    } else if (e.key === 'Shift') {
      mouse.shift = e.type === 'keydown';
      previewMouse();
    }
  }
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
  window.addEventListener('blur', cancelMouse);
})();
