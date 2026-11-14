// Azan-Benachrichtigung: Muezzin, Azan je Gebet mit Lautstärke und Probehören, Test mit Anzeige auf der Uhr
import { useEffect, useRef, useState } from 'react';
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonToggle, IonIcon, IonButton, IonRange, IonSpinner, IonSelect, IonSelectOption, IonSegment, IonSegmentButton } from '@ionic/react';
import { play, stop, checkmark, volumeLowOutline, volumeHighOutline, removeOutline, addOutline, cloudUploadOutline, trashOutline, addCircleOutline, moonOutline, chevronDown, chevronUp } from 'ionicons/icons';
import { Bar, BigTitle } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import Svg from '../components/Svg.jsx';
import { t } from '../lib/i18n.js';
import { PRAYER_ICON } from '../lib/icons.js';
import { PRAYERS } from '../lib/constants.js';
import { useApp, api, save, toast, toMin, two, mb, confirmBox } from '../lib/store.js';
import { encodeAzan } from '../lib/azanFile.js';
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

// Eigene Azane auf der Uhr: Plätze normal, fajr, ramadan. Die App wandelt jede Audiodatei in ein kleines MP3 um;
// der freie Speicher wird auf die leeren Plätze verteilt.
const OWN = ['normal', 'fajr', 'ramadan'];
const RESERVE = 100 * 1024;
const SD_MAX = 15 * 1048576;
const sortV = d => ({ ...d, list: d.list.slice().sort() });
function useOwn(voices, setVoices, onDone) {
  const fileRef = useRef(null);
  const slotRef = useRef('normal');
  const [busy, setBusy] = useState(null); // { slot, text }
  const own = voices.own || {};
  const pick = slot => { slotRef.current = slot; fileRef.current.click(); };
  async function upload(e) {
    const f = e.target.files[0]; e.target.value = '';
    const slot = slotRef.current;
    if (!f) return;
    try {
      // Auf der SD-Karte ist genug Platz (höchstens 15 MB je Datei); im Flash teilen sich die leeren Plätze den Rest
      const empty = OWN.filter(k => k !== slot && !own[k]).length;
      const budget = voices.target === 'sd' ? Math.min((voices.free || 0) - RESERVE, SD_MAX)
        : ((voices.free || 0) + (own[slot] || 0) - RESERVE) / (1 + empty);
      setBusy({ slot, text: t('own_converting').replace('{p}', 0) });
      const mp3 = await encodeAzan(f, budget, p => setBusy({ slot, text: t('own_converting').replace('{p}', p) }));
      setBusy({ slot, text: t('own_sending') });
      const fd = new FormData();
      fd.append('file', mp3, 'azan.mp3');
      const r = await fetch('/api/azan/upload?slot=' + slot, { method: 'POST', body: fd });
      if (!r.ok) throw new Error(r.status === 400 ? 'space' : 'net');
      setVoices(sortV(await r.json()));
      if (onDone) await onDone(slot);
      toast(t('saved'));
    } catch (err) {
      toast(t(err.message === 'space' ? 'own_space' : err.message === 'bad' ? 'own_bad' : 'offline'), true);
      api('/api/azan/voices').then(r => r.data && setVoices(sortV(r.data))).catch(() => {});
    }
    setBusy(null);
  }
  async function del(slot) {
    if (!await confirmBox(t('own_delete_q'), '', true)) return;
    try { const r = await api('/api/azan/delete?slot=' + slot, {}); if (r.ok) { setVoices(sortV(r.data)); toast(t('saved')); } }
    catch (e) { toast(t('offline'), true); }
  }
  const input = <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac" hidden onChange={upload} />;
  return { own, busy, pick, del, input };
}

// Knöpfe für einen eigenen Platz: anhören, ersetzen/hochladen, löschen
function OwnButtons({ o, slot, onPlay }) {
  const has = o.own[slot] > 0;
  if (o.busy && o.busy.slot === slot) return <IonSpinner slot="end" name="crescent" />;
  if (o.busy) return null;
  return <>
    {has && <IonButton slot="end" fill="clear" className="play" aria-label={t('listen')} onClick={e => { e.stopPropagation(); onPlay(); }}><IonIcon slot="icon-only" icon={play} /></IonButton>}
    <IonButton slot="end" fill="clear" className="play" aria-label={t(has ? 'own_replace' : 'own_upload')} onClick={e => { e.stopPropagation(); o.pick(slot); }}><IonIcon slot="icon-only" icon={cloudUploadOutline} /></IonButton>
    {has && <IonButton slot="end" fill="clear" color="danger" aria-label={t('delete')} onClick={e => { e.stopPropagation(); o.del(slot); }}><IonIcon slot="icon-only" icon={trashOutline} /></IonButton>}
  </>;
}
const ownSub = (o, slot, where) => (o.busy && o.busy.slot === slot ? o.busy.text : o.own[slot] > 0
  ? mb(o.own[slot]) + (where && where[slot] === 'sd' ? ' · ' + t('store_sd') : '') : t('own_none'));

// Muezzin der Uhr: mitgelieferte Stimmen und der eigene Azan in einer Liste
function Voices({ voices, setVoices, playOn }) {
  const o = useOwn(voices, setVoices);
  const voiceName = id => (t('voice_' + id) === 'voice_' + id ? id : t('voice_' + id));
  const builtIn = voices.list.filter(id => id !== 'custom');
  const hasOwn = o.own.normal > 0 || o.own.fajr > 0;
  async function choose(id) {
    if (id === voices.selected) return;
    try {
      const r = await api('/api/azan/voice', { id });
      if (r.ok) { setVoices(sortV(r.data)); toast(t('saved')); } else toast(t('error'), true);
    } catch (e) { toast(t('offline'), true); }
  }
  return (
    <Section title={t('azan_voice')} hint={t('azan_voice_hint')}>
      <IonList inset>
        {builtIn.map(id => (
          <IonItem key={id} button detail={false} onClick={() => choose(id)}>
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
        {hasOwn ? <>
          <IonItem button detail={false} lines="none" onClick={() => choose('custom')}>
            <IonIcon slot="start" icon={checkmark} className={'check' + (voices.selected === 'custom' ? '' : ' hidden')} />
            <IonLabel className="ion-text-wrap">{t('voice_custom')}<p>{ownSub(o, 'normal', voices.where)}</p></IonLabel>
            <OwnButtons o={o} slot="normal" onPlay={() => playOn('/api/azan/preview', { id: 'custom', prayer: 'dhuhr' })} />
          </IonItem>
          <IonItem className="own-sub">
            <IonIcon slot="start" icon={checkmark} className="check hidden" />
            <IonLabel className="ion-text-wrap"><small>{t('own_fajr_opt')}</small><p>{ownSub(o, 'fajr', voices.where)}</p></IonLabel>
            <OwnButtons o={o} slot="fajr" onPlay={() => playOn('/api/azan/preview', { id: 'custom', prayer: 'fajr' })} />
          </IonItem>
        </> : (
          <IonItem button detail={false} disabled={!!o.busy} onClick={() => o.pick('normal')}>
            <IonIcon slot="start" icon={addCircleOutline} className="check" />
            <IonLabel className="ion-text-wrap">{o.busy ? o.busy.text : t('own_add')}<p>{t('own_add_hint')}</p></IonLabel>
            {o.busy && <IonSpinner slot="end" name="crescent" />}
          </IonItem>
        )}
      </IonList>
      {hasOwn && voices.target !== 'sd' && <p className="section-hint">{t('own_free').replace('{mb}', mb(Math.max(0, (voices.free || 0) - RESERVE)))}</p>}
      {voices.sd && <Store voices={voices} setVoices={setVoices} />}
      {o.input}
    </Section>
  );
}

// Speicherort für eigene Azane – erscheint nur, wenn eine SD-Karte in der Uhr steckt
function Store({ voices, setVoices }) {
  async function pick(v) {
    if (v === voices.store) return;
    try {
      const r = await api('/api/settings', { ownStore: v });
      if (!r.ok) { toast(t('error'), true); return; }
      const v2 = await api('/api/azan/voices');
      if (v2.data) setVoices(sortV(v2.data));
      toast(t('saved'));
    } catch (e) { toast(t('offline'), true); }
  }
  return (
    <div className="pad-x mt">
      <p className="muted top">{t('store_title')}</p>
      <IonSegment value={String(voices.store || 0)} onIonChange={e => pick(Number(e.detail.value))}>
        <IonSegmentButton value="0"><IonLabel>{t('store_auto')}</IonLabel></IonSegmentButton>
        <IonSegmentButton value="1"><IonLabel>{t('store_clock')}</IonLabel></IonSegmentButton>
        <IonSegmentButton value="2"><IonLabel>{t('store_sd')}</IonLabel></IonSegmentButton>
      </IonSegment>
      <p className="muted">{t('store_hint')}</p>
    </div>
  );
}

// Ramadan-Azan: nur im Monat Ramadan zu Maghrib; bewusst ganz unten und eingeklappt
function Ramadan({ S, voices, setVoices, playOn }) {
  const [open, setOpen] = useState(false);
  const o = useOwn(voices, setVoices, slot => slot === 'ramadan' && save({ azanRamadan: 2 }, true));
  const has = o.own.ramadan > 0;
  const on = has && (S.azanRamadan ?? 1) !== 0;
  return (
    <Section title={t('ramadan_title')}>
      <IonList inset>
        <IonItem button detail={false} onClick={() => setOpen(!open)} lines={open ? 'full' : 'none'}>
          <IonIcon slot="start" icon={moonOutline} />
          <IonLabel className="ion-text-wrap">{t('ramadan_on')}<p>{on ? t('on') : t('off')}</p></IonLabel>
          <IonIcon slot="end" icon={open ? chevronUp : chevronDown} />
        </IonItem>
        {open && <>
          <IonItem lines={has ? 'full' : 'none'}>
            <IonLabel className="ion-text-wrap">{t('ramadan_file')}<p>{ownSub(o, 'ramadan', voices.where)}</p></IonLabel>
            <OwnButtons o={o} slot="ramadan" onPlay={() => playOn('/api/azan/preview', { id: 'ramadan' })} />
          </IonItem>
          {has && <IonItem lines="none">
            <IonToggle checked={on} onIonChange={e => save({ azanRamadan: e.detail.checked ? 2 : 0 }, true)}>{t('ramadan_on')}</IonToggle>
          </IonItem>}
        </>}
      </IonList>
      {open && <p className="section-hint">{t('ramadan_hint')}</p>}
      {o.input}
    </Section>
  );
}

export default function Azan() {
  const { S, ST, local } = useApp();
  const [voices, setVoices] = useState(null);
  const [perOpen, setPerOpen] = useState(false); // Azan und Lautstärke je Gebet: eingeklappt
  useEffect(() => {
    api('/api/azan/voices').then(r => { if (r.data) setVoices(sortV(r.data)); })
      .catch(() => setVoices({ list: [], selected: '' }));
  }, []);
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
          {!local && (voices ? <Voices voices={voices} setVoices={setVoices} playOn={playOn} /> : <div className="center pad"><IonSpinner /></div>)}
          <PhoneVoices />

          <Section title={t('azan')} hint={perOpen ? t('azan_volume_hint') : null}>
            <IonList inset className="azan-list">
              <IonItem button detail={false} onClick={() => setPerOpen(!perOpen)} lines={perOpen ? 'full' : 'none'}>
                <IonIcon slot="start" icon={volumeHighOutline} />
                <IonLabel className="ion-text-wrap">{t('azan_per_prayer')}
                  <p>{PRAYERS.filter(k => S.azan[k]).length === PRAYERS.length ? t('azan_all_on')
                    : PRAYERS.filter(k => S.azan[k]).map(k => t(k)).join(' · ') || t('off')}</p>
                </IonLabel>
                <IonIcon slot="end" icon={perOpen ? chevronUp : chevronDown} />
              </IonItem>
              {perOpen && PRAYERS.map((k, i) => (
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

          <Output S={S} local={local} />
          {!local && <ClockDuration S={S} />}
          <Timing S={S} ST={ST} />

          <Section title={t('azan_test_display')} hint={t('azan_test_hint')}>
            <div className="pad-x btnrow">
              <IonButton shape="round" onClick={() => playOn('/api/azan/test', { prayer: 'dhuhr' })}><IonIcon slot="start" icon={play} />{t('azan_test_normal')}</IonButton>
              <IonButton shape="round" onClick={() => playOn('/api/azan/test', { prayer: 'fajr' })}><IonIcon slot="start" icon={play} />{t('azan_test_fajr')}</IonButton>
              <IonButton shape="round" color="danger" fill="outline" onClick={stopAzan}><IonIcon slot="start" icon={stop} />{t('stop')}</IonButton>
            </div>
          </Section>

          {!local && voices && voices.own && <Ramadan S={S} voices={voices} setVoices={setVoices} playOn={playOn} />}
        </>}
      </IonContent>
    </IonPage>
  );
}
