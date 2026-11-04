// Baut die Store-Screenshots auf. Der Hinweis am Mauszeiger ist im selben Stil wie
// in src/content/content.js gezeichnet; die Einstellungsseite ist die echte options.html.
'use strict';

const params = new URLSearchParams(location.search);
const scene = Number(params.get('s')) || 1;
const lang = params.get('lang') === 'en' ? 'en' : 'de';

const T = {
  de: {
    h: ['Nach rechts ziehen – neuer Tab im Vordergrund', 'Nach links ziehen – Tab im Hintergrund',
      'Markierten Text ziehen – Suche oder Adresse', 'Alles einstellbar – jede Option erklärt'],
    s: ['Link anklicken, kurz zur Seite ziehen, loslassen. Fertig.', 'Bilder, SVG-Grafiken und Links laden unauffällig – du liest einfach weiter.',
      'Google, DuckDuckGo, Bing oder Firefox-Standard. Adressen öffnen direkt, E-Mails im Mailprogramm.',
      'Richtungen, Tab-Position, SHIFT für verlinkte Bilder, Suchmaschine, Ausschlussliste.'],
    site: 'Bergtouren-Blog', url: 'bergtouren-blog.example/zugspitze',
    title: 'Auf die Zugspitze über das Reintal',
    p1: 'Die klassische Route startet am Olympia-Skistadion in Garmisch. Durch die <a href="#">Partnachklamm</a> geht es ins wildromantische Reintal.',
    p2: 'Übernachtet wird auf der <a id="target-link" href="#">Reintalangerhütte</a>, bevor am zweiten Tag der Anstieg über das Zugspitzplatt folgt.',
    p3: 'Vorher unbedingt <span id="target-text">Zugspitze Wetter</span> prüfen – Gewitter kommen hier oft schon mittags.',
    p4: 'Fragen zur Tour? Schreib an tourenplanung@example.com oder schau auf www.example.org/touren vorbei.',
    newTab: { 1: 'Reintalangerhütte', 2: 'gipfel.jpg (1600 × 900)', 3: 'Zugspitze Wetter – Google' },
    badge: 'neu',
    pill: { 1: '→ Vordergrund · Link', 2: '← Hintergrund · Bild', 3: '→ Vordergrund · Suche' },
    card: '<h3>Was beim Loslassen passiert</h3><ul><li>Text → Suche</li><li>„www.example.org“ → Adresse öffnen</li><li>E-Mail-Adresse → Mailprogramm</li><li>ESC → Abbruch</li></ul>'
  },
  en: {
    h: ['Drag right – new tab in the foreground', 'Drag left – tab in the background',
      'Drag selected text – search or address', 'Fully configurable – every option explained'],
    s: ['Press on a link, drag a little to the side, release. Done.', 'Images, SVG graphics and links load quietly – you just keep reading.',
      'Google, DuckDuckGo, Bing or Firefox default. Addresses open directly, emails in your mail app.',
      'Directions, tab position, SHIFT for linked images, search engine, exclusion list.'],
    site: 'Mountain Trails Blog', url: 'mountain-trails.example/zugspitze',
    title: 'Climbing the Zugspitze via the Reintal',
    p1: 'The classic route starts at the Olympic ski stadium in Garmisch. Through the <a href="#">Partnach Gorge</a> you enter the wild Reintal valley.',
    p2: 'Spend the night at the <a id="target-link" href="#">Reintalanger Hut</a> before climbing across the Zugspitzplatt on day two.',
    p3: 'Always check the <span id="target-text">Zugspitze weather</span> first – thunderstorms often arrive by noon.',
    p4: 'Questions about the tour? Write to planning@example.com or visit www.example.org/tours.',
    newTab: { 1: 'Reintalanger Hut', 2: 'summit.jpg (1600 × 900)', 3: 'Zugspitze weather – Google' },
    badge: 'new',
    pill: { 1: '→ Foreground · Link', 2: '← Background · Image', 3: '→ Foreground · Search' },
    card: '<h3>What happens on release</h3><ul><li>Text → search</li><li>"www.example.org" → open address</li><li>Email address → mail app</li><li>ESC → cancel</li></ul>'
  }
}[lang];

document.documentElement.lang = lang;
document.getElementById('headline').textContent = T.h[scene - 1];
document.getElementById('subline').textContent = T.s[scene - 1];

// Kleine Berg-Grafik als „Foto“ (eigene Zeichnung)
const PHOTO = `<svg class="photo" id="target-image" width="300" height="170" viewBox="0 0 300 170">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb2f0"/><stop offset="1" stop-color="#d6e8fb"/></linearGradient></defs>
  <rect width="300" height="170" fill="url(#sky)"/><circle cx="235" cy="42" r="18" fill="#fde293"/>
  <path d="M0 170 L70 70 L110 115 L170 35 L240 125 L300 85 L300 170 Z" fill="#5f6b7a"/>
  <path d="M170 35 L190 62 L178 58 L168 70 L158 56 Z M70 70 L82 87 L70 84 L60 92 Z" fill="#fff"/>
  <path d="M0 170 L60 128 L120 150 L190 118 L300 150 L300 170 Z" fill="#3d7d4f"/></svg>`;

function tabs(newTab) {
  const fav = (color) => `<span class="fav" style="background:${color}"></span>`;
  const title = (text) => `<span class="title">${text}</span>`;
  const items = [`<div class="tab ${scene === 2 || !newTab ? 'active' : ''}">${fav('#188038')}${title(T.site)}</div>`];
  if (newTab) {
    const cls = scene === 2 ? 'new background' : 'active new';
    items.push(`<div class="tab ${cls}">${fav('#1a73e8')}${title(newTab)}<span class="badge">${T.badge}</span></div>`);
  }
  items.push(`<div class="tab">${fav('#e8710a')}${title('Wetter · Weather')}</div>`);
  document.getElementById('tabs').innerHTML = items.join('');
}

function page(extra = '') {
  return `<h2>${T.title}</h2><p>${T.p1}</p><p>${T.p2}</p>
    <div style="display:flex;gap:28px;align-items:flex-start;margin:6px 0 18px">${PHOTO}
    <p style="margin:0;max-width:350px">${T.p3}</p></div><p>${T.p4}</p>${extra}`;
}

// Bild rechts, damit der Zug nach links Platz hat
function pageImageRight() {
  return `<div style="display:flex;gap:150px;align-items:flex-start">
    <div style="width:560px"><h2>${T.title}</h2><p>${T.p1}</p><p>${T.p2}</p><p>${T.p3}</p><p>${T.p4}</p></div>
    <div style="padding-top:60px">${PHOTO}</div></div>`;
}

// Zugweg vom Element zum Mauszeiger, Mauszeiger und Hinweis
function gesture(target, dx, dy, pillText) {
  const content = document.getElementById('content');
  const c = content.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  const x0 = (dx > 0 ? r.left + r.width * 0.55 : r.left + r.width * 0.45) - c.left;
  const y0 = r.top + r.height / 2 - c.top;
  const x1 = x0 + dx;
  const y1 = y0 + dy;
  target.classList.add('highlight');
  content.insertAdjacentHTML('beforeend', `
    <svg class="trail" width="1" height="1"><path d="M${x0} ${y0} Q ${(x0 + x1) / 2} ${Math.min(y0, y1) - 40} ${x1} ${y1}"
      fill="none" stroke="#1a73e8" stroke-width="3" stroke-dasharray="8 7" stroke-linecap="round"/>
      <circle cx="${x0}" cy="${y0}" r="6" fill="#1a73e8"/></svg>
    <svg class="cursor" style="left:${x1 - 2}px;top:${y1 - 2}px" viewBox="0 0 22 30">
      <path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 17 L20 17 Z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>
    <div class="pill" style="left:${x1 + 22}px;top:${y1 + 22}px">${pillText}</div>`);
}

const content = document.getElementById('content');
if (scene === 4) {
  tabs(null);
  document.getElementById('url').textContent = 'moz-extension://…/options/options.html';
  content.classList.add('options');
  content.innerHTML = `<iframe src="options-frame.html?lang=${lang}"></iframe>`;
} else {
  tabs(T.newTab[scene]);
  document.getElementById('url').textContent = T.url;
  content.innerHTML = scene === 2 ? pageImageRight() : page(scene === 3 ? `<div class="sidecard">${T.card}</div>` : '');
  if (scene === 1) gesture(document.getElementById('target-link'), 450, 20, T.pill[1]);
  if (scene === 2) gesture(document.getElementById('target-image'), -250, 170, T.pill[2]);
  if (scene === 3) {
    const text = document.getElementById('target-text');
    text.classList.add('selection');
    gesture(text, 180, 90, T.pill[3]);
  }
}
