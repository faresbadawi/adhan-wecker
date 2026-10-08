// Gerät: Infos, App installieren, Update-Datei hochladen, Neustart und Werkseinstellungen
import { useRef, useState } from 'react';
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonNote, IonButton, IonIcon, IonProgressBar } from '@ionic/react';
import { downloadOutline, cloudUploadOutline, powerOutline, copyOutline } from 'ionicons/icons';
import { Bar } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t } from '../lib/i18n.js';
import { useApp, set, api, toast, confirmBox, duration, mb, signal, elapsed, isStandalone, isIOS, appMode } from '../lib/store.js';

const FLAG_URL = 'chrome://flags/#unsafely-treat-insecure-origin-as-secure';

function Copy({ value }) {
  const ref = useRef(null);
  async function copy() {
    try { await navigator.clipboard.writeText(value); }
    catch (e) { ref.current.select(); document.execCommand('copy'); } // ohne HTTPS keine Clipboard-API
    toast(t('copied'));
  }
  return (
    <div className="copy">
      <input ref={ref} className="ltr" readOnly value={value} />
      <IonButton size="small" fill="outline" shape="round" onClick={copy}><IonIcon slot="start" icon={copyOutline} />{t('copy')}</IonButton>
    </div>
  );
}

export default function Device() {
  const st = useApp();
  const { ST, online, installEvt } = st;
  const d = ST && ST.device, w = ST && ST.wifi;
  const wifiOk = online && w && w.connected;
  const secure = window.isSecureContext;
  const fileRef = useRef(null);
  const [up, setUp] = useState(null); // { pct, text, busy }

  async function install() {
    if (!installEvt) return;
    installEvt.prompt();
    await installEvt.userChoice;
    set({ installEvt: null });
  }
  async function update(e) {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (!await confirmBox(t('update_confirm'), f.name, false)) return;
    const fd = new FormData(); fd.append('update', f, f.name);
    const xhr = new XMLHttpRequest();
    setUp({ pct: 0, text: t('update_running') + ' 0%', busy: true });
    xhr.upload.onprogress = ev => {
      if (!ev.lengthComputable) return;
      const pct = Math.round(ev.loaded * 100 / ev.total);
      setUp({ pct, text: `${t('update_running')} ${pct}%`, busy: true });
    };
    xhr.onload = () => {
      if (xhr.status === 200) { setUp({ pct: 100, text: t('update_ok'), busy: true }); toast(t('update_ok')); setTimeout(() => location.reload(), 15000); }
      else { setUp({ pct: 0, text: t('update_fail'), busy: false }); toast(t('update_fail'), true); }
    };
    xhr.onerror = () => setUp({ pct: 0, text: t('update_fail'), busy: false });
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
  const kv = (label, value, ltr) => (
    <IonItem><IonLabel>{label}</IonLabel><IonNote slot="end" className={ltr ? 'ltr' : ''}>{value}</IonNote></IonItem>
  );

  let installBody;
  if (isStandalone()) installBody = <p>{t('installed')}</p>;
  else if (installEvt) installBody = <IonButton shape="round" onClick={install}><IonIcon slot="start" icon={downloadOutline} />{t('install')}</IonButton>;
  else if (isIOS()) installBody = <p>{t('install_hint_ios')}</p>;
  else if (secure) installBody = <p>{t('install_menu')}</p>;
  else if (appMode()) installBody = <ol className="steps"><li>{t('sc_1')}</li><li>{t('sc_2')}</li><li>{t('sc_3')}</li></ol>;
  else installBody = <>
    <ol className="steps">
      <li>{t('sc_0')}<div className="mt"><IonButton size="small" shape="round" href="/?app=1#/settings/device" target="_self"><IonIcon slot="start" icon={downloadOutline} />{t('sc_open')}</IonButton></div></li>
      <li>{t('sc_1')}</li><li>{t('sc_2')}</li><li>{t('sc_3')}</li>
    </ol>
    <p className="muted">{t('install_ip')}</p>
    <details>
      <summary>{t('sc_adv')}</summary>
      <p className="muted">{t('install_why')}</p>
      <ol className="steps">
        <li>{t('install_s1')}<Copy value={FLAG_URL} /></li>
        <li>{t('install_s2')}<Copy value={location.origin} /></li>
        <li>{t('install_s3')}</li>
      </ol>
    </details>
  </>;

  return (
    <IonPage>
      <Bar title={t('nav_device')} back="/settings" />
      <IonContent>
        <Section title={t('device')}>
          <IonList inset>
            {kv(t('dev_name'), d ? d.name : 'Smart Azan Wecker')}
            <IonItem><IonLabel>{t('connection')}</IonLabel>
              <span slot="end" className="state"><span className={'dot' + (online ? ' ok' : '')} />{t(online ? 'device_online' : 'device_offline')}</span></IonItem>
            <IonItem><IonLabel>{t('nav_wifi')}</IonLabel>
              <span slot="end">{wifiOk ? <span className={'sig ' + signal(w.bars)}>{t('sig_' + signal(w.bars))}</span> : t('wifi_off')}</span></IonItem>
            {kv(t('firmware'), d ? d.firmware : '—', true)}
            {d && kv(t('ip'), d.ip, true)}
            {d && kv(t('host'), d.host, true)}
            {d && kv(t('uptime'), duration(d.uptime + elapsed(st)))}
            {d && d.fsTotal ? kv(t('storage'), `${mb(d.fsTotal - d.fsUsed)} ${t('free_of')} ${mb(d.fsTotal)}`) : null}
          </IonList>
        </Section>

        <Section title={secure || isIOS() || isStandalone() ? t('install') : t('install_android')}>
          <div className="card-pad">{installBody}</div>
        </Section>

        <Section title={t('firmware_update')}>
          <div className="card-pad">
            <p className="muted top">{t('update_hint')}</p>
            {up && <><IonProgressBar value={up.pct / 100} /><p className="muted">{up.text}</p></>}
            <IonButton expand="block" shape="round" disabled={up && up.busy} onClick={() => fileRef.current.click()}>
              <IonIcon slot="start" icon={cloudUploadOutline} />{t('update_pick')}
            </IonButton>
            <input ref={fileRef} type="file" accept=".bin,application/octet-stream" hidden onChange={update} />
          </div>
        </Section>

        <Section title={t('restart')} hint={t('factory_hint')}>
          <div className="pad-x btnrow">
            <IonButton shape="round" fill="outline" onClick={restart}><IonIcon slot="start" icon={powerOutline} />{t('restart')}</IonButton>
            <IonButton shape="round" fill="outline" color="danger" onClick={reset}>{t('factory_reset')}</IonButton>
          </div>
        </Section>
      </IonContent>
    </IonPage>
  );
}
