<script>
  // Kopfzeile jeder Seite: Titel, optional Zurück, rechts Verbindungsstatus und Zahnrad (Einstellungen)
  import { Navbar, NavRight, Link } from 'framework7-svelte';
  import { t } from '../lib/i18n.js';
  import { I } from '../lib/icons.js';
  import { app } from '../lib/store.svelte.js';

  let { title, back = false, large = false, settings = true } = $props();
</script>

<Navbar {title} backLink={back ? t('back') : false} {large} transparent={large}>
  <NavRight>
    <Link href="/settings/device/" iconOnly class="nav-status" aria-label={t(app.online ? 'device_online' : 'device_offline')}>
      <span class="dot" class:ok={app.online}></span>
    </Link>
    {#if settings}
      <Link href="/settings/" iconOnly aria-label={t('nav_settings')}><i class="icon">{@html I.settings}</i></Link>
    {/if}
  </NavRight>
</Navbar>
