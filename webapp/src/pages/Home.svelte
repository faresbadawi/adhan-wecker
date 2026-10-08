<script>
  // Start: nächstes Gebet mit Countdown, Wetter, WLAN, letztes Drittel der Nacht und die Zeiten von heute.
  // Zum Aktualisieren nach unten ziehen.
  import { Page, BlockTitle, Link } from 'framework7-svelte';
  import TopBar from '../components/TopBar.svelte';
  import { t } from '../lib/i18n.js';
  import { I, SKY_ICON, PRAYER_ICON } from '../lib/icons.js';
  import { ALL_TIMES } from '../lib/constants.js';
  import { app, refreshStatus, locale, duration, hijri, nowSec, elapsed, toMin, two, pname, signal, isStandalone } from '../lib/store.svelte.js';

  const ST = $derived(app.ST);
  const p = $derived(ST && ST.prayer);
  const wx = $derived(ST && ST.weather);
  const next = $derived(p && p.next ? p.next.key : '');
  const date = $derived(ST && ST.time ? new Date(ST.time.date + 'T12:00:00').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }) : '');
  const clock = $derived.by(() => { const s = nowSec(); return `${two(Math.floor(s / 3600))}:${two(Math.floor(s % 3600 / 60))}`; });
  const countdown = $derived(p && p.next ? duration(Math.max(0, p.next.seconds - elapsed())) : '');

  // Balken: Anteil der Zeit vom vorigen Gebet bis zum nächsten
  const progress = $derived.by(() => {
    if (!p || !p.times || !p.next) return 0;
    const i = ALL_TIMES.indexOf(p.next.key);
    const nextMin = toMin(p.times[ALL_TIMES[i]]);
    const prevMin = i > 0 ? toMin(p.times[ALL_TIMES[i - 1]]) : toMin(p.times.isha) - 1440;
    let now = nowSec() / 60;
    if (i === 0 && now > nextMin) now -= 1440;
    const span = nextMin - prevMin;
    return span > 0 ? Math.max(0, Math.min(100, (now - prevMin) / span * 100)) : 0;
  });
  const nightLeft = $derived(ST && ST.night ? ST.night.seconds - elapsed() : 0);
  const skyIcon = $derived(wx ? ((!wx.day && (wx.sky === 'clear' || wx.sky === 'partly_cloudy')) ? I.moon : (SKY_ICON[wx.sky] || I.cloud)) : I.cloud);
  const wifiOk = $derived(ST && app.online && ST.wifi && ST.wifi.connected);

  let bannerOff = $state(false);
  try { bannerOff = localStorage.getItem('installBanner') === 'off'; } catch (e) { /* privat */ }
  const showBanner = $derived(!bannerOff && !isStandalone() && (app.installEvt || /android/i.test(navigator.userAgent)));
  function closeBanner() { bannerOff = true; try { localStorage.setItem('installBanner', 'off'); } catch (e) { /* privat */ } }
  async function install() {
    if (!app.installEvt) return;
    app.installEvt.prompt();
    await app.installEvt.userChoice;
    app.installEvt = null;
  }

  async function onRefresh(...args) {
    const done = args.find(a => typeof a === 'function');
    await refreshStatus();
    if (done) done();
  }
  const past = k => k !== next && p && toMin(p.times[k]) <= nowSec() / 60 && next !== 'fajr';
</script>

<Page ptr onPtrRefresh={onRefresh}>
  <TopBar title={t('app')} />

  {#if showBanner}
    <div class="banner">
      <i class="icon">{@html I.download}</i>
      <div class="t">{t('install_banner')}</div>
      {#if app.installEvt}
        <button class="btn gold" onclick={install}>{t('install')}</button>
      {:else}
        <Link href="/settings/device/" class="btn gold">{t('install_how')}</Link>
      {/if}
      <button class="round" aria-label={t('close')} onclick={closeBanner}>{@html I.stop}</button>
    </div>
  {/if}

  <section class="hero">
    <div class="hero-top">
      <span class="loc"><i class="icon">{@html I.location}</i><span dir="auto">{ST ? ST.location.city : '—'}</span></span>
      <span class="clock num ltr">{ST && ST.time ? clock : '--:--'}</span>
    </div>
    <div class="bism" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
    {#if p && p.holiday}
      <div class="holiday"><i class="icon">{@html I.moon}</i><span>{t('holiday_' + p.holiday)}</span></div>
    {/if}
    {#if next}
      <div class="hero-label">{t('next_prayer')}</div>
      <div class="hero-name">{pname(next)}</div>
      <div class="hero-time num ltr">{p.times[next]}</div>
      <div class="hero-cd">{t('in')} <span class="num">{countdown}</span></div>
      <div class="progress"><i style:width={progress + '%'}></i></div>
    {:else}
      <div class="hero-label">{app.online ? '—' : t('offline')}</div>
    {/if}
    <div class="hero-date">{date}{#if p} · <span class="hj">{hijri(p.hijri)}</span>{/if}</div>
  </section>

  <div class="chips">
    <div class="chip-card">
      <i class="icon">{@html skyIcon}</i>
      <div><b class="num ltr">{wx ? wx.temp + '°' : '—'}</b><small>{wx ? t('sky_' + wx.sky) : t('weather_now')}</small></div>
    </div>
    <a class="chip-card" href="/settings/wifi/">
      <i class="icon">{@html I.wifi}</i>
      <div><b>{wifiOk ? t('sig_' + signal(ST.wifi.bars)) : '—'}</b><small>{t(wifiOk ? 'wifi_on' : 'wifi_off')}</small></div>
    </a>
  </div>

  {#if ST && ST.night}
    <BlockTitle>{t('night_page')}</BlockTitle>
    <div class="card-box night">
      <div class="nmain"><small>{t('night_start')}</small><b class="num ltr">{ST.night.lastThird}</b></div>
      <div class="nside">
        <div><small>{t('fajr')}</small><b class="num ltr">{ST.night.fajr}</b></div>
        <div><small>{t('sunrise')}</small><b class="num ltr">{ST.night.sunrise}</b></div>
      </div>
      <div class="ncd" class:run={nightLeft <= 0}>{nightLeft > 0 ? `${t('night_in')} ${duration(nightLeft)}` : t('night_running')}</div>
    </div>
  {/if}

  <BlockTitle>{t('today_times')}</BlockTitle>
  <div class="card-box plist">
    {#if p}
      {#each ALL_TIMES as k}
        <div class="prow" class:next={k === next} class:past={past(k)}>
          <span class="pi">{@html PRAYER_ICON[k]}</span>
          <span class="pn">{pname(k)}</span>
          <span class="pt num ltr">{p.times[k] || '--:--'}</span>
        </div>
      {/each}
    {:else}
      <div class="empty">—</div>
    {/if}
  </div>
</Page>
