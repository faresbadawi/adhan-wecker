// Azan-Benachrichtigung: Muezzin, Azan je Gebet mit Lautstärke und Probehören, Test mit Anzeige auf der Uhr
import { useEffect, useState } from 'react';
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonToggle, IonIcon, IonButton, IonRange, IonSpinner } from '@ionic/react';
import { play, stop, checkmark, volumeLowOutline, volumeHighOutline } from 'ionicons/icons';
import { Bar, BigTitle } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import Svg from '../components/Svg.jsx';
import { t } from '../lib/i18n.js';
import { PRAYER_ICON } from '../lib/icons.js';
import { PRAYERS } from '../lib/constants.js';
import { useApp, api, save, toast } from '../lib/store.js';

export default function Azan() {
  const { S } = useApp();
  const [voices, setVoices] = useState(null);
  useEffect(() => {
    api('/api/azan/voices').then(r => { if (r.data) setVoices({ list: r.data.list.slice().sort(), selected: r.data.selected }); })
      .catch(() => setVoices({ list: [], selected: '' }));
  }, []);
  const voiceName = id => (t('voice_' + id) === 'voice_' + id ? id : t('voice_' + id));
  async function chooseVoice(id) {
    if (id === voices.selected) return;
    try {
      const r = await api('/api/azan/voice', { id });
      if (r.ok) { setVoices({ list: r.data.list.slice().sort(), selected: r.data.selected }); toast(t('saved')); } else toast(t('error'), true);
    } catch (e) { toast(t('offline'), true); }
  }
  async function playOn(url, body) {
    try { const r = await api(url, body); toast(r.ok ? t('azan_playing') : t('error'), !r.ok); }
    catch (e) { toast(t('offline'), true); }
  }
  const stopAzan = () => api('/api/azan/stop', {}).catch(() => toast(t('offline'), true));

  return (
    <IonPage>
      <Bar title={t('title_audio')} />
      <IonContent fullscreen>
        <BigTitle title={t('title_audio')} />
        {!S ? <div className="center pad"><IonSpinner /></div> : <>
          <Section title={t('azan_voice')} hint={t('azan_voice_hint')}>
            <IonList inset>
              {!voices && <div className="center pad"><IonSpinner /></div>}
              {voices && voices.list.map(id => (
                <IonItem key={id} button detail={false} onClick={() => chooseVoice(id)}>
                  <IonIcon slot="start" icon={checkmark} className={'check' + (id === voices.selected ? '' : ' hidden')} />
                  <IonLabel>{voiceName(id)}</IonLabel>
                  <IonButton slot="end" fill="clear" className="play" onClick={e => { e.stopPropagation(); playOn('/api/azan/preview', { id }); }} aria-label={t('listen')}>
                    <IonIcon slot="icon-only" icon={play} />
                  </IonButton>
                </IonItem>
              ))}
            </IonList>
          </Section>

          <Section title={t('azan')} hint={t('azan_volume_hint')}>
            <IonList inset className="azan-list">
              {PRAYERS.map((k, i) => (
                <IonItem key={k} lines={i < PRAYERS.length - 1 ? 'full' : 'none'} className={S.azan[k] ? '' : 'off'}>
                  <div className="pvol">
                    <div className="prow">
                      <span className="ico"><Svg html={PRAYER_ICON[k]} /></span>
                      <IonToggle checked={S.azan[k]} onIonChange={e => save({ azan: { [k]: e.detail.checked } }, true)}>{t(k)}</IonToggle>
                    </div>
                    <div className="vrow">
                      <IonRange className="vol" min={0} max={100} value={S.azanVolume[k]} pin pinFormatter={v => v + '%'}
                        onIonKnobMoveEnd={e => save({ azanVolume: { [k]: e.detail.value } }, true)} aria-label={t('volume')}>
                        <IonIcon slot="start" icon={volumeLowOutline} />
                        <IonIcon slot="end" icon={volumeHighOutline} />
                      </IonRange>
                      <IonButton fill="clear" className="play" onClick={() => playOn('/api/azan/preview', { prayer: k })} aria-label={t('listen')}>
                        <IonIcon slot="icon-only" icon={play} />
                      </IonButton>
                    </div>
                  </div>
                </IonItem>
              ))}
            </IonList>
          </Section>

          <Section title={t('azan_test_display')} hint={t('azan_test_hint')}>
            <div className="pad-x btnrow">
              <IonButton shape="round" onClick={() => playOn('/api/azan/test', { prayer: 'dhuhr' })}><IonIcon slot="start" icon={play} />{t('azan_test_normal')}</IonButton>
              <IonButton shape="round" onClick={() => playOn('/api/azan/test', { prayer: 'fajr' })}><IonIcon slot="start" icon={play} />{t('azan_test_fajr')}</IonButton>
              <IonButton shape="round" color="danger" fill="outline" onClick={stopAzan}><IonIcon slot="start" icon={stop} />{t('stop')}</IonButton>
            </div>
          </Section>
        </>}
      </IonContent>
    </IonPage>
  );
}
