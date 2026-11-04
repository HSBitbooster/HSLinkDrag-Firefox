// Zeigt eine per Drag geöffnete Inline-SVG-Grafik an. Der Inhalt liegt in
// storage.session (abgelegt von src/background.js) unter „svg:<id>“, die id steht im Hash.
// Angezeigt wird über <img>, damit Scripte in der SVG nicht ausgeführt werden.
'use strict';

const SVG_KEY_PREFIX = 'svg:';
const FIT_RATIO = 0.9;  // Anteil des Fensters im angepassten Modus

const I = globalThis.HSLD.i18n;

// Texte in der aktuellen Firefox-Sprache (src/shared/i18n.js)
I.load().then(() => {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const text = I.t(el.dataset.i18n);
    if (text) el.textContent = text;
  }
  document.documentElement.lang = I.locale();
});

async function show() {
  const key = SVG_KEY_PREFIX + location.hash.slice(1);
  const entry = (await browser.storage.session.get(key))[key];
  if (!entry) {
    document.getElementById('missing').hidden = false;
    return;
  }

  const url = URL.createObjectURL(new Blob([entry.svg], { type: 'image/svg+xml' }));
  const image = document.getElementById('image');
  image.src = url;
  image.hidden = false;
  // Vektorgrafik: zunächst ans Fenster angepasst (auch vergrößert), Klick wechselt zur Originalgröße.
  let fit = true;
  const layout = () => {
    const scale = fit ? Math.min(FIT_RATIO * innerWidth / image.naturalWidth, FIT_RATIO * innerHeight / image.naturalHeight) : 1;
    image.style.width = Math.round(image.naturalWidth * scale) + 'px';
    image.style.height = Math.round(image.naturalHeight * scale) + 'px';
    image.classList.toggle('fit', fit);
  };
  image.addEventListener('load', layout, { once: true });
  image.addEventListener('click', () => {
    fit = !fit;
    layout();
  });
  addEventListener('resize', layout);

  const download = document.getElementById('download');
  download.href = url;
  download.hidden = false;
}

show();
