<script>
  // Gerät: Infos, App installieren, Update-Datei hochladen, Neustart und Werkseinstellungen
  import { Page, BlockTitle, Block, BlockFooter, List, ListItem, Progressbar } from 'framework7-svelte';
  import TopBar from '../components/TopBar.svelte';
  import { t } from '../lib/i18n.js';
  import { I } from '../lib/icons.js';
  import { app, api, toast, confirmBox, duration, mb, signal, isStandalone, isIOS, appMode } from '../lib/store.svelte.js';

  const d = $derived(app.ST && app.ST.device);
  const w = $derived(app.ST && app.ST.wifi);
  const wifiOk = $derived(app.online && w && w.connected);
  const uptime = $derived(d ? duration(d.uptime + (app.now, Math.floor((performance.now() - app.stBase) / 1000))) : '');

  // ---------- Installation: Knopf, sobald Chrome sie anbietet, sonst Anleitung
  const FLAG_URL = 'chrome://flags/#unsafely-treat-insecure-origin-as-secure';
  const secure = window.isSecureContext;
  async function install() {
    if (!app.installEvt) return;
    app.installEvt.prompt();
    await app.installEvt.userChoice;
    app.installEvt = null;
  }
  async function copy(text, e) {
    try { await navigator.clipboard.writeText(text); }
    catch (err) { const el = e.target.closest('.copy').querySelector('input'); el.select(); document.execCommand('copy'); } // ohne HTTPS keine Clipboard-API
    toast(t('copied'));
  }

  // ---------- Update-Datei hochladen (mit Fortschritt); die Uhr startet danach neu
  let fileEl;
  let up = $state(null); // { pct, text, busy }
  async function update(e) {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (!await confirmBox(t('update_confirm'), f.name, false)) return;
    const fd = new FormData(); fd.append('update', f, f.name);
    const xhr = new XMLHttpRequest();
    up = { pct: 0, text: t('update_running') + ' 0%', busy: true };
    xhr.upload.onprogress = ev => {
      if (!ev.lengthComputable) return;
      const pct = Math.round(ev.loaded * 100 / ev.total);
      up = { pct, text: `${t('update_running')} ${pct}%`, busy: true };
    };
    xhr.onload = () => {
      if (xhr.status === 200) { up = { pct: 100, text: t('update_ok'), busy: true }; toast(t('update_ok')); setTimeout(() => location.reload(), 15000); }
      else { up = { pct: 0, text: t('update_fail'), busy: false }; toast(t('update_fail'), true); }
    };
    xhr.onerror = () => { up = { pct: 0, text: t('update_fail'), busy: false }; };
    xhr.open('POST', '/api/update');
    xhr.send(fd);
  }

  async function restart() {
    if (!await confirmBox(t('are_you_sure'), '', false)) return;
    try { await api('/api/device/restart', {}); toast(t('restarting')); } catch (e) { toast(t('offline'), true); }
  }
  async function reset() {
    if (!await confirmBox(t('factory_reset') + ' – ' + t('are_you_sure'), t('factory_hint'), true)) return;
    try { await api('/api/device/reset', {}); toast(t('restarting')); } catch (e) { toast(t('offline'), true); }
  }
</script>

<Page>
  <TopBar title={t('nav_device')} back />
  <BlockTitle>{t('device')}</BlockTitle>
  <List strong inset dividers class="kv-list">
    <ListItem title={t('dev_name')} after={d ? d.name : 'Smart Azan Clock'} />
    <ListItem title={t('connection')}>
      {#snippet after()}<span class="state"><span class="dot" class:ok={app.online}></span>{t(app.online ? 'device_online' : 'device_offline')}</span>{/snippet}
    </ListItem>
    <ListItem title={t('nav_wifi')}>
      {#snippet after()}{#if wifiOk}<span class="sig {signal(w.bars)}">{t('sig_' + signal(w.bars))}</span>{:else}{t('wifi_off')}{/if}{/snippet}
    </ListItem>
    <ListItem title={t('firmware')}>{#snippet after()}<span class="ltr">{d ? d.firmware : '1.0.0'}</span>{/snippet}</ListItem>
    {#if d}
      <ListItem title={t('ip')}>{#snippet after()}<span class="ltr">{d.ip}</span>{/snippet}</ListItem>
      <ListItem title={t('host')}>{#snippet after()}<span class="ltr">{d.host}</span>{/snippet}</ListItem>
      <ListItem title={t('uptime')} after={uptime} />
      {#if d.fsTotal}
        <ListItem title={t('storage')}>
          {#snippet after()}<span><span class="ltr">{mb(d.fsTotal - d.fsUsed)}</span> {t('free_of')} <span class="ltr">{mb(d.fsTotal)}</span></span>{/snippet}
        </ListItem>
      {/if}
    {/if}
  </List>

  <BlockTitle>{secure || isIOS() || isStandalone() ? t('install') : t('install_android')}</BlockTitle>
  <Block strong inset class="install">
    {#if isStandalone()}
      <p>{t('installed')}</p>
    {:else if app.installEvt}
      <button class="btn gold" onclick={install}>{@html I.download}{t('install')}</button>
    {:else if isIOS()}
      <p>{t('install_hint_ios')}</p>
    {:else if secure}
      <p>{t('install_menu')}</p>
    {:else if appMode()}
      <ol class="steps"><li>{t('sc_1')}</li><li>{t('sc_2')}</li><li>{t('sc_3')}</li></ol>
    {:else}
      <ol class="steps">
        <li>{t('sc_0')}<div class="btnrow start"><a class="btn gold external" href="/?app=1#device" target="_self">{@html I.download}{t('sc_open')}</a></div></li>
        <li>{t('sc_1')}</li><li>{t('sc_2')}</li><li>{t('sc_3')}</li>
      </ol>
      <p class="hint">{t('install_ip')}</p>
      <details>
        <summary>{t('sc_adv')}</summary>
        <p class="hint">{t('install_why')}</p>
        <ol class="steps">
          <li>{t('install_s1')}<div class="copy"><input class="ltr" readonly value={FLAG_URL} /><button class="btn" onclick={e => copy(FLAG_URL, e)}>{t('copy')}</button></div></li>
          <li>{t('install_s2')}<div class="copy"><input class="ltr" readonly value={location.origin} /><button class="btn" onclick={e => copy(location.origin, e)}>{t('copy')}</button></div></li>
          <li>{t('install_s3')}</li>
        </ol>
      </details>
    {/if}
  </Block>

  <BlockTitle>{t('firmware_update')}</BlockTitle>
  <Block strong inset>
    <p class="hint top">{t('update_hint')}</p>
    {#if up}
      <Progressbar progress={up.pct} />
      <p class="hint">{up.text}</p>
    {/if}
    <button class="btn gold wide" disabled={up && up.busy} onclick={() => fileEl.click()}>{@html I.download}{t('update_pick')}</button>
    <input type="file" accept=".bin,application/octet-stream" hidden bind:this={fileEl} onchange={update} />
  </Block>

  <BlockTitle>{t('restart')}</BlockTitle>
  <Block>
    <div class="btnrow">
      <button class="btn" onclick={restart}>{@html I.power}{t('restart')}</button>
      <button class="btn danger" onclick={reset}>{t('factory_reset')}</button>
    </div>
  </Block>
  <BlockFooter>{t('factory_hint')}</BlockFooter>
</Page>
