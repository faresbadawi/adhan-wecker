// Unterseite "Bilal und der Azan": Sprache, Einblenden, Zeitleiste, Kapitel-Markierung.
import { T, LANGS } from './i18n.js?v=202611181043';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// ---------- Sprache (gleicher Speicher wie die Hauptseite)
let lang = 'ar';
try { lang = new URLSearchParams(location.search).get('lang') || localStorage.getItem('bilal-lang') || 'ar'; } catch {}
if (!LANGS.includes(lang)) lang = 'ar';
const t = k => (T[k] && T[k][lang]) ?? '';
const html = s => s.replace(/<g>/g, '<span class="gold">').replace(/<\/g>/g, '</span>');

const langBox = $('.lang'), pill = document.createElement('span');
pill.className = 'pill';
langBox.prepend(pill);
function movePill() {
  const b = langBox.querySelector('button.sel');
  if (b) { pill.style.left = b.offsetLeft + 'px'; pill.style.width = b.offsetWidth + 'px'; }
}
function setLang(l) {
  lang = l;
  try { localStorage.setItem('bilal-lang', l); } catch {}
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  document.title = 'Bilal · ' + t('page.story');
  $$('[data-t]').forEach(el => { el.innerHTML = html(t(el.dataset.t)); });
  $$('[data-t-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.tAria)));
  $$('.lang button').forEach(b => b.classList.toggle('sel', b.dataset.lang === l));
  movePill();
  requestAnimationFrame(onScroll);
}
$$('.lang button').forEach(b => b.onclick = () => {
  if (b.dataset.lang === lang) return;
  if (reduce) return setLang(b.dataset.lang);
  document.body.classList.add('switching');
  setTimeout(() => { setLang(b.dataset.lang); requestAnimationFrame(() => document.body.classList.remove('switching')); }, 260);
});
addEventListener('resize', movePill);
document.fonts && document.fonts.ready.then(movePill);

// ---------- Einblenden
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.12 });
$$('.rv').forEach(el => io.observe(el));

// ---------- Scrollen: Fortschritt, Zeitleiste, aktives Kapitel
const bar = $('#scrollbar'), tl = $('#timeline'), items = $$('#timeline li');
const links = $$('.links a, .chips a');
let ticking = false;
function onScroll() {
  ticking = false;
  bar.style.transform = `scaleX(${clamp(scrollY / (document.documentElement.scrollHeight - innerHeight))})`;
  const r = tl.getBoundingClientRect(), H = innerHeight;
  tl.style.setProperty('--tl', reduce ? 1 : clamp((H * 0.65 - r.top) / r.height).toFixed(3));
  items.forEach(li => li.classList.toggle('lit', reduce || li.getBoundingClientRect().top < H * 0.65));
  let cur = '';
  for (const id of ['idee', 'bilal', 'fadl']) if (document.getElementById(id).getBoundingClientRect().top < H * 0.4) cur = id;
  links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

setLang(lang);
