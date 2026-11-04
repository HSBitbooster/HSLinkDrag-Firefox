// Automatischer Test der Erweiterung in echtem Firefox (headless, Selenium + geckodriver).
// Ausführen: npm run test:e2e  (baut vorher das Paket; geckodriver lädt Selenium selbst).
//
// Grenzen der Automatisierung (bleiben im manuellen Testplan, docs/TESTPLAN.md):
// - Selenium erzeugt in Firefox echte dragstart/dragover-Ereignisse, aber kein „drop“ –
//   das Drop wird an der Endposition nachgestellt. Maus-Gesten laufen vollständig echt.
// - Ereignisse über den Rand eines Frames mit fremdem Ursprung stellt Selenium nicht zu;
//   dort wird nur innerhalb des Frames gezogen.
// - ESC, E-Mail-Programm, Tab-Gruppen, Toolbar-Symbol, private Fenster: nur manuell.
'use strict';
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Builder, By, Key } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

const ROOT = path.resolve(__dirname, '..');
const VERSION = require(path.join(ROOT, 'manifest.json')).version;
const XPI = path.join(ROOT, 'dist', `hslinkdrag-${VERSION}.zip`);
const PORT = 8765;
const BASE = `http://127.0.0.1:${PORT}/test/testseite.html`;
const UUID = '11111111-2222-3333-4444-555555555555';  // feste moz-extension://-Adresse für die Optionsseite
const headless = !process.env.HEADFUL;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

// Statischer Server für die Testseite (wie python3 -m http.server); läuft schon einer, wird er genutzt.
function startServer() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.once('error', () => resolve(null));
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

const results = [];
function report(name, ok, info = '') {
  results.push({ name, ok, info });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? '  – ' + info : ''}`);
}

async function main() {
  execFileSync('npx', ['web-ext', 'build'], { cwd: ROOT, stdio: 'ignore' });
  const server = await startServer();
  const opts = new firefox.Options();
  if (headless) opts.addArguments('-headless');
  opts.setPreference('extensions.webextensions.uuids', JSON.stringify({ 'hslinkdrag@hsbitbooster': UUID }));
  opts.setPreference('browser.tabs.warnOnClose', false);
  opts.windowSize({ width: 1280, height: 900 });
  const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(opts)
    .setFirefoxService(new firefox.ServiceBuilder().addArguments('--allow-system-access')).build();
  try {
    await driver.installAddon(XPI, true);
    const main = await driver.getWindowHandle();

    async function fresh() {
      // Alle anderen Tabs schließen, Testseite neu laden.
      for (const h of await driver.getAllWindowHandles()) {
        if (h !== main) { await driver.switchTo().window(h); await driver.close(); }
      }
      await driver.switchTo().window(main);
      await driver.get(BASE);
      await driver.sleep(600);
    }

    async function newTabs(before, wait = 2500) {
      const end = Date.now() + wait;
      let handles;
      do {
        handles = await driver.getAllWindowHandles();
        if (handles.length > before.length) break;
        await driver.sleep(150);
      } while (Date.now() < end);
      await driver.sleep(400);
      handles = await driver.getAllWindowHandles();
      return handles.filter((h) => !before.includes(h));
    }

    async function urlOf(handle) {
      await driver.switchTo().window(handle);
      const end = Date.now() + 4000;
      let url = await driver.getCurrentUrl();
      while ((url === 'about:blank' || url === '') && Date.now() < end) { await driver.sleep(200); url = await driver.getCurrentUrl(); }
      await driver.switchTo().window(main);
      return url;
    }

    // Selenium erzeugt in Firefox echte dragstart/dragover-Ereignisse, aber kein „drop“.
    // Das Drop wird darum an der Endposition nachgestellt (nur wirksam, wenn ein nativer Drag läuft).
    async function drag(el, dx, { shift = false, steps = 6, dy = 0, beforeRelease } = {}) {
      await driver.executeScript((e) => e.scrollIntoView({ block: 'center' }), el);
      const a = driver.actions({ async: true });
      a.move({ origin: el }).press();
      if (shift) a.keyDown(Key.SHIFT);
      for (let i = 1; i <= steps; i++) a.move({ origin: el, x: Math.round(dx * i / steps), y: Math.round(dy * i / steps), duration: 30 });
      await a.perform();
      if (beforeRelease) await beforeRelease();
      await driver.executeScript((e, dx, dy, shift) => {
        const r = e.getBoundingClientRect();
        const x = r.left + r.width / 2 + dx;
        const y = r.top + r.height / 2 + dy;
        const t = document.elementFromPoint(x, y) || document.body;
        t.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, shiftKey: shift, dataTransfer: new DataTransfer() }));
      }, el, dx, dy, shift);
      // SHIFT erst nach dem Loslassen der Maustaste lösen (eigene Aktion, sonst gleicher Tick).
      await driver.actions({ async: true }).release().perform();
      if (shift) await driver.actions({ async: true }).keyUp(Key.SHIFT).perform();
    }

    async function visibility() {
      return driver.executeScript('return document.visibilityState');
    }

    async function caseOpen(name, findEl, dx, expect, opts = {}) {
      await fresh();
      const el = await findEl();
      const before = await driver.getAllWindowHandles();
      let overlayText = null;
      await drag(el, dx, { ...opts, beforeRelease: async () => {
        overlayText = await driver.executeScript(() => !!document.querySelector('hslinkdrag-overlay'));
      } });
      const added = await newTabs(before);
      const vis = await visibility();
      if (expect === null) {
        report(name, added.length === 0, `neue Tabs: ${added.length}`);
        return;
      }
      if (added.length !== 1) { report(name, false, `neue Tabs: ${added.length}, Overlay: ${overlayText}`); return; }
      const url = await urlOf(added[0]);
      const fg = vis === 'hidden';
      const okUrl = expect.url instanceof RegExp ? expect.url.test(url) : url === expect.url;
      report(name, okUrl && fg === expect.fg, `URL ${url} · ${fg ? 'Vordergrund' : 'Hintergrund'} · Overlay ${overlayText}`);
    }

    async function openOptions() {
      await fresh();
      await driver.setContext(firefox.Context.CHROME);
      await driver.executeScript((u) => { openTrustedLinkIn(u, 'current'); }, `moz-extension://${UUID}/options/options.html`);
      await driver.setContext(firefox.Context.CONTENT);
      await driver.sleep(800);
    }

    const link = () => driver.findElement(By.css('a[href="https://example.com/"]'));
    await caseOpen('T1 Link nach rechts → Vordergrund', link, 140, { url: 'https://example.com/', fg: true });
    await caseOpen('T2 Link nach links → Hintergrund', link, -140, { url: 'https://example.com/', fg: false });
    await caseOpen('Unter Mindestdistanz → nichts', () => driver.findElement(By.css('a[href="https://example.com/kurz"]')), 12, null);
    await caseOpen('Bild ohne Link → Bild', () => driver.findElement(By.css('img[alt="Bild ohne Link"]')), 140,
      { url: /\/icons\/icon-128\.png$/, fg: true });
    await caseOpen('Bild mit Link ohne SHIFT → Link', () => driver.findElement(By.css('img[alt="Bild mit Link"]')), 140,
      { url: 'https://example.com/verlinkt', fg: true });
    await caseOpen('Bild mit Link mit SHIFT → Bild', () => driver.findElement(By.css('img[alt="Bild mit Link"]')), 140,
      { url: /\/icons\/icon-48\.png$/, fg: true }, { shift: true });
    await caseOpen('SVG-Link (Kreis) → Link', () => driver.findElement(By.css('a[href="https://example.org/svg-kreis"] circle')), 140,
      { url: 'https://example.org/svg-kreis', fg: true });
    await caseOpen('SVG-Link (Kreis) mit SHIFT → Anzeigeseite', () => driver.findElement(By.css('a[href="https://example.org/svg-kreis"] circle')), 140,
      { url: new RegExp(`^moz-extension://${UUID}/viewer/svg\\.html#`), fg: true }, { shift: true });
    await caseOpen('Inline-SVG ohne Link → Anzeigeseite', () => driver.findElement(By.css('svg.farbig')), 140,
      { url: new RegExp(`^moz-extension://${UUID}/viewer/svg\\.html#`), fg: true });
    await caseOpen('SVG im HTML-Link ohne SHIFT → Link', () => driver.findElement(By.css('a[href="https://example.com/svg-im-link"] svg')), 140,
      { url: 'https://example.com/svg-im-link', fg: true });
    await caseOpen('file:-Link → nichts', () => driver.findElement(By.css('a[href^="file:"]')), 140, null);
    {
      await fresh();
      await driver.get(BASE.replace('testseite.html', 'csp.html'));
      await driver.sleep(500);
      const el = await driver.findElement(By.css('a[href="https://example.com/csp"]'));
      const before = await driver.getAllWindowHandles();
      let pos = null;
      await drag(el, 140, { beforeRelease: async () => {
        pos = await driver.executeScript(() => {
          const host = document.querySelector('hslinkdrag-overlay');
          return host ? getComputedStyle(host).position : null;
        });
      } });
      const added = await newTabs(before);
      const url = added.length === 1 ? await urlOf(added[0]) : '';
      report('Strenge CSP: Hinweis formatiert, Link öffnet', pos === 'fixed' && url === 'https://example.com/csp', `Hinweis position=${pos} · ${url}`);
    }
    await caseOpen('javascript:-Link → nichts', () => driver.findElement(By.css('a[href^="javascript:"]')), 140, null);
    await caseOpen('Stern im Knopf → nichts', () => driver.findElement(By.css('button svg')), 140, null);
    await caseOpen('draggable-Element → nichts', () => driver.findElement(By.css('[draggable="true"]')), 140, null);

    // Markierter Text
    async function selectCase(name, xpathText, dx, expect, selectPart) {
      await fresh();
      const el = await driver.findElement(By.xpath(xpathText));
      await driver.executeScript((node, part) => {
        const range = document.createRange();
        const textNode = node.firstChild;
        if (part) { range.setStart(textNode, part[0]); range.setEnd(textNode, part[1]); } else range.selectNodeContents(node);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      }, el, selectPart || null);
      const before = await driver.getAllWindowHandles();
      await drag(el, dx, selectPart ? {} : {});
      const added = await newTabs(before);
      if (added.length !== 1) { report(name, false, `neue Tabs: ${added.length}`); return; }
      const url = await urlOf(added[0]);
      report(name, expect.test(url), url);
    }
    await driver.get(BASE);
    await selectCase('Text → Google-Suche', '//b[text()="Firefox Erweiterung Drag und Drop"]', 140, /^https:\/\/www\.google\.com\/search\?q=Firefox(%20|\+)Erweiterung/);
    await selectCase('Text www.heise.de → Adresse', '//b[text()="www.heise.de"]', 140, /^https:\/\/www\.heise\.de\/$/);
    await selectCase('Text node.js → Suche', '//b[text()="node.js"]', 140, /google\.com\/(search\?q=node\.js|sorry\/.*q%3Dnode\.js)/);

    // Teil eines Linktexts markiert, Ziehen in der Markierung → Suche (Firefox: Startpunkt ist der Link)
    {
      await fresh();
      const a = await driver.findElement(By.css('a[href="https://example.com/link"]'));
      await driver.executeScript((node) => node.scrollIntoView({ block: 'center' }), a);
      await driver.executeScript((node) => {
        const r = document.createRange(); r.setStart(node.firstChild, 0); r.setEnd(node.firstChild, 15);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      }, a);
      const rect = await driver.executeScript((node) => { const r = document.createRange(); r.setStart(node.firstChild, 2); r.setEnd(node.firstChild, 6); const b = r.getBoundingClientRect(); const a = node.getBoundingClientRect(); return { x: b.left + b.width / 2 - (a.left + a.width / 2), y: 0 }; }, a);
      const before = await driver.getAllWindowHandles();
      const act = driver.actions({ async: true });
      act.move({ origin: a, x: Math.round(rect.x), y: 0 }).press();
      for (let i = 1; i <= 6; i++) act.move({ origin: a, x: Math.round(rect.x + 140 * i / 6), y: 0, duration: 30 });
      await act.perform();
      await driver.executeScript((node, dx) => {
        const r = node.getBoundingClientRect();
        node.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2 + dx, clientY: r.top + r.height / 2, dataTransfer: new DataTransfer() }));
      }, a, rect.x + 140);
      await driver.actions({ async: true }).release().perform();
      const added = await newTabs(before);
      const url = added.length === 1 ? await urlOf(added[0]) : '';
      report('Markierung im Link → Suche', /google\.com\/search\?q=dieser/.test(url), url || `neue Tabs: ${added.length}`);
    }

    // F7: Text markiert, aber an einem Link außerhalb der Markierung gezogen → Link
    {
      await fresh();
      await driver.executeScript(() => {
        const b = [...document.querySelectorAll('b')].find((el) => el.textContent === 'www.heise.de');
        const r = document.createRange(); r.selectNodeContents(b);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      });
      const before = await driver.getAllWindowHandles();
      await drag(await link(), 140);
      const added = await newTabs(before);
      const url = added.length === 1 ? await urlOf(added[0]) : '';
      report('F7 Markierung woanders, Link gezogen → Link', url === 'https://example.com/', url || `neue Tabs: ${added.length}`);
    }

    // F7: Teil eines Linktexts markiert, am Link außerhalb der Markierung gezogen → Link
    // (Firefox zieht dabei selbst die Markierung, ohne text/uri-list)
    {
      await fresh();
      const a = await driver.findElement(By.css('a[href="https://example.com/link"]'));
      await driver.executeScript((node) => node.scrollIntoView({ block: 'center' }), a);
      await driver.executeScript((node) => {
        const r = document.createRange(); r.setStart(node.firstChild, 0); r.setEnd(node.firstChild, 6);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      }, a);
      const off = await driver.executeScript((node) => { const r = document.createRange(); r.setStart(node.firstChild, 25); r.setEnd(node.firstChild, 30); const b = r.getBoundingClientRect(); const a = node.getBoundingClientRect(); return b.left + b.width / 2 - (a.left + a.width / 2); }, a);
      const before = await driver.getAllWindowHandles();
      const act = driver.actions({ async: true });
      act.move({ origin: a, x: Math.round(off), y: 0 }).press();
      for (let i = 1; i <= 6; i++) act.move({ origin: a, x: Math.round(off + 140 * i / 6), y: 0, duration: 30 });
      await act.perform();
      await driver.executeScript((node, dx) => {
        const r = node.getBoundingClientRect();
        node.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2 + dx, clientY: r.top + r.height / 2, dataTransfer: new DataTransfer() }));
      }, a, off + 140);
      await driver.actions({ async: true }).release().perform();
      const added = await newTabs(before);
      const url = added.length === 1 ? await urlOf(added[0]) : '';
      report('F7 Teil des Links markiert, außerhalb gezogen → Link', url === 'https://example.com/link', url || `neue Tabs: ${added.length}`);
    }

    // Frames: Link im Frame, aus dem Frame heraus nach rechts/links ziehen
    // Ganze Geste im Hauptdokument mit Fensterkoordinaten: Firefox leitet die Ereignisse selbst
    // an den Frame weiter (wie bei echter Maus), auch über den Frame-Rand hinaus.
    async function frameCase(name, frameId, selector, dx, expect, { shift = false, dy = 0, inside = false } = {}) {
      await fresh();
      if (inside) {
        // Fremder Ursprung: Selenium stellt Ereignisse über den Frame-Rand nicht zu → nur im Frame.
        const frame = await driver.findElement(By.id(frameId));
        await driver.executeScript((f) => f.scrollIntoView({ block: 'start' }), frame);
        await driver.switchTo().frame(frame);
        const el = await driver.findElement(By.css(selector));
        const before = await driver.getAllWindowHandles();
        await driver.actions({ async: true }).move({ origin: el }).press().perform();
        if (shift) await driver.actions({ async: true }).keyDown(Key.SHIFT).perform();
        const a = driver.actions({ async: true });
        for (let i = 1; i <= 6; i++) a.move({ origin: el, x: Math.round(dx * i / 6), y: 0, duration: 30 });
        await a.perform();
        await driver.actions({ async: true }).release().perform();
        if (shift) await driver.actions({ async: true }).keyUp(Key.SHIFT).perform();
        await driver.switchTo().defaultContent();
        const added = await newTabs(before);
        const vis = await visibility();
        if (expect === null) { report(name, added.length === 0, `neue Tabs: ${added.length}`); return; }
        if (added.length !== 1) { report(name, false, `neue Tabs: ${added.length}`); return; }
        const url = await urlOf(added[0]);
        const fg = vis === 'hidden';
        report(name, expect.url.test(url) && fg === expect.fg, `URL ${url} · ${fg ? 'Vordergrund' : 'Hintergrund'}`);
        return;
      }
      const frame = await driver.findElement(By.id(frameId));
      await driver.executeScript((f) => f.scrollIntoView({ block: 'start' }), frame);
      const fr = await driver.executeScript((f) => { const r = f.getBoundingClientRect(); return { x: r.left + f.clientLeft, y: r.top + f.clientTop }; }, frame);
      await driver.switchTo().frame(frame);
      const er = await driver.executeScript((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, selector);
      await driver.switchTo().defaultContent();
      const x0 = Math.round(fr.x + er.x);
      const y0 = Math.round(fr.y + er.y);
      const before = await driver.getAllWindowHandles();
      await driver.actions({ async: true }).move({ x: x0, y: y0 }).press().perform();
      if (shift) await driver.actions({ async: true }).keyDown(Key.SHIFT).perform();
      const a = driver.actions({ async: true });
      for (let i = 1; i <= 10; i++) a.move({ x: x0 + Math.round(dx * i / 10), y: y0 + Math.round(dy * i / 10), duration: 30 });
      await a.perform();
      await driver.actions({ async: true }).release().perform();
      if (shift) await driver.actions({ async: true }).keyUp(Key.SHIFT).perform();
      const added = await newTabs(before);
      const vis = await visibility();
      if (expect === null) { report(name, added.length === 0, `neue Tabs: ${added.length}`); return; }
      if (added.length !== 1) { report(name, false, `neue Tabs: ${added.length}`); return; }
      const url = await urlOf(added[0]);
      const fg = vis === 'hidden';
      report(name, expect.url.test(url) && fg === expect.fg, `URL ${url} · ${fg ? 'Vordergrund' : 'Hintergrund'}`);
    }
    await frameCase('Frame gleich: Link im Frame nach rechts', 'eigenframe', 'a[href="https://example.com/frame-link"]', 120, { url: /frame-link$/, fg: true });
    await frameCase('Frame gleich: Link aus Frame heraus nach unten-rechts', 'eigenframe', 'a[href="https://example.com/frame-link"]', 300, { url: /frame-link$/, fg: true }, { dy: 140 });
    await frameCase('Frame gleich: SVG-Link aus Frame heraus nach unten-links', 'eigenframe', 'a circle', -150, { url: /frame-svg-link$/, fg: false }, { dy: 140 });
    await frameCase('Frame gleich: Bildlink mit SHIFT aus Frame heraus', 'eigenframe', 'img[alt="Bild mit Link"]', 250, { url: /icon-32\.png$/, fg: true }, { dy: 120, shift: true });
    await frameCase('Frame gleich: SVG-Link (Text) nach rechts', 'eigenframe', 'a text', 120, { url: /frame-svg-text$/, fg: true });
    await frameCase('Frame fremd: SVG-Link nach links', 'fremdframe', 'a circle', -60, { url: /frame-svg-link$/, fg: false }, { inside: true });
    await frameCase('Frame fremd: Link nach rechts', 'fremdframe', 'a[href="https://example.com/frame-link"]', 120, { url: /frame-link$/, fg: true }, { inside: true });
    await frameCase('Frame fremd: Bildlink mit SHIFT → Bild', 'fremdframe', 'img[alt="Bild mit Link"]', 120, { url: /icon-32\.png$/, fg: true }, { shift: true, inside: true });

    // Ausschalten über den Speicher (wie Toolbar-Button) → nichts
    {
      await openOptions();
      await driver.sleep(500);
      const title = await driver.getTitle();
      const accessHidden = await driver.executeScript(() => document.getElementById('access').hidden);
      const engineText = await driver.executeScript(() => document.querySelector('#searchEngine option[value="default"]').textContent);
      report('Optionsseite lädt, Zugriff vorhanden', accessHidden === true, `Titel „${title}“, Standardsuche „${engineText}“`);
      await driver.findElement(By.id('enabled')).click();
      await driver.sleep(300);
    }
    await caseOpen('Ausgeschaltet → nichts', link, 140, null);
    {
      await openOptions();
      await driver.sleep(400);
      await driver.findElement(By.id('enabled')).click();
      await driver.findElement(By.css('input[name="tabPosition"][value="left"] + span')).click();
      await driver.sleep(300);
    }
    // Position links: neuer Tab muss links vom Ursprungstab liegen → Index per Hintergrund nicht abfragbar;
    // geprüft über die Reihenfolge der Handles (Firefox liefert sie in Tab-Reihenfolge).
    {
      await fresh();
      const before = await driver.getAllWindowHandles();
      await drag(await link(), -140);
      await newTabs(before);
      const handles = await driver.getAllWindowHandles();
      report('Position „Links“', handles.indexOf(main) === handles.length - 1 && handles.length === 2, `Reihenfolge: ${handles.map((h) => h === main ? 'Ursprung' : 'neu').join(', ')}`);
    }
    {
      await openOptions();
      await driver.sleep(400);
      await driver.findElement(By.css('input[name="tabPosition"][value="right"] + span')).click();
      await driver.sleep(300);
    }
    // T6 Position „Am Ende“: Ursprung, anderer Tab, neuer Tab (Firefox würde ohne Index neben den Ursprung setzen)
    {
      await openOptions();
      await driver.findElement(By.css('input[name="tabPosition"][value="end"] + span')).click();
      await driver.sleep(300);
      await fresh();
      await driver.switchTo().newWindow('tab');
      const other = await driver.getWindowHandle();
      await driver.switchTo().window(main);
      const before = await driver.getAllWindowHandles();
      await drag(await link(), -140);
      const added = await newTabs(before);
      const handles = await driver.getAllWindowHandles();
      const order = handles.map((h) => (h === main ? 'Ursprung' : h === other ? 'anderer' : 'neu')).join(', ');
      report('T6 Position „Am Ende“', added.length === 1 && order === 'Ursprung, anderer, neu', `Reihenfolge: ${order}`);
      await openOptions();
      await driver.findElement(By.css('input[name="tabPosition"][value="right"] + span')).click();
      await driver.sleep(300);
    }

    // Reihenfolge 1,2,3 im Hintergrund
    {
      await fresh();
      const urls = ['https://example.com/', 'https://www.wikipedia.org/', 'https://example.com/abbruch'];
      for (const u of urls) {
        const before = await driver.getAllWindowHandles();
        await drag(await driver.findElement(By.css(`a[href="${u}"]`)), -140);
        await newTabs(before);
      }
      const handles = await driver.getAllWindowHandles();
      const got = [];
      for (const h of handles) got.push(h === main ? 'Ursprung' : (await urlOf(h)).replace(/^https:\/\//, ''));
      report('T3 Reihenfolge 1, 2, 3', got.join(' | ') === 'Ursprung | example.com/ | www.wikipedia.org/ | example.com/abbruch', got.join(' | '));
    }

    // Ausschlussliste: Mit 127.0.0.1 ist auch der Frame von localhost inaktiv, denn es zählt die
    // Domain der Adresszeile – die erfragt der Frame beim Hintergrundskript.
    await openOptions();
    await driver.findElement(By.id('excludedDomains')).sendKeys('127.0.0.1');
    await driver.findElement(By.id('minDistance')).click();  // Feld verlassen → speichern
    await driver.sleep(500);
    await caseOpen('Ausschlussliste 127.0.0.1 → nichts', link, 140, null);
    await frameCase('Ausschlussliste 127.0.0.1 → Frame von localhost ebenfalls inaktiv', 'fremdframe',
      'a[href="https://example.com/frame-link"]', 120, null, { inside: true });

    // Firefox-Standardsuchmaschine (search.query im neu angelegten Tab)
    await openOptions();
    await driver.findElement(By.id('reset')).click();
    await driver.findElement(By.css('#searchEngine option[value="default"]')).click();
    await driver.sleep(400);
    await selectCase('Firefox-Standardsuche', '//b[text()="Firefox Erweiterung Drag und Drop"]', 140, /[?&](q|p|query)=Firefox(%20|\+)Erweiterung/);
    await openOptions();
    await driver.findElement(By.id('reset')).click();
    await driver.sleep(300);
  } finally {
    await driver.quit();
    if (server) server.close();
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} bestanden`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exitCode = 2; });
