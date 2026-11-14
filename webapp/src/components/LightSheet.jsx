// Licht der Uhr (RGB-LED) als Fenster von unten: an/aus, Farbfelder, Farbton und Helligkeit.
// Geöffnet über das Lampen-Symbol oben in der Kopfzeile der Startseite.
import { useState } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonToggle } from '@ionic/react';
import { t } from '../lib/i18n.js';
import { LED_PRESETS } from '../lib/constants.js';
import { hex2hsl, hsl2hex } from '../lib/color.js';
import { loadLed, ledSend } from '../lib/led.js';

const same = (a, b) => (a || '').toUpperCase() === (b || '').toUpperCase();

export default function LightSheet({ open, onClose, onChange }) {
  const [led, setLed] = useState(loadLed);
  const ledSet = part => { const n = { ...led, ...part }; setLed(n); ledSend(n); if (onChange) onChange(n); };
  return (
    <IonModal isOpen={open} onDidDismiss={onClose} initialBreakpoint={0.6} breakpoints={[0, 0.6, 0.9]} className="sheet">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('led')}</IonTitle>
          <IonButtons slot="end"><IonButton strong onClick={onClose}>{t('done')}</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className={'light-head' + (led.on ? ' on' : '')} style={{ '--c': led.color }}>
          <span className="light-glow" />
          <IonToggle checked={led.on} onIonChange={e => ledSet({ on: e.detail.checked })}>{t('led_on')}</IonToggle>
        </div>
        <div className="swatches big">
          {LED_PRESETS.map(c => <button key={c} className={led.on && same(c, led.color) ? 'on' : ''} style={{ '--c': c }} aria-label={c} onClick={() => ledSet({ color: c, on: true })} />)}
        </div>
        <label className="f">{t('hue')}</label>
        <input type="range" className="slider hue" min="0" max="359" value={Math.round(hex2hsl(led.color)[0])}
          onChange={e => ledSet({ color: hsl2hex(Number(e.target.value), 1, 0.5), on: true })} />
        <label className="f">{t('led_bri')}</label>
        <input type="range" className="slider bri" min="5" max="100" value={led.bri} onChange={e => ledSet({ bri: Number(e.target.value), on: true })} />
        <p className="section-hint">{t('led_hint')}</p>
      </IonContent>
    </IonModal>
  );
}
