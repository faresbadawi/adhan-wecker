// Azan-Benachrichtigung: Muezzin, Azan je Gebet mit Lautstärke und Probehören, Test mit Anzeige auf der Uhr
import { useEffect, useState } from 'react';
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonToggle, IonIcon, IonButton, IonRange, IonSpinner, IonSelect, IonSelectOption, IonSegment, IonSegmentButton } from '@ionic/react';
import { play, stop, checkmark, volumeLowOutline, volumeHighOutline, removeOutline, addOutline } from 'ionicons/icons';
import { Bar, BigTitle } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import Svg from '../components/Svg.jsx';
import { t } from '../lib/i18n.js';
import { PRAYER_ICON } from '../lib/icons.js';
import { PRAYERS } from '../lib/constants.js';
import { useApp, api, save, toast, toMin, two } from '../lib/store.js';
import { hasNative } from '../lib/native.js';
import { phone, saveLocal, scheduleSoon, playVoice, VOICES } from '../lib/phone.js';

const REMINDS = [0, 5, 10, 15, 20, 30, 45, 60];
const DURATIONS = [0, 60, 30, 15];
const durLabel = v => (v ? t('dur_secs').replace('{s}', v) : t('dur_full'));
const STEP = 5;
const hm = m => `${two(Math.floor(m / 60) % 24)}:${two(m % 60)}`;

// Azan später ertönen lassen und Erinnerung vor dem Gebet – die angezeigte Gebetszeit bleibt unverändert
function Timing({ S, ST }) {
  const times = (ST && ST.prayer && ST.prayer.times) || {};
  return (
    <Section title={t('azan_timing')} hint={t('azan_timing_hint')}>
      <div className="tm-list">
        {PRAYERS.map(k => {
          const delay = (S.azanDelay && S.azanDelay[k]) || 0;
          const max = (S.azanDelayMax && S.azanDelayMax[k]) ?? 60;
          const remind = (S.azanRemind && S.azanRemind[k]) || 0;
          const base = times[k] ? toMin(times[k]) : null;
          const setDelay = v => save({ azanDelay: { [k]: Math.max(0, Math.min(max, v)) } }, true);
          return (
            <div key={k} className={'tm-card' + (S.azan[k] ? '' : ' off')}>
              <div className="tm-head">
                <span className="ico"><Svg html={PRAYER_ICON[k]} /></span>
                <span className="tm-name">{t(k)}</span>
                {base !== null && <span className="tm-show">{t('prayer_at')} {hm(base)}</span>}
              </div>
              <div className="tm-row">
                <div className="tm-label">{t('azan_delay')}<small>{t('delay_max').replace('{m}', max)}</small></div>
                <div className="tm-stepper">
                  <button aria-label="−" disabled={delay <= 0} onClick={() => setDelay(delay - STEP)}><IonIcon icon={removeOutline} /></button>
                  <span className="tm-val">{delay ? `+${delay} ${t('minutes')}` : t('delay_none')}</span>
                  <button aria-label="+" disabled={delay >= max} onClick={() => setDelay(delay + STEP > max ? max : delay + STEP)}><IonIcon icon={addOutline} /></button>
                </div>
              </div>
              {base !== null && delay > 0 && <div className="tm-result">{t('azan_at')} <b>{hm(base + Math.min(delay, max))}</b></div>}
              <div className="tm-row">
                <div className="tm-label">{t('azan_remind')}</div>
                <IonSelect className="tm-sel" interface="popover" value={remind} aria-label={t('azan_remind')}
                  onIonChange={e => save({ azanRemind: { [k]: e.detail.value } }, true)}>
                  {REMINDS.map(m => <IonSelectOption key={m} value={m}>{m ? t('remind_before').replace('{m}', m) : t('remind_off')}</IonSelectOption>)}
                </IonSelect>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// Wo ertönt der Azan: Handy, Uhr oder beide (Handy nur in der Android-App); Dauer und Lautstärke je Gerät
function Output({ S, local }) {
  const native = hasNative();
  const [phoneOn, setPhoneOn] = useState(phone().azanOnPhone !== false);
  const clockOn = S.azanOnClock !== false;
  const mode = !native ? 'clock' : phoneOn && clockOn ? 'both' : phoneOn ? 'phone' : 'clock';
  async function pick(m) {
    const p = m !== 'clock', c = m !== 'phone';
    setPhoneOn(p);
    await saveLocal({ azanOnPhone: p });
    await save({ azanOnClock: c }, true);
    scheduleSoon();
  }
  if (!native) return null;
  return (
    <Section title={t('out_title')} hint={t('out_hint')}>
      <div className="pad-x">
        <IonSegment value={mode} onIonChange={e => e.detail.value !== mode && pick(e.detail.value)}>
          <IonSegmentButton value="phone"><IonLabel>{t('out_phone')}</IonLabel></IonSegmentButton>
          <IonSegmentButton value="clock"><IonLabel>{t('out_clock')}</IonLabel></IonSegmentButton>
          <IonSegmentButton value="both"><IonLabel>{t('out_both')}</IonLabel></IonSegmentButton>
        </IonSegment>
      </div>
    </Section>
  );
}

// Dauer des Azans auf der Uhr (kurzer Ausschnitt statt ganzem Azan)
function ClockDuration({ S }) {
  return (
    <Section title={t('dur_title')} hint={t('dur_clock_hint')}>
      <div className="pad-x">
        <IonSegment value={String(S.azanMaxSec || 0)} onIonChange={e => save({ azanMaxSec: Number(e.detail.value) }, true)}>
          {DURATIONS.map(v => <IonSegmentButton key={v} value={String(v)}><IonLabel>{durLabel(v)}</IonLabel></IonSegmentButton>)}
        </IonSegment>
      </div>
    </Section>
  );
}

// Azan-Stimme für die Alarme auf dem Handy (nur in der Android-App neben der Uhr; ohne Uhr ist es die Hauptliste)
function PhoneVoices() {
  const [sel, setSel] = useState(phone().voice);
  const [vol, setVol] = useState(phone().phoneVolume ?? 90);
  const [dur, setDur] = useState(phone().phoneAzanSec || 0);
  if (!hasNative()) return null;
  const choose = async id => { setSel(id); await saveLocal({ voice: id }); scheduleSoon(); toast(t('saved')); };
  return (
    <Section title={t('phone_voice')} hint={t('phone_voice_hint')}>
      <IonList inset>
        {VOICES.map(v => (
          <IonItem key={v.id} button detail={false} onClick={() => choose(v.id)}>
            <IonIcon slot="start" icon={checkmark} className={'check' + (v.id === sel ? '' : ' hidden')} />
            <IonLabel>{t('voice_' + v.id) === 'voice_' + v.id ? v.id : t('voice_' + v.id)}</IonLabel>
            {v.fajr && <IonButton slot="end" fill="clear" className="play fajr-btn" onClick={e => { e.stopPropagation(); playVoice(v.id, true); }} aria-label={t('fajr') + ' – ' + t('listen')}><span className="fajr-lbl">{t('fajr')}</span><IonIcon slot="end" icon={play} /></IonButton>}
            <IonButton slot="end" fill="clear" className="play" onClick={e => { e.stopPropagation(); playVoice(v.id, false); }} aria-label={t('listen')}><IonIcon slot="icon-only" icon={play} /></IonButton>
          </IonItem>
        ))}
      </IonList>
      <div className="pad-x mt">
        <p className="muted top">{t('phone_volume')}</p>
        <IonRange min={0} max={100} value={vol} pin pinFormatter={v => v + '%'}
          onIonKnobMoveEnd={e => { setVol(e.detail.value); saveLocal({ phoneVolume: e.detail.value }).then(scheduleSoon); }} aria-label={t('phone_volume')}>
          <IonIcon slot="start" icon={volumeLowOutline} />
          <IonIcon slot="end" icon={volumeHighOutline} />
        </IonRange>
        <p className="muted">{t('dur_phone_hint')}</p>
        <IonSegment value={String(dur)} onIonChange={e => { const v = Number(e.detail.value); setDur(v); saveLocal({ phoneAzanSec: v }).then(scheduleSoon); }}>
          {DURATIONS.map(v => <IonSegmentButton key={v} value={String(v)}><IonLabel>{durLabel(v)}</IonLabel></IonSegmentButton>)}
        </IonSegment>
      </div>
    </Section>
  );
}

export default function Azan() {
  const { S, ST, local } = useApp();
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
          {!local && <ClockDuration S={S} />}

          {!local && <Section title={t('azan_voice')} hint={t('azan_voice_hint')}>
            <IonList inset>
              {!voices && <div className="center pad"><IonSpinner /></div>}
              {voices && voices.list.map(id => (
                <IonItem key={id} button detail={false} onClick={() => chooseVoice(id)}>
                  <IonIcon slot="start" icon={checkmark} className={'check' + (id === voices.selected ? '' : ' hidden')} />
                  <IonLabel>{voiceName(id)}</IonLabel>
                  <IonButton slot="end" fill="clear" className="play fajr-btn" onClick={e => { e.stopPropagation(); playOn('/api/azan/preview', { id, prayer: 'fajr' }); }} aria-label={t('fajr') + ' – ' + t('listen')}>
                    <span className="fajr-lbl">{t('fajr')}</span><IonIcon slot="end" icon={play} />
                  </IonButton>
                  <IonButton slot="end" fill="clear" className="play" onClick={e => { e.stopPropagation(); playOn('/api/azan/preview', { id }); }} aria-label={t('listen')}>
                    <IonIcon slot="icon-only" icon={play} />
                  </IonButton>
                </IonItem>
              ))}
            </IonList>
          </Section>}

          <Output S={S} local={local} />
          <PhoneVoices />

          <Section title={t('azan')} hint={t('azan_volume_hint')}>
            <IonList inset className="azan-list">
              {PRAYERS.map((k, i) => (
                <IonItem key={k} lines={i < PRAYERS.length - 1 ? 'full' : 'none'} className={S.azan[k] ? '' : 'off'}>
                  <div className="pvol">
                    <div className="prow">
                      <span className="ico"><Svg html={PRAYER_ICON[k]} /></span>
                      <IonToggle checked={S.azan[k]} onIonChange={e => save({ azan: { [k]: e.detail.checked } }, true)}>{t(k)}</IonToggle>
                    </div>
                    {!local && <div className="vrow">
                      <IonRange className="vol" min={0} max={100} value={S.azanVolume[k]} pin pinFormatter={v => v + '%'}
                        onIonKnobMoveEnd={e => save({ azanVolume: { [k]: e.detail.value } }, true)} aria-label={t('volume')}>
                        <IonIcon slot="start" icon={volumeLowOutline} />
                        <IonIcon slot="end" icon={volumeHighOutline} />
                      </IonRange>
                      <IonButton fill="clear" className="play" onClick={() => playOn('/api/azan/preview', { prayer: k })} aria-label={t('listen')}>
                        <IonIcon slot="icon-only" icon={play} />
                      </IonButton>
                    </div>}
                  </div>
                </IonItem>
              ))}
            </IonList>
          </Section>

          <Timing S={S} ST={ST} />

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
