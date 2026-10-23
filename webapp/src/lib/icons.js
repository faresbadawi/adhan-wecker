// Symbole als SVG-Zeichenketten (Strichzeichnungen, Farbe über currentColor); Einbinden mit {@html I.name}
export const svg = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
export const I = {
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
  alarm: svg('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.2 1.6M4.5 5.5 7 3.2M19.5 5.5 17 3.2"/>'),
  // Letztes Drittel der Nacht: Mondsichel mit Stern
  night: svg('<path d="M19.5 14.2A8 8 0 1 1 9.8 4.5a6.3 6.3 0 0 0 9.7 9.7Z"/><path d="M17 2.5v3.2M15.4 4.1h3.2M21 8.5v2M20 9.5h2"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>'),
};


export const PAGE_ICON = { clock: I.clock, prayer: I.prayer, weather: I.cloud, calendar: I.calendar, night: I.moon,
  moon: svg('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16a5 8 0 0 0 0-16z" fill="currentColor"/>') };
export const SKY_ICON = { clear: I.sun, partly_cloudy: I.partly, cloudy: I.cloud, fog: I.fog, drizzle: I.rain, rain: I.rain, snow: I.snow, thunder: I.thunder };
export const PRAYER_ICON = { fajr: I.sunrise, sunrise: I.sun, dhuhr: I.sun, asr: I.partly, maghrib: I.sunset, isha: I.moon };
