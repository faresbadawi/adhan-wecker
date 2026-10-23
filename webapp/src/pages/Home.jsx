// Heute: nächstes Gebet im Ring (Anteil der Zeit seit dem letzten Gebet), Wetter, letztes Drittel der Nacht,
// WLAN und die Zeiten des Tages. Die Glocke je Gebet schaltet den Azan. Zum Aktualisieren nach unten ziehen.
import { useState } from 'react';
import { IonPage, IonContent, IonRefresher, IonRefresherContent, IonButton, IonIcon, useIonRouter } from '@ionic/react';
import { notifications, notificationsOffOutline, close, downloadOutline, phonePortraitOutline } from 'ionicons/icons';
import { Bar, BigTitle } from '../components/Header.jsx';
import Svg from '../components/Svg.jsx';
import { t } from '../lib/i18n.js';
import { I, SKY_ICON, PRAYER_ICON } from '../lib/icons.js';
import { ALL_TIMES } from '../lib/constants.js';
import { useApp, set, save, refreshStatus, locale, duration, hijri, nowSec, elapsed, toMin, two, pname, signal, isStandalone, useNow } from '../lib/store.js';

const RING = 2 * Math.PI * 104; // Umfang des Fortschrittsrings

export default function Home() {
  const st = useApp();
  useNow(); // Uhr und Countdowns jede Sekunde
  const { ST, S, online, installEvt, local } = st;
  const router = useIonRouter();
  const p = ST && ST.prayer;
  const wx = ST && ST.weather;
  const next = p && p.next ? p.next.key : '';
  const ns = nowSec(st);
  const clock = `${two(Math.floor(ns / 3600))}:${two(Math.floor(ns % 3600 / 60))}`;
  const date = ST && ST.time ? new Date(ST.time.date + 'T12:00:00').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const left = p && p.next ? Math.max(0, p.next.seconds - elapsed(st)) : 0;

  // Anteil der Zeit vom vorigen Gebet bis zum nächsten
  let progress = 0;
  if (p && p.times && p.next) {
    const i = ALL_TIMES.indexOf(p.next.key);
    const nextMin = toMin(p.times[ALL_TIMES[i]]);
    const prevMin = i > 0 ? toMin(p.times[ALL_TIMES[i - 1]]) : toMin(p.times.isha) - 1440;
    let now = ns / 60;
    if (i === 0 && now > nextMin) now -= 1440;
    const span = nextMin - prevMin;
    progress = span > 0 ? Math.max(0, Math.min(1, (now - prevMin) / span)) : 0;
  }
  const nightLeft = ST && ST.night ? ST.night.seconds - elapsed(st) : 0;
  const skyIcon = wx ? ((!wx.day && (wx.sky === 'clear' || wx.sky === 'partly_cloudy')) ? I.moon : (SKY_ICON[wx.sky] || I.cloud)) : I.cloud;
  const wifiOk = ST && online && ST.wifi && ST.wifi.connected;
  const past = k => k !== next && p && toMin(p.times[k]) <= ns / 60 && next !== 'fajr';

  const [bannerOff, setBannerOff] = useState(() => { try { return localStorage.getItem('installBanner') === 'off'; } catch (e) { return false; } });
  const showBanner = !bannerOff && !isStandalone() && (installEvt || /android|iphone|ipad/i.test(navigator.userAgent));
  const closeBanner = () => { setBannerOff(true); try { localStorage.setItem('installBanner', 'off'); } catch (e) { /* privat */ } };
  async function install() {
    if (!installEvt) { router.push('/install'); return; }
    installEvt.prompt();
    await installEvt.userChoice;
    set({ installEvt: null });
  }
  const bell = k => S && save({ azan: { [k]: !S.azan[k] } }, true);

  return (
    <IonPage>
      <Bar title={t('tab_home')} />
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={async e => { await refreshStatus(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>
        <BigTitle title={t('tab_home')} />

        {local && <div className="banner"><IonIcon icon={phonePortraitOutline} className="accent" /><div className="grow"><b>{t('phone_mode')}</b><div className="muted">{t('phone_mode_hint')}</div></div></div>}

        {showBanner && !local && (
          <div className="banner">
            <IonIcon icon={downloadOutline} className="accent" />
            <div className="grow">{t('inst_banner')}</div>
            <IonButton size="small" shape="round" onClick={install}>{installEvt ? t('install') : t('inst_how')}</IonButton>
            <IonButton size="small" fill="clear" color="medium" onClick={closeBanner} aria-label={t('close')}><IonIcon slot="icon-only" icon={close} /></IonButton>
          </div>
        )}

        <div className="home-grid">
          <div className="home-a">
            <section className="hero">
              <div className="hero-top">
                <span className="loc"><Svg html={I.location} />{ST ? ST.location.city : '—'}</span>
                <span className="num ltr hero-clock">{ST && ST.time ? clock : '--:--'}</span>
              </div>
              <div className="verse" lang="ar" dir="rtl">
                ﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا﴾
                <small>{t('verse_ref')}</small>
              </div>
              {p && p.holiday && <div className="holiday"><Svg html={I.moon} />{t('holiday_' + p.holiday)}</div>}
              <div className="ring">
                <svg viewBox="0 0 240 240" aria-hidden="true">
                  <defs><linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f1dfa9" /><stop offset="1" stopColor="#b8913f" /></linearGradient></defs>
                  <circle cx="120" cy="120" r="104" className="ring-bg" />
                  <circle cx="120" cy="120" r="104" className="ring-fg" strokeDasharray={RING} strokeDashoffset={RING * (1 - progress)} />
                </svg>
                <div className="ring-in">
                  {next ? <>
                    <small>{t('next_prayer')}</small>
                    <b className="pn">{pname(next, ST)}</b>
                    <span className="time num ltr">{p.times[next]}</span>
                    <span className="cd">{t('in')} {duration(left)}</span>
                  </> : <small>{online ? '—' : t('offline')}</small>}
                </div>
              </div>
              <div className="hero-date">{date}{p && <> · <span className="hj">{hijri(p.hijri)}</span></>}</div>
            </section>
          </div>

          <div className="home-b">
            <div className="tiles two">
              <div className="tile">
                <Svg html={skyIcon} className="accent" />
                <b className="num ltr">{wx ? wx.temp + '°' : '—'}</b>
                <small>{wx ? t('sky_' + wx.sky) : t('weather_now')}</small>
              </div>
              <button className="tile" onClick={() => router.push(local ? '/settings' : '/settings/wifi')}>
                <Svg html={I.wifi} className={wifiOk ? 'accent' : 'dimmed'} />
                <b>{wifiOk ? t('sig_' + signal(ST.wifi.bars)) : '—'}</b>
                <small>{t(wifiOk ? 'wifi_on' : 'wifi_off')}</small>
              </button>
            </div>

            {ST && ST.night && (
              <section className="night-card">
                <span className="night-ico"><Svg html={I.night} /></span>
                <div className="night-txt">
                  <small>{t('night_page')}</small>
                  <b className="num ltr">{ST.night.lastThird}</b>
                  <span>{nightLeft > 0 ? `${t('night_begins')} ${t('in')} ${duration(nightLeft)}` : t('night_running')}</span>
                </div>
                <span className="night-end">{t('night_until_fajr')}<b className="num ltr">{ST.night.fajr}</b></span>
              </section>
            )}

        <h2 className="section-title">{t('today_times')}</h2>
        <div className="timeline">
          {p ? ALL_TIMES.map(k => (
            <div key={k} className={'trow' + (k === next ? ' next' : '') + (past(k) ? ' past' : '')}>
              <span className="tico"><Svg html={PRAYER_ICON[k]} /></span>
              <span className="tname">{pname(k, ST)}</span>
              <span className="ttime num ltr">{p.times[k] || '--:--'}</span>
              {k !== 'sunrise' && S ? (
                <button className={'bell' + (S.azan[k] ? ' on' : '')} onClick={() => bell(k)} aria-label={t('azan')}>
                  <IonIcon icon={S.azan[k] ? notifications : notificationsOffOutline} />
                </button>
              ) : <span className="bell-space" />}
            </div>
          )) : <div className="empty">—</div>}
        </div>
        <p className="section-hint">{t('bell_hint')}</p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
