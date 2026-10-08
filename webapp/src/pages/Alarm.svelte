<script>
  // Wecker: Weckzeiten (Drehrad, Name, Wochentage, zum Löschen nach links wischen),
  // Wecker zum letzten Drittel der Nacht, Weckton und Lautstärke
  import { Page, BlockTitle, Block, BlockFooter, List, ListItem, Toggle, Stepper, Range, Preloader, SwipeoutActions, SwipeoutButton, f7 } from 'framework7-svelte';
  import TopBar from '../components/TopBar.svelte';
  import { t } from '../lib/i18n.js';
  import { I } from '../lib/icons.js';
  import { MAX_ALARMS, DAY_ORDER } from '../lib/constants.js';
  import { app, api, save, saveLater, toast, two } from '../lib/store.svelte.js';

  const S = $derived(app.S);
  let alarms = $state(null);
  let tj = $state(null);
  $effect(() => {
    if (S && !alarms) alarms = (S.alarms || []).map(a => Object.assign({}, a));
    if (S && !tj) tj = Object.assign({ on: false, offset: 0 }, S.tahajjud);
  });
  const days = t('days');
  const store = () => save({ alarms: alarms.map(a => Object.assign({}, a)) });

  // Uhrzeit mit dem Drehrad wählen (Stunden und Minuten)
  function pickTime(i) {
    const [h, m] = alarms[i].time.split(':');
    const picker = f7.picker.create({
      openIn: 'sheet',
      rotateEffect: true,
      toolbarCloseText: t('done'),
      cssClass: 'time-picker',
      value: [h, m],
      cols: [
        { textAlign: 'center', values: Array.from({ length: 24 }, (_, v) => two(v)) },
        { divider: true, content: ':' },
        { textAlign: 'center', values: Array.from({ length: 60 }, (_, v) => two(v)) },
      ],
      on: {
        close(p) {
          const v = `${p.value[0]}:${p.value[1]}`;
          if (v !== alarms[i].time) { alarms[i].time = v; store(); }
          p.destroy();
        },
      },
    });
    picker.open();
  }
  function toggleDay(a, bit) {
    const m = a.days ^ (1 << bit);
    if (!m) { toast(t('day_min'), true); return; }
    a.days = m; store();
  }
  function add() { alarms.push({ on: true, time: '06:00', days: 127, name: '' }); store(); }
  function remove(i) { alarms.splice(i, 1); store(); }

  // Wecktöne
  let sounds = $state(null);
  $effect(() => {
    if (sounds === null) {
      sounds = { list: [], selected: '' };
      api('/api/sounds').then(r => { if (r.data) sounds = { list: r.data.list, selected: (r.data.selected || '').trim() }; }).catch(() => {});
    }
  });
  const toneName = n => (t('tone_' + n) === 'tone_' + n ? n : t('tone_' + n));
  async function chooseTone(n) {
    if (n === sounds.selected) return;
    const r = await api('/api/sound', { name: n });
    if (r.ok) { sounds = { list: r.data.list, selected: (r.data.selected || '').trim() }; toast(t('saved')); } else toast(t('error'), true);
  }
  async function hear(n) {
    const r = await api('/api/preview', { name: n });
    toast(r.ok ? t('tone_playing') : t('error'), !r.ok);
  }
  const volPct = v => Math.round(v * 100 / 21); // Decoder 0..21 <-> Prozent
  async function setVolume(pct) {
    const ok = await save({ volume: Math.round(pct * 21 / 100) }, true);
    if (ok && sounds && sounds.selected) api('/api/preview', { name: sounds.selected }).catch(() => {});
  }
</script>

<Page>
  <TopBar title={t('nav_alarm')} />
  {#if !S || !alarms}
    <Block class="text-align-center"><Preloader /></Block>
  {:else}
    <BlockTitle>{t('alarm_times')}</BlockTitle>
    {#if !alarms.length}
      <Block class="empty">{t('alarm_none')}</Block>
    {/if}
    <List strong inset dividers class="alarms">
      {#each alarms as a, i (i)}
        <ListItem swipeout class={a.on ? '' : 'off'}>
          {#snippet inner()}
            <div class="arow">
              <button class="tbtn ltr" onclick={() => pickTime(i)}>{a.time}</button>
              <span class="grow"></span>
              <Toggle checked={a.on} onToggleChange={v => { a.on = v; store(); }} />
            </div>
            <input class="field aname" value={a.name || ''} placeholder={t('alarm_name_ph')} maxlength="40" dir="auto"
              oninput={e => { a.name = e.currentTarget.value; saveLater({ alarms: alarms.map(x => Object.assign({}, x)) }); }} />
            <div class="days">
              {#each DAY_ORDER as bit}
                <button class:on={a.days & (1 << bit)} onclick={() => toggleDay(a, bit)}>{days[bit]}</button>
              {/each}
            </div>
          {/snippet}
          <SwipeoutActions right>
            <SwipeoutButton delete confirmText={t('are_you_sure')} onClick={() => remove(i)}>{t('delete')}</SwipeoutButton>
          </SwipeoutActions>
        </ListItem>
      {/each}
    </List>
    <Block>
      <button class="btn wide" disabled={alarms.length >= MAX_ALARMS} onclick={add}>{@html I.plus}{t('alarm_add')}</button>
    </Block>
    <BlockFooter>{t('alarm_hint')} {t('swipe_delete')}</BlockFooter>

    <BlockTitle>{t('tj_title')}</BlockTitle>
    <List strong inset dividers>
      <ListItem title={t('tj_on')}>
        {#snippet media()}<i class="icon accent">{@html I.moon}</i>{/snippet}
        {#snippet after()}<Toggle checked={tj.on} onToggleChange={v => { tj.on = v; save({ tahajjud: Object.assign({}, tj) }); }} />{/snippet}
      </ListItem>
      {#if tj.on}
        <ListItem title={t('tj_offset')}>
          {#snippet after()}
            <Stepper small round fill value={tj.offset} min={0} max={60} step={5}
              formatValue={v => (v ? '+' + v : '0')} onStepperChange={v => { tj.offset = v; saveLater({ tahajjud: Object.assign({}, tj) }); }} />
          {/snippet}
        </ListItem>
      {/if}
    </List>
    <BlockFooter>{t('tj_hint')}</BlockFooter>

    <BlockTitle>{t('alarm_tone')}</BlockTitle>
    <List strong inset dividers>
      {#each (sounds && sounds.list) || [] as n}
        <ListItem title={toneName(n)} onClick={() => chooseTone(n)} class="clickable">
          {#snippet media()}<i class="icon accent">{@html n === sounds.selected ? I.check : ''}</i>{/snippet}
          {#snippet after()}<button class="round" aria-label={t('listen')} onclick={e => { e.stopPropagation(); hear(n); }}>{@html I.play}</button>{/snippet}
        </ListItem>
      {/each}
      <ListItem>
        {#snippet inner()}
          <div class="vol">
            <i class="icon">{@html I.audio}</i>
            <Range min={0} max={100} value={volPct(S.volume)} label onRangeChanged={setVolume} />
          </div>
        {/snippet}
      </ListItem>
    </List>
    <BlockFooter>{t('alarm_volume_hint')}</BlockFooter>
  {/if}
</Page>
