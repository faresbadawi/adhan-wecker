// Ort der Uhr: Name in der Sprache des Landes (Braunschweig bleibt "Braunschweig", Damaskus wird "دمشق"),
// Koordinaten für Gebetszeiten und Wetter, Zeitzone für die Uhrzeit. Die Oberfläche bleibt in der Sprache des Nutzers.
import TZDB from './tzdb.json';
import { save } from './store.js';

// Landessprache je Ländercode (häufige Länder; sonst Englisch)
const COUNTRY_LANG = {
  DE: 'de', AT: 'de', CH: 'de', LI: 'de', LU: 'fr', BE: 'fr', FR: 'fr', MC: 'fr', NL: 'nl', IT: 'it', ES: 'es', PT: 'pt',
  TR: 'tr', BA: 'bs', AL: 'sq', XK: 'sq', MK: 'mk', RS: 'sr', HR: 'hr', SI: 'sl', PL: 'pl', CZ: 'cs', SK: 'sk', HU: 'hu',
  RO: 'ro', BG: 'bg', GR: 'el', SE: 'sv', NO: 'no', DK: 'da', FI: 'fi', RU: 'ru', UA: 'uk', AZ: 'az',
  SA: 'ar', AE: 'ar', QA: 'ar', KW: 'ar', BH: 'ar', OM: 'ar', YE: 'ar', IQ: 'ar', SY: 'ar', JO: 'ar', LB: 'ar', PS: 'ar',
  EG: 'ar', LY: 'ar', TN: 'ar', DZ: 'ar', MA: 'ar', SD: 'ar', MR: 'ar', SO: 'ar', DJ: 'ar', KM: 'ar',
  IR: 'fa', AF: 'fa', PK: 'ur', IN: 'en', BD: 'bn', ID: 'id', MY: 'ms', BN: 'ms', SN: 'fr', ML: 'fr', NE: 'fr',
  GB: 'en', IE: 'en', US: 'en', CA: 'en', AU: 'en', NZ: 'en', ZA: 'en', NG: 'en',
};
export const langOf = cc => COUNTRY_LANG[(cc || '').toUpperCase()] || 'en';

// Verwaltungswörter vor/hinter Stadtnamen entfernen ("محافظة مكة المكرمة" -> "مكة المكرمة")
const ADMIN = /^(محافظة|بلدية|ناحية|منطقة|Landkreis|Kreis|Municipality of|City of)\s+|\s+(Municipality|İli|Province|Governorate)$/i;
const clean = s => (s || '').replace(ADMIN, '').trim();

// Ortsname aus Koordinaten (OpenStreetMap/Nominatim, Stadtebene) in der Landessprache
export async function localCityName(lat, lon, cc) {
  const lg = langOf(cc);
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lon}&accept-language=${lg}`);
    const a = (await r.json()).address || {};
    // "بلدية …" ist in manchen Ländern nur ein Stadtbezirk: dann die Provinz (z. B. محافظة دمشق -> دمشق)
    const city = a.city && !/^بلدية/.test(a.city) ? a.city : (a.town || a.village || a.state || a.county || a.city);
    return { name: clean(city), cc: (a.country_code || cc || '').toUpperCase() };
  } catch (e) { return null; }
}

// Ort aus der Ortssuche (Open-Meteo) in der Landessprache abrufen
async function localSearchName(id, cc, fallback) {
  try {
    const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/get?id=${id}&language=${langOf(cc)}`)).json();
    return r && r.name ? r.name : fallback;
  } catch (e) { return fallback; }
}

const tzOf = name => (name && TZDB[name] ? { name, posix: TZDB[name] } : undefined);

// Ort aus der Ortssuche übernehmen: Berechnung der Gebetszeiten, Zeitzone und Wetter dieses Ortes
export async function takeSearchedPlace(p) {
  const name = await localSearchName(p.id, p.country_code, p.name);
  return save({
    city: name.slice(0, 40), country: p.country_code || '', latitude: Number(p.latitude.toFixed(4)), longitude: Number(p.longitude.toFixed(4)),
    timezone: tzOf(p.timezone), source: 'calculated',
  }, true);
}

// Mawaqit-Moschee übernehmen: Zeiten von der Moschee, Ort, Zeitzone und Wetter von ihrem Standort
export async function takeMosque(m) {
  const place = m.lat ? await localCityName(m.lat, m.lon, m.country) : null;
  const part = { source: 'mawaqit', mawaqit: { slug: m.slug, name: m.name } };
  if (m.lat) {
    part.latitude = Number(m.lat.toFixed(4));
    part.longitude = Number(m.lon.toFixed(4));
    part.country = (place && place.cc) || m.country || '';
    if (place && place.name) part.city = place.name.slice(0, 40);
  }
  const tz = tzOf(m.timezone);
  if (tz) part.timezone = tz;
  return save(part, true);
}
