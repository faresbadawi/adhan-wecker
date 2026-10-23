// App auf dem Gerät: Android bekommt die eigene App (APK aus dem Netz, Adresse einstellbar, QR-Code auf der Uhr),
// iPhone/iPad die Web-App über Safari, am PC genügt der Browser.
import { useState } from 'react';
import { IonPage, IonContent, IonButton, IonIcon, IonInput } from '@ionic/react';
import { downloadOutline, checkmarkCircle, logoAndroid, logoApple, desktopOutline } from 'ionicons/icons';
import { Bar } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t } from '../lib/i18n.js';
import { isStandalone, isIOS, isNativeApp, useApp, api, refreshStatus, toast } from '../lib/store.js';
import AccessCard from '../components/AccessCard.jsx';

const isAndroid = () => /android/i.test(navigator.userAgent);

// Download-Adresse der App einstellen (erscheint als QR-Code auf der Uhr)
function AppLink({ current, currentPwa }) {
  const [url, setUrl] = useState(current || '');
  const [pwa, setPwa] = useState(currentPwa || '');
  async function saveUrl() {
    try {
      const r = await api('/api/appurl', { url: url.trim(), pwa: pwa.trim() });
      if (r.ok) { await refreshStatus(); toast(t('saved')); } else toast(t('error'), true);
    } catch (e) { toast(t('offline'), true); }
  }
  return (
    <div className="card-pad">
      <p className="muted top">{t('app_link_hint')}</p>
      <IonInput className="urlin ltr-inline" value={url} placeholder="https://github.com/…/releases/latest" inputmode="url"
        onIonInput={e => setUrl(e.detail.value || '')} />
      <p className="muted mt">{t('pwa_link_hint')}</p>
      <IonInput className="urlin ltr-inline" value={pwa} placeholder="https://…github.io/…/" inputmode="url"
        onIonInput={e => setPwa(e.detail.value || '')} />
      <div className="btnrow mt"><IonButton shape="round" onClick={saveUrl}>{t('app_link_set')}</IonButton></div>
    </div>
  );
}

export default function Install() {
  const { ST } = useApp();
  const appUrl = (ST && ST.device && ST.device.appUrl) || '';
  let body;
  if (isNativeApp() || isStandalone()) {
    body = <div className="card-pad done"><IonIcon icon={checkmarkCircle} className="accent" /><p>{t('installed')}</p></div>;
  } else if (isAndroid()) {
    body = (
      <div className="card-pad">
        {/* normaler Link statt IonButton: Ionic würde den Link abfangen und nichts herunterladen */}
        {appUrl ? <>
          <a className="dl-btn" href={appUrl} target="_blank" rel="noreferrer">
            <IonIcon icon={downloadOutline} />{t('apk_download')}
          </a>
          <p className="muted dl-link ltr-inline">{appUrl}</p>
        </> : <p className="muted">{t('app_link_none')}</p>}
        <ol className="steps big-steps mt">
          <li><b>{t('apk_s1')}</b></li>
          <li><b>{t('apk_s2')}</b><span className="muted">{t('apk_s2b')}</span></li>
          <li><b>{t('apk_s3')}</b></li>
          <li><b>{t('inst_old')}</b></li>
        </ol>
      </div>
    );
  } else if (isIOS()) {
    body = <div className="card-pad"><p>{t('install_hint_ios')}</p></div>;
  } else {
    body = <div className="card-pad"><p>{t('pc_hint')}</p></div>;
  }

  return (
    <IonPage>
      <Bar title={t('inst_title')} back="/home" />
      <IonContent>
        <Section>
          <div className="card-pad intro"><p>{t('inst_intro2')}</p><p className="muted mt">{t('app_scan')}</p></div>
        </Section>
        <Section title={t('inst_steps')}>{body}</Section>
        {!isNativeApp() && <Section title={t('app_link')}><AppLink current={appUrl} currentPwa={(ST && ST.device && ST.device.pwaUrl) || ''} /></Section>}
        {!isNativeApp() && <AccessCard />}
        <Section title={t('inst_all')}>
          <div className="card-pad platforms">
            <p><IonIcon icon={logoAndroid} className="accent" /> {t('plat_android')}</p>
            <p><IonIcon icon={logoApple} className="accent" /> {t('plat_ios')}</p>
            <p><IonIcon icon={desktopOutline} className="accent" /> {t('plat_pc')}</p>
          </div>
        </Section>
      </IonContent>
    </IonPage>
  );
}
