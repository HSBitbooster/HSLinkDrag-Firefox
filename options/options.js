// Optionsseite: Texte übersetzen, Einstellungen anzeigen und bei jeder Änderung sofort speichern.
'use strict';

const { settings: S, i18n: I } = globalThis.HSLD;
const $ = (id) => document.getElementById(id);

const SELECTS = ['dirRight', 'dirLeft', 'searchEngine'];
const RADIOS = ['tabPosition', 'imageLinkShift'];
const CHECKBOXES = ['enabled', 'showOverlay'];
const ALL_SITES = { origins: ['<all_urls>'] };

function translate() {
  document.documentElement.lang = I.locale();
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const text = I.t(el.dataset.i18n);
    if (text) el.textContent = text;
  }
}

// Sprachwechsel in Firefox ohne Neustart: Firefox meldet ihn nicht, darum beim Zurückkehren
// auf diese Seite prüfen (z. B. nach dem Umstellen in den Firefox-Einstellungen).
async function retranslateIfChanged() {
  if (await I.load()) translate();
}

function render(values) {
  for (const key of SELECTS) $(key).value = values[key];
  for (const key of CHECKBOXES) $(key).checked = values[key];
  for (const key of RADIOS) {
    const radio = document.querySelector(`input[name="${key}"][value="${values[key]}"]`);
    if (radio) radio.checked = true;
  }
  $('minDistance').value = values.minDistance;
  if (document.activeElement !== $('excludedDomains')) {
    $('excludedDomains').value = values.excludedDomains.join('\n');
  }
}

let statusTimer;
function flashSaved() {
  const status = $('status');
  status.textContent = I.t('saved');
  status.classList.add('visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => status.classList.remove('visible'), 1500);
}

async function save(values) {
  await browser.storage.sync.set(values);
  flashSaved();
}

function saveMinDistance() {
  const { min, max } = S.MIN_DISTANCE_RANGE;
  const value = Math.round(Number($('minDistance').value));
  if (!Number.isFinite(value)) return;
  const clamped = Math.min(max, Math.max(min, value));
  $('minDistance').value = clamped;
  save({ minDistance: clamped });
}

function saveDomains() {
  return save({ excludedDomains: S.normalizeDomainList($('excludedDomains').value) });
}

function bind() {
  for (const key of SELECTS) $(key).addEventListener('change', (e) => save({ [key]: e.target.value }));
  for (const key of CHECKBOXES) $(key).addEventListener('change', (e) => save({ [key]: e.target.checked }));
  for (const key of RADIOS) {
    for (const radio of document.querySelectorAll(`input[name="${key}"]`)) {
      radio.addEventListener('change', (e) => save({ [key]: e.target.value }));
    }
  }

  const { min, max } = S.MIN_DISTANCE_RANGE;
  $('minDistance').min = min;
  $('minDistance').max = max;
  $('minDistance').addEventListener('change', saveMinDistance);

  // Während des Tippens verzögert speichern, beim Verlassen bereinigt anzeigen.
  let domainTimer;
  $('excludedDomains').addEventListener('input', () => {
    clearTimeout(domainTimer);
    domainTimer = setTimeout(saveDomains, 800);
  });
  $('excludedDomains').addEventListener('change', async () => {
    clearTimeout(domainTimer);
    await saveDomains();
    $('excludedDomains').value = S.normalizeDomainList($('excludedDomains').value).join('\n');
  });

  // permissions.request muss direkt im Klick-Handler laufen (Nutzergeste).
  $('grantAccess').addEventListener('click', () => {
    browser.permissions.request(ALL_SITES).then(showAccess);
  });
  browser.permissions.onAdded.addListener(showAccess);
  browser.permissions.onRemoved.addListener(showAccess);

  $('reset').addEventListener('click', async () => {
    await save({ ...S.DEFAULTS });
    render(S.DEFAULTS);
  });

  // Änderungen von außen (z. B. Toolbar-Button, anderes Gerät) übernehmen.
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') S.load().then(render);
  });
}

// Firefox: Der Zugriff auf Websites kann fehlen (bei der Installation nicht erteilt oder
// in der Add-on-Verwaltung entzogen) – dann funktioniert die Geste nirgends.
async function showAccess() {
  $('access').hidden = await browser.permissions.contains(ALL_SITES);
}

I.load().then(translate);
bind();
showAccess();
window.addEventListener('focus', retranslateIfChanged);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') retranslateIfChanged();
});
S.load().then(render);
