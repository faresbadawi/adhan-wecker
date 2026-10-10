// Wecker: bis zu vier Weckzeiten (Zeit am Drehrad, Name, Wochentage, zum Löschen zur Seite wischen),
// Wecker zum letzten Drittel der Nacht, Weckton und Lautstärke
import { useEffect, useState } from 'react';
import {
  IonPage, IonContent, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonToggle, IonIcon,
  IonButton, IonRange, IonModal, IonDatetime, IonHeader, IonToolbar, IonTitle, IonButtons, IonSpinner, IonInput,
} from '@ionic/react';
import { addOutline, trashOutline, moonOutline, play, checkmark, volumeLowOutline, volumeHighOutline, removeOutline } from 'ionicons/icons';
import { Bar, BigTitle } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t } from '../lib/i18n.js';
import { MAX_ALARMS, DAY_ORDER } from '../lib/constants.js';
import { useApp, api, save, saveLater, toast, confirmBox, toMin, two } from '../lib/store.js';

const volPct = v => Math.round(v * 100 / 21); // Decoder 0..21 <-> Prozent

export default function Alarm() {
  const { S, ST } = useApp();
  const [alarms, setAlarms] = useState(null);
  const [tj, setTj] = useState(null);
  const [edit, setEdit] = useState(-1); // Index des Weckers, dessen Zeit gerade gewählt wird
  const [pick, setPick] = useState('06:00');
  const [sounds, setSounds] = useState(null);
  useEffect(() => {
    if (!S) return;
    setAlarms(S.alarms.map(a => ({ ...a })));
    setTj({ on: false, offset: 0, ...S.tahajjud });
  }, [S]);
  useEffect(() => {
    api('/api/sounds').then(r => { if (r.data) setSounds({ list: r.data.list, selected: (r.data.selected || '').trim() }); }).catch(() => setSounds({ list: [], selected: '' }));
  }, []);
  const days = t('days');

  const store = (list, later) => { setAlarms(list); (later ? saveLater : save)({ alarms: list.map(a => ({ ...a })) }, later); };
  const patch = (i, part, later) => store(alarms.map((a, j) => (j === i ? { ...a, ...part } : a)), later);
  function toggleDay(i, bit) {
    const m = alarms[i].days ^ (1 << bit);
    if (!m) { toast(t('day_min'), true); return; }
    patch(i, { days: m });
  }
  const add = () => store([...alarms, { on: true, time: '06:00', days: 127, name: '' }]);
  async function remove(i) {
    if (!await confirmBox(t('are_you_sure'), alarms[i].name || alarms[i].time, true)) return;
    store(alarms.filter((_, j) => j !== i));
  }
  function openTime(i) { setPick(alarms[i].time); setEdit(i); }
  function takeTime() {
    if (edit >= 0 && pick !== alarms[edit].time) patch(edit, { time: pick });
    setEdit(-1);
  }
  // Nachtwecker: höchstens bis zur Fajr-Zeit verschieben (die Uhr begrenzt ebenso)
  const night = ST && ST.night;
  const tjMax = night ? Math.min(255, ((toMin(night.fajr) - toMin(night.lastThird)) + 1440) % 1440) : 255;
  const tjAt = night && tj ? (() => { const m = (toMin(night.lastThird) + Math.min(tj.offset, tjMax)) % 1440; return `${two(Math.floor(m / 60))}:${two(m % 60)}`; })() : '';
  const tjAtFajr = !!night && tj && tj.offset >= tjMax;
  const tjSet = (part, later) => { const n = { ...tj, ...part }; setTj(n); (later ? saveLater : save)({ tahajjud: n }, later); };

  const toneName = n => (t('tone_' + n) === 'tone_' + n ? n : t('tone_' + n));
  async function chooseTone(n) {
    if (n === sounds.selected) return;
    const r = await api('/api/sound', { name: n });
    if (r.ok) { setSounds({ list: r.data.list, selected: (r.data.selected || '').trim() }); toast(t('saved')); } else toast(t('error'), true);
  }
  async function hear(n) {
    try { const r = await api('/api/preview', { name: n }); toast(r.ok ? t('tone_playing') : t('error'), !r.ok); }
    catch (e) { toast(t('offline'), true); }
  }
  async function testAlarm() {
    try { const r = await api('/api/alarm/test', {}); toast(r.ok ? t('alarm_test_running') : t('error'), !r.ok); }
    catch (e) { toast(t('offline'), true); }
  }
  async function setVolume(pct) {
    const ok = await save({ volume: Math.round(pct * 21 / 100) }, true);
    if (ok && sounds && sounds.selected) api('/api/preview', { name: sounds.selected }).catch(() => {});
  }

  return (
    <IonPage>
      <Bar title={t('nav_alarm')} />
      <IonContent fullscreen>
        <BigTitle title={t('nav_alarm')} />
        {!S || !alarms ? <div className="center pad"><IonSpinner /></div> : <>
          <Section title={t('alarm_times')} hint={`${t('alarm_hint')} ${t('swipe_delete')}`}>
            {!alarms.length && <div className="empty">{t('alarm_none')}</div>}
            <IonList inset className="alarms">
              {alarms.map((a, i) => (
                <IonItemSliding key={i}>
                  <IonItem lines={i < alarms.length - 1 ? 'full' : 'none'} className={'alarm' + (a.on ? '' : ' off')}>
                    <div className="alarm-in">
                      <div className="arow">
                        <button className="tbtn num ltr" onClick={() => openTime(i)}>{a.time}</button>
                        <IonToggle checked={a.on} onIonChange={e => patch(i, { on: e.detail.checked })} aria-label={t('alarm_on')} />
                      </div>
                      <IonInput className="aname" value={a.name || ''} placeholder={t('alarm_name_ph')} maxlength={40}
                        onIonInput={e => patch(i, { name: e.detail.value || '' }, true)} />
                      <div className="days">
                        {DAY_ORDER.map(bit => (
                          <button key={bit} className={a.days & (1 << bit) ? 'on' : ''} onClick={() => toggleDay(i, bit)}>{days[bit]}</button>
                        ))}
                      </div>
                    </div>
                  </IonItem>
                  <IonItemOptions side="end">
                    <IonItemOption color="danger" expandable onClick={() => remove(i)}><IonIcon slot="icon-only" icon={trashOutline} /></IonItemOption>
                  </IonItemOptions>
                </IonItemSliding>
              ))}
            </IonList>
            <div className="pad-x btnrow mt">
              <IonButton shape="round" fill="outline" onClick={testAlarm}><IonIcon slot="start" icon={play} />{t('alarm_test')}</IonButton>
            </div>
            {alarms.length < MAX_ALARMS && (
              <div className="pad-x"><IonButton expand="block" fill="outline" shape="round" onClick={add}><IonIcon slot="start" icon={addOutline} />{t('alarm_add')}</IonButton></div>
            )}
          </Section>

          <Section title={t('tj_title')} hint={t('tj_hint')}>
            <IonList inset>
              <IonItem>
                <span className="ico" slot="start"><IonIcon icon={moonOutline} /></span>
                <IonToggle checked={tj.on} onIonChange={e => tjSet({ on: e.detail.checked })}>{t('tj_on')}</IonToggle>
              </IonItem>
              {tj.on && <>
                <IonItem>
                  <IonLabel>{t('tj_offset')}</IonLabel>
                  <div slot="end" className="stepper ltr">
                    <button onClick={() => tjSet({ offset: Math.max(0, Math.min(tj.offset, tjMax) - 5) }, true)} disabled={tj.offset <= 0} aria-label="-5"><IonIcon icon={removeOutline} /></button>
                    <span className={tj.offset ? 'nz' : ''}>{tj.offset ? '+' + Math.min(tj.offset, tjMax) : 0}</span>
                    <button onClick={() => tjSet({ offset: Math.min(tjMax, tj.offset + 5) }, true)} disabled={tjAtFajr} aria-label="+5"><IonIcon icon={addOutline} /></button>
                  </div>
                </IonItem>
                {night && (
                  <IonItem lines="none">
                    <IonLabel className={'tj-at' + (tjAtFajr ? ' fajr' : '')}>
                      {tjAtFajr ? `${t('tj_fajr_reached')} (${night.fajr})` : `${t('tj_rings_at')} ${tjAt}`}
                    </IonLabel>
                  </IonItem>
                )}
              </>}
            </IonList>
          </Section>

          <Section title={t('alarm_tone')} hint={t('alarm_volume_hint')}>
            <IonList inset>
              {!sounds && <div className="center pad"><IonSpinner /></div>}
              {sounds && sounds.list.map(n => (
                <IonItem key={n} button detail={false} onClick={() => chooseTone(n)}>
                  <IonIcon slot="start" icon={checkmark} className={'check' + (n === sounds.selected ? '' : ' hidden')} />
                  <IonLabel>{toneName(n)}</IonLabel>
                  <IonButton slot="end" fill="clear" className="play" onClick={e => { e.stopPropagation(); hear(n); }} aria-label={t('listen')}><IonIcon slot="icon-only" icon={play} /></IonButton>
                </IonItem>
              ))}
              <IonItem lines="none">
                <IonRange className="vol" min={0} max={100} value={volPct(S.volume)} pin pinFormatter={v => v + '%'} onIonKnobMoveEnd={e => setVolume(e.detail.value)} aria-label={t('volume')}>
                  <IonIcon slot="start" icon={volumeLowOutline} />
                  <IonIcon slot="end" icon={volumeHighOutline} />
                </IonRange>
              </IonItem>
            </IonList>
          </Section>
        </>}

        <IonModal isOpen={edit >= 0} onDidDismiss={() => setEdit(-1)} initialBreakpoint={0.5} breakpoints={[0, 0.5]} className="sheet time-sheet">
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start"><IonButton onClick={() => setEdit(-1)}>{t('cancel')}</IonButton></IonButtons>
              <IonTitle>{t('alarm_time')}</IonTitle>
              <IonButtons slot="end"><IonButton strong onClick={takeTime}>{t('done')}</IonButton></IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {edit >= 0 && (
              <IonDatetime presentation="time" preferWheel hourCycle="h23" value={pick} minuteValues={undefined}
                onIonChange={e => { const v = String(e.detail.value || ''); const m = v.match(/(\d{2}):(\d{2})/); if (m) setPick(`${m[1]}:${m[2]}`); }} />
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}
