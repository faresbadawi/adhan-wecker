// Adhkar: kurze bekannte Dhikr-Texte mit Zähler (Tasbih). Der Zähler bleibt auf dem Gerät.
import { useState } from 'react';
import { IonPage, IonContent, IonButton, IonIcon } from '@ionic/react';
import { refreshOutline } from 'ionicons/icons';
import { Bar, BigTitle } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t, lang } from '../lib/i18n.js';
import { ADHKAR, dhikrOfDay, meaning } from '../lib/adhkar.js';
import { kvGet, kvSet } from '../lib/native.js';

export default function Adhkar() {
  const [counts, setCounts] = useState(() => kvGet('adhkar', {}));
  const today = dhikrOfDay();
  const bump = (id, n) => { const c = { ...counts, [id]: (counts[id] || 0) + 1 }; setCounts(c); kvSet('adhkar', c); if (n && c[id] === n && navigator.vibrate) navigator.vibrate(60); };
  const reset = id => { const c = { ...counts, [id]: 0 }; setCounts(c); kvSet('adhkar', c); };
  const card = a => (
    <div key={a.id} className={'dhikr-card' + (a.id === today.id ? ' today' : '')}>
      <div className="dhikr-ar" lang="ar" dir="rtl">{a.ar}</div>
      {lang() !== 'ar' && <p className="muted">{meaning(a, lang())}</p>}
      <div className="dhikr-row">
        <button className="dhikr-count" onClick={() => bump(a.id, a.n)} aria-label={t('adhkar_count')}>
          <b className="num">{counts[a.id] || 0}</b>{a.n ? <small>/ {a.n}</small> : null}
        </button>
        <IonButton fill="clear" size="small" onClick={() => reset(a.id)} aria-label={t('adhkar_reset')}><IonIcon slot="icon-only" icon={refreshOutline} /></IonButton>
      </div>
    </div>
  );
  return (
    <IonPage>
      <Bar title={t('adhkar_title')} back="/home" />
      <IonContent>
        <BigTitle title={t('adhkar_title')} />
        <Section title={t('adhkar_today')}>{card(today)}</Section>
        <Section title={t('adhkar_all')}><div className="dhikr-list">{ADHKAR.filter(a => a.id !== today.id).map(card)}</div></Section>
      </IonContent>
    </IonPage>
  );
}
