// App auf dem Gerät: Android bekommt die eigene App (APK, liegt auf der Uhr), iPhone/iPad die Web-App über Safari,
// am PC genügt der Browser. Die Oberfläche kommt in allen Fällen von der Uhr, Updates kommen mit der Uhr.
import { IonPage, IonContent, IonButton, IonIcon } from '@ionic/react';
import { downloadOutline, checkmarkCircle, logoAndroid, logoApple, desktopOutline } from 'ionicons/icons';
import { Bar } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t } from '../lib/i18n.js';
import { isStandalone, isIOS, isNativeApp } from '../lib/store.js';

const isAndroid = () => /android/i.test(navigator.userAgent);

export default function Install() {
  let body;
  if (isNativeApp() || isStandalone()) {
    body = <div className="card-pad done"><IonIcon icon={checkmarkCircle} className="accent" /><p>{t('installed')}</p></div>;
  } else if (isAndroid()) {
    body = (
      <div className="card-pad">
        <IonButton expand="block" shape="round" href="/app/SmartAzanWecker.apk" download="SmartAzanWecker.apk" target="_self">
          <IonIcon slot="start" icon={downloadOutline} />{t('apk_download')}
        </IonButton>
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
          <div className="card-pad intro"><p>{t('inst_intro2')}</p></div>
        </Section>
        <Section title={t('inst_steps')}>{body}</Section>
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
