// Alarme auf dem Handy (Android-App): Erinnerung und Azan zur Gebetszeit, auch ohne Uhr und ohne Internet.
// Zeigt, ob Android die nötigen Rechte gegeben hat, und führt zu den Einstellungen.
import { useEffect, useState } from 'react';
import { IonList, IonItem, IonLabel, IonToggle, IonButton, IonIcon } from '@ionic/react';
import { checkmarkCircle, alertCircleOutline } from 'ionicons/icons';
import Section from './Section.jsx';
import { t } from '../lib/i18n.js';
import { native } from '../lib/native.js';
import { phone, saveLocal, scheduleSoon } from '../lib/phone.js';
import { LOCAL_ONLY } from '../lib/store.js';

export default function PhoneAlerts() {
  const n = native();
  const [on, setOn] = useState(phone().alerts !== false);
  const [perm, setPerm] = useState(null);
  const refresh = () => { try { setPerm(JSON.parse(n.permissions())); } catch (e) { /* ältere App */ } };
  useEffect(() => {
    if (!n) return undefined;
    refresh();
    const vis = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);

  if (!n) return LOCAL_ONLY ? <Section title={t('alerts_title')} hint={t('alerts_web_only')} /> : null;

  const toggle = async v => { setOn(v); await saveLocal({ alerts: v }); scheduleSoon(); };
  const row = (kind, label) => {
    const ok = perm && perm[kind];
    return (
      <IonItem key={kind} lines="full">
        <IonIcon slot="start" icon={ok ? checkmarkCircle : alertCircleOutline} className={ok ? 'accent' : 'warn'} />
        <IonLabel>{label}</IonLabel>
        {ok ? <span slot="end" className="muted">{t('perm_ok')}</span>
          : <IonButton slot="end" size="small" shape="round" onClick={() => { n.requestPermission(kind); }}>{t('perm_allow')}</IonButton>}
      </IonItem>
    );
  };
  return (
    <Section title={t('alerts_title')} hint={t('alerts_hint')}>
      <IonList inset>
        <IonItem lines="full"><IonToggle checked={on} onIonChange={e => toggle(e.detail.checked)}>{t('alerts_on')}</IonToggle></IonItem>
        {perm && row('notifications', t('perm_notif'))}
        {perm && row('exactAlarms', t('perm_exact'))}
        {perm && row('battery', t('perm_battery'))}
      </IonList>
    </Section>
  );
}
