// Kopfzeile: Titel, Zurück (Unterseiten), rechts Verbindungsstatus und Zahnrad für die Einstellungen.
// Hauptseiten nutzen den großen iOS-Titel, der beim Scrollen in die Leiste wandert.
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton, IonIcon } from '@ionic/react';
import { useState } from 'react';
import { settingsOutline, chevronBack, chevronForward, bulbOutline, bulb } from 'ionicons/icons';
import { useApp } from '../lib/store.js';
import { t, lang } from '../lib/i18n.js';
import { loadLed } from '../lib/led.js';
import LightSheet from './LightSheet.jsx';

// light: Lampen-Symbol neben dem Zahnrad, öffnet das Licht der Uhr (nur mit Uhr, nicht im Handy-Modus)
export function Bar({ title, back, gear = true, light = false }) {
  const { online, local } = useApp();
  const [lightOpen, setLightOpen] = useState(false);
  const [led, setLed] = useState(loadLed);
  const showLight = light && !local;
  return (
    <IonHeader translucent>
      <IonToolbar>
        {back && <IonButtons slot="start"><IonBackButton defaultHref={back} text="" icon={lang() === 'ar' ? chevronForward : chevronBack} /></IonButtons>}
        <IonTitle>{title}</IonTitle>
        <IonButtons slot="end">
          <IonButton routerLink="/settings/device" aria-label={t(online ? 'device_online' : 'device_offline')} className="status-btn">
            <span className={'dot' + (online ? ' ok' : '')} />
          </IonButton>
          {showLight && (
            <IonButton onClick={() => setLightOpen(true)} aria-label={t('led')} className={'light-btn' + (led.on ? ' on' : '')} style={{ '--c': led.color }}>
              <IonIcon slot="icon-only" icon={led.on ? bulb : bulbOutline} />
            </IonButton>
          )}
          {gear && <IonButton routerLink="/settings" aria-label={t('nav_settings')}><IonIcon slot="icon-only" icon={settingsOutline} /></IonButton>}
        </IonButtons>
      </IonToolbar>
      {showLight && <LightSheet open={lightOpen} onClose={() => setLightOpen(false)} onChange={setLed} />}
    </IonHeader>
  );
}

// Großer Titel am Seitenanfang (wird beim Scrollen zum kleinen Titel oben)
export function BigTitle({ title }) {
  return (
    <IonHeader collapse="condense">
      <IonToolbar><IonTitle size="large">{title}</IonTitle></IonToolbar>
    </IonHeader>
  );
}
