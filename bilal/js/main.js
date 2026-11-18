// Bilal – Produktseite: Sprache, Scroll-Szenen, Muster zeichnen, Simulator bei Bedarf laden.
import { T, LANGS, GUIDE, GUIDE_AR } from './i18n.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// ---------- Sprache
let lang = 'ar';
try { lang = new URLSearchParams(location.search).get('lang') || localStorage.getItem('bilal-lang') || 'ar'; } catch {}
if (!LANGS.includes(lang)) lang = 'ar';
const listeners = [];
export const onLang = fn => listeners.push(fn);
export const t = k => (T[k] && T[k][lang]) ?? '';
const html = s => s.replace(/<g>/g, '<span class="gold">').replace(/<\/g>/g, '</span>');

function setLang(l) {
  lang = l;
  try { localStorage.setItem('bilal-lang', l); } catch {}
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  document.title = t('title');
  $$('[data-t]').forEach(el => { el.innerHTML = html(t(el.dataset.t)); });
  // Produktfotos zeigen die Uhr in derselben Sprache
  $$('[data-img]').forEach(img => { img.src = `assets/img/${img.dataset.img}${l === 'ar' ? '' : '-' + l}.webp`; });
  $$('.lang button').forEach(b => b.classList.toggle('sel', b.dataset.lang === l));
  $('#guideLink').href = GUIDE[l];
  $('#guideLink2').href = GUIDE_AR;
  $('#guideLink2').style.display = l === 'en' ? '' : 'none';
  splitStatement();
  listeners.forEach(fn => fn(l));
  requestAnimationFrame(onScroll);
}
$$('.lang button').forEach(b => b.onclick = () => setLang(b.dataset.lang));
window.bilalLang = () => lang;

// ---------- Kopfzeile
const nav = $('#nav');

// ---------- Einblenden
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.12 });
$$('.rv').forEach(el => io.observe(el));

// ---------- Muster als Linien, die sich zeichnen
const SVGNS = 'http://www.w3.org/2000/svg';
function build(svg, data, opts = {}) {
  const { cx = data.w / 2, cy = data.h / 2 } = opts;
  const g = document.createElementNS(SVGNS, 'g');
  const maxD = Math.hypot(data.w, data.h) / 2;
  const list = data.paths.map(p => {
    const el = document.createElementNS(SVGNS, 'path');
    el.setAttribute('d', p.d);
    el.setAttribute('pathLength', '1');
    el.style.strokeDasharray = '1';
    el.style.strokeDashoffset = '1';
    g.appendChild(el);
    return { el, k: Math.hypot(p.cx - cx, p.cy - cy) / maxD }; // 0 = Mitte, 1 = Rand
  });
  svg.appendChild(g);
  return list;
}

// Bühne: zeichnet sich von der Mitte nach außen, einmal beim Laden
fetch('assets/muster-buehne.json').then(r => r.json()).then(data => {
  const svg = $('#heroDraw');
  svg.setAttribute('viewBox', `0 0 ${data.w} ${data.h}`);
  const list = build(svg, data);
  if (reduce) { list.forEach(p => p.el.style.strokeDashoffset = 0); return; }
  const t0 = performance.now(), DUR = 4200;
  (function step(now) {
    const k = (now - t0) / DUR;
    list.forEach(p => {
      const local = clamp((k - p.k * 0.55) / 0.45);
      p.el.style.strokeDashoffset = 1 - (1 - Math.pow(1 - local, 3));
    });
    if (k < 1.05) requestAnimationFrame(step);
  })(t0);
});

// Ornament: zeichnet sich mit dem Scrollen, im Kreis
let motif = null;
fetch('assets/muster-kreis.json').then(r => r.json()).then(data => {
  const svg = $('#motifDraw');
  const clip = document.createElementNS(SVGNS, 'clipPath');
  clip.id = 'mclip';
  const c = document.createElementNS(SVGNS, 'circle');
  c.setAttribute('cx', 500); c.setAttribute('cy', 500); c.setAttribute('r', 470);
  clip.appendChild(c);
  svg.appendChild(clip);
  const ring = document.createElementNS(SVGNS, 'circle');
  ring.setAttribute('class', 'ring'); ring.setAttribute('cx', 500); ring.setAttribute('cy', 500); ring.setAttribute('r', 488);
  ring.setAttribute('pathLength', '1'); ring.style.strokeDasharray = '1';
  svg.appendChild(ring);
  const list = build(svg, data, { cx: 500, cy: 500 });
  svg.lastChild.setAttribute('clip-path', 'url(#mclip)');
  motif = { list, ring };
  onScroll();
});

// ---------- Scroll-Szenen
const reveal = $('#reveal'), revImgs = $$('.rv-img'), caps = $$('.cap'), dots = $$('.dots i');
const gallery = $('#features'), track = $('#track'), bar = $('#trackBar');
const motifSec = $('#motif');
const progressOf = sec => { const r = sec.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); };

function sizeGallery() {
  if (innerWidth <= 760) { gallery.style.height = ''; return; }
  const extra = track.scrollWidth - innerWidth;
  gallery.style.height = (innerHeight + Math.max(0, extra) * 1.1) + 'px';
}
addEventListener('resize', () => { sizeGallery(); onScroll(); });
addEventListener('load', sizeGallery);
sizeGallery();

let ticking = false;
const heroInner = $('#heroInner'), heroDraw = $('#heroDraw'), sbar = $('#scrollbar');
const slides = $$('.slide');
const lifeImgs = $$('.life-grid img');
function onScroll() {
  ticking = false;
  nav.classList.toggle('solid', scrollY > 30);
  sbar.style.transform = `scaleX(${clamp(scrollY / (document.documentElement.scrollHeight - innerHeight))})`;

  // Bühne: Inhalt gleitet langsamer weg und blendet aus, das Muster zoomt leicht
  if (!reduce && scrollY < innerHeight * 1.2) {
    const h = scrollY / innerHeight;
    heroInner.style.transform = `translateY(${h * 140}px) scale(${1 - h * 0.08})`;
    heroInner.style.opacity = 1 - h * 1.2;
    heroDraw.style.transform = `scale(${1 + h * 0.12})`;
  }

  // Produkt: drei Folien, jede zoomt beim Scrollen leicht
  const p = progressOf(reveal);
  const step = Math.min(2, Math.floor(p * 3));
  revImgs.forEach((im, i) => im.classList.toggle('on', i === step));
  caps.forEach((c, i) => c.classList.toggle('on', i === step));
  dots.forEach((d, i) => d.classList.toggle('on', i === step));
  reveal.dataset.step = step;
  if (!reduce) reveal.querySelector('.reveal-stage').style.setProperty('--lp', (p * 3 - step).toFixed(3));

  // Funktionen: Spur fährt quer (bei Arabisch von rechts nach links), die mittlere Folie ist vorn
  if (innerWidth > 760) {
    const g = progressOf(gallery);
    const extra = Math.max(0, track.scrollWidth - innerWidth);
    track.style.transform = `translateX(${(lang === 'ar' ? 1 : -1) * g * extra}px)`;
    bar.style.transform = `scaleX(${g})`;
    if (!reduce) slides.forEach(s => {
      const r = s.getBoundingClientRect();
      const off = (r.left + r.width / 2 - innerWidth / 2) / innerWidth;
      s.style.setProperty('--d', Math.min(1, Math.abs(off) * 1.3).toFixed(3));
      s.style.setProperty('--sx', (off * -60).toFixed(1));
    });
  }

  // Ornament: Linien von der Mitte nach außen, dazu eine langsame Drehung
  if (motif) {
    const m = reduce ? 1 : clamp(progressOf(motifSec) * 1.25);
    if (!reduce) $('#motifDraw').style.setProperty('--mr', (progressOf(motifSec) * 22.5).toFixed(2));
    motif.ring.style.strokeDashoffset = 1 - clamp(m * 1.6);
    motif.list.forEach(q => {
      const local = clamp((m - q.k * 0.6) / 0.4);
      q.el.style.strokeDashoffset = 1 - local;
    });
  }
  // Fotos im Alltag: Bild wandert langsamer als der Rahmen
  if (!reduce) lifeImgs.forEach(im => {
    const r = im.closest(".frame").getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    im.style.setProperty('--py', (((r.top + r.height / 2) - innerHeight / 2) * -0.12).toFixed(1));
  });
  updateStatement();
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

// ---------- Leitsatz: Wort für Wort
const st = $('#statement');
let words = [];
function splitStatement() {
  const tmp = document.createElement('div');
  tmp.innerHTML = t('statement');
  const parts = [];
  tmp.childNodes.forEach(n => {
    const hl = n.nodeType === 1;
    n.textContent.split(/(\s+)/).forEach(w => parts.push(w.trim() ? `<span class="${hl ? 'hl' : ''}">${w}</span>` : w));
  });
  st.innerHTML = parts.join('');
  words = [...st.querySelectorAll('span')];
}
function updateStatement() {
  const r = st.getBoundingClientRect();
  const k = reduce ? 1 : clamp((innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.3));
  const n = Math.round(k * words.length);
  words.forEach((w, i) => w.classList.toggle('on', i < n));
}

// ---------- Goldstaub auf der Bühne (pausiert außerhalb des Bildes)
{
  const cv = $('#dust'), cx = cv.getContext('2d');
  let parts = [], run = true, W = 0, H = 0;
  const dpr = Math.min(devicePixelRatio, 2);
  const size = () => {
    W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts = Array.from({ length: Math.round(Math.min(70, W / 18)) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + 0.4,
      vy: -(Math.random() * 0.25 + 0.06), vx: (Math.random() - 0.5) * 0.12, ph: Math.random() * 6.28,
    }));
  };
  size();
  addEventListener('resize', size);
  new IntersectionObserver(([e]) => { run = e.isIntersecting; if (run) requestAnimationFrame(tick); }).observe(cv);
  function tick(now) {
    if (!run || reduce) return;
    cx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(now / 900 + p.ph));
      cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283);
      cx.fillStyle = `rgba(243, 209, 138, ${a.toFixed(2)})`;
      cx.shadowColor = 'rgba(232,160,78,.8)'; cx.shadowBlur = 6;
      cx.fill();
    }
    requestAnimationFrame(tick);
  }
}

// ---------- Karten neigen sich zur Maus
if (!reduce && matchMedia('(hover: hover)').matches) {
  $$('.duo figure, .mini').forEach(el => {
    el.classList.add('tilt');
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(900px) rotateY(${(x - 0.5) * 8}deg) rotateX(${(0.5 - y) * 8}deg) translateY(-4px)`;
      el.style.setProperty('--mx', x * 100 + '%');
      el.style.setProperty('--my', y * 100 + '%');
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

// ---------- Symbole zeichnen sich: Länge jedes Strichs auf 1 normieren
$$('.mini svg *').forEach(s => s.setAttribute('pathLength', '1'));

// ---------- Zahlen zählen hoch
{
  const co = new IntersectionObserver((es) => es.forEach(e => {
    if (!e.isIntersecting) return;
    co.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, t0 = performance.now();
    (function step(now) {
      const k = reduce ? 1 : clamp((now - t0) / 1400);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => co.observe(el));
}

// ---------- Aktiver Menüpunkt
{
  const map = new Map($$('.links a').map(a => [a.getAttribute('href').slice(1), a]));
  const so = new IntersectionObserver(es => es.forEach(e => {
    const a = map.get(e.target.id);
    if (a && e.isIntersecting) { map.forEach(x => x.classList.remove('active')); a.classList.add('active'); }
  }), { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((a, id) => { const s = document.getElementById(id); if (s) so.observe(s); });
}

// ---------- Simulator erst laden, wenn man in die Nähe scrollt
const stage = $('#simStage');
new IntersectionObserver(([e], o) => {
  if (!e.isIntersecting) return;
  o.disconnect();
  import('./viewer.js').then(m => m.start(stage, { t, onLang, lang: () => lang }));
}, { rootMargin: '700px 0px' }).observe(stage);

setLang(lang);
