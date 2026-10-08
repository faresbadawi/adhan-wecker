<script>
  // Gebetszeiten: Quelle (Berechnung oder Mawaqit-Moschee), Methode, Madhhab und Korrekturen je Gebet
  import { Page, BlockTitle, Block, BlockFooter, List, ListItem, Segmented, Button, Stepper, Preloader } from 'framework7-svelte';
  import TopBar from '../components/TopBar.svelte';
  import { t, lang } from '../lib/i18n.js';
  import { I } from '../lib/icons.js';
  import { METHODS, PRAYERS } from '../lib/constants.js';
  import { app, api, save, saveLater } from '../lib/store.svelte.js';

  const S = $derived(app.S);
  let source = $state(null);
  const src = $derived(source || (S ? S.source : 'calculated'));
  let query = $state('');
  let results = $state(null); // null = nichts gesucht, 'loading', [] oder Liste
  let offsets = $state(null);
  $effect(() => { if (S && !offsets) offsets = Object.assign({}, S.offsets); });

  function pick(v) {
    source = v;
    if (v === 'calculated' || (S && S.mawaqit.slug)) save({ source: v });
  }
  async function choose(slug, name) {
    results = null;
    await save({ source: 'mawaqit', mawaqit: { slug, name } });
  }
  async function search(q) {
    const link = q.match(/mawaqit\.net\/(?:[a-z]{2}\/)?([^/?#\s]+)/i);
    if (link) { choose(link[1], link[1]); return; }
    results = 'loading';
    try {
      const r = await api('/api/mawaqit/search?q=' + encodeURIComponent(q));
      results = r.ok && r.data ? r.data : [];
    } catch (e) { results = []; }
  }
  function step(k, v) {
    offsets[k] = v;
    saveLater({ offsets: Object.assign({}, offsets) });
  }
</script>

<Page>
  <TopBar title={t('nav_prayer')} />
  {#if !S}
    <Block class="text-align-center"><Preloader /></Block>
  {:else}
    <BlockTitle>{t('source')}</BlockTitle>
    <Block>
      <Segmented strong>
        <Button active={src === 'calculated'} onclick={() => pick('calculated')}>{t('source_calc')}</Button>
        <Button active={src === 'mawaqit'} onclick={() => pick('mawaqit')}>{t('source_mawaqit')}</Button>
      </Segmented>
    </Block>

    {#if src === 'mawaqit'}
      <List strong inset dividers>
        <ListItem title={S.mawaqit.slug ? S.mawaqit.name || S.mawaqit.slug : t('mosque_none')} header={S.mawaqit.slug ? t('mosque_chosen') : ''}>
          {#snippet media()}<i class="icon accent">{@html S.mawaqit.slug ? I.check : I.prayer}</i>{/snippet}
        </ListItem>
      </List>
      <BlockTitle>{t('mosque_search')}</BlockTitle>
      <Block>
        <form class="row" onsubmit={e => { e.preventDefault(); if (query.trim()) search(query.trim()); }}>
          <input class="field grow" bind:value={query} placeholder={t('mosque_ph')} dir="auto" />
          <button class="btn" type="submit">{@html I.search}{t('search')}</button>
        </form>
        <button class="btn mt" onclick={() => search('')}>{@html I.location}{t('mosques_near')}</button>
      </Block>
      {#if results === 'loading'}
        <Block class="text-align-center"><Preloader /></Block>
      {:else if results && !results.length}
        <Block class="empty">{t('no_results')}</Block>
      {:else if results}
        <List strong inset dividers mediaList>
          {#each results as m}
            <ListItem link title={m.name} text={m.address} after={m.distance ? (m.distance / 1000).toFixed(1) + ' ' + t('km') : ''}
              onClick={() => choose(m.slug, m.name)} />
          {/each}
        </List>
      {/if}
    {:else}
      <List strong inset dividers>
        <ListItem title={t('method')}>
          {#snippet after()}
            <select class="pick" value={S.method} onchange={e => save({ method: Number(e.currentTarget.value) })}>
              {#each METHODS as [id, ar, en]}<option value={id}>{lang() === 'ar' ? ar : en}</option>{/each}
            </select>
          {/snippet}
        </ListItem>
        <ListItem title={t('madhhab')}>
          {#snippet after()}
            <select class="pick" value={S.madhhab} onchange={e => save({ madhhab: Number(e.currentTarget.value) })}>
              {#each [0, 1] as v}<option value={v}>{t('madhhab_' + v)}</option>{/each}
            </select>
          {/snippet}
        </ListItem>
      </List>
    {/if}

    <BlockTitle>{t('offsets')}</BlockTitle>
    <List strong inset dividers>
      {#each PRAYERS as k}
        <ListItem title={t(k)}>
          {#snippet after()}
            {#if offsets}
              <Stepper small round fill value={offsets[k] || 0} min={-30} max={30}
                formatValue={v => (v > 0 ? '+' : '') + v} onStepperChange={v => step(k, v)} />
            {/if}
          {/snippet}
        </ListItem>
      {/each}
    </List>
    <BlockFooter>{t('offsets_hint')}</BlockFooter>
  {/if}
</Page>
