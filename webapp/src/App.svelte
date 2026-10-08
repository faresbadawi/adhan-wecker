<script>
  // App-Gerüst: vier Tabs unten (jeder mit eigenem Seitenverlauf und Zurück-Wischen),
  // die Einstellungen öffnet das Zahnrad oben rechts auf jeder Seite.
  import { onMount } from 'svelte';
  import { App, Views, View, Toolbar, Link } from 'framework7-svelte';
  import { t, lang } from './lib/i18n.js';
  import { I } from './lib/icons.js';
  import { app, refreshStatus, loadSettings, applyTheme, isStandalone, appMode } from './lib/store.svelte.js';
  import routes from './routes.js';

  let accent = '#e9a27c';
  try { accent = JSON.parse(localStorage.getItem('colors') || 'null')?.accent || accent; } catch (e) { /* privat */ }

  const params = {
    name: 'Smart Azan Wecker',
    theme: 'auto',      // iPhone/iPad: iOS-Darstellung, Android: Material
    darkMode: true,
    colors: { primary: accent },
    routes,
    view: { iosSwipeBack: true, mdSwipeBack: true, browserHistory: false },
    toast: { closeTimeout: 2200 },
    touch: { tapHold: true },
  };

  const tabs = [
    { id: 'home', url: '/', icon: I.dashboard, label: 'tab_home' },
    { id: 'prayer', url: '/prayer/', icon: I.prayer, label: 'nav_prayer' },
    { id: 'alarm', url: '/alarm/', icon: I.alarm, label: 'nav_alarm' },
    { id: 'azan', url: '/azan/', icon: I.audio, label: 'nav_audio' },
  ];

  // Vollbild nur in der gespeicherten Android-Verknüpfung (?app=1), nie im normalen Browser-Tab
  function enterFullscreen() {
    const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!appMode() || isStandalone() || document.fullscreenElement || document.webkitFullscreenElement || !req) return;
    try { const r = req.call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } catch (e) { /* nicht erlaubt */ }
  }

  onMount(() => {
    try {
      const cached = localStorage.getItem('status');
      if (cached) app.ST = JSON.parse(cached);
      applyTheme(JSON.parse(localStorage.getItem('colors') || 'null'));
    } catch (e) { /* privat */ }

    (async () => {
      await refreshStatus();
      // Sprache der Uhr übernehmen (gilt für App und Display); neue Leserichtung braucht einen Neustart der Seite
      if (app.ST && app.ST.lang && app.online && app.ST.lang !== lang()) {
        try { localStorage.setItem('lang', app.ST.lang); } catch (e) { /* privat */ }
        location.reload();
        return;
      }
      await loadSettings();
    })();

    app.now = Date.now();
    const tick = setInterval(() => (app.now = Date.now()), 1000);
    const poll = setInterval(() => { if (!document.hidden) refreshStatus(); }, 20000);
    const vis = () => { if (!document.hidden) refreshStatus(); };
    document.addEventListener('visibilitychange', vis);
    const bip = e => { e.preventDefault(); app.installEvt = e; };
    window.addEventListener('beforeinstallprompt', bip);
    window.addEventListener('appinstalled', () => (app.installEvt = null));
    document.addEventListener('pointerup', enterFullscreen, { capture: true });
    return () => { clearInterval(tick); clearInterval(poll); document.removeEventListener('visibilitychange', vis); window.removeEventListener('beforeinstallprompt', bip); };
  });
</script>

<App {...params}>
  <Views tabs class="safe-areas">
    <Toolbar tabbar icons bottom>
      {#each tabs as tab, i}
        <Link tabLink={'#view-' + tab.id} tabLinkActive={i === 0}>
          <i class="icon">{@html tab.icon}</i>
          <span class="tabbar-label">{t(tab.label)}</span>
        </Link>
      {/each}
    </Toolbar>
    {#each tabs as tab, i}
      <View id={'view-' + tab.id} main={i === 0} tab tabActive={i === 0} url={tab.url} />
    {/each}
  </Views>
</App>
