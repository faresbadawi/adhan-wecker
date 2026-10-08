// Farbwahl von unten: passende Farbfelder, Farbton und Helligkeit; Vorschau live auf die App-Farben
import { useEffect, useState } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/react';
import { t } from '../lib/i18n.js';
import { hex2hsl, hsl2hex } from '../lib/color.js';

// req: { title, value, swatches, live(hex), done(hex|null) } oder null
export default function ColorSheet({ req, onClose }) {
  const [hsl, setHsl] = useState([0, 0, 0]);
  const [cur, setCur] = useState('#FFFFFF');
  useEffect(() => { if (req) { setHsl(hex2hsl(req.value)); setCur(req.value.toUpperCase()); } }, [req]);
  useEffect(() => { if (req) req.live(cur); }, [cur]); // eslint-disable-line react-hooks/exhaustive-deps

  const setHex = c => { setCur(c); setHsl(hex2hsl(c)); };
  const onHue = h => { const s = hsl[1] < 0.15 ? 0.6 : hsl[1]; setHsl([h, s, hsl[2]]); setCur(hsl2hex(h, s, hsl[2])); };
  const onLight = v => { const l = v / 100; setHsl([hsl[0], hsl[1], l]); setCur(hsl2hex(hsl[0], hsl[1], l)); };
  function finish(v) {
    if (!req) return;
    if (v === null) req.live(req.value);
    const r = req;
    onClose();
    r.done(v);
  }
  const [h, s] = hsl;
  return (
    <IonModal isOpen={!!req} onDidDismiss={() => finish(null)} initialBreakpoint={0.62} breakpoints={[0, 0.62, 0.9]} className="sheet">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={() => finish(null)}>{t('cancel')}</IonButton></IonButtons>
          <IonTitle>{req ? req.title : ''}</IonTitle>
          <IonButtons slot="end"><IonButton strong onClick={() => finish(cur)}>{t('done')}</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {req && <>
          <div className="cphead"><span className="cpdot" style={{ background: cur }} /><span className="ltr num">{cur}</span></div>
          <div className="swatches">
            {req.swatches.map(c => <button key={c} className={c === cur ? 'on' : ''} style={{ '--c': c }} aria-label={c} onClick={() => setHex(c)} />)}
          </div>
          <label className="f">{t('hue')}</label>
          <input type="range" className="slider hue" min="0" max="359" value={Math.round(h)} onChange={e => onHue(Number(e.target.value))} />
          <label className="f">{t('lightness')}</label>
          <input type="range" className="slider" min="15" max="97" value={Math.round(hsl[2] * 100)} onChange={e => onLight(Number(e.target.value))}
            style={{ '--track': `linear-gradient(90deg, ${hsl2hex(h, s, 0.15)}, ${hsl2hex(h, s, 0.5)}, ${hsl2hex(h, s, 0.97)})` }} />
        </>}
      </IonContent>
    </IonModal>
  );
}
