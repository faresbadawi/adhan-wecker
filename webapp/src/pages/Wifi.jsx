// WLAN: Status, Netze suchen und verbinden, neu einrichten (Einrichtungsportal der Uhr)
import { useState } from 'react';
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonNote, IonIcon, IonButton, IonSpinner, IonInput } from '@ionic/react';
import { lockClosedOutline, refreshOutline } from 'ionicons/icons';
import { Bar } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t } from '../lib/i18n.js';
import { useApp, api, toast, confirmBox, signal } from '../lib/store.js';

export default function Wifi() {
  const { ST, online } = useApp();
  const w = ST && ST.wifi;
  const ok = online && w && w.connected;
  const [nets, setNets] = useState(null);
  const [open, setOpen] = useState(-1);
  const [pass, setPass] = useState('');

  async function scan() {
    setNets('loading'); setOpen(-1);
    try { const r = await api('/api/wifi/scan'); setNets(r.data || []); }
    catch (e) { setNets([]); toast(t('offline'), true); }
  }
  async function connect(n) {
    try { await api('/api/wifi/connect', { ssid: n.ssid, password: n.secure ? pass : '' }); toast(t('connecting')); }
    catch (e) { toast(t('offline'), true); }
  }
  async function forget() {
    if (!await confirmBox(t('are_you_sure'), t('wifi_forget_hint'), true)) return;
    try { await api('/api/wifi/forget', {}); toast(t('restarting')); } catch (e) { toast(t('offline'), true); }
  }
  const Sig = ({ bars }) => <span className={'sig ' + signal(bars)}>{t('sig_' + signal(bars))}</span>;

  return (
    <IonPage>
      <Bar title={t('nav_wifi')} back="/settings" />
      <IonContent>
        <Section title={t('wifi_status')}>
          <IonList inset>
            <IonItem>
              <IonLabel>{t('nav_wifi')}</IonLabel>
              <span slot="end" className="state"><span className={'dot' + (ok ? ' ok' : '')} />{t(ok ? 'wifi_on' : 'wifi_off')}</span>
            </IonItem>
            {ok && <IonItem><IonLabel>{t('network')}</IonLabel><IonNote slot="end">{w.ssid}</IonNote></IonItem>}
            {ok && <IonItem lines="none"><IonLabel>{t('signal')}</IonLabel><span slot="end"><Sig bars={w.bars} /></span></IonItem>}
          </IonList>
        </Section>

        <Section title={t('networks')}>
          {nets === 'loading' && <div className="center pad"><IonSpinner /></div>}
          {Array.isArray(nets) && !nets.length && <div className="empty">{t('no_results')}</div>}
          {Array.isArray(nets) && nets.length > 0 && (
            <IonList inset>
              {nets.map((n, i) => (
                <div key={n.ssid + i}>
                  <IonItem button detail={false} onClick={() => { setOpen(open === i ? -1 : i); setPass(''); }}>
                    <IonLabel>{n.ssid}</IonLabel>
                    {n.secure && <IonIcon slot="end" icon={lockClosedOutline} color="medium" />}
                    <span slot="end"><Sig bars={n.bars} /></span>
                  </IonItem>
                  {open === i && (
                    <IonItem>
                      {n.secure && <IonInput className="ltr" type="password" value={pass} placeholder={t('password')} autocomplete="current-password" onIonInput={e => setPass(e.detail.value || '')} />}
                      <IonButton slot="end" shape="round" size="small" onClick={() => connect(n)}>{t('connect')}</IonButton>
                    </IonItem>
                  )}
                </div>
              ))}
            </IonList>
          )}
          <div className="pad-x"><IonButton expand="block" fill="outline" shape="round" onClick={scan}><IonIcon slot="start" icon={refreshOutline} />{t('scan')}</IonButton></div>
        </Section>

        <Section title={t('wifi_forget')} hint={t('wifi_forget_hint')}>
          <div className="pad-x"><IonButton expand="block" color="danger" fill="outline" shape="round" onClick={forget}>{t('wifi_forget')}</IonButton></div>
        </Section>
      </IonContent>
    </IonPage>
  );
}
