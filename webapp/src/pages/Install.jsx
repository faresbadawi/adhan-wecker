// Als App installieren: dann läuft die App ohne Browserleiste, die Statusleiste des Handys bleibt sichtbar,
// und Moscheen lassen sich aus der Mawaqit-App teilen. Android/Chrome installiert nur für sichere Adressen;
// die Uhr im Heimnetz (http) wird dafür einmal in chrome://flags als vertrauenswürdig eingetragen.
import { useRef } from 'react';
import { IonPage, IonContent, IonButton, IonIcon } from '@ionic/react';
import { downloadOutline, copyOutline, checkmarkCircle } from 'ionicons/icons';
import { Bar } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t } from '../lib/i18n.js';
import { useApp, set, toast, isStandalone, isIOS } from '../lib/store.js';

const FLAG_URL = 'chrome://flags/#unsafely-treat-insecure-origin-as-secure';

export function Copy({ value }) {
  const ref = useRef(null);
  async function copy() {
    try { await navigator.clipboard.writeText(value); }
    catch (e) { ref.current.select(); document.execCommand('copy'); } // ohne HTTPS keine Clipboard-API
    toast(t('copied'));
  }
  return (
    <div className="copy">
      <input ref={ref} className="ltr" readOnly value={value} onFocus={e => e.target.select()} />
      <IonButton size="small" fill="outline" shape="round" onClick={copy}><IonIcon slot="start" icon={copyOutline} />{t('copy')}</IonButton>
    </div>
  );
}

export default function Install() {
  const { ST, installEvt } = useApp();
  // beide Adressen der Uhr eintragen, damit es mit Name und IP klappt
  const origins = [...new Set([location.origin, 'http://azan-clock.local', ST && ST.device ? 'http://' + ST.device.ip : ''].filter(Boolean))].join(',');
  async function install() {
    if (!installEvt) return;
    installEvt.prompt();
    await installEvt.userChoice;
    set({ installEvt: null });
  }

  let body;
  if (isStandalone()) {
    body = <div className="card-pad done"><IonIcon icon={checkmarkCircle} className="accent" /><p>{t('installed')}</p></div>;
  } else if (isIOS()) {
    body = <div className="card-pad"><p>{t('install_hint_ios')}</p></div>;
  } else if (window.isSecureContext) {
    body = (
      <div className="card-pad">
        <p className="muted top">{t('inst_ready')}</p>
        {installEvt
          ? <IonButton expand="block" shape="round" onClick={install}><IonIcon slot="start" icon={downloadOutline} />{t('install')}</IonButton>
          : <p>{t('install_menu')}</p>}
        <p className="muted">{t('inst_old')}</p>
      </div>
    );
  } else {
    body = (
      <div className="card-pad">
        <ol className="steps big-steps">
          <li><b>{t('inst_s1')}</b><Copy value={FLAG_URL} /><span className="muted">{t('inst_s1b')}</span></li>
          <li><b>{t('inst_s2')}</b><Copy value={origins} /><span className="muted">{t('inst_s2b')}</span></li>
          <li><b>{t('inst_s3')}</b></li>
          <li><b>{t('inst_s4')}</b><span className="muted">{t('inst_s4b')}</span></li>
          <li><b>{t('inst_old')}</b></li>
        </ol>
      </div>
    );
  }

  return (
    <IonPage>
      <Bar title={t('inst_title')} back="/home" />
      <IonContent>
        <Section hint={!isStandalone() && !isIOS() && !window.isSecureContext ? t('inst_why') : ''}>
          <div className="card-pad intro"><p>{t('inst_intro')}</p></div>
        </Section>
        <Section title={t('inst_steps')}>{body}</Section>
      </IonContent>
    </IonPage>
  );
}
