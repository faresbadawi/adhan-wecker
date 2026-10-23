// Nacht: Maghrib bis Fajr in drei Teile geteilt; das letzte Drittel ist die Zeit für Tahajjud
import { IonPage, IonContent } from '@ionic/react';
import { Bar, BigTitle } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import Svg from '../components/Svg.jsx';
import { t } from '../lib/i18n.js';
import { I } from '../lib/icons.js';
import { useApp, useNow, toMin, two, duration, elapsed } from '../lib/store.js';

const hm = m => `${two(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${two(((m % 60) + 60) % 60)}`;

export default function Night() {
  const st = useApp();
  useNow();
  const { ST } = st;
  const p = ST && ST.prayer, n = ST && ST.night;
  if (!p || !n) return <IonPage><Bar title={t('night_title')} back="/home" /><IonContent><div className="empty">—</div></IonContent></IonPage>;
  const start = toMin(p.times.maghrib);
  let end = toMin(n.fajr);
  if (end <= start) end += 1440;
  const len = end - start, third = len / 3;
  const parts = [start, start + third, start + 2 * third, end].map(Math.round);
  const mid = Math.round(start + len / 2);
  const left = n.seconds - elapsed(st);
  const h = Math.floor(len / 60), m = Math.round(len % 60);
  return (
    <IonPage>
      <Bar title={t('night_title')} back="/home" />
      <IonContent>
        <BigTitle title={t('night_title')} />
        <section className="night-hero">
          <span className="night-ico big"><Svg html={I.night} /></span>
          <small>{t('night_page')}</small>
          <b className="num ltr">{hm(parts[2])} – {hm(parts[3])}</b>
          <span>{left > 0 ? `${t('night_starts_prefix')} ${duration(left)}` : t('night_running')}</span>
        </section>
        <Section title={t('night_thirds')}>
          <div className="thirds">
            {[0, 1, 2].map(i => (
              <div key={i} className={'third' + (i === 2 ? ' last' : '')}>
                <small>{t('night_third_' + (i + 1))}</small>
                <b className="num ltr">{hm(parts[i])}</b>
                <span className="num ltr">→ {hm(parts[i + 1])}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title={t('night_details')}>
          <div className="card-pad kv">
            <div><span>{t('maghrib')}</span><b className="num ltr">{hm(start)}</b></div>
            <div><span>{t('night_midnight')}</span><b className="num ltr">{hm(mid)}</b></div>
            <div><span>{t('fajr')}</span><b className="num ltr">{hm(end)}</b></div>
            <div><span>{t('night_length')}</span><b className="num ltr">{h} {t('hours')} {m} {t('minutes')}</b></div>
          </div>
        </Section>
        <p className="section-hint">{t('night_hint')}</p>
      </IonContent>
    </IonPage>
  );
}
