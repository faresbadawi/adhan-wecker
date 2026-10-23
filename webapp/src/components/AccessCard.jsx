// Nach dem Verbinden: direkter Link zur Bilal-Seite der Uhr, QR-Code zur Android-App und Link zur Web-Version (PWA)
import { IonIcon } from '@ionic/react';
import { openOutline, phonePortraitOutline } from 'ionicons/icons';
import Section from './Section.jsx';
import QrCode from './QrCode.jsx';
import { t } from '../lib/i18n.js';
import { useApp } from '../lib/store.js';

export default function AccessCard() {
  const { ST } = useApp();
  const d = ST && ST.device;
  if (!d || ST.local) return null;
  const home = 'http://' + (d.host || 'azan-clock.local') + '/';
  const app = d.appUrl, pwa = d.pwaUrl;
  return (
    <Section title={t('open_bilal')}>
      <div className="card-pad access">
        <a className="dl-btn" href={home} target="_blank" rel="noreferrer"><IonIcon icon={openOutline} />{t('open_bilal_btn')}</a>
        <p className="muted dl-link ltr-inline">{home}{d.ip ? ' · http://' + d.ip + '/' : ''}</p>
        {(app || home) && <>
          <QrCode text={app || home} />
          <p className="muted qr-cap"><IonIcon icon={phonePortraitOutline} /> {app ? t('qr_android') : t('qr_open')}</p>
        </>}
        {pwa && <a className="dl-btn ghost" href={pwa} target="_blank" rel="noreferrer">{t('open_web')}</a>}
        {pwa && <p className="muted">{t('open_web_hint')}</p>}
      </div>
    </Section>
  );
}
