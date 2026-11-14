// Gerät: Infos, App installieren, Update-Datei hochladen, Neustart und Werkseinstellungen
import { useRef, useState, useEffect } from 'react';
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonNote, IonButton, IonIcon, IonProgressBar, IonToggle, IonInput } from '@ionic/react';
import { downloadOutline, cloudUploadOutline, powerOutline, refreshOutline, checkmarkCircle, sparklesOutline } from 'ionicons/icons';
import { Bar } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t } from '../lib/i18n.js';
import { useApp, api, toast, confirmBox, duration, mb, signal, elapsed, isStandalone, useNow } from '../lib/store.js';
import { reloadApp } from '../lib/errors.js';

// Selbst-Update aus dem Internet: Stand, automatisch nachts, jetzt prüfen/installieren
function SelfUpdate() {
  const [u, setU] = useState(null);
  const load = () => api('/api/selfupdate').then(r => r.ok && r.data && setU(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!u || !['checking', 'installing', 'done'].includes(u.state)) return undefined;
    const id = setTimeout(load, 2000);
    return () => clearTimeout(id);
  }, [u]);
  async function post(body) {
    try { const r = await api('/api/selfupdate', body); if (r.ok && r.data) setU(r.data); } catch (e) { toast(t('offline'), true); }
    setTimeout(load, 1500);
  }
  if (!u) return null;
  const busy = ['checking', 'installing', 'done'].includes(u.state);
  const line = {
    checking: t('upd_checking'), uptodate: t('upd_uptodate'), available: t('upd_available').replace('{v}', u.latest || ''),
    installing: t('upd_installing').replace('{p}', u.progress), done: t('upd_done'), failed: t('upd_failed'), idle: '',
  }[u.state];
  return (
    <Section title={t('upd_title')} hint={t('upd_hint')}>
      <IonList inset>
        <IonItem>
          <IonIcon slot="start" icon={u.state === 'available' ? sparklesOutline : checkmarkCircle} className="accent" />
          <IonLabel className="ion-text-wrap">{t('firmware')} <span className="ltr">{u.version}</span>{line && <p>{line}{u.error && u.state === 'failed' ? ` (${u.error})` : ''}</p>}</IonLabel>
        </IonItem>
        {u.state === 'installing' && <IonItem lines="none"><IonProgressBar value={u.progress / 100} /></IonItem>}
        <IonItem lines="none">
          <IonToggle checked={u.auto} onIonChange={e => post({ auto: e.detail.checked })}>{t('upd_auto')}</IonToggle>
        </IonItem>
      </IonList>
      <div className="pad-x">
        {u.state === 'available'
          ? <IonButton expand="block" shape="round" disabled={busy} onClick={() => post({ action: 'install' })}><IonIcon slot="start" icon={downloadOutline} />{t('upd_install')}</IonButton>
          : <IonButton expand="block" shape="round" fill="outline" disabled={busy} onClick={() => post({ action: 'check' })}><IonIcon slot="start" icon={refreshOutline} />{t('upd_check')}</IonButton>}
      </div>
    </Section>
  );
}

// Name der Uhr und Meldung an die Zentrale des Herausgebers (nur Name, Stadt, Version)
function Fleet() {
  const [f, setF] = useState(null);
  const [name, setName] = useState('');
  useEffect(() => { api('/api/fleet').then(r => { if (r.ok && r.data) { setF(r.data); setName(r.data.name); } }).catch(() => {}); }, []);
  async function post(body) {
    try { const r = await api('/api/fleet', body); if (r.ok && r.data) { setF(r.data); setName(r.data.name); return true; } } catch (e) { toast(t('offline'), true); }
    return false;
  }
  async function saveName() {
    const n = name.trim();
    if (!f || n === f.name) return;
    if (await post({ name: n })) toast(t('saved'));
  }
  if (!f) return null;
  return (
    <Section title={t('fleet_title')} hint={t('fleet_hint')}>
      <IonList inset>
        <IonItem>
          <IonInput label={t('dev_name')} labelPlacement="stacked" value={name} maxlength={40} placeholder="Bilal"
            onIonInput={e => setName(e.detail.value || '')} onIonBlur={saveName} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
        </IonItem>
        <IonItem lines="none">
          <IonToggle checked={f.enabled} onIonChange={e => post({ enabled: e.detail.checked })}>{t('fleet_on')}</IonToggle>
        </IonItem>
      </IonList>
    </Section>
  );
}

export default function Device() {
  const st = useApp();
  useNow(); // Uhr und Countdowns jede Sekunde
  const { ST, online } = st;
  const d = ST && ST.device, w = ST && ST.wifi;
  const wifiOk = online && w && w.connected;
  const fileRef = useRef(null);
  const [up, setUp] = useState(null); // { pct, text, busy }

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
      if (xhr.status === 200) { setUp({ pct: 100, text: t('update_ok'), busy: true }); toast(t('update_ok')); setTimeout(() => reloadApp(), 15000); }
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

  return (
    <IonPage>
      <Bar title={t('nav_device')} back="/settings" />
      <IonContent>
        <Section title={t('device')}>
          <IonList inset>
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

        <Section title={t('install')}>
          <IonList inset>
            <IonItem routerLink="/install" detail>
              <span className="ico" slot="start"><IonIcon icon={downloadOutline} /></span>
              <IonLabel>{t(isStandalone() ? 'installed_short' : 'inst_title')}</IonLabel>
            </IonItem>
          </IonList>
        </Section>

        {!st.local && <Fleet />}
        {!st.local && <SelfUpdate />}

        <Section title={t('firmware_update')}>
          <div className="card-pad">
            <p className="muted top">{t('update_hint')}</p>
            {up && <><IonProgressBar value={up.pct / 100} /><p className="muted">{up.text}</p></>}
            <IonButton expand="block" shape="round" fill="clear" size="small" disabled={up && up.busy} onClick={() => fileRef.current.click()}>
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
