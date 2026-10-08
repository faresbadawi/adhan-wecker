<script>
  // Standort: Stadt suchen (Open-Meteo-Geocoding, direkt vom Handy) oder Koordinaten eingeben
  import { Page, BlockTitle, Block, List, ListItem, ListInput, Preloader } from 'framework7-svelte';
  import TopBar from '../components/TopBar.svelte';
  import { t, lang } from '../lib/i18n.js';
  import { I } from '../lib/icons.js';
  import { app, save, toast } from '../lib/store.svelte.js';

  let query = $state('');
  let results = $state(null);
  let f = $state(null);
  $effect(() => {
    if (app.S && !f) f = { city: app.S.city, country: app.S.country, lat: app.S.latitude.toFixed(4), lon: app.S.longitude.toFixed(4) };
  });

  async function search() {
    const q = query.trim(); if (!q) return;
    results = 'loading';
    try {
      const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=6&language=${lang()}&name=` + encodeURIComponent(q))).json();
      results = r.results || [];
    } catch (e) { results = []; toast(t('error'), true); }
  }
  function pick(p) {
    f = { city: p.name, country: p.country_code || p.country || '', lat: p.latitude.toFixed(4), lon: p.longitude.toFixed(4) };
    results = null;
    toast(t('location_picked'));
  }
  function store() {
    const latitude = parseFloat(f.lat), longitude = parseFloat(f.lon);
    if (isNaN(latitude) || isNaN(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) { toast(t('coords_bad'), true); return; }
    save({ city: f.city.trim(), country: f.country.trim(), latitude, longitude });
  }
</script>

<Page>
  <TopBar title={t('nav_location')} back />
  <BlockTitle>{t('city_search')}</BlockTitle>
  <Block>
    <form class="row" onsubmit={e => { e.preventDefault(); search(); }}>
      <input class="field grow" bind:value={query} placeholder={t('city_ph')} dir="auto" />
      <button class="btn" type="submit">{@html I.search}{t('search')}</button>
    </form>
  </Block>
  {#if results === 'loading'}
    <Block class="text-align-center"><Preloader /></Block>
  {:else if results && !results.length}
    <Block class="empty">{t('no_results')}</Block>
  {:else if results}
    <List strong inset dividers mediaList>
      {#each results as p}
        <ListItem link title={p.name} text={[p.admin1, p.country].filter(Boolean).join(', ')} onClick={() => pick(p)} />
      {/each}
    </List>
  {/if}

  {#if f}
    <BlockTitle>{t('nav_location')}</BlockTitle>
    <List strong inset dividers form>
      <ListInput label={t('city')} type="text" value={f.city} onInput={e => (f.city = e.target.value)} />
      <ListInput label={t('country')} type="text" value={f.country} onInput={e => (f.country = e.target.value)} />
      <ListInput label={t('lat')} type="text" inputmode="decimal" value={f.lat} onInput={e => (f.lat = e.target.value)} class="ltr" />
      <ListInput label={t('lon')} type="text" inputmode="decimal" value={f.lon} onInput={e => (f.lon = e.target.value)} class="ltr" />
    </List>
    <Block><button class="btn gold wide" onclick={store}>{t('save')}</button></Block>
  {/if}
</Page>
