<script>
  // Übersicht der Einstellungen: gruppiert, mit aktuellem Wert; Antippen öffnet die Unterseite
  import { Page, BlockTitle, List, ListItem } from 'framework7-svelte';
  import TopBar from '../components/TopBar.svelte';
  import { t, lang, LANGS } from '../lib/i18n.js';
  import { I } from '../lib/icons.js';
  import { app, signal } from '../lib/store.svelte.js';

  const wifiOk = $derived(app.online && app.ST && app.ST.wifi && app.ST.wifi.connected);
</script>

<Page>
  <TopBar title={t('nav_settings')} back settings={false} />
  <BlockTitle>{t('grp_prayer')}</BlockTitle>
  <List strong inset dividers>
    <ListItem link="/settings/location/" title={t('nav_location')} after={app.S ? app.S.city : ''}>
      {#snippet media()}<span class="ico">{@html I.location}</span>{/snippet}
    </ListItem>
  </List>
  <BlockTitle>{t('grp_clock')}</BlockTitle>
  <List strong inset dividers>
    <ListItem link="/settings/display/" title={t('nav_display')}>
      {#snippet media()}<span class="ico">{@html I.display}</span>{/snippet}
    </ListItem>
    <ListItem link="/settings/lang/" title={t('nav_lang')} after={LANGS[lang()]}>
      {#snippet media()}<span class="ico">{@html I.lang}</span>{/snippet}
    </ListItem>
  </List>
  <BlockTitle>{t('grp_conn')}</BlockTitle>
  <List strong inset dividers>
    <ListItem link="/settings/wifi/" title={t('nav_wifi')} after={wifiOk ? t('sig_' + signal(app.ST.wifi.bars)) : t('wifi_off')}>
      {#snippet media()}<span class="ico">{@html I.wifi}</span>{/snippet}
    </ListItem>
    <ListItem link="/settings/device/" title={t('nav_device')} after={app.ST ? app.ST.device.firmware : ''}>
      {#snippet media()}<span class="ico">{@html I.device}</span>{/snippet}
    </ListItem>
  </List>
</Page>
