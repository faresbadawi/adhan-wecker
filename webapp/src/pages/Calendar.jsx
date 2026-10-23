// Hidschri-Kalender: Monatsansicht mit gregorianischem Datum, heute und besonderen Tagen
import { useState } from 'react';
import { IonPage, IonContent, IonButton, IonIcon } from '@ionic/react';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { Bar, BigTitle } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t, lang } from '../lib/i18n.js';
import { useApp, locale } from '../lib/store.js';
import { hijriOf, addDays } from '../lib/times.js';
import { HOLIDAYS } from '../lib/phone.js';

export default function Calendar() {
  const { ST } = useApp();
  const [off, setOff] = useState(0); // Monate vor oder zurück
  const td = ST && ST.time ? ST.time.date.split('-').map(Number) : (() => { const d = new Date(); return [d.getFullYear(), d.getMonth() + 1, d.getDate()]; })();
  const ref = ST && ST.prayer && ST.prayer.hijri && ST.prayer.hijri.day ? ST.prayer.hijri : hijriOf(...td);
  // Die Uhr rechnet das Datum etwas anders als der Kalender des Handys: auf den Stand der Uhr abgleichen
  const own = hijriOf(...td);
  const shift = ref.day - own.day === 0 ? 0 : Math.max(-2, Math.min(2, ref.day - own.day));
  const hij = (y, m, d) => { const s = addDays(y, m, d, shift); return hijriOf(s.y, s.m, s.d); };

  // Anfang des angezeigten Hidschri-Monats finden: erst auf den 1. des heutigen Monats zurück, dann Monate weiter
  let cur = { ...addDays(td[0], td[1], td[2], 0) };
  for (let i = 0; i < 31 && hij(cur.y, cur.m, cur.d).day > 1; i++) cur = addDays(cur.y, cur.m, cur.d, -1);
  for (let k = 0; k < Math.abs(off); k++) {
    cur = addDays(cur.y, cur.m, cur.d, off > 0 ? 29 : -1);
    if (off > 0) for (let i = 0; i < 3 && hij(cur.y, cur.m, cur.d).day > 1; i++) cur = addDays(cur.y, cur.m, cur.d, 1);
    else for (let i = 0; i < 31 && hij(cur.y, cur.m, cur.d).day > 1; i++) cur = addDays(cur.y, cur.m, cur.d, -1);
  }
  const days = [];
  for (let i = 0; i < 31; i++) {
    const g = addDays(cur.y, cur.m, cur.d, i), h = hij(g.y, g.m, g.d);
    if (i > 0 && h.day === 1) break;
    days.push({ g, h, wd: new Date(Date.UTC(g.y, g.m - 1, g.d, 12)).getUTCDay() });
  }
  const first = days[0], monthName = t('hijri_months')[first.h.month - 1];
  const startCol = lang() === 'ar' ? (first.wd + 1) % 7 : (first.wd + 6) % 7; // Woche beginnt Samstag (arabisch) bzw. Montag
  const order = lang() === 'ar' ? [6, 0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 0];
  const names = t('days');
  const isToday = d => d.g.y === td[0] && d.g.m === td[1] && d.g.d === td[2];
  const holidays = days.filter(d => HOLIDAYS(d.h.month, d.h.day));
  const chev = lang() === 'ar' ? [chevronForward, chevronBack] : [chevronBack, chevronForward];
  const gr = d => new Date(Date.UTC(d.g.y, d.g.m - 1, d.g.d, 12)).toLocaleDateString(locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return (
    <IonPage>
      <Bar title={t('cal_title')} back="/home" />
      <IonContent>
        <BigTitle title={t('cal_title')} />
        <div className="cal-head">
          <IonButton fill="clear" onClick={() => setOff(off - 1)} aria-label="‹"><IonIcon slot="icon-only" icon={chev[0]} /></IonButton>
          <div><b>{monthName} {first.h.year}</b><small>{gr(days[0])} – {gr(days[days.length - 1])}</small></div>
          <IonButton fill="clear" onClick={() => setOff(off + 1)} aria-label="›"><IonIcon slot="icon-only" icon={chev[1]} /></IonButton>
        </div>
        <div className="cal">
          {order.map(w => <div key={'h' + w} className="cal-wd">{names[w]}</div>)}
          {Array.from({ length: startCol }).map((_, i) => <div key={'e' + i} />)}
          {days.map(d => (
            <div key={d.h.day} className={'cal-day' + (isToday(d) ? ' today' : '') + (d.wd === 5 ? ' fri' : '') + (HOLIDAYS(d.h.month, d.h.day) ? ' hol' : '')}>
              <b className="num">{d.h.day}</b><small className="num">{d.g.d}</small>
            </div>
          ))}
        </div>
        {holidays.length > 0 && (
          <Section title={t('cal_special')}>
            <div className="card-pad kv">
              {holidays.map(d => <div key={d.h.day}><span>{t('holiday_' + HOLIDAYS(d.h.month, d.h.day))}</span><b className="num">{d.h.day} · {gr(d)}</b></div>)}
            </div>
          </Section>
        )}
        <p className="section-hint">{t('cal_hint')}</p>
      </IonContent>
    </IonPage>
  );
}
