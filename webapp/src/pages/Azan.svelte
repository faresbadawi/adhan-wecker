<script>
  // Azan-Benachrichtigung: Muezzin, Azan je Gebet mit Lautstärke und Probehören, Test mit Anzeige auf der Uhr
  import { Page, BlockTitle, Block, BlockFooter, List, ListItem, Toggle, Range, Preloader } from 'framework7-svelte';
  import TopBar from '../components/TopBar.svelte';
  import { t } from '../lib/i18n.js';
  import { I, PRAYER_ICON } from '../lib/icons.js';
  import { PRAYERS } from '../lib/constants.js';
  import { app, api, save, toast } from '../lib/store.svelte.js';

  const S = $derived(app.S);
  let voices = $state(null);
  $effect(() => {
    if (voices === null) {
      voices = { list: [], selected: '' };
      api('/api/azan/voices').then(r => { if (r.data) voices = { list: r.data.list.slice().sort(), selected: r.data.selected }; }).catch(() => {});
    }
  });
  const voiceName = id => (t('voice_' + id) === 'voice_' + id ? id : t('voice_' + id));
  async function chooseVoice(id) {
    if (id === voices.selected) return;
    try {
      const r = await api('/api/azan/voice', { id });
      if (r.ok) { voices = { list: r.data.list.slice().sort(), selected: r.data.selected }; toast(t('saved')); } else toast(t('error'), true);
    } catch (e) { toast(t('offline'), true); }
  }
  async function play(url, body) {
    try { const r = await api(url, body); toast(r.ok ? t('azan_playing') : t('error'), !r.ok); }
    catch (e) { toast(t('offline'), true); }
  }
  const stop = () => api('/api/azan/stop', {}).catch(() => toast(t('offline'), true));
</script>

<Page>
  <TopBar title={t('title_audio')} />
  {#if !S}
    <Block class="text-align-center"><Preloader /></Block>
  {:else}
    <BlockTitle>{t('azan_voice')}</BlockTitle>
    <List strong inset dividers>
      {#each (voices && voices.list) || [] as id}
        <ListItem title={voiceName(id)} onClick={() => chooseVoice(id)} class="clickable">
          {#snippet media()}<i class="icon accent">{@html id === voices.selected ? I.check : ''}</i>{/snippet}
          {#snippet after()}<button class="round" aria-label={t('listen')} onclick={e => { e.stopPropagation(); play('/api/azan/preview', { id }); }}>{@html I.play}</button>{/snippet}
        </ListItem>
      {/each}
    </List>
    <BlockFooter>{t('azan_voice_hint')}</BlockFooter>

    <BlockTitle>{t('azan')}</BlockTitle>
    <List strong inset dividers>
      {#each PRAYERS as k}
        <ListItem class={S.azan[k] ? '' : 'off'}>
          {#snippet inner()}
            <div class="pvol">
              <div class="prow2">
                <i class="icon accent">{@html PRAYER_ICON[k]}</i>
                <span class="grow">{t(k)}</span>
                <Toggle checked={S.azan[k]} onToggleChange={v => save({ azan: { [k]: v } })} />
              </div>
              <div class="vol">
                <i class="icon">{@html I.audio}</i>
                <Range min={0} max={100} value={S.azanVolume[k]} label onRangeChanged={v => save({ azanVolume: { [k]: v } }, true)} />
                <button class="round" aria-label={t('listen')} onclick={() => play('/api/azan/preview', { prayer: k })}>{@html I.play}</button>
              </div>
            </div>
          {/snippet}
        </ListItem>
      {/each}
    </List>
    <BlockFooter>{t('azan_volume_hint')}</BlockFooter>

    <BlockTitle>{t('azan_test_display')}</BlockTitle>
    <Block>
      <div class="btnrow">
        <button class="btn" onclick={() => play('/api/azan/test', { prayer: 'dhuhr' })}>{@html I.play}{t('azan_test_normal')}</button>
        <button class="btn" onclick={() => play('/api/azan/test', { prayer: 'fajr' })}>{@html I.play}{t('azan_test_fajr')}</button>
        <button class="btn danger" onclick={stop}>{@html I.stop}{t('stop')}</button>
      </div>
    </Block>
    <BlockFooter>{t('azan_test_hint')}</BlockFooter>
  {/if}
</Page>
