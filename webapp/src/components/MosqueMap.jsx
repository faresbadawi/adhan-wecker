// Moscheen in der Nähe auf einer Karte (OpenStreetMap). Mawaqit gibt seine Suche nicht mehr frei,
// deshalb: Moschee antippen -> "Bei Mawaqit finden" öffnet die Suche, den Link der Moscheeseite hier einfügen.
import { useEffect, useRef, useState } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSpinner, IonIcon, IonInput } from '@ionic/react';
import { searchOutline, navigateOutline, linkOutline, globeOutline } from 'ionicons/icons';
import L from 'leaflet';
import { t, lang } from '../lib/i18n.js';
import { useApp, save, toast, km, slugFromLink } from '../lib/store.js';

const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];

// Alle Server gleichzeitig fragen, die schnellste gültige Antwort zählt; Ergebnis je Ort eine Woche merken
async function findMosques(lat, lon, radius) {
  const key = `mosques:${lat.toFixed(2)},${lon.toFixed(2)},${radius}`;
  try {
    const c = JSON.parse(localStorage.getItem(key) || 'null');
    if (c && Date.now() - c.at < 7 * 864e5) return c.list;
  } catch (e) { /* privat */ }
  const q = `[out:json][timeout:25];nwr["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lon});out center tags 80;`;
  const ctl = new AbortController();
  const ask = async url => {
    const r = await fetch(url, { method: 'POST', signal: ctl.signal, body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()).elements;
  };
  const timer = setTimeout(() => ctl.abort(), 45000);
  let elements;
  try { elements = await Promise.any(OVERPASS.map(ask)); } finally { clearTimeout(timer); ctl.abort(); }
  const list = elements.map(e => {
    const g = e.center || e, tg = e.tags || {};
    const street = [tg['addr:street'], tg['addr:housenumber']].filter(Boolean).join(' ');
    return {
      id: e.type + e.id, lat: g.lat, lon: g.lon,
      name: tg['name:' + lang()] || tg.name || t('mosque'),
      address: [street, tg['addr:city'] || tg['addr:town'] || tg['addr:village']].filter(Boolean).join(', '),
      city: tg['addr:city'] || tg['addr:town'] || '',
      website: tg.website || tg['contact:website'] || '',
      dist: km(lat, lon, g.lat, g.lon),
    };
  }).sort((a, b) => a.dist - b.dist);
  try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), list })); } catch (e) { /* voll oder privat */ }
  return list;
}

const pin = sel => L.divIcon({
  className: 'mq-pin' + (sel ? ' sel' : ''), iconSize: [30, 30], iconAnchor: [15, 30],
  html: '<svg viewBox="0 0 24 24"><path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><path d="M9 12.5v-2a3 3 0 0 1 6 0v2M8.5 12.5h7M12 6.6v.9" class="m"/></svg>',
});

export default function MosqueMap({ open, onClose }) {
  const { S } = useApp();
  const mapEl = useRef(null), map = useRef(null), markers = useRef({});
  const [list, setList] = useState(null); // null = lädt, 'error', []
  const [sel, setSel] = useState(null);
  const [link, setLink] = useState('');

  async function start() {
    if (!S || !mapEl.current) return;
    const { latitude: lat, longitude: lon } = S;
    map.current = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView([lat, lon], 12);
    // OpenStreetMap-Kacheln, per CSS-Filter dunkel eingefärbt (passend zur App)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, className: 'dark-tiles',
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current);
    L.circleMarker([lat, lon], { radius: 7, color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }).addTo(map.current);
    load();
  }
  async function load() {
    const { latitude: lat, longitude: lon } = S;
    setList(null);
    try {
      let found = await findMosques(lat, lon, 25000);
      if (found.length < 5) found = await findMosques(lat, lon, 80000);
      setList(found);
      found.forEach(m => {
        if (!map.current) return;
        markers.current[m.id] = L.marker([m.lat, m.lon], { icon: pin(false) }).addTo(map.current).on('click', () => choose(m, false));
      });
      if (found.length && map.current) map.current.fitBounds(L.latLngBounds([[lat, lon], ...found.slice(0, 8).map(m => [m.lat, m.lon])]), { padding: [30, 30], maxZoom: 14 });
    } catch (e) { setList('error'); }
  }
  function stop() {
    if (map.current) { map.current.remove(); map.current = null; }
    markers.current = {}; setSel(null); setLink(''); setList(null);
  }
  useEffect(() => () => stop(), []);

  function choose(m, fly = true) {
    setSel(prev => {
      if (prev && markers.current[prev.id]) markers.current[prev.id].setIcon(pin(false));
      return m;
    });
    setLink('');
    if (markers.current[m.id]) markers.current[m.id].setIcon(pin(true)).setZIndexOffset(1000);
    if (fly && map.current) map.current.flyTo([m.lat, m.lon], Math.max(map.current.getZoom(), 14), { duration: 0.6 });
    setTimeout(() => document.getElementById('mq-' + m.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }
  function findOnMawaqit(m) {
    const q = `mawaqit ${m.name} ${m.city}`.trim();
    window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank', 'noopener');
  }
  async function take(m) {
    const slug = slugFromLink(link);
    if (!slug) { toast(t('mosque_link_bad'), true); return; }
    if (await save({ source: 'mawaqit', mawaqit: { slug, name: m.name.slice(0, 60) } })) onClose();
  }
  const dist = d => (d < 1 ? Math.round(d * 1000) + ' m' : d.toFixed(1).replace('.', lang() === 'de' ? ',' : '.') + ' ' + t('km'));

  return (
    <IonModal isOpen={open} onDidPresent={start} onWillDismiss={stop} onDidDismiss={onClose} className="map-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('mosque_map_title')}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onClose}>{t('done')}</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        <div className="map-wrap">
          <div className="map" ref={mapEl} dir="ltr" />
          <div className="map-list">
            {list === null && <div className="center pad"><IonSpinner /><p className="section-hint">{t('mosque_loading')}</p></div>}
            {list === 'error' && <div className="center pad"><p className="muted">{t('mosque_map_error')}</p><IonButton shape="round" fill="outline" onClick={load}>{t('retry')}</IonButton></div>}
            {Array.isArray(list) && !list.length && <div className="empty">{t('no_results')}</div>}
            {Array.isArray(list) && list.map(m => (
              <div key={m.id} id={'mq-' + m.id} className={'mq' + (sel && sel.id === m.id ? ' sel' : '')}>
                <button className="mq-head" onClick={() => choose(m)}>
                  <span className="mq-name">{m.name}<small>{m.address}</small></span>
                  <span className="mq-dist num ltr">{dist(m.dist)}</span>
                </button>
                {sel && sel.id === m.id && (
                  <div className="mq-body">
                    <div className="mq-actions">
                      <IonButton size="small" shape="round" onClick={() => findOnMawaqit(m)}><IonIcon slot="start" icon={searchOutline} />{t('mosque_find')}</IonButton>
                      <IonButton size="small" shape="round" fill="outline" href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}`} target="_blank"><IonIcon slot="start" icon={navigateOutline} />{t('route')}</IonButton>
                      {m.website && <IonButton size="small" shape="round" fill="outline" href={m.website} target="_blank"><IonIcon slot="start" icon={globeOutline} />{t('website')}</IonButton>}
                    </div>
                    <div className="mq-link">
                      <IonIcon icon={linkOutline} className="accent" />
                      <IonInput className="ltr" type="url" value={link} placeholder="https://mawaqit.net/…" onIonInput={e => setLink(e.detail.value || '')} />
                      <IonButton size="small" shape="round" disabled={!link.trim()} onClick={() => take(m)}>{t('save')}</IonButton>
                    </div>
                    <p className="section-hint">{t('mosque_find_hint')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
}
