// Einstellungen: Anzeige der Uhr, Sprache, WLAN, Gerät – jeweils mit dem aktuellen Wert
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonNote, IonIcon } from '@ionic/react';
import { colorPaletteOutline, languageOutline, wifiOutline, hardwareChipOutline, chevronForward, chevronBack, sparklesOutline } from 'ionicons/icons';
import { Bar } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t, lang, LANGS } from '../lib/i18n.js';
import { useApp, set, signal } from '../lib/store.js';
import PhoneAlerts from '../components/PhoneAlerts.jsx';
import { native } from '../lib/native.js';
import { restartSetup } from '../components/Onboarding.jsx';

export default function Settings() {
  const { ST, online, local } = useApp();
  const wifiOk = online && ST && ST.wifi && ST.wifi.connected;
  const chev = lang() === 'ar' ? chevronBack : chevronForward;
  const row = (href, icon, title, note) => (
    <IonItem routerLink={href} detail detailIcon={chev}>
      <span className="ico" slot="start"><IonIcon icon={icon} /></span>
      <IonLabel>{title}</IonLabel>
      {note && <IonNote slot="end">{note}</IonNote>}
    </IonItem>
  );
  return (
    <IonPage>
      <Bar title={t('nav_settings')} back="/home" gear={false} />
      <IonContent>
        <PhoneAlerts />
        <Section title={t('grp_clock')}>
          <IonList inset>
            {!local && row('/settings/display', colorPaletteOutline, t('nav_display'))}
            {row('/settings/lang', languageOutline, t('nav_lang'), LANGS[lang()])}
          </IonList>
        </Section>
        <Section hint={t('ob_restart_hint')}>
          <IonList inset>
            <IonItem button detail detailIcon={chev} onClick={() => { restartSetup(); set({ setup: true }); }}>
              <span className="ico" slot="start"><IonIcon icon={sparklesOutline} /></span>
              <IonLabel>{t('ob_restart')}</IonLabel>
            </IonItem>
          </IonList>
        </Section>
        {local && native() && <Section title={t('grp_conn')}>
          <IonList inset>
            <IonItem button detail detailIcon={chev} onClick={() => native().findClock()}>
              <span className="ico" slot="start"><IonIcon icon={wifiOutline} /></span>
              <IonLabel>{t('connect_clock')}</IonLabel>
            </IonItem>
          </IonList>
        </Section>}
        {!local && <Section title={t('grp_conn')}>
          <IonList inset>
            {row('/settings/wifi', wifiOutline, t('nav_wifi'), wifiOk ? t('sig_' + signal(ST.wifi.bars)) : t('wifi_off'))}
            {row('/settings/device', hardwareChipOutline, t('nav_device'), ST ? ST.device.firmware : '')}
          </IonList>
        </Section>}
      </IonContent>
    </IonPage>
  );
}
