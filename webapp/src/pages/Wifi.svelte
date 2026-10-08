<script>
  // WLAN: Status, Netze suchen und verbinden, neu einrichten (Einrichtungsportal der Uhr)
  import { Page, BlockTitle, Block, BlockFooter, List, ListItem, Preloader } from 'framework7-svelte';
  import TopBar from '../components/TopBar.svelte';
  import { t } from '../lib/i18n.js';
  import { I } from '../lib/icons.js';
  import { app, api, toast, confirmBox, signal } from '../lib/store.svelte.js';

  const w = $derived(app.ST && app.ST.wifi);
  const ok = $derived(app.online && w && w.connected);
  let nets = $state(null);
  let open = $state(-1);
  let pass = $state('');

  async function scan() {
    nets = 'loading'; open = -1;
    try { const r = await api('/api/wifi/scan'); nets = r.data || []; }
    catch (e) { nets = []; toast(t('offline'), true); }
  }
  async function connect(n) {
    try { await api('/api/wifi/connect', { ssid: n.ssid, password: n.secure ? pass : '' }); toast(t('connecting')); }
    catch (e) { toast(t('offline'), true); }
  }
  async function forget() {
    if (!await confirmBox(t('are_you_sure'), t('wifi_forget_hint'), true)) return;
    try { await api('/api/wifi/forget', {}); toast(t('restarting')); } catch (e) { toast(t('offline'), true); }
  }
</script>

<Page>
  <TopBar title={t('nav_wifi')} back />
  <BlockTitle>{t('wifi_status')}</BlockTitle>
  <List strong inset dividers>
    <ListItem title={t('nav_wifi')}>
      {#snippet after()}<span class="state"><span class="dot" class:ok></span>{t(ok ? 'wifi_on' : 'wifi_off')}{#if ok}<span class="sig {signal(w.bars)}">{t('sig_' + signal(w.bars))}</span>{/if}</span>{/snippet}
    </ListItem>
    {#if ok}<ListItem title={t('network')} after={w.ssid} />{/if}
  </List>

  <BlockTitle>{t('networks')}</BlockTitle>
  {#if nets === 'loading'}
    <Block class="text-align-center"><Preloader /></Block>
  {:else if nets && !nets.length}
    <Block class="empty">{t('no_results')}</Block>
  {:else if nets}
    <List strong inset dividers>
      {#each nets as n, i}
        <ListItem title={n.ssid} onClick={() => { open = open === i ? -1 : i; pass = ''; }} class="clickable">
          {#snippet media()}<span class="sig {signal(n.bars)}">{t('sig_' + signal(n.bars))}</span>{/snippet}
          {#snippet after()}{#if n.secure}<i class="icon dim">{@html I.lock}</i>{/if}{/snippet}
        </ListItem>
        {#if open === i}
          <ListItem>
            {#snippet inner()}
              <form class="row" onsubmit={e => { e.preventDefault(); connect(n); }}>
                {#if n.secure}<input class="field grow ltr" type="password" bind:value={pass} placeholder={t('password')} autocomplete="current-password" />{:else}<span class="grow"></span>{/if}
                <button class="btn gold" type="submit">{t('connect')}</button>
              </form>
            {/snippet}
          </ListItem>
        {/if}
      {/each}
    </List>
  {/if}
  <Block><button class="btn wide" onclick={scan}>{@html I.refresh}{t('scan')}</button></Block>

  <BlockTitle>{t('wifi_forget')}</BlockTitle>
  <Block><button class="btn danger wide" onclick={forget}>{t('wifi_forget')}</button></Block>
  <BlockFooter>{t('wifi_forget_hint')}</BlockFooter>
</Page>
