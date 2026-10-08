<script>
  // Gebetszeiten: Ort (für Berechnung und Wetter), Quelle (Berechnung oder Mawaqit-Moschee),
  // Methode, Madhhab und Korrekturen je Gebet
  import { Page, BlockTitle, Block, BlockFooter, List, ListItem, Segmented, Button, Stepper, Preloader } from 'framework7-svelte';
  import TopBar from '../components/TopBar.svelte';
  import { t, lang } from '../lib/i18n.js';
  import { I } from '../lib/icons.js';
  import { METHODS, PRAYERS } from '../lib/constants.js';
  import { app, save, saveLater, toast } from '../lib/store.svelte.js';

  const S = $derived(app.S);
  let source = $state(null);
  const src = $derived(source || (S ? S.source : 'calculated'));
  let offsets = $state(null);
  $effect(() => { if (S && !offsets) offsets = Object.assign({}, S.offsets); });

  // ---------- Ort: Stadt eintippen, Treffer antippen; gilt sofort und schaltet auf Berechnung
  let place = $state('');
  let places = $state(null); // null = nichts gesucht, 'loading', [] oder Liste
  async function searchPlace() {
    const q = place.trim(); if (!q) return;
    places = 'loading';
    try {
      const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=6&language=${lang()}&name=` + encodeURIComponent(q))).json();
      places = r.results || [];
    } catch (e) { places = []; toast(t('error'), true); }
  }
  async function pickPlace(p) {
    places = null; place = '';
    source = 'calculated';
    const ok = await save({
      city: p.name, country: p.country_code || '', latitude: Number(p.latitude.toFixed(4)), longitude: Number(p.longitude.toFixed(4)),
      source: 'calculated',
    }, true);
    if (ok) toast(t('place_saved'));
  }

  // ---------- Quelle
  function pick(v) {
    source = v;
    if (v === 'calculated' || (S && S.mawaqit.slug)) save({ source: v });
  }
  // Mawaqit sperrt seine Suche; die Moschee wird über ihren Link gewählt
  let link = $state('');
  function useLink() {
    const m = link.trim().match(/mawaqit\.net\/(?:[a-z]{2}\/)?([a-z0-9][a-z0-9._-]*)/i);
    if (!m) { toast(t('mosque_link_bad'), true); return; }
    link = '';
    save({ source: 'mawaqit', mawaqit: { slug: m[1].toLowerCase(), name: m[1] } });
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
    <BlockTitle>{t('place_title')}</BlockTitle>
    <List strong inset dividers>
      <ListItem title={S.city || '—'} after={S.country}>
        {#snippet media()}<span class="ico">{@html I.location}</span>{/snippet}
      </ListItem>
    </List>
    <Block class="tight">
      <form class="row" onsubmit={e => { e.preventDefault(); searchPlace(); }}>
        <input class="field grow" bind:value={place} placeholder={t('place_ph')} dir="auto" enterkeyhint="search" />
        <button class="btn" type="submit" aria-label={t('search')}>{@html I.search}</button>
      </form>
    </Block>
    {#if places === 'loading'}
      <Block class="text-align-center"><Preloader /></Block>
    {:else if places && !places.length}
      <Block class="empty">{t('no_results')}</Block>
    {:else if places}
      <List strong inset dividers mediaList>
        {#each places as p}
          <ListItem link title={p.name} text={[p.admin1, p.country].filter(Boolean).join(lang() === 'ar' ? '، ' : ', ')} onClick={() => pickPlace(p)} />
        {/each}
      </List>
    {/if}
    <BlockFooter>{t('place_hint')}</BlockFooter>

    <BlockTitle>{t('source')}</BlockTitle>
    <Block class="tight">
      <Segmented strong>
        <Button active={src === 'calculated'} onclick={() => pick('calculated')}>{t('source_calc')}</Button>
        <Button active={src === 'mawaqit'} onclick={() => pick('mawaqit')}>{t('source_mawaqit')}</Button>
      </Segmented>
    </Block>

    {#if src === 'mawaqit'}
      <List strong inset dividers>
        <ListItem title={S.mawaqit.slug ? S.mawaqit.name || S.mawaqit.slug : t('mosque_none')} header={S.mawaqit.slug ? t('mosque_chosen') : ''}>
          {#snippet media()}<span class="ico">{@html S.mawaqit.slug ? I.check : I.prayer}</span>{/snippet}
        </ListItem>
      </List>
      <BlockFooter>{t('mawaqit_hint')}</BlockFooter>
      <BlockTitle>{t('mosque_link')}</BlockTitle>
      <Block class="tight">
        <form class="row" onsubmit={e => { e.preventDefault(); useLink(); }}>
          <input class="field grow ltr" type="url" bind:value={link} placeholder="https://mawaqit.net/…" />
          <button class="btn gold" type="submit">{t('save')}</button>
        </form>
        <a class="btn mt external" href="https://mawaqit.net/" target="_blank" rel="noopener">{@html I.search}{t('mosque_open')}</a>
      </Block>
      <BlockFooter>{t('mosque_link_hint')}</BlockFooter>
    {:else}
      <List strong inset dividers class="picks">
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
