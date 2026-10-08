// Kopfzeile: Titel, Zurück (Unterseiten), rechts Verbindungsstatus und Zahnrad für die Einstellungen.
// Hauptseiten nutzen den großen iOS-Titel, der beim Scrollen in die Leiste wandert.
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton, IonIcon } from '@ionic/react';
import { settingsOutline, chevronBack, chevronForward } from 'ionicons/icons';
import { useApp } from '../lib/store.js';
import { t, lang } from '../lib/i18n.js';

export function Bar({ title, back, gear = true }) {
  const { online } = useApp();
  return (
    <IonHeader translucent>
      <IonToolbar>
        {back && <IonButtons slot="start"><IonBackButton defaultHref={back} text="" icon={lang() === 'ar' ? chevronForward : chevronBack} /></IonButtons>}
        <IonTitle>{title}</IonTitle>
        <IonButtons slot="end">
          <IonButton routerLink="/settings/device" aria-label={t(online ? 'device_online' : 'device_offline')} className="status-btn">
            <span className={'dot' + (online ? ' ok' : '')} />
          </IonButton>
          {gear && <IonButton routerLink="/settings" aria-label={t('nav_settings')}><IonIcon slot="icon-only" icon={settingsOutline} /></IonButton>}
        </IonButtons>
      </IonToolbar>
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
