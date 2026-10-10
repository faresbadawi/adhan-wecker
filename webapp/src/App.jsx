// App-Gerüst: vier Tabs unten (Heute, Gebetszeiten, Wecker, Azan); die Einstellungen öffnet das Zahnrad
// oben rechts. Daten der Uhr: Status alle 20 s, Uhr und Countdowns laufen jede Sekunde lokal weiter.
import { useEffect } from 'react';
import { IonApp, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/react';
import { IonReactHashRouter } from '@ionic/react-router';
import { Route, Navigate } from 'react-router-dom';
import { homeOutline, alarmOutline, volumeHighOutline } from 'ionicons/icons';
import { t, lang } from './lib/i18n.js';
import { set, get, refreshStatus, loadSettings, applyTheme, save, confirmBox, toast, parseMawaqit, resolveMosque } from './lib/store.js';
import Hosts from './components/Hosts.jsx';
import { takeMosque } from './lib/place.js';
import Home from './pages/Home.jsx';
import Prayer from './pages/Prayer.jsx';
import Alarm from './pages/Alarm.jsx';
import Azan from './pages/Azan.jsx';
import Settings from './pages/Settings.jsx';
import Display from './pages/Display.jsx';
import Language from './pages/Language.jsx';
import Wifi from './pages/Wifi.jsx';
import Device from './pages/Device.jsx';
import Install from './pages/Install.jsx';
import { reloadApp } from './lib/errors.js';

// Moschee-Symbol für den Tab "Gebetszeiten"
const mosque = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path fill='none' stroke='currentColor' stroke-width='32' stroke-linecap='round' stroke-linejoin='round' d='M96 464V272c0-88 72-136 160-176 88 40 160 88 160 176v192M48 464h416M208 464v-80a48 48 0 0 1 96 0v80M256 96V40'/></svg>";

// Aus der Mawaqit-App geteilte Moschee (Web Share Target, siehe manifest.json): ?title=…&text=…&url=…
function sharedMosque() {
  const q = new URLSearchParams(location.search);
  return parseMawaqit([q.get('url'), q.get('text'), q.get('title')].filter(Boolean).join('\n'));
}

export default function App() {
  useEffect(() => {
    try {
      const cached = localStorage.getItem('status');
      if (cached) set({ ST: JSON.parse(cached) });
      applyTheme(JSON.parse(localStorage.getItem('colors') || 'null'));
    } catch (e) { /* privat */ }

    (async () => {
      await refreshStatus();
      // Sprache der Uhr übernehmen (gilt für App und Display); neue Leserichtung braucht einen Neustart der Seite
      const { ST, online } = get();
      if (ST && ST.lang && online && ST.lang !== lang()) {
        try { localStorage.setItem('lang', ST.lang); } catch (e) { /* privat */ }
        reloadApp();
        return;
      }
      await loadSettings();
      const shared = sharedMosque();
      if (shared) {
        history.replaceState(null, '', '/?app=1#/prayer');
        location.hash = '#/prayer';
        const m = await resolveMosque(shared);
        if (!m) toast(t('mosque_not_found'), true);
        else if (await confirmBox(t('mosque_take'), m.name)) await takeMosque(m);
      }
    })();

    const poll = setInterval(() => { if (!document.hidden) refreshStatus(); }, 20000);
    const vis = () => { if (!document.hidden) refreshStatus(); };
    document.addEventListener('visibilitychange', vis);
    const bip = e => { e.preventDefault(); set({ installEvt: e }); };
    window.addEventListener('beforeinstallprompt', bip);
    const inst = () => set({ installEvt: null });
    window.addEventListener('appinstalled', inst);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('beforeinstallprompt', bip);
      window.removeEventListener('appinstalled', inst);
    };
  }, []);

  return (
    <IonApp>
      <IonReactHashRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/home" element={<Home />} />
            <Route path="/prayer" element={<Prayer />} />
            <Route path="/alarm" element={<Alarm />} />
            <Route path="/azan" element={<Azan />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/display" element={<Display />} />
            <Route path="/settings/lang" element={<Language />} />
            <Route path="/settings/wifi" element={<Wifi />} />
            <Route path="/settings/device" element={<Device />} />
            <Route path="/install" element={<Install />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home"><IonIcon icon={homeOutline} /><IonLabel>{t('tab_home')}</IonLabel></IonTabButton>
            <IonTabButton tab="prayer" href="/prayer"><IonIcon icon={mosque} /><IonLabel>{t('nav_prayer')}</IonLabel></IonTabButton>
            <IonTabButton tab="alarm" href="/alarm"><IonIcon icon={alarmOutline} /><IonLabel>{t('nav_alarm')}</IonLabel></IonTabButton>
            <IonTabButton tab="azan" href="/azan"><IonIcon icon={volumeHighOutline} /><IonLabel>{t('nav_audio')}</IonLabel></IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactHashRouter>
      <Hosts />
    </IonApp>
  );
}
