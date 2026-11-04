// Hintergrundskript (Event-Page, wird bei Bedarf gestartet): öffnet Tabs an der
// eingestellten Position, startet das E-Mail-Programm und schaltet die Erweiterung
// über den Toolbar-Button an/aus. settings.js und i18n.js lädt das Manifest vorher (background.scripts).
'use strict';

const { settings: S, i18n: I } = globalThis.HSLD;
const TAB_GROUP_NONE = -1;
const ICON_SIZES = [16, 32];
const SVG_KEY_PREFIX = 'svg:';  // muss zu viewer/svg.js passen
const MAX_STORED_SVGS = 30;
const ALL_SITES = { origins: ['<all_urls>'] };
const MENU_OPTIONS = 'hslinkdrag-options';

// ---------- Tabs öffnen ----------

// Mehrere Tabs rechts vom Ursprungstab reihen sich in Öffnungsreihenfolge ein
// (wie bei Mittelklick). Gemerkt wird der zuletzt geöffnete Tab; ein Tabwechsel
// setzt die Reihe zurück. storage.session überlebt das Entladen der Event-Page.
async function rightIndex(origin) {
  const { lastOpened } = await browser.storage.session.get('lastOpened');
  if (lastOpened && lastOpened.originId === origin.id) {
    try {
      const last = await browser.tabs.get(lastOpened.tabId);
      if (last.windowId === origin.windowId && last.index > origin.index) return last.index + 1;
    } catch (e) { /* Tab inzwischen geschlossen */ }
  }
  return origin.index + 1;
}

async function createTab(origin, url, active) {
  const { tabPosition } = await S.load();
  const props = { url, active, openerTabId: origin.id, windowId: origin.windowId };
  if (tabPosition === 'right') props.index = await rightIndex(origin);
  else if (tabPosition === 'left') props.index = origin.index;
  // Ohne Index setzt Firefox Tabs mit openerTabId neben den Ursprungstab (anders als Chrome).
  else props.index = (await browser.tabs.query({ windowId: origin.windowId })).length;

  const tab = await browser.tabs.create(props);

  if (tabPosition === 'right') {
    await browser.storage.session.set({ lastOpened: { originId: origin.id, tabId: tab.id } });
  }
  // Neben dem Ursprungstab bleibt der neue Tab in dessen Tab-Gruppe (Firefox ≥ 138).
  if (tabPosition !== 'end' && origin.groupId !== undefined && origin.groupId !== TAB_GROUP_NONE) {
    try {
      await browser.tabs.group({ groupId: origin.groupId, tabIds: tab.id });
    } catch (e) { /* Gruppe existiert nicht mehr */ }
  }
  return tab;
}

async function handleRequest(request, origin) {
  switch (request.action) {
    case 'open':
      await createTab(origin, request.url, request.active);
      break;
    case 'search': {
      // Firefox-Standardsuchmaschine: erst Tab an der richtigen Stelle anlegen, dann darin suchen.
      const tab = await createTab(origin, 'about:blank', request.active);
      await browser.search.query({ text: request.query, tabId: tab.id });
      break;
    }
    case 'openSvg': {
      const id = await storeSvg(request.svg);
      await createTab(origin, browser.runtime.getURL(`viewer/svg.html#${id}`), request.active);
      break;
    }
    case 'mail':
      // Externes Protokoll: Firefox übergibt an das E-Mail-Programm, die Seite bleibt erhalten.
      await browser.tabs.update(origin.id, { url: request.url });
      break;
  }
}

// ---------- SVG-Grafiken für die Anzeigeseite ----------

// Inline-SVGs haben keine Adresse. Der Inhalt wird in storage.session abgelegt
// (bis zum Browser-Neustart) und von viewer/svg.html angezeigt; nur die neuesten bleiben.
async function storeSvg(svg) {
  const all = await browser.storage.session.get(null);
  const old = Object.keys(all)
    .filter((key) => key.startsWith(SVG_KEY_PREFIX))
    .sort((a, b) => all[b].time - all[a].time)
    .slice(MAX_STORED_SVGS - 1);
  if (old.length) await browser.storage.session.remove(old);

  const id = crypto.randomUUID();
  await browser.storage.session.set({ [SVG_KEY_PREFIX + id]: { svg, time: Date.now() } });
  return id;
}

// Mit Antwort: 'messages' liefert Content-Scripts die Texte einer Sprache (src/shared/i18n.js),
// 'topHost' eingebetteten Frames die Domain in der Adresszeile (Firefox kennt
// location.ancestorOrigins nicht). Alle anderen Aufträge ohne Antwort.
browser.runtime.onMessage.addListener((request, sender) => {
  if (!sender.tab || !request || typeof request.action !== 'string') return undefined;
  if (request.action === 'messages') return I.readMessages(request.locale);
  if (request.action === 'topHost') {
    try {
      return Promise.resolve(new URL(sender.tab.url).hostname);
    } catch (e) {
      return Promise.resolve('');
    }
  }
  handleRequest(request, sender.tab).catch((e) => console.warn('HSLinkDrag:', e));
  return undefined;
});

browser.tabs.onActivated.addListener(() => {
  browser.storage.session.remove('lastOpened');
  refreshLanguage().catch((e) => console.warn('HSLinkDrag:', e));
});

// ---------- Toolbar-Button: Ein/Aus ----------

function iconPaths(enabled) {
  const paths = {};
  for (const size of ICON_SIZES) paths[size] = `/icons/icon-${size}${enabled ? '' : '-off'}.png`;
  return paths;
}

async function updateAction(enabled) {
  await I.load();
  await browser.action.setIcon({ path: iconPaths(enabled) });
  await browser.action.setBadgeText({ text: enabled ? '' : I.t('badgeOff') });
  await browser.action.setBadgeBackgroundColor({ color: '#777' });
  await browser.action.setTitle({ title: I.t(enabled ? 'actionTitleOn' : 'actionTitleOff') });
}

browser.action.onClicked.addListener(async () => {
  const { enabled } = await S.load();
  await browser.storage.sync.set({ enabled: !enabled });
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.enabled) updateAction(changes.enabled.newValue !== false);
});

function syncActionWithSettings() {
  S.load().then(({ enabled }) => updateAction(enabled)).catch((e) => console.warn('HSLinkDrag:', e));
}

// Firefox zeigt im Rechtsklick-Menü des Symbols keinen Eintrag „Einstellungen“ – eigener Eintrag.
// Firefox merkt sich Menüeinträge über Neustarts hinweg samt Titel, darum bei jedem Start neu anlegen.
async function createMenu() {
  await I.load();
  await browser.menus.removeAll();
  browser.menus.create({ id: MENU_OPTIONS, title: I.t('menuOptions'), contexts: ['action'] });
}

browser.menus.onClicked.addListener((info) => {
  if (info.menuItemId === MENU_OPTIONS) browser.runtime.openOptionsPage();
});

// ---------- Sprachwechsel ohne Neustart ----------

// Firefox meldet einen Sprachwechsel nicht. Geprüft wird beim Tabwechsel und beim Öffnen des
// Symbol-Menüs; die zuletzt angewandte Sprache steht in storage.session, weil die Event-Page
// zwischendurch entladen wird. Ergebnis: true, wenn Symbol und Menüeintrag neu beschriftet wurden.
async function refreshLanguage() {
  await I.load();
  const uiLocale = I.locale();
  const { appliedLocale } = await browser.storage.session.get('appliedLocale');
  if (appliedLocale === uiLocale) return false;
  await browser.storage.session.set({ appliedLocale: uiLocale });
  syncActionWithSettings();
  try {
    await browser.menus.update(MENU_OPTIONS, { title: I.t('menuOptions') });
  } catch (e) { /* Eintrag wird gerade neu angelegt */ }
  return true;
}

browser.menus.onShown.addListener(async (info) => {
  if (!info.contexts.includes('action')) return;
  if (await refreshLanguage()) browser.menus.refresh();
});

// Firefox kann den Zugriff auf Websites verweigern (Nutzer hat ihn entzogen oder bei der
// Installation nicht erteilt). Dann die Einstellungen öffnen – dort steht der Knopf zum Erlauben.
async function checkSiteAccess() {
  if (!(await browser.permissions.contains(ALL_SITES))) browser.runtime.openOptionsPage();
}

browser.runtime.onStartup.addListener(() => {
  syncActionWithSettings();
  createMenu().catch((e) => console.warn('HSLinkDrag:', e));
});
browser.runtime.onInstalled.addListener(() => {
  syncActionWithSettings();
  createMenu().catch((e) => console.warn('HSLinkDrag:', e));
  checkSiteAccess().catch((e) => console.warn('HSLinkDrag:', e));
});
