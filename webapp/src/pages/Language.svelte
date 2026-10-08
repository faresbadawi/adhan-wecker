<script>
  // Sprache für App und Display; die Uhr startet dafür neu, die App lädt mit neuer Leserichtung
  import { Page, BlockFooter, List, ListItem } from 'framework7-svelte';
  import TopBar from '../components/TopBar.svelte';
  import { t, lang, LANGS } from '../lib/i18n.js';
  import { I } from '../lib/icons.js';
  import { api, toast } from '../lib/store.svelte.js';

  async function choose(l) {
    if (l === lang()) return;
    try {
      const r = await api('/api/device/lang', { lang: l });
      if (!r.ok) throw new Error();
      try { localStorage.setItem('lang', l); } catch (e) { /* privat */ }
      toast(t('lang_restart'));
      setTimeout(() => location.reload(), 900);
    } catch (e) { toast(t('offline'), true); }
  }
</script>

<Page>
  <TopBar title={t('nav_lang')} back />
  <List strong inset dividers class="langs-list">
    {#each Object.entries(LANGS) as [k, n]}
      <ListItem title={n} onClick={() => choose(k)} class="clickable" lang={k}>
        {#snippet media()}<i class="icon accent">{@html k === lang() ? I.check : ''}</i>{/snippet}
      </ListItem>
    {/each}
  </List>
  <BlockFooter>{t('language_hint')}</BlockFooter>
</Page>
