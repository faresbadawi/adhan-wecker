// Eigene Zeitwahl für den Wecker (statt der Eingabe von Android/iOS): große Ziffern mit Pfeilen,
// Stunden- und Minutenraster zum Antippen und eine Schnellwahl (Gebetszeiten, feste Zeiten, "in … Stunden").
import { useEffect, useState } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon } from '@ionic/react';
import { chevronUp, chevronDown } from 'ionicons/icons';
import { t } from '../lib/i18n.js';
import { toMin, two, duration, pname } from '../lib/store.js';

const fmt = m => { m = ((m % 1440) + 1440) % 1440; return `${two(Math.floor(m / 60))}:${two(m % 60)}`; };
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINS = Array.from({ length: 12 }, (_, i) => i * 5);
const FIXED = ['04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00'];

// value 'HH:MM'; nowSec: Sekunden seit Mitternacht (Uhr der Uhr); ST: Status (Gebetszeiten);
// onDone(time, nameHint): nameHint ist ein Vorschlag für den Namen, wenn eine Gebetszeit gewählt wurde
export default function TimeSheet({ open, value, nowSec, ST, onCancel, onDone }) {
  const [m, setM] = useState(360);
  const [hint, setHint] = useState('');
  useEffect(() => { if (open) { setM(toMin(value || '06:00')); setHint(''); } }, [open, value]);
  const h = Math.floor(m / 60), mi = m % 60;
  const setTime = (v, name = '') => { setM(((v % 1440) + 1440) % 1440); setHint(name); };

  // Schnellwahl aus den Gebetszeiten des Tages
  const times = ST && ST.prayer && ST.prayer.times;
  const quick = [];
  if (times && times.fajr) {
    const f = toMin(times.fajr);
    quick.push({ label: `${pname('fajr', ST)}`, m: f, name: pname('fajr', ST) });
    quick.push({ label: t('tp_before').replace('{m}', 15).replace('{p}', pname('fajr', ST)), m: f - 15, name: pname('fajr', ST) });
    quick.push({ label: t('tp_before').replace('{m}', 30).replace('{p}', pname('fajr', ST)), m: f - 30, name: pname('fajr', ST) });
  }
  if (times && times.sunrise) {
    quick.push({ label: t('tp_before').replace('{m}', 20).replace('{p}', pname('sunrise', ST)), m: toMin(times.sunrise) - 20, name: '' });
  }
  if (times && times.dhuhr) quick.push({ label: pname('dhuhr', ST), m: toMin(times.dhuhr), name: pname('dhuhr', ST) });
  // "In … " ab jetzt (Mittagsschlaf, Nacht)
  const nowM = Math.floor((nowSec || 0) / 60);
  const rel = [[20, t('tp_nap')], [90, ''], [420, ''], [480, '']];

  // Wann klingelt es (ab jetzt)
  const leftMin = ((m - nowM) % 1440 + 1440) % 1440 || 1440;

  return (
    <IonModal isOpen={open} onDidDismiss={onCancel} initialBreakpoint={0.92} breakpoints={[0, 0.92]} className="sheet time-sheet">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onCancel}>{t('cancel')}</IonButton></IonButtons>
          <IonTitle>{t('alarm_time')}</IonTitle>
          <IonButtons slot="end"><IonButton strong onClick={() => onDone(fmt(m), hint)}>{t('done')}</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="tp-big ltr">
          <div className="tp-col">
            <button onClick={() => setTime(m + 60)} aria-label="+1 h"><IonIcon icon={chevronUp} /></button>
            <span className="num">{two(h)}</span>
            <button onClick={() => setTime(m - 60)} aria-label="-1 h"><IonIcon icon={chevronDown} /></button>
          </div>
          <span className="tp-colon">:</span>
          <div className="tp-col">
            <button onClick={() => setTime(h * 60 + (mi + 1) % 60)} aria-label="+1 min"><IonIcon icon={chevronUp} /></button>
            <span className="num">{two(mi)}</span>
            <button onClick={() => setTime(h * 60 + (mi + 59) % 60)} aria-label="-1 min"><IonIcon icon={chevronDown} /></button>
          </div>
        </div>
        {nowSec != null && <div className="tp-left">{t('tp_rings_in')} {duration(leftMin * 60)}</div>}

        {quick.length > 0 && <>
          <label className="f">{t('tp_prayer')}</label>
          <div className="tp-chips">
            {quick.map(q => (
              <button key={q.label} className={fmt(q.m) === fmt(m) ? 'on' : ''} onClick={() => setTime(q.m, q.name)}>
                <span>{q.label}</span><b className="num ltr">{fmt(q.m)}</b>
              </button>
            ))}
          </div>
        </>}

        <label className="f">{t('tp_hour')}</label>
        <div className="tp-grid ltr">
          {HOURS.map(x => <button key={x} className={x === h ? 'on' : ''} onClick={() => setTime(x * 60 + mi)}>{two(x)}</button>)}
        </div>
        <label className="f">{t('tp_minute')}</label>
        <div className="tp-grid ltr">
          {MINS.map(x => <button key={x} className={x === mi ? 'on' : ''} onClick={() => setTime(h * 60 + x)}>:{two(x)}</button>)}
        </div>

        <label className="f">{t('tp_fixed')}</label>
        <div className="tp-chips small ltr">
          {FIXED.map(v => <button key={v} className={v === fmt(m) ? 'on' : ''} onClick={() => setTime(toMin(v))}><b className="num">{v}</b></button>)}
        </div>

        {nowSec != null && <>
          <label className="f">{t('tp_from_now')}</label>
          <div className="tp-chips small">
            {rel.map(([d, name]) => (
              <button key={d} onClick={() => setTime(nowM + d, name)}>
                <span>{t('tp_in').replace('{d}', d % 60 ? duration(d * 60) : `${d / 60} ${t('hours')}`)}</span>
              </button>
            ))}
          </div>
        </>}
      </IonContent>
    </IonModal>
  );
}
