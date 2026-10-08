<script>
  // Anzeige: Reihenfolge der Seiten (ziehen), Hintergrund mit eigenem Bild, Farben, Helligkeit, RGB-LED
  import { Page, BlockTitle, Block, BlockFooter, List, ListItem, Toggle, Range, Preloader } from 'framework7-svelte';
  import TopBar from '../components/TopBar.svelte';
  import ColorSheet from '../components/ColorSheet.svelte';
  import { t } from '../lib/i18n.js';
  import { I, PAGE_ICON } from '../lib/icons.js';
  import { PRESETS, LED_PRESETS, THEME_SWATCHES } from '../lib/constants.js';
  import { hex2hsl, hsl2hex } from '../lib/color.js';
  import { cropImage } from '../lib/crop.js';
  import { app, api, save, toast, confirmBox, applyTheme } from '../lib/store.svelte.js';

  const S = $derived(app.S);
  const same = (a, b) => (a || '').toUpperCase() === (b || '').toUpperCase();

  // ---------- Seiten: Reihenfolge per Ziehen, jede Seite ein-/ausblendbar; Einstellungen bleiben am Ende
  let pages = $state([]);
  $effect(() => { if (S) pages = S.pages.map(p => ({ ...p })); });
  function sorted({ from, to }) {
    const list = pages.slice();
    const [p] = list.splice(from, 1);
    list.splice(to, 0, p);
    pages = list;
    save({ pages: list });
  }
  function toggle(i, on) { pages[i].on = on; save({ pages: pages.map(p => ({ ...p })) }); }

  // ---------- Hintergründe; das eigene Bild ("custom") steht vorne, "+" lädt ein neues hoch (ersetzt das alte)
  let bgs = $state(null);
  let bgVer = $state(Date.now());
  let fileEl = $state();
  const setBgs = names => { bgs = names.slice().sort((a, b) => (a === 'custom' ? -1 : b === 'custom' ? 1 : 0)); bgVer = Date.now(); };
  $effect(() => {
    if (bgs === null) { bgs = 'loading'; api('/api/backgrounds').then(r => setBgs(r.data || [])).catch(() => (bgs = 'offline')); }
  });
  async function delBg() {
    if (!await confirmBox(t('bg_delete_q'), '', true)) return;
    const r = await api('/api/background/delete', {});
    if (r.ok) { if (S.background === 'custom') app.S.background = 'noir'; setBgs(r.data || []); toast(t('saved')); }
  }
  async function upload(e) {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    const out = await cropImage(f, S.colors, t, () => toast(t('error'), true));
    if (!out) return;
    toast(t('bg_uploading'));
    try {
      const fd = new FormData();
      fd.append('bin', out.bin, 'custom.bin');
      fd.append('jpg', out.jpg, 'custom.jpg');
      const r = await fetch('/api/background/upload', { method: 'POST', body: fd });
      if (!r.ok) throw new Error();
      setBgs(await r.json());
      await save({ background: 'custom' });
    } catch (err) { toast(t('error'), true); }
  }

  // ---------- Farben
  let colorReq = $state(null);
  function editColor(role) {
    const base = { ...S.colors };
    colorReq = {
      title: t('col_' + role), value: base[role], swatches: THEME_SWATCHES[role],
      live: hex => applyTheme({ ...base, [role]: hex }),
      done: v => { if (v && !same(v, base[role])) save({ colors: { ...base, [role]: v } }); else applyTheme(S.colors); },
    };
  }

  // ---------- RGB-LED: jede Änderung geht sofort an die Uhr; Farbe und Helligkeit merkt sich das Handy
  let led = $state((() => {
    try { return Object.assign({ color: '#FF0000', bri: 100, on: true }, JSON.parse(localStorage.getItem('led') || '{}')); }
    catch (e) { return { color: '#FF0000', bri: 100, on: true }; }
  })());
  let ledBusy = false, ledNext = false;
  async function ledSend() {
    try { localStorage.setItem('led', JSON.stringify(led)); } catch (e) { /* privat */ }
    if (ledBusy) { ledNext = true; return; }
    ledBusy = true;
    const n = parseInt(led.color.slice(1), 16), k = led.on ? led.bri / 100 : 0;
    try { await api('/api/led', { r: Math.round((n >> 16 & 255) * k), g: Math.round((n >> 8 & 255) * k), b: Math.round((n & 255) * k) }); }
    catch (e) { toast(t('offline'), true); }
    ledBusy = false;
    if (ledNext) { ledNext = false; ledSend(); }
  }
  const ledSet = part => { Object.assign(led, part); ledSend(); };
</script>

<Page>
  <TopBar title={t('nav_display')} back />
  {#if !S}
    <Block class="text-align-center"><Preloader /></Block>
  {:else}
    <BlockTitle>{t('pages')}</BlockTitle>
    <List strong inset dividers sortable sortableEnabled sortableMoveElements={false} onSortableSort={sorted} class="pages-list">
      {#each pages as p, i (p.id)}
        <ListItem title={t('page_' + p.id)} class={p.on ? '' : 'off'}>
          {#snippet media()}<span class="idx">{i + 1}</span><span class="ico">{@html PAGE_ICON[p.id] || ''}</span>{/snippet}
          {#snippet after()}<Toggle checked={p.on} onToggleChange={v => toggle(i, v)} />{/snippet}
        </ListItem>
      {/each}
    </List>
    <List strong inset class="pages-fixed">
      <ListItem title={t('page_settings')} class="off">
        {#snippet media()}<span class="idx">{pages.length + 1}</span><span class="ico">{@html I.lock}</span>{/snippet}
      </ListItem>
    </List>
    <BlockFooter>{t('pages_hint')}</BlockFooter>

    <BlockTitle>{t('background')}</BlockTitle>
    <Block>
      {#if bgs === 'loading' || bgs === null}
        <div class="text-align-center"><Preloader /></div>
      {:else if bgs === 'offline'}
        <div class="empty">{t('offline')}</div>
      {:else}
        <div class="bgs">
          <button class="bgadd" onclick={() => fileEl.click()}>{@html I.plus}<span>{t(bgs.includes('custom') ? 'bg_replace' : 'bg_own')}</span></button>
          {#each bgs as n (n)}
            <div class="bgwrap">
              <button class:sel={n === S.background} onclick={() => save({ background: n })}><img src="/bg/{encodeURIComponent(n)}.jpg?v={bgVer}" alt={n} loading="lazy" /></button>
              {#if n === 'custom'}<button class="bgdel" aria-label={t('delete')} onclick={delBg}>{@html I.trash}</button>{/if}
            </div>
          {/each}
        </div>
      {/if}
      <input type="file" accept="image/*" hidden bind:this={fileEl} onchange={upload} />
    </Block>

    <BlockTitle>{t('presets')}</BlockTitle>
    <Block>
      <div class="themes">
        {#each PRESETS as [k, m, a, mu]}
          <button class:on={same(S.colors.main, m) && same(S.colors.accent, a) && same(S.colors.muted, mu)} onclick={() => save({ colors: { main: m, accent: a, muted: mu } })}>
            <span class="tprev"><b style="color:{m}">12:30</b><i style="background:{a}"></i><small style="color:{mu}">{t('fajr')}</small></span>
            <span class="tname">{t(k)}</span>
          </button>
        {/each}
      </div>
    </Block>

    <BlockTitle>{t('custom_colors')}</BlockTitle>
    <List strong inset dividers>
      {#each ['main', 'accent', 'muted'] as r}
        <ListItem link title={t('col_' + r)} onClick={() => editColor(r)}>
          {#snippet media()}<span class="sw" style="background:{S.colors[r]}"></span>{/snippet}
          {#snippet after()}<span class="ltr">{S.colors[r].toUpperCase()}</span>{/snippet}
        </ListItem>
      {/each}
    </List>

    <BlockTitle>{t('brightness')}</BlockTitle>
    <List strong inset dividers>
      <ListItem>
        {#snippet inner()}
          <div class="vol"><i class="icon">{@html I.sun}</i><Range min={5} max={100} value={S.brightness} label onRangeChanged={v => save({ brightness: v }, true)} /></div>
        {/snippet}
      </ListItem>
      <ListItem title={t('auto_dim')}>
        {#snippet after()}<Toggle checked={S.autoDim} onToggleChange={v => save({ autoDim: v })} />{/snippet}
      </ListItem>
      {#if S.autoDim}
        <ListItem>
          {#snippet inner()}
            <div class="pvol">
              <span class="f">{t('night_brightness')}</span>
              <div class="vol"><i class="icon">{@html I.moon}</i><Range min={5} max={100} value={S.nightBrightness} label onRangeChanged={v => save({ nightBrightness: v }, true)} /></div>
            </div>
          {/snippet}
        </ListItem>
      {/if}
    </List>
    <BlockFooter>{t('auto_dim_hint')}</BlockFooter>

    <BlockTitle>{t('led')}</BlockTitle>
    <List strong inset dividers>
      <ListItem title={t('led_on')}>
        {#snippet media()}<span class="ledglow" style="--c:{led.on ? led.color : 'transparent'}"></span>{/snippet}
        {#snippet after()}<Toggle checked={led.on} onToggleChange={v => ledSet({ on: v })} />{/snippet}
      </ListItem>
      <ListItem>
        {#snippet inner()}
          <div class="pvol">
            <div class="swatches big">
              {#each LED_PRESETS as c}<button class:on={same(c, led.color)} style="--c:{c}" aria-label={c} onclick={() => ledSet({ color: c, on: true })}></button>{/each}
            </div>
            <span class="f">{t('hue')}</span>
            <input type="range" class="slider hue" min="0" max="359" value={Math.round(hex2hsl(led.color)[0])} oninput={e => ledSet({ color: hsl2hex(Number(e.target.value), 1, 0.5), on: true })} />
            <span class="f">{t('led_bri')}</span>
            <div class="vol"><Range min={5} max={100} value={led.bri} label onRangeChange={v => ledSet({ bri: v, on: true })} /></div>
          </div>
        {/snippet}
      </ListItem>
    </List>
    <BlockFooter>{t('led_hint')}</BlockFooter>
  {/if}
  <ColorSheet bind:req={colorReq} />
</Page>
