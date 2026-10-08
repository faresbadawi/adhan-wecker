<script>
  // Farbwahl als Bottom-Sheet: passende Farbfelder, Farbton und Helligkeit; Vorschau live auf App-Farben
  import { Sheet } from 'framework7-svelte';
  import { t } from '../lib/i18n.js';
  import { hex2hsl, hsl2hex } from '../lib/color.js';

  // req: { title, value, swatches, live(hex), done(hex|null) } oder null
  let { req = $bindable(null) } = $props();

  let h = $state(0), sat = $state(0), l = $state(0), cur = $state('#FFFFFF');
  let opened = $state(false);
  let finished = false;
  $effect(() => {
    if (req && !opened) {
      [h, sat, l] = hex2hsl(req.value); cur = req.value.toUpperCase();
      finished = false; opened = true;
    }
  });
  $effect(() => { if (req && opened) req.live(cur); });

  const setHex = c => { cur = c; [h, sat, l] = hex2hsl(c); };
  const onHue = v => { h = v; if (sat < 0.15) sat = 0.6; cur = hsl2hex(h, sat, l); };
  const onLight = v => { l = v / 100; cur = hsl2hex(h, sat, l); };
  function finish(v) {
    if (finished || !req) return;
    finished = true;
    const r = req;
    if (v === null) r.live(r.value);
    opened = false; req = null;
    r.done(v);
  }
</script>

<Sheet {opened} backdrop swipeToClose class="color-sheet" style="height:auto" onSheetClosed={() => finish(null)}>
  {#if req}
    <div class="sheet-body">
      <div class="cphead"><span class="cpdot" style="background:{cur}"></span><div><b>{req.title}</b><small class="ltr">{cur}</small></div></div>
      <div class="swatches">
        {#each req.swatches as c}<button class:on={c === cur} style="--c:{c}" aria-label={c} onclick={() => setHex(c)}></button>{/each}
      </div>
      <label class="f" for="cpHue">{t('hue')}</label>
      <input id="cpHue" type="range" class="slider hue" min="0" max="359" value={Math.round(h)} oninput={e => onHue(Number(e.target.value))} />
      <label class="f" for="cpLight">{t('lightness')}</label>
      <input id="cpLight" type="range" class="slider" min="15" max="97" value={Math.round(l * 100)} oninput={e => onLight(Number(e.target.value))}
        style="--track:linear-gradient(90deg, {hsl2hex(h, sat, 0.15)}, {hsl2hex(h, sat, 0.5)}, {hsl2hex(h, sat, 0.97)})" />
      <div class="btnrow">
        <button class="btn" onclick={() => finish(null)}>{t('cancel')}</button>
        <button class="btn gold" onclick={() => finish(cur)}>{t('done')}</button>
      </div>
    </div>
  {/if}
</Sheet>
