// Smart Azan Clock – Web-App (PWA). Eine Datei pro Aufgabe: i18n.js für Texte, hier App-Gerüst und Ansichten.
// Jede Ansicht ist eine Funktion in VIEWS, die HTML liefert und danach ihre Ereignisse bindet.
import { LANGS, setLang, lang, t } from "./i18n.js";

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const ALL_TIMES = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

const svg = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
const I = {
  dashboard: svg('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
  prayer: svg('<path d="M4 21V11a8 8 0 0 1 16 0v10"/><path d="M9 21v-5a3 3 0 0 1 6 0v5M3 21h18M12 3V1"/>'),
  location: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  display: svg('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  audio: svg('<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  wifi: svg('<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>'),
  device: svg('<rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3.2"/><path d="M12 10.5V12l1 .8"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  calendar: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  cloud: svg('<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>'),
  partly: svg('<path d="M8 4.5V3M3.5 8H2M4.8 4.8l-1-1M12.2 4.8l1-1"/><path d="M5.2 11a4 4 0 0 1 7.3-3.3"/><path d="M17.5 20H9.5a5 5 0 1 1 4.6-7h1.4a3.5 3.5 0 1 1 2 7Z"/>'),
  rain: svg('<path d="M17.5 15H9a6 6 0 1 1 5.7-8h1.8a4 4 0 1 1 1 8Z"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/>'),
  snow: svg('<path d="M17.5 15H9a6 6 0 1 1 5.7-8h1.8a4 4 0 1 1 1 8Z"/><path d="M9 19h.01M13 21h.01M17 19h.01"/>'),
  thunder: svg('<path d="M17.5 15H9a6 6 0 1 1 5.7-8h1.8a4 4 0 1 1 1 8Z"/><path d="m13 14-2 4h3l-2 4"/>'),
  fog: svg('<path d="M4 9h16M3 13h18M5 17h14"/>'),
  up: svg('<path d="m6 15 6-6 6 6"/>'), down: svg('<path d="m6 9 6 6 6-6"/>'),
  check: svg('<path d="m5 12 5 5 9-10"/>'), lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'), refresh: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
  power: svg('<path d="M12 3v8M6.3 6.3a8 8 0 1 0 11.4 0"/>'), download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  lang: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  palette: svg('<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-1.2-1-1.6-1-2.7 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="m21 16-5-5-9 9"/>'),
  sliders: svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  bell: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0"/>'),
  music: svg('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
  back: svg('<path d="m15 6-6 6 6 6"/>'),
  more: svg('<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'),
  chevron: svg('<path d="m9 6 6 6-6 6"/>'),
  stop: svg('<rect x="7" y="7" width="10" height="10" rx="1.5"/>'),
  sunrise: svg('<path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 6v3M5.6 10.6l1.4 1.4M18.4 10.6 17 12M8 21h8"/>'),
  sunset: svg('<path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 3v6M9 6l3 3 3-3M8 21h8"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>'),
};

// Vier Hauptbereiche; "Einstellungen" ist eine Übersicht mit den Unterseiten
const TABS = ["dashboard", "prayer", "audio", "settings"];
const SUB = ["location", "display", "lang", "wifi", "device"];
const NAV = [...TABS, ...SUB];
const parentOf = k => SUB.includes(k) ? "settings" : k;
const PAGE_ICON = { clock: I.clock, prayer: I.prayer, weather: I.cloud, calendar: I.calendar };
const SKY_ICON = { clear: I.sun, partly_cloudy: I.partly, cloudy: I.cloud, fog: I.fog, drizzle: I.rain, rain: I.rain, snow: I.snow, thunder: I.thunder };

// Berechnungsmethoden von Aladhan: [id, arabisch, englisch]
const METHODS = [
  [3, "رابطة العالم الإسلامي", "Muslim World League"], [4, "أم القرى، مكة المكرمة", "Umm al-Qura, Makkah"],
  [5, "الهيئة المصرية العامة للمساحة", "Egyptian General Authority of Survey"], [1, "جامعة العلوم الإسلامية، كراتشي", "University of Islamic Sciences, Karachi"],
  [2, "الجمعية الإسلامية لأمريكا الشمالية", "ISNA (North America)"], [7, "معهد الجيوفيزياء، جامعة طهران", "Institute of Geophysics, Tehran"],
  [0, "الشيعة الإثنا عشرية، قم", "Shia Ithna-Ashari, Qum"], [8, "منطقة الخليج", "Gulf Region"], [9, "الكويت", "Kuwait"], [10, "قطر", "Qatar"],
  [16, "دبي", "Dubai"], [11, "سنغافورة", "Singapore (MUIS)"], [12, "اتحاد المنظمات الإسلامية في فرنسا", "UOIF (France)"],
  [13, "رئاسة الشؤون الدينية التركية", "Diyanet (Türkiye)"], [14, "الإدارة الدينية لمسلمي روسيا", "Spiritual Administration of Muslims of Russia"],
  [15, "لجنة رؤية الهلال", "Moonsighting Committee"], [17, "ماليزيا (JAKIM)", "JAKIM (Malaysia)"], [18, "تونس", "Tunisia"],
  [19, "الجزائر", "Algeria"], [20, "إندونيسيا", "KEMENAG (Indonesia)"], [21, "المغرب", "Morocco"], [23, "الأردن", "Jordan"],
];
const PRESETS = [
  ["preset_rosegold", "#FFFFFF", "#E9A27C", "#C4B6AE"],
  ["preset_gold", "#F4F1EA", "#C9A45C", "#8C978F"], ["preset_silver", "#FFFFFF", "#C3CAD3", "#8A929C"],
  ["preset_emerald", "#F1F5EC", "#6FC79A", "#869A8E"], ["preset_turquoise", "#EAF6F6", "#5EC4CC", "#86A0A3"],
  ["preset_amber", "#FFF4E6", "#E8A04E", "#A08E7C"],
];
const LED_PRESETS = ["#FF0000", "#FF6A00", "#FFD000", "#00FF00", "#00FFB0", "#00C8FF", "#0000FF", "#A000FF", "#FF00A0", "#FFFFFF"];
// Passende Farbfelder je Rolle: Hauptschrift hell, Akzent kräftig, Nebenschrift gedämpft
const THEME_SWATCHES = {
  main: ["#FFFFFF", "#F4F1EA", "#FFF4E6", "#FDEDEE", "#F1F5EC", "#EAF6F6", "#EEF0FF", "#E2E2E2"],
  accent: ["#E9A27C", "#C9A45C", "#E8A04E", "#FFD54F", "#6FC79A", "#4DB6AC", "#5EC4CC", "#6FA8F5", "#BA8CF0", "#F06292", "#E57373", "#C3CAD3"],
  muted: ["#C4B6AE", "#A08E7C", "#8C978F", "#869A8E", "#86A0A3", "#8A929C", "#B0A8C0", "#9E9E9E"],
};
const MAX_ALARMS = 4;
const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5]; // Samstag zuerst; Bit = tm_wday

// ---------- Zustand
let S = null;          // Einstellungen (/api/settings)
let ST = null;         // Gerätestatus (/api/status)
let online = false;
let stBase = 0;        // performance.now() beim letzten Status
let current = "dashboard";
let installEvt = null;

// ---------- Netzwerk
async function api(url, body) {
  const opt = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const r = await fetch(url, opt);
  let data = null;
  try { data = await r.json(); } catch (e) { /* leere Antwort */ }
  return { ok: r.ok, status: r.status, data };
}

let saveTimer;
// Teil-Einstellungen speichern; die Antwort ist der neue Gesamtstand
async function save(part, quiet) {
  try {
    const r = await api("/api/settings", part);
    if (r.ok && r.data) { S = r.data; applyTheme(S.colors); }
    if (!quiet || !r.ok) toast(r.ok ? t("saved") : t("invalid"), !r.ok);
    return r.ok;
  } catch (e) { toast(t("offline"), true); return false; }
}
function saveLater(part) { clearTimeout(saveTimer); saveTimer = setTimeout(() => save(part), 700); }

let toastTimer;
function toast(text, err) {
  const el = $("toast");
  el.textContent = text;
  el.classList.toggle("err", !!err);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
}

function confirmBox(text, hint, danger) {
  return new Promise(res => {
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `<div class="card"><p><b>${esc(text)}</b></p>${hint ? `<p class="hint">${esc(hint)}</p>` : ""}
      <div class="actions"><button class="btn" data-a="0">${t("cancel")}</button>
      <button class="btn ${danger ? "danger" : "gold"}" data-a="1">${t("confirm")}</button></div></div>`;
    m.onclick = e => {
      const b = e.target.closest("[data-a]");
      if (b || e.target === m) { m.remove(); res(!!b && b.dataset.a === "1"); }
    };
    document.body.appendChild(m);
  });
}

// ---------- kleine Bausteine
// Signalstärke (1..4) als Wort: stark, mittel, schwach
function bars(n) {
  const lvl = n >= 3 ? "strong" : n === 2 ? "medium" : "weak";
  return `<span class="sig ${lvl}">${t("sig_" + lvl)}</span>`;
}
const wifiState = () => {
  const w = ST && ST.wifi;
  const ok = online && w && w.connected;
  return `<span class="dot ${ok ? "ok" : ""}"></span>${t(ok ? "wifi_on" : "wifi_off")}${ok ? bars(w.bars) : ""}`;
};
const deviceState = () => `<span class="dot ${online ? "ok" : ""}"></span>${t(online ? "device_online" : "device_offline")}`;
// Abschnitt: Überschrift über einer abgerundeten Gruppe
const card = (title, icon, body, cls = "") => `<section class="sec ${cls}"><h2>${esc(title)}</h2><div class="group">${body}</div></section>`;
const toggle = (attrs, on) => `<label class="toggle"><input type="checkbox" ${attrs} ${on ? "checked" : ""}><span></span></label>`;
const range = (id, v, min, max, suffix = "") =>
  `<div class="range"><input type="range" id="${id}" min="${min}" max="${max}" value="${v}"><output id="${id}Val">${v}${suffix}</output></div>`;
const loading = text => `<div class="loading"><span class="spinner"></span>${esc(text)}</div>`;
const locale = () => ({ ar: "ar-u-nu-latn", de: "de-DE", en: "en-GB" }[lang()]);

const mb = b => (b / 1048576).toFixed(1).replace(".", lang() === "de" ? "," : ".") + " MB";

function duration(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
  return h ? `${h} ${t("hours")} ${m} ${t("minutes")}` : `${m} ${t("minutes")}`;
}
function hijri(h) {
  if (!h || !h.month) return "";
  return `${h.day} ${t("hijri_months")[h.month - 1]} ${h.year} ${lang() === "ar" ? "هـ" : "AH"}`;
}

// ---------- Ansichten
const VIEWS = {};

const PRAYER_ICON = { fajr: I.sunrise, sunrise: I.sun, dhuhr: I.sun, asr: I.partly, maghrib: I.sunset, isha: I.moon };
const toMin = hm => { const [h, m] = (hm || "0:0").split(":").map(Number); return h * 60 + m; };
// aktuelle Uhrzeit der Uhr in Sekunden seit Mitternacht (lokal weitergezählt)
const nowSec = () => {
  const [h, m, s] = ST.time.clock.split(":").map(Number);
  return (h * 3600 + m * 60 + s + Math.floor((performance.now() - stBase) / 1000)) % 86400;
};

VIEWS.dashboard = () => {
  const p = ST && ST.prayer, wx = ST && ST.weather, loc = ST ? ST.location : (S ? { city: S.city, country: S.country } : {});
  const date = ST && ST.time ? new Date(ST.time.date + "T12:00:00").toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" }) : "";
  const next = p && p.next ? p.next.key : "";
  const now = ST && ST.time ? nowSec() / 60 : 0;
  const wxIcon = wx ? ((!wx.day && (wx.sky === "clear" || wx.sky === "partly_cloudy")) ? I.moon : (SKY_ICON[wx.sky] || I.cloud)) : I.cloud;
  return `${installBanner()}
  <section class="hero">
    <div class="hero-top"><span class="loc">${I.location}<span dir="auto">${esc(loc.city || "—")}</span></span><span class="clock num ltr" id="dClock">--:--</span></div>
    <div class="bism" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
    ${next ? `<div class="hero-label">${t("next_prayer")}</div>
      <div class="hero-name">${t(next)}</div>
      <div class="hero-time num ltr">${esc(p.times[next])}</div>
      <div class="hero-cd">${t("in")} <span id="dCount" class="num"></span></div>
      <div class="progress"><i id="dProg"></i></div>` : `<div class="hero-label">${online ? "—" : t("offline")}</div>`}
    <div class="hero-date">${esc(date)}${p ? ` · <span class="hj">${esc(hijri(p.hijri))}</span>` : ""}</div>
  </section>
  <div class="chips">
    <button class="chip" data-go="location">${wxIcon}<div><b class="num ltr">${wx ? wx.temp + "°" : "—"}</b><small>${wx ? t("sky_" + wx.sky) : t("weather_now")}</small></div></button>
    <button class="chip" data-go="wifi">${I.wifi}<div><b>${ST && online && ST.wifi.connected ? bars(ST.wifi.bars) : "—"}</b><small>${t(ST && online && ST.wifi.connected ? "wifi_on" : "wifi_off")}</small></div></button>
  </div>
  ${card(t("today_times"), I.prayer, p ? `<div class="list plist">${ALL_TIMES.map(k => {
    const past = k !== next && toMin(p.times[k]) <= now && next !== "fajr";
    return `<div class="prow ${k === next ? "next" : past ? "past" : ""}"><span class="pi">${PRAYER_ICON[k]}</span>
      <span class="pn">${t(k)}</span><span class="pt num ltr">${esc(p.times[k] || "--:--")}</span></div>`;
  }).join("")}</div>` : `<div class="empty">—</div>`)}`;
};
VIEWS.dashboard.bind = () => {
  tick();
  if ($("bnInstall")) $("bnInstall").onclick = () => installEvt ? install() : go("device");
  if ($("bnClose")) $("bnClose").onclick = () => {
    try { localStorage.setItem("installBanner", "off"); } catch (e) { /* privat */ }
    render();
  };
};

// Uhr und Countdown laufen lokal weiter, der Status wird nur alle 20 s neu geholt
function tick() {
  const c = $("dClock");
  if (!c || !ST || !ST.time) return;
  const el = Math.floor((performance.now() - stBase) / 1000);
  const [h, m, s] = ST.time.clock.split(":").map(Number);
  const tot = (h * 3600 + m * 60 + s + el) % 86400;
  c.textContent = `${String(Math.floor(tot / 3600)).padStart(2, "0")}:${String(Math.floor(tot % 3600 / 60)).padStart(2, "0")}`;
  const cd = $("dCount");
  if (cd && ST.prayer && ST.prayer.next) cd.textContent = duration(Math.max(0, ST.prayer.next.seconds - el));
  // Balken: Anteil der Zeit vom vorigen Gebet bis zum nächsten
  const bar = $("dProg");
  if (bar && ST.prayer && ST.prayer.times) {
    const i = ALL_TIMES.indexOf(ST.prayer.next.key);
    const nextMin = toMin(ST.prayer.times[ALL_TIMES[i]]);
    let prevMin = i > 0 ? toMin(ST.prayer.times[ALL_TIMES[i - 1]]) : toMin(ST.prayer.times.isha) - 1440;
    let now = tot / 60;
    if (i === 0 && now > nextMin) now -= 1440; // nach Isha, vor Mitternacht
    const span = nextMin - prevMin;
    bar.style.width = span > 0 ? Math.max(0, Math.min(100, (now - prevMin) / span * 100)) + "%" : "0";
  }
}

VIEWS.prayer = () => {
  const mq = S.source === "mawaqit";
  return `
  ${card(t("source"), I.prayer, `<div class="seg" id="srcSeg">
      <button data-v="calculated" class="${mq ? "" : "on"}">${t("source_calc")}</button>
      <button data-v="mawaqit" class="${mq ? "on" : ""}">${t("source_mawaqit")}</button></div>
    <div id="mqBox" ${mq ? "" : "hidden"}>
      <label class="f" for="mqQ">${t("mosque_search")}</label>
      <div class="row"><input id="mqQ" class="grow" placeholder="${t("mosque_ph")}" dir="auto">
        <button class="btn" id="mqGo">${I.search}${t("search")}</button></div>
      <div class="actions" style="justify-content:flex-start;margin-top:10px"><button class="btn" id="mqNear">${I.location}${t("mosques_near")}</button></div>
      <div id="mqRes"></div><div id="mqChosen"></div>
    </div>
    <div id="calcBox" ${mq ? "hidden" : ""}>
      <label class="f" for="method">${t("method")}</label>
      <select id="method">${METHODS.map(([id, ar, en]) => `<option value="${id}" ${id === S.method ? "selected" : ""}>${esc(lang() === "ar" ? ar : en)}</option>`).join("")}</select>
      <label class="f" for="madhhab">${t("madhhab")}</label>
      <select id="madhhab">${[0, 1].map(v => `<option value="${v}" ${v === S.madhhab ? "selected" : ""}>${t("madhhab_" + v)}</option>`).join("")}</select>
    </div>`)}
  ${card(t("offsets"), I.sliders, `<div class="list" id="offsets">${PRAYERS.map(k => `<div class="item"><span class="name">${t(k)}</span>
      <div class="stepper"><button data-k="${k}" data-d="-1">−</button><span id="off-${k}"></span><button data-k="${k}" data-d="1">+</button></div></div>`).join("")}</div>
    <p class="hint">${t("offsets_hint")}</p>`)}`;
};
VIEWS.prayer.bind = () => {
  const chosen = () => {
    const c = $("mqChosen"), m = S.mawaqit;
    c.className = "chosen" + (m.slug ? "" : " none");
    c.innerHTML = m.slug ? `${I.check}<div><small>${t("mosque_chosen")}</small><b dir="auto">${esc(m.name || m.slug)}</b></div>` : `${I.prayer}<div>${t("mosque_none")}</div>`;
  };
  chosen();
  $("srcSeg").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    const v = b.dataset.v;
    document.querySelectorAll("#srcSeg button").forEach(x => x.classList.toggle("on", x === b));
    $("mqBox").hidden = v !== "mawaqit"; $("calcBox").hidden = v === "mawaqit";
    if (v === "calculated" || S.mawaqit.slug) save({ source: v });
  };
  const choose = (slug, name) => { $("mqRes").innerHTML = ""; save({ source: "mawaqit", mawaqit: { slug, name } }).then(chosen); };
  const search = async q => {
    const link = q.match(/mawaqit\.net\/(?:[a-z]{2}\/)?([^/?#\s]+)/i);
    if (link) { choose(link[1], link[1]); return; }
    $("mqRes").innerHTML = loading(t("searching"));
    try {
      const r = await api("/api/mawaqit/search?q=" + encodeURIComponent(q));
      const list = r.ok && r.data ? r.data : [];
      if (!list.length) { $("mqRes").innerHTML = `<div class="empty">${t("no_results")}</div>`; return; }
      $("mqRes").innerHTML = list.map((m, i) => `<button class="result" data-i="${i}">${I.prayer}
        <div class="t"><b dir="auto">${esc(m.name)}</b><small dir="auto">${esc(m.address)}</small></div>
        ${m.distance ? `<span class="badge">${(m.distance / 1000).toFixed(1)} ${t("km")}</span>` : ""}</button>`).join("");
      $("mqRes").onclick = e => { const b = e.target.closest(".result"); if (b) choose(list[b.dataset.i].slug, list[b.dataset.i].name); };
    } catch (e) { $("mqRes").innerHTML = `<div class="empty">${t("offline")}</div>`; }
  };
  $("mqGo").onclick = () => { const q = $("mqQ").value.trim(); if (q) search(q); };
  $("mqQ").onkeydown = e => { if (e.key === "Enter") $("mqGo").click(); };
  $("mqNear").onclick = () => search("");
  $("method").onchange = e => save({ method: Number(e.target.value) });
  $("madhhab").onchange = e => save({ madhhab: Number(e.target.value) });

  const offsets = Object.assign({}, S.offsets);
  const show = k => { const v = offsets[k] || 0, el = $("off-" + k); el.textContent = (v > 0 ? "+" : "") + v; el.classList.toggle("nz", v !== 0); };
  PRAYERS.forEach(show);
  $("offsets").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    const k = b.dataset.k;
    offsets[k] = Math.max(-30, Math.min(30, (offsets[k] || 0) + Number(b.dataset.d)));
    show(k); saveLater({ offsets });
  };
};

// Übersicht der Einstellungen: gruppierte Zeilen mit aktuellem Wert, Antippen öffnet die Unterseite
VIEWS.settings = () => {
  const ok = online && ST && ST.wifi && ST.wifi.connected;
  const row = (k, value) => `<button class="item link" data-go="${k}"><span class="ico">${I[k]}</span><span class="name">${t("nav_" + k)}</span>
    <span class="val">${value}</span><span class="chev">${I.chevron}</span></button>`;
  return card(t("grp_prayer"), "", `<div class="list">${row("location", `<span dir="auto">${esc(S ? S.city : "")}</span>`)}</div>`)
    + card(t("grp_clock"), "", `<div class="list">${row("display", "")}${row("lang", LANGS[lang()])}</div>`)
    + card(t("grp_conn"), "", `<div class="list">${row("wifi", ok ? bars(ST.wifi.bars) : `<span class="dot"></span>`)}
      ${row("device", `<span class="ltr">${esc(ST ? ST.device.firmware : "")}</span>`)}</div>`);
};

VIEWS.location = () => card(t("city_search"), I.search, `
    <div class="row"><input id="locQ" class="grow" placeholder="${t("city_ph")}" dir="auto"><button class="btn" id="locGo">${I.search}${t("search")}</button></div>
    <div id="locRes"></div>`) + card(t("nav_location"), I.location, `
    <label class="f" for="city">${t("city")}</label><input id="city" value="${esc(S.city)}" dir="auto">
    <label class="f" for="country">${t("country")}</label><input id="country" value="${esc(S.country)}" dir="auto">
    <div class="two"><div><label class="f" for="lat">${t("lat")}</label><input id="lat" class="ltr" inputmode="decimal" value="${S.latitude.toFixed(4)}"></div>
      <div><label class="f" for="lon">${t("lon")}</label><input id="lon" class="ltr" inputmode="decimal" value="${S.longitude.toFixed(4)}"></div></div>
    <div class="actions"><button class="btn gold" id="locSave">${t("save")}</button></div>`);
VIEWS.location.bind = () => {
  // Orte über die Geocoding-API von Open-Meteo (direkt vom Handy aus)
  $("locGo").onclick = async () => {
    const q = $("locQ").value.trim(); if (!q) return;
    $("locRes").innerHTML = loading(t("searching"));
    try {
      const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=6&language=${lang()}&name=` + encodeURIComponent(q))).json();
      const list = r.results || [];
      if (!list.length) { $("locRes").innerHTML = `<div class="empty">${t("no_results")}</div>`; return; }
      $("locRes").innerHTML = list.map((p, i) => `<button class="result" data-i="${i}">${I.location}
        <div class="t"><b dir="auto">${esc(p.name)}</b><small dir="auto">${esc([p.admin1, p.country].filter(Boolean).join(", "))}</small></div></button>`).join("");
      $("locRes").onclick = e => {
        const b = e.target.closest(".result"); if (!b) return;
        const p = list[b.dataset.i];
        $("city").value = p.name; $("country").value = p.country_code || p.country || "";
        $("lat").value = p.latitude.toFixed(4); $("lon").value = p.longitude.toFixed(4);
        $("locRes").innerHTML = "";
        toast(t("location_picked"));
      };
    } catch (e) { $("locRes").innerHTML = `<div class="empty">${t("error")}</div>`; }
  };
  $("locQ").onkeydown = e => { if (e.key === "Enter") $("locGo").click(); };
  $("locSave").onclick = () => {
    const latitude = parseFloat($("lat").value), longitude = parseFloat($("lon").value);
    if (isNaN(latitude) || isNaN(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) { toast(t("coords_bad"), true); return; }
    save({ city: $("city").value.trim(), country: $("country").value.trim(), latitude, longitude });
  };
};

VIEWS.display = () => `
  ${card(t("pages"), I.display, `<div class="list" id="pages"></div><p class="hint">${t("pages_hint")}</p>`)}
  ${card(t("background"), I.image, `<div class="bgs" id="bgs">${loading("")}</div>`)}
  ${card(t("presets"), I.palette, `<div class="themes" id="presets"></div>`)}
  ${card(t("custom_colors"), I.palette, `<div class="list" id="customCols"></div>`)}
  ${card(t("brightness"), I.sun, `<div class="vol">${I.sun}${range("brightness", S.brightness, 5, 100, "%")}</div>
    <div class="item"><span class="name">${t("auto_dim")}</span>${toggle(`id="autoDim"`, S.autoDim)}</div>
    <div id="nightBox" ${S.autoDim ? "" : "hidden"}><label class="f">${t("night_brightness")}</label>
      <div class="vol">${I.moon}${range("nightBrightness", S.nightBrightness, 5, 100, "%")}</div></div>
    <p class="hint">${t("auto_dim_hint")}</p>`)}
  ${card(t("led"), I.palette, `<div class="item"><span class="ledglow" id="ledGlow"></span><span class="name">${t("led_on")}</span>${toggle(`id="ledOn"`, led.on)}</div>
    <div class="swatches big" id="ledSw">${LED_PRESETS.map(c => `<button data-c="${c}" style="--c:${c}" aria-label="${c}"></button>`).join("")}</div>
    <label class="f">${t("hue")}</label><input type="range" class="slider hue" id="ledHue" min="0" max="359" value="0">
    <label class="f">${t("led_bri")}</label><div class="range"><input type="range" class="slider" id="ledBri" min="5" max="100" value="${led.bri}"><output id="ledBriVal">${led.bri}%</output></div>
    <p class="hint">${t("led_hint")}</p>`)}`;

// ---------- Farben umrechnen
function hex2hsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const sat = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, sat, l];
}
function hsl2hex(h, sat, l) {
  const f = k => { const a = sat * Math.min(l, 1 - l), x = (k + h / 30) % 12; return l - a * Math.max(-1, Math.min(x - 3, 9 - x, 1)); };
  return "#" + [0, 8, 4].map(k => Math.round(f(k) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// ---------- Auswahlfenster von unten
function sheet(html, onClose) {
  const m = document.createElement("div");
  m.className = "modal sheetwrap";
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.addEventListener("click", e => { if (e.target === m) { m.remove(); onClose(); } });
  document.body.appendChild(m);
  return m;
}

// Uhrzeit in zwei Schritten: Stunde antippen, dann Minute (5er-Raster, ±1 für Feinheiten)
function pickTime(time) {
  return new Promise(res => {
    let [h, m] = time.split(":").map(Number), step = "h";
    const two = n => String(n).padStart(2, "0");
    const el = sheet(`<div class="tbig ltr"><button data-s="h"></button><b>:</b><button data-s="m"></button></div>
      <p class="tlabel" id="tlabel"></p><div id="tgrid"></div>
      <div class="actions"><button class="btn" data-a="0">${t("cancel")}</button><button class="btn gold" data-a="1">${t("done")}</button></div>`, () => res(null));
    const draw = () => {
      el.querySelector('[data-s="h"]').textContent = two(h);
      el.querySelector('[data-s="m"]').textContent = two(m);
      el.querySelectorAll("[data-s]").forEach(b => b.classList.toggle("on", b.dataset.s === step));
      el.querySelector("#tlabel").textContent = t(step === "h" ? "hour_pick" : "minute_pick");
      const g = el.querySelector("#tgrid");
      g.className = "tgrid ltr " + step;
      g.innerHTML = step === "h"
        ? Array.from({ length: 24 }, (_, v) => `<button data-h="${v}" class="${v === h ? "on" : ""}">${two(v)}</button>`).join("")
        : Array.from({ length: 12 }, (_, k) => k * 5).map(v => `<button data-m="${v}" class="${v === m ? "on" : ""}">${two(v)}</button>`).join("")
          + `<div class="fine"><button class="round" data-d="-1">−</button><span>${two(m)} ${t("minutes")}</span><button class="round" data-d="1">+</button></div>`;
    };
    draw();
    el.querySelector(".sheet").onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      const d = b.dataset;
      if (d.s) step = d.s;
      else if (d.h !== undefined) { h = Number(d.h); step = "m"; }
      else if (d.m !== undefined) m = Number(d.m);
      else if (d.d) m = (m + Number(d.d) + 60) % 60;
      else if (d.a) { el.remove(); res(d.a === "1" ? `${two(h)}:${two(m)}` : null); return; }
      draw();
    };
  });
}

// Farbe wählen: passende Farbfelder, dazu Farbton und Hell/Dunkel; live() zeigt jede Änderung sofort
function pickColor(title, value, swatches, live) {
  return new Promise(res => {
    let [h, sat, l] = hex2hsl(value), cur = value.toUpperCase();
    const el = sheet(`<div class="cphead"><span class="cpdot" id="cpDot"></span><div><b>${esc(title)}</b><small class="ltr" id="cpHex"></small></div></div>
      <div class="swatches" id="cpSw">${swatches.map(c => `<button data-c="${c}" style="--c:${c}" aria-label="${c}"></button>`).join("")}</div>
      <label class="f">${t("hue")}</label><input type="range" class="slider hue" id="cpHue" min="0" max="359">
      <label class="f">${t("lightness")}</label><input type="range" class="slider" id="cpLight" min="15" max="97">
      <div class="actions"><button class="btn" data-a="0">${t("cancel")}</button><button class="btn gold" data-a="1">${t("done")}</button></div>`,
      () => { live(value); res(null); });
    const q = id => el.querySelector("#" + id);
    const draw = moved => {
      if (moved !== "hue") q("cpHue").value = Math.round(h);
      if (moved !== "light") q("cpLight").value = Math.round(l * 100);
      q("cpLight").style.setProperty("--track", `linear-gradient(90deg, ${hsl2hex(h, sat, .15)}, ${hsl2hex(h, sat, .5)}, ${hsl2hex(h, sat, .97)})`);
      q("cpDot").style.background = cur; q("cpHex").textContent = cur;
      el.querySelectorAll("#cpSw button").forEach(b => b.classList.toggle("on", b.dataset.c === cur));
      live(cur);
    };
    draw();
    q("cpSw").onclick = e => { const b = e.target.closest("button"); if (!b) return; cur = b.dataset.c; [h, sat, l] = hex2hsl(cur); draw(); };
    q("cpHue").oninput = () => { h = Number(q("cpHue").value); if (sat < .15) sat = .6; cur = hsl2hex(h, sat, l); draw("hue"); };
    q("cpLight").oninput = () => { l = Number(q("cpLight").value) / 100; cur = hsl2hex(h, sat, l); draw("light"); };
    el.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
      el.remove();
      if (b.dataset.a === "1") res(cur); else { live(value); res(null); }
    });
  });
}

// ---------- RGB-LED: jede Änderung geht sofort an die Uhr; Farbe und Helligkeit merkt sich das Handy
const led = (() => {
  try { return Object.assign({ color: "#FF0000", bri: 100, on: true }, JSON.parse(localStorage.getItem("led") || "{}")); }
  catch (e) { return { color: "#FF0000", bri: 100, on: true }; }
})();
let ledBusy = false, ledNext = false;
async function ledSend() {
  try { localStorage.setItem("led", JSON.stringify(led)); } catch (e) { /* privat */ }
  if (ledBusy) { ledNext = true; return; }
  ledBusy = true;
  const n = parseInt(led.color.slice(1), 16), k = led.on ? led.bri / 100 : 0;
  try { await api("/api/led", { r: Math.round((n >> 16 & 255) * k), g: Math.round((n >> 8 & 255) * k), b: Math.round((n & 255) * k) }); }
  catch (e) { toast(t("offline"), true); }
  ledBusy = false;
  if (ledNext) { ledNext = false; ledSend(); }
}

VIEWS.display.bind = () => {
  const pages = S.pages.map(p => Object.assign({}, p));
  const render = () => {
    $("pages").innerHTML = pages.map((p, i) => `<div class="item ${p.on ? "" : "off"}">
      <span class="idx">${i + 1}</span><span class="pico">${PAGE_ICON[p.id] || ""}</span><span class="name">${t("page_" + p.id)}</span>
      <button class="round" data-i="${i}" data-d="-1" ${i === 0 ? "disabled" : ""}>${I.up}</button>
      <button class="round" data-i="${i}" data-d="1" ${i === pages.length - 1 ? "disabled" : ""}>${I.down}</button>
      ${toggle(`data-on="${i}"`, p.on)}</div>`).join("") +
      `<div class="item off"><span class="idx">${pages.length + 1}</span><span class="pico">${I.lock}</span><span class="name">${t("page_settings")}</span></div>`;
  };
  render();
  $("pages").onclick = e => {
    const b = e.target.closest(".round"); if (!b || b.disabled) return;
    const i = Number(b.dataset.i), j = i + Number(b.dataset.d);
    [pages[i], pages[j]] = [pages[j], pages[i]];
    render(); save({ pages });
  };
  $("pages").onchange = e => { const c = e.target; if (c.dataset.on === undefined) return; pages[c.dataset.on].on = c.checked; render(); save({ pages }); };

  api("/api/backgrounds").then(r => {
    const names = r.data || [];
    $("bgs").innerHTML = names.map(n => `<button data-n="${esc(n)}" class="${n === S.background ? "sel" : ""}"><img src="/bg/${encodeURIComponent(n)}.jpg" alt="${esc(n)}" loading="lazy"></button>`).join("");
    $("bgs").onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      document.querySelectorAll("#bgs button").forEach(x => x.classList.toggle("sel", x === b));
      save({ background: b.dataset.n });
    };
  }).catch(() => { $("bgs").innerHTML = `<div class="empty">${t("offline")}</div>`; });

  // Farbvorlagen als Kacheln mit kleiner Vorschau
  const same = (a, b) => a.toUpperCase() === b.toUpperCase();
  const drawThemes = () => {
    const c = S.colors;
    $("presets").innerHTML = PRESETS.map(([k, m, a, mu], i) => `<button data-i="${i}" class="${same(c.main, m) && same(c.accent, a) && same(c.muted, mu) ? "on" : ""}">
      <span class="tprev"><b style="color:${m}">12:30</b><i style="background:${a}"></i><small style="color:${mu}">${t("fajr")}</small></span>
      <span class="tname">${t(k)}</span></button>`).join("");
    $("customCols").innerHTML = ["main", "accent", "muted"].map(r => `<button class="item link" data-col="${r}">
      <span class="sw" style="background:${c[r]}"></span><span class="name">${t("col_" + r)}</span>
      <span class="val ltr">${esc(c[r].toUpperCase())}</span><span class="chev">${I.chevron}</span></button>`).join("");
  };
  drawThemes();
  $("presets").onclick = async e => {
    const b = e.target.closest("button"); if (!b) return;
    const [, main, accent, muted] = PRESETS[b.dataset.i];
    if (await save({ colors: { main, accent, muted } })) drawThemes();
  };
  $("customCols").onclick = async e => {
    const b = e.target.closest("[data-col]"); if (!b) return;
    const role = b.dataset.col, base = Object.assign({}, S.colors);
    const v = await pickColor(t("col_" + role), base[role], THEME_SWATCHES[role], hex => applyTheme(Object.assign({}, base, { [role]: hex })));
    if (v && !same(v, base[role]) && await save({ colors: Object.assign(base, { [role]: v }) })) drawThemes();
    else applyTheme(S.colors);
  };
  bindRange("brightness", v => save({ brightness: v }), "%");
  bindRange("nightBrightness", v => save({ nightBrightness: v }), "%");
  $("autoDim").onchange = () => { $("nightBox").hidden = !$("autoDim").checked; save({ autoDim: $("autoDim").checked }); };

  const drawLed = () => {
    $("ledGlow").style.setProperty("--c", led.on ? led.color : "transparent");
    $("ledHue").value = Math.round(hex2hsl(led.color)[0]);
    $("ledBriVal").textContent = led.bri + "%";
    document.querySelectorAll("#ledSw button").forEach(b => b.classList.toggle("on", same(b.dataset.c, led.color)));
  };
  drawLed();
  const ledSet = part => { Object.assign(led, part); drawLed(); ledSend(); };
  $("ledSw").onclick = e => { const b = e.target.closest("button"); if (b) ledSet({ color: b.dataset.c, on: true }); };
  $("ledHue").oninput = () => ledSet({ color: hsl2hex(Number($("ledHue").value), 1, .5), on: true });
  $("ledBri").oninput = () => ledSet({ bri: Number($("ledBri").value), on: true });
  $("ledOn").onchange = () => ledSet({ on: $("ledOn").checked });
};

function bindRange(id, onSet, suffix = "") {
  const el = $(id);
  el.oninput = () => $(id + "Val").textContent = el.value + suffix;
  el.onchange = () => onSet(Number(el.value));
}

const volPct = v => Math.round(v * 100 / 21); // Wecker: Decoder 0..21 <-> Prozent
VIEWS.audio = () => `
  ${card(t("azan"), I.prayer, `<div class="list">${PRAYERS.map(k => `<div class="pvol ${S.azan[k] ? "" : "off"}">
      <div class="item"><span class="pico">${PRAYER_ICON[k]}</span><span class="name">${t(k)}</span>${toggle(`data-az="${k}"`, S.azan[k])}</div>
      <div class="vol">${I.audio}${range("pv_" + k, S.azanVolume[k], 0, 100, "%")}<button class="round" data-pplay="${k}" aria-label="${t("listen")}">${I.play}</button></div></div>`).join("")}</div>
    <p class="hint">${t("azan_volume_hint")}</p>
    <div class="actions"><button class="btn danger" data-stop>${I.stop}${t("stop")}</button></div>`)}
  ${card(t("azan_voice"), I.music, `<div class="list" id="voices">${loading("")}</div><p class="hint">${t("azan_voice_hint")}</p>`)}
  ${card(t("azan_test_display"), I.play, `<div class="actions">
      <button class="btn" data-test="dhuhr">${I.play}${t("azan_test_normal")}</button>
      <button class="btn" data-test="fajr">${I.play}${t("azan_test_fajr")}</button>
      <button class="btn danger" data-stop>${I.stop}${t("stop")}</button></div>
    <p class="hint">${t("azan_test_hint")}</p>`)}
  ${card(t("alarms"), I.bell, `<div class="list" id="alarms"></div>
    <div class="actions"><button class="btn" id="alarmAdd">${I.plus}${t("alarm_add")}</button></div><p class="hint">${t("alarm_hint")}</p>`)}
  ${card(t("alarm_tone"), I.music, `<div class="list" id="sounds">${loading("")}</div>
    <div class="vol">${I.audio}${range("volume", volPct(S.volume), 0, 100, "%")}</div>
    <p class="hint">${t("alarm_volume_hint")}</p>`)}`;
VIEWS.audio.bind = () => {
  // Lautstärke je Gebet: beim Loslassen speichern, ▶ spielt den Azan des Gebets in dieser Lautstärke
  PRAYERS.forEach(k => {
    const el = $("pv_" + k);
    el.oninput = () => $("pv_" + k + "Val").textContent = el.value + "%";
    el.onchange = () => save({ azanVolume: { [k]: Number(el.value) } }, true);
  });
  document.querySelectorAll("[data-pplay]").forEach(b => b.onclick = async () => {
    const k = b.dataset.pplay;
    try {
      await save({ azanVolume: { [k]: Number($("pv_" + k).value) } }, true);
      const r = await api("/api/azan/preview", { prayer: k });
      toast(r.ok ? t("azan_playing") : t("error"), !r.ok);
    } catch (e) { toast(t("offline"), true); }
  });
  // Wecker-Lautstärke: beim Loslassen speichern und den gewählten Weckton abspielen
  $("volume").oninput = () => $("volumeVal").textContent = $("volume").value + "%";
  $("volume").onchange = async () => {
    const ok = await save({ volume: Math.round(Number($("volume").value) * 21 / 100) }, true);
    if (ok && sounds.selected) api("/api/preview", { name: sounds.selected }).catch(() => {});
  };
  // Azan-Stimme wählen und probehören
  let voices = { list: [], selected: "" };
  const voiceName = id => { const k = "voice_" + id; return t(k) === k ? id : t(k); };
  const renderVoices = () => {
    $("voices").innerHTML = voices.list.map(id => `<div class="item" data-voice="${esc(id)}" style="cursor:pointer">
      <span class="mark">${id === voices.selected ? I.check : ""}</span><span class="name">${esc(voiceName(id))}</span>
      <button class="round" data-hear="${esc(id)}" aria-label="${t("listen")}">${I.play}</button></div>`).join("") || `<div class="empty">—</div>`;
  };
  const sortVoices = d => { d.list.sort((a, b) => a.localeCompare(b)); voices = d; renderVoices(); };
  api("/api/azan/voices").then(r => r.data && sortVoices(r.data)).catch(() => { $("voices").innerHTML = `<div class="empty">${t("offline")}</div>`; });
  $("voices").onclick = async e => {
    const hear = e.target.closest("[data-hear]");
    if (hear) {
      try { const r = await api("/api/azan/preview", { id: hear.dataset.hear }); toast(r.ok ? t("azan_playing") : t("error"), !r.ok); }
      catch (err) { toast(t("offline"), true); }
      return;
    }
    const row = e.target.closest("[data-voice]"); if (!row || row.dataset.voice === voices.selected) return;
    try {
      const r = await api("/api/azan/voice", { id: row.dataset.voice });
      if (r.ok) { sortVoices(r.data); toast(t("saved")); } else toast(t("error"), true);
    } catch (err) { toast(t("offline"), true); }
  };
  document.querySelectorAll("[data-az]").forEach(c => c.onchange = () => { c.closest(".pvol").classList.toggle("off", !c.checked); save({ azan: { [c.dataset.az]: c.checked } }); });
  document.querySelectorAll("[data-test]").forEach(b => b.onclick = async () => {
    try { const r = await api("/api/azan/test", { prayer: b.dataset.test }); toast(r.ok ? t("azan_playing") : t("error"), !r.ok); }
    catch (e) { toast(t("offline"), true); }
  });
  document.querySelectorAll("[data-stop]").forEach(b => b.onclick = () => api("/api/azan/stop", {}).catch(() => toast(t("offline"), true)));

  const alarms = (S.alarms || []).map(a => Object.assign({}, a));
  const days = t("days");
  // Weckzeit: große Uhrzeit antippen, im Fenster erst Stunde, dann Minute wählen
  const render = () => {
    $("alarms").innerHTML = alarms.map((a, i) => {
      return `<div class="alarmbox ${a.on ? "" : "off"}">
      <div class="arow"><button class="tbtn ltr" data-time="${i}">${esc(a.time)}</button>
        <span class="grow"></span>${toggle(`data-on="${i}"`, a.on)}<button class="round" data-del="${i}" aria-label="del">${I.trash}</button></div>
      <input class="aname" data-name="${i}" value="${esc(a.name || "")}" placeholder="${t("alarm_name_ph")}" maxlength="40" dir="auto">
      <div class="days">${DAY_ORDER.map(bit => `<button data-i="${i}" data-bit="${bit}" class="${a.days & (1 << bit) ? "on" : ""}">${days[bit]}</button>`).join("")}</div>
    </div>`;
    }).join("") || `<div class="empty">${t("alarm_none")}</div>`;
    $("alarmAdd").disabled = alarms.length >= MAX_ALARMS;
  };
  render();
  $("alarms").onclick = async e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.time !== undefined) {
      const v = await pickTime(alarms[b.dataset.time].time);
      if (!v || v === alarms[b.dataset.time].time) return;
      alarms[b.dataset.time].time = v;
    } else if (b.dataset.del !== undefined) alarms.splice(Number(b.dataset.del), 1);
    else if (b.dataset.bit !== undefined) {
      const a = alarms[b.dataset.i], m = a.days ^ (1 << b.dataset.bit);
      if (!m) { toast(t("day_min"), true); return; }
      a.days = m;
    } else return;
    render(); save({ alarms });
  };
  $("alarms").onchange = e => {
    const el = e.target, d = el.dataset;
    if (d.on !== undefined) { alarms[d.on].on = el.checked; render(); }
    else return;
    save({ alarms });
  };
  // Name: beim Tippen speichern, ohne neu zu zeichnen (Tastatur bleibt offen)
  $("alarms").oninput = e => {
    const el = e.target; if (el.dataset.name === undefined) return;
    alarms[el.dataset.name].name = el.value;
    saveLater({ alarms });
  };
  $("alarmAdd").onclick = () => { alarms.push({ on: true, time: "06:00", days: 127, name: "" }); render(); save({ alarms }); };

  let sounds = { list: [], selected: "" };
  const renderSounds = () => {
    $("sounds").innerHTML = sounds.list.map(n => `<div class="item" data-n="${esc(n)}" style="cursor:pointer">
      <span class="mark">${n === sounds.selected ? I.check : ""}</span><span class="name">${esc(t("tone_" + n) === "tone_" + n ? n : t("tone_" + n))}</span>
      <button class="round" data-play="${esc(n)}">${I.play}</button></div>`).join("") || `<div class="empty">—</div>`;
  };
  const load = data => { sounds = data; sounds.selected = (sounds.selected || "").trim(); renderSounds(); };
  api("/api/sounds").then(r => r.data && load(r.data)).catch(() => {});
  $("sounds").onclick = async e => {
    const play = e.target.closest("[data-play]");
    if (play) { const r = await api("/api/preview", { name: play.dataset.play }); toast(r.ok ? t("tone_playing") : t("error"), !r.ok); return; }
    const item = e.target.closest("[data-n]"); if (!item || item.dataset.n === sounds.selected) return;
    const r = await api("/api/sound", { name: item.dataset.n });
    if (r.ok) { load(r.data); toast(t("saved")); } else toast(t("error"), true);
  };
};

VIEWS.lang = () => card(t("language"), I.globe, `<div class="langs" id="langs">${Object.entries(LANGS).map(([k, n]) =>
    `<button data-l="${k}" class="${k === lang() ? "on" : ""}" lang="${k}">${n}</button>`).join("")}</div><p class="hint">${t("language_hint")}</p>`);
VIEWS.lang.bind = () => {
  $("langs").onclick = async e => {
    const b = e.target.closest("button"); if (!b || b.dataset.l === lang()) return;
    applyLang(b.dataset.l);
    try { const r = await api("/api/device/lang", { lang: b.dataset.l }); if (r.ok) toast(t("lang_restart")); }
    catch (err) { toast(t("offline"), true); }
  };
};

VIEWS.wifi = () => {
  const w = ST && ST.wifi;
  return `
  ${card(t("wifi_status"), I.wifi, `<div class="kv"><span>${t("nav_wifi")}</span><span>${wifiState()}</span></div>
    ${w && w.connected ? `<div class="kv"><span>${t("network")}</span><span dir="auto">${esc(w.ssid)}</span></div>` : ""}`)}
  ${card(t("networks"), I.search, `<div class="list" id="nets"></div>
    <div class="actions"><button class="btn" id="scan">${I.refresh}${t("scan")}</button></div>`)}
  ${card(t("wifi_forget"), I.refresh, `<p class="hint" style="margin-top:0">${t("wifi_forget_hint")}</p>
    <div class="actions"><button class="btn danger" id="forget">${t("wifi_forget")}</button></div>`)}`;
};
VIEWS.wifi.bind = () => {
  let nets = [], open = -1;
  const render = () => {
    $("nets").innerHTML = nets.map((n, i) => `<div class="item" data-i="${i}" style="cursor:pointer;flex-wrap:wrap">
      ${bars(n.bars)}<span class="name" dir="auto">${esc(n.ssid)}</span>${n.secure ? `<span class="pico" style="color:var(--dim)">${I.lock}</span>` : ""}
      ${i === open ? `<form class="row" style="width:100%" data-f="${i}">
        ${n.secure ? `<input type="password" class="grow ltr" id="wpass" placeholder="${t("password")}" autocomplete="current-password">` : `<span class="grow"></span>`}
        <button class="btn gold" type="submit">${t("connect")}</button></form>` : ""}</div>`).join("");
  };
  const scan = async () => {
    $("nets").innerHTML = loading(t("searching"));
    try {
      const r = await api("/api/wifi/scan");
      nets = r.data || []; open = -1;
      if (!nets.length) $("nets").innerHTML = `<div class="empty">${t("no_results")}</div>`; else render();
    } catch (e) { $("nets").innerHTML = `<div class="empty">${t("offline")}</div>`; }
  };
  $("scan").onclick = scan;
  $("nets").onclick = e => {
    if (e.target.closest("form")) return;
    const it = e.target.closest("[data-i]"); if (!it) return;
    open = Number(it.dataset.i) === open ? -1 : Number(it.dataset.i);
    render();
    if ($("wpass")) $("wpass").focus();
  };
  $("nets").onsubmit = async e => {
    e.preventDefault();
    const n = nets[e.target.dataset.f];
    try { await api("/api/wifi/connect", { ssid: n.ssid, password: $("wpass") ? $("wpass").value : "" }); toast(t("connecting")); }
    catch (err) { toast(t("offline"), true); }
  };
  $("forget").onclick = async () => {
    if (!await confirmBox(t("are_you_sure"), t("wifi_forget_hint"), true)) return;
    try { await api("/api/wifi/forget", {}); toast(t("restarting")); } catch (e) { toast(t("offline"), true); }
  };
};

VIEWS.device = () => {
  const d = ST && ST.device;
  return `
  ${card(t("device"), I.device, `
    <div class="kv"><span>${t("dev_name")}</span><span>${esc(d ? d.name : "Smart Azan Clock")}</span></div>
    <div class="kv"><span>${t("connection")}</span><span>${deviceState()}</span></div>
    <div class="kv"><span>${t("nav_wifi")}</span><span>${wifiState()}</span></div>
    <div class="kv"><span>${t("firmware")}</span><span class="ltr">${esc(d ? d.firmware : "1.0.0")}</span></div>
    ${d ? `<div class="kv"><span>${t("ip")}</span><span class="ltr">${esc(d.ip)}</span></div>
    <div class="kv"><span>${t("host")}</span><span class="ltr">${esc(d.host)}</span></div>
    <div class="kv"><span>${t("uptime")}</span><span>${duration(d.uptime)}</span></div>
    ${d.fsTotal ? `<div class="kv"><span>${t("storage")}</span><span><span class="ltr">${mb(d.fsTotal - d.fsUsed)}</span> ${t("free_of")} <span class="ltr">${mb(d.fsTotal)}</span></span></div>` : ""}` : ""}`)}
  ${installCard()}
  ${card(t("firmware_update"), I.download, `<div class="actions" style="margin-top:0;justify-content:space-between;align-items:center">
    <span class="hint" style="margin:0">${t("soon")}</span><button class="btn" disabled>${t("firmware_update")}</button></div>`)}
  ${card(t("restart"), I.power, `<div class="actions" style="margin-top:0">
    <button class="btn" id="devRestart">${I.power}${t("restart")}</button>
    <button class="btn danger" id="devReset">${t("factory_reset")}</button></div><p class="hint">${t("factory_hint")}</p>`)}`;
};
VIEWS.device.bind = () => {
  bindInstall();
  $("devRestart").onclick = async () => {
    if (!await confirmBox(t("are_you_sure"), "", false)) return;
    try { await api("/api/device/restart", {}); toast(t("restarting")); } catch (e) { toast(t("offline"), true); }
  };
  $("devReset").onclick = async () => {
    if (!await confirmBox(t("factory_reset") + " – " + t("are_you_sure"), t("factory_hint"), true)) return;
    try { await api("/api/device/reset", {}); toast(t("restarting")); } catch (e) { toast(t("offline"), true); }
  };
};

// ---------- Installation: Knopf, sobald Chrome sie anbietet, sonst Anleitung
const FLAG_URL = "chrome://flags/#unsafely-treat-insecure-origin-as-secure";
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const copyField = (id, value) => `<div class="copy"><input id="${id}" class="ltr" readonly value="${esc(value)}"><button class="btn" data-copy="${id}">${t("copy")}</button></div>`;

function installCard() {
  let body;
  if (isStandalone()) body = `<p class="hint" style="margin-top:0">${t("installed")}</p>`;
  else if (installEvt) body = `<div class="actions" style="margin-top:0"><button class="btn gold" id="devInstall">${I.download}${t("install")}</button></div>`;
  else if (isIOS()) body = `<p class="hint" style="margin-top:0">${t("install_hint_ios")}</p>`;
  else if (window.isSecureContext) body = `<p class="hint" style="margin-top:0">${t("install_menu")}</p>`;
  else if (appMode()) body = `<ol class="steps"><li>${t("sc_1")}</li><li>${t("sc_2")}</li><li>${t("sc_3")}</li></ol>`;
  else body = `<ol class="steps"><li>${t("sc_0")}<div class="actions" style="justify-content:flex-start;margin:10px 0 0">
      <a class="btn gold" href="/?app=1#device">${I.download}${t("sc_open")}</a></div></li><li>${t("sc_1")}</li><li>${t("sc_2")}</li><li>${t("sc_3")}</li></ol>
    <p class="hint">${t("install_ip")}</p>
    <details><summary>${t("sc_adv")}</summary><p class="hint">${t("install_why")}</p>
      <ol class="steps"><li>${t("install_s1")}${copyField("cpFlag", FLAG_URL)}</li>
        <li>${t("install_s2")}${copyField("cpOrigin", location.origin)}</li><li>${t("install_s3")}</li></ol></details>`;
  return card(window.isSecureContext || isIOS() || isStandalone() ? t("install") : t("install_android"), I.download, body);
}

function bindInstall() {
  if ($("devInstall")) $("devInstall").onclick = install;
  document.querySelectorAll("[data-copy]").forEach(b => b.onclick = async () => {
    const el = $(b.dataset.copy);
    try { await navigator.clipboard.writeText(el.value); }
    catch (e) { el.select(); document.execCommand("copy"); } // ohne HTTPS gibt es keine Clipboard-API
    toast(t("copied"));
  });
}

// Hinweis auf dem Dashboard, solange die App nicht installiert ist (schließbar)
function installBanner() {
  let hidden = false;
  try { hidden = localStorage.getItem("installBanner") === "off"; } catch (e) { /* privat */ }
  if (hidden || isStandalone() || !(installEvt || /android/i.test(navigator.userAgent))) return "";
  return `<section class="card banner">${I.download}<div class="t">${t("install_banner")}</div>
    <button class="btn gold" id="bnInstall">${installEvt ? t("install") : t("install_how")}</button>
    <button class="round" id="bnClose" aria-label="${t("close")}">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button></section>`;
}

// ---------- Farben der Uhr übernehmen (Akzent, Schrift, Nebenschrift)
function applyTheme(c) {
  if (!c || !/^#[0-9a-f]{6}$/i.test(c.accent || "")) return;
  const r = document.documentElement.style;
  r.setProperty("--gold", c.accent);
  r.setProperty("--gold2", `color-mix(in srgb, ${c.accent} 75%, #fff)`);
  r.setProperty("--accent-soft", `color-mix(in srgb, ${c.accent} 18%, transparent)`);
  if (/^#[0-9a-f]{6}$/i.test(c.main || "")) r.setProperty("--text", c.main);
  try { localStorage.setItem("colors", JSON.stringify(c)); } catch (e) { /* privat */ }
}
try { applyTheme(JSON.parse(localStorage.getItem("colors") || "null")); } catch (e) { /* privat */ }

// ---------- Gerüst
function renderNav() {
  const btn = k => `<button class="navbtn ${parentOf(current) === k ? "on" : ""}" data-v="${k}">${I[k]}<span>${t(k === "dashboard" ? "tab_home" : "nav_" + k)}</span></button>`;
  $("nav").innerHTML = TABS.map(k => btn(k) + (k === "settings" ? SUB.map(sk =>
    `<button class="navbtn subnav ${current === sk ? "on" : ""}" data-v="${sk}">${I[sk]}<span>${t("nav_" + sk)}</span></button>`).join("") : "")).join("");
  $("tabs").innerHTML = TABS.map(btn).join("");
  document.querySelectorAll("[data-t]").forEach(el => el.textContent = t(el.dataset.t));
  $("install").innerHTML = `${I.download}${t("install")}`;
  $("install").hidden = !installEvt;
  if (ST) $("sideHost").textContent = ST.device.host;
}

function render() {
  const v = VIEWS[current];
  const ok = online && ST && ST.wifi && ST.wifi.connected;
  const lead = SUB.includes(current) ? `<button class="round backbtn" data-go="settings" aria-label="${t("back")}">${I.back}</button>`
    : `<span class="mobile-brand"><img src="/icons/icon-192.png" alt=""></span>`;
  const head = `<div class="top">${lead}<h1>${current === "dashboard" ? t("app") : t("nav_" + current)}</h1>
    <button class="status" data-go="device"><span class="dot ${online ? "ok" : ""}"></span><span class="lbl">${t(online ? "device_online" : "device_offline")}</span></button></div>`;
  if (!S && current !== "dashboard") { $("view").innerHTML = head + (online ? loading("") : `<div class="group empty">${t("offline")}</div>`); return; }
  $("view").innerHTML = head + v();
  if (v.bind) v.bind();
}

function go(view) {
  if (!VIEWS[view]) view = "dashboard";
  current = view;
  if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
  renderNav(); render();
  window.scrollTo(0, 0);
}
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]"); if (g) { go(g.dataset.go); return; }
  const b = e.target.closest(".navbtn[data-v]"); if (b) go(b.dataset.v);
});
window.addEventListener("hashchange", () => go(location.hash.slice(1)));

function applyLang(l) {
  setLang(l);
  try { localStorage.setItem("lang", l); } catch (e) { /* privat */ }
  renderNav(); render();
}

async function refreshStatus() {
  try {
    const r = await api("/api/status");
    if (!r.ok) throw new Error();
    ST = r.data; stBase = performance.now(); online = true;
    try { localStorage.setItem("status", JSON.stringify(ST)); } catch (e) { /* privat */ }
  } catch (e) { online = false; }
  // nur Ansichten neu zeichnen, die keine Eingaben enthalten
  if (current === "dashboard" || current === "device") render();
  renderNav();
}

// ---------- Installation (PWA)
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; renderNav(); if (current === "device" || current === "dashboard") render(); });
window.addEventListener("appinstalled", () => { installEvt = null; renderNav(); render(); });
async function install() {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice;
  installEvt = null; renderNav();
}
$("install").onclick = install;
// Vollbild nur in der gespeicherten App, nie im normalen Browser-Tab.
// Installiert (iOS, Chrome mit HTTPS) regelt das Manifest/iOS selbst. Die Android-Verknüpfung ohne HTTPS
// öffnet in Chrome; sie startet mit "?app=1" und wechselt beim ersten Antippen ins Vollbild.
const appMode = () => new URLSearchParams(location.search).has("app");
const inFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement;
function enterFullscreen() {
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!appMode() || isStandalone() || inFullscreen() || !req) return;
  try { const r = req.call(el, { navigationUI: "hide" }); if (r && r.catch) r.catch(() => {}); } catch (e) { /* nicht erlaubt */ }
}
document.addEventListener("pointerup", enterFullscreen, { capture: true });
document.addEventListener("click", enterFullscreen, { capture: true });

// Service Worker gibt es nur in sicheren Kontexten (HTTPS oder als sicher markierter Ursprung)
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

// ---------- Start
(async function start() {
  let l = "ar";
  try {
    l = localStorage.getItem("lang") || l;
    const cached = localStorage.getItem("status");
    if (cached) ST = JSON.parse(cached);
  } catch (e) { /* privat */ }
  setLang(l);
  current = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : "dashboard";
  renderNav(); render();

  await refreshStatus();
  if (ST && ST.lang && online && ST.lang !== lang()) applyLang(ST.lang);
  try { const r = await api("/api/settings"); if (r.ok) { S = r.data; applyTheme(S.colors); if (current !== "dashboard") render(); } } catch (e) { /* offline */ }
  setInterval(tick, 1000);
  setInterval(() => { if (!document.hidden) refreshStatus(); }, 20000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshStatus(); });
})();
