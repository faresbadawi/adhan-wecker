// Einrichtungsassistent: erscheint beim ersten Öffnen der App auf einem Gerät (und auf Wunsch unter Einstellungen).
// Wenige, einfache Schritte mit Erklärung; jede Wahl wird sofort auf der Uhr gespeichert.
import { useEffect, useState } from 'react';
import {
  IonModal, IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, IonToggle, IonSearchbar, IonSpinner,
  IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonInput, IonDatetime,
} from '@ionic/react';
import { locationOutline, checkmark, play, linkOutline, chevronForward, chevronBack } from 'ionicons/icons';
import Svg from './Svg.jsx';
import { t, lang, LANGS } from '../lib/i18n.js';
import { PAGE_ICON } from '../lib/icons.js';
import { METHODS } from '../lib/constants.js';
import { useApp, api, save, saveLater, toast, parseMawaqit, resolveMosque } from '../lib/store.js';
import { takeSearchedPlace, takeMosque } from '../lib/place.js';
import { loadLed, ledSend } from '../lib/led.js';
import { reloadApp } from '../lib/errors.js';

const CLOCK_STEPS = ['welcome', 'place', 'times', 'azan', 'alarm', 'display', 'light', 'done'];
const PHONE_STEPS = ['welcome', 'place', 'times', 'azan', 'done']; // ohne Uhr: keine Schritte für Wecker, Anzeige und Licht der Uhr
const KEY = 'bilalSetup'; // "done" oder Nummer des Schritts (nach dem Neuladen bei Sprachwechsel)

export const setupDone = () => { try { return localStorage.getItem(KEY) === 'done'; } catch (e) { return true; } };
export const restartSetup = () => { try { localStorage.setItem(KEY, '0'); } catch (e) { /* privat */ } };

// ---------- Schritt: Ort suchen
function PlaceStep({ S }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setRes(null); return; }
    const ctl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=6&language=${lang()}&name=` + encodeURIComponent(s), { signal: ctl.signal })).json();
        setRes(r.results || []);
      } catch (e) { if (e.name !== 'AbortError') setRes([]); }
    }, 350);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [q]);
  async function pick(p) {
    setBusy(true);
    if (await takeSearchedPlace(p)) { setQ(''); setRes(null); toast(t('place_saved')); }
    setBusy(false);
  }
  const sep = lang() === 'ar' ? '، ' : ', ';
  return <>
    <div className="ob-current"><IonIcon icon={locationOutline} /><b>{S.city}</b><span>{S.country}</span>{busy && <IonSpinner name="crescent" />}</div>
    <IonSearchbar value={q} onIonInput={e => setQ(e.detail.value || '')} placeholder={t('place_ph')} debounce={0} />
    {Array.isArray(res) && (
      <IonList inset>
        {res.length ? res.map(p => (
          <IonItem key={p.id} button detail={false} onClick={() => pick(p)}>
            <IonLabel><h3>{p.name}</h3><p>{[p.admin1, p.country].filter(Boolean).join(sep)}</p></IonLabel>
          </IonItem>
        )) : <IonItem><IonLabel>{t('no_results')}</IonLabel></IonItem>}
      </IonList>
    )}
  </>;
}

// ---------- Schritt: Quelle der Gebetszeiten
function TimesStep({ S }) {
  const [src, setSrc] = useState(S.source);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  async function takeText(v) {
    setLink(v);
    const ref = parseMawaqit(v);
    if (!ref) return;
    setBusy(true);
    const m = await resolveMosque(ref);
    if (!m) toast(t('mosque_not_found'), true);
    else if (await takeMosque(m)) { toast(t('mosque_taken')); setLink(''); }
    setBusy(false);
  }
  function pickSource(v) {
    setSrc(v);
    if (v === 'calculated' || S.mawaqit.slug) save({ source: v }, true);
  }
  return <>
    <IonSegment value={src} onIonChange={e => pickSource(e.detail.value)}>
      <IonSegmentButton value="calculated"><IonLabel>{t('source_calc')}</IonLabel></IonSegmentButton>
      <IonSegmentButton value="mawaqit"><IonLabel>{t('source_mawaqit')}</IonLabel></IonSegmentButton>
    </IonSegment>
    {src === 'calculated' ? <>
      <p className="ob-text">{t('ob_calc_text')}</p>
      <IonList inset>
        <IonItem>
          <IonSelect label={t('method')} value={S.method} interface="action-sheet" cancelText={t('cancel')} onIonChange={e => save({ method: Number(e.detail.value) }, true)}>
            {METHODS.map(([id, ar, en]) => <IonSelectOption key={id} value={id}>{lang() === 'ar' ? ar : en}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
      </IonList>
    </> : <>
      <ol className="steps ob-steps">
        <li>{t('mosque_step1')}</li>
        <li>{t('mosque_step2')}</li>
        <li>{t('ob_mawaqit_step3')}</li>
      </ol>
      <div className="link-row">
        <IonIcon icon={linkOutline} className="accent" />
        <IonInput value={link} placeholder={t('mosque_link_ph')} onIonInput={e => takeText(e.detail.value || '')} disabled={busy} />
        {busy && <IonSpinner name="crescent" className="small-spin" />}
      </div>
      {S.source === 'mawaqit' && S.mawaqit.slug && <p className="ob-ok"><IonIcon icon={checkmark} /> {S.mawaqit.name} · {S.city}</p>}
      <p className="ob-text small">{t('ob_mawaqit_note')}</p>
    </>}
  </>;
}

// ---------- Schritt: Azan (Muezzin, an/aus)
function AzanStep({ S }) {
  const [voices, setVoices] = useState(null);
  useEffect(() => { api('/api/azan/voices').then(r => r.data && setVoices(r.data)).catch(() => {}); }, []);
  const allOn = Object.values(S.azan).every(Boolean);
  const voiceName = id => (t('voice_' + id) === 'voice_' + id ? id : t('voice_' + id));
  async function choose(id) {
    const r = await api('/api/azan/voice', { id });
    if (r.ok) setVoices(r.data);
  }
  return <>
    <IonList inset>
      <IonItem><IonToggle checked={allOn} onIonChange={e => save({ azan: { fajr: e.detail.checked, dhuhr: e.detail.checked, asr: e.detail.checked, maghrib: e.detail.checked, isha: e.detail.checked } }, true)}>{t('ob_azan_all')}</IonToggle></IonItem>
    </IonList>
    <h3 className="ob-sub">{t('azan_voice')}</h3>
    <IonList inset>
      {!voices && <IonItem><IonSpinner /></IonItem>}
      {voices && voices.list.slice().sort().map(id => (
        <IonItem key={id} button detail={false} onClick={() => choose(id)}>
          <IonIcon slot="start" icon={checkmark} className={'check' + (id === voices.selected ? '' : ' hidden')} />
          <IonLabel>{voiceName(id)}</IonLabel>
          <IonButton slot="end" fill="clear" className="play" onClick={e => { e.stopPropagation(); api('/api/azan/preview', { id }); }}><IonIcon slot="icon-only" icon={play} /></IonButton>
        </IonItem>
      ))}
    </IonList>
  </>;
}

// ---------- Schritt: erster Wecker und Wecker zum letzten Drittel der Nacht
function AlarmStep({ S }) {
  const first = S.alarms[0] || { on: false, time: '06:00', days: 127, name: '' };
  const setFirst = (part, later) => (later ? saveLater : save)({ alarms: [{ ...first, ...part }, ...S.alarms.slice(1)] }, true);
  return <>
    <IonList inset>
      <IonItem><IonToggle checked={first.on} onIonChange={e => setFirst({ on: e.detail.checked })}>{t('ob_alarm_on')}</IonToggle></IonItem>
    </IonList>
    <div className="ob-time">
      <IonDatetime presentation="time" preferWheel hourCycle="h23" value={first.time}
        onIonChange={e => { const m = String(e.detail.value || '').match(/(\d{2}):(\d{2})/); if (m && `${m[1]}:${m[2]}` !== first.time) setFirst({ time: `${m[1]}:${m[2]}`, on: true }, true); }} />
    </div>
    <p className="ob-text small">{t('ob_alarm_more')}</p>
    <IonList inset>
      <IonItem><IonToggle checked={S.tahajjud.on} onIonChange={e => save({ tahajjud: { ...S.tahajjud, on: e.detail.checked } }, true)}>{t('tj_title')}</IonToggle></IonItem>
    </IonList>
    <p className="ob-text small">{t('ob_tj_text')}</p>
  </>;
}

// ---------- Schritt: Seiten der Uhr und automatischer Wechsel
function DisplayStep({ S }) {
  const pages = S.pages;
  const rot = S.rotate || { seconds: 0, pages: [] };
  return <>
    <IonList inset>
      {pages.map((p, i) => (
        <IonItem key={p.id}>
          <span className="ico" slot="start"><Svg html={PAGE_ICON[p.id] || ''} /></span>
          <IonToggle checked={p.on} onIonChange={e => save({ pages: pages.map((x, j) => (j === i ? { ...x, on: e.detail.checked } : x)) }, true)}>{t('page_' + p.id)}</IonToggle>
        </IonItem>
      ))}
    </IonList>
    <IonList inset>
      <IonItem><IonToggle checked={rot.seconds > 0} onIonChange={e => save({ rotate: { seconds: e.detail.checked ? 60 : 0, pages: rot.pages.length ? rot.pages : ['prayer', 'clock', 'weather'] } }, true)}>{t('rotate_on')}</IonToggle></IonItem>
    </IonList>
    <p className="ob-text small">{t('ob_rotate_text')}</p>
  </>;
}

// ---------- Schritt: Licht (LED)
function LightStep() {
  const [led, setLed] = useState(loadLed);
  const setL = part => { const n = { ...led, ...part }; setLed(n); ledSend(n); };
  const COLORS = ['#FF0000', '#FF6A00', '#FFD000', '#00FF00', '#00C8FF', '#0000FF', '#A000FF', '#FFFFFF'];
  return <>
    <IonList inset>
      <IonItem>
        <span className="ledglow" slot="start" style={{ '--c': led.on ? led.color : 'transparent' }} />
        <IonToggle checked={led.on} onIonChange={e => setL({ on: e.detail.checked })}>{t('led_on')}</IonToggle>
      </IonItem>
    </IonList>
    <div className="swatches big ob-swatches">
      {COLORS.map(c => <button key={c} className={led.color.toUpperCase() === c ? 'on' : ''} style={{ '--c': c }} aria-label={c} onClick={() => setL({ color: c, on: true })} />)}
    </div>
  </>;
}

export default function Onboarding({ open, onClose }) {
  const { S, local } = useApp();
  const STEPS = local ? PHONE_STEPS : CLOCK_STEPS;
  // Schritt beim Öffnen aus dem Speicher (nach Sprachwechsel geht es dort weiter), sonst von vorn
  const savedStep = () => { try { const v = Number(localStorage.getItem(KEY)); return isNaN(v) ? 0 : Math.min(v, STEPS.length - 1); } catch (e) { return 0; } };
  const [step, setStepState] = useState(savedStep);
  useEffect(() => { if (open) setStepState(savedStep()); }, [open]);
  const setStep = n => { setStepState(n); try { localStorage.setItem(KEY, String(n)); } catch (e) { /* privat */ } };
  const id = STEPS[step];
  const last = step === STEPS.length - 1;
  function finish() {
    try { localStorage.setItem(KEY, 'done'); } catch (e) { /* privat */ }
    api('/api/device/setup', { done: true }).catch(() => {}); // die Uhr merkt es sich (Werkseinstellungen löschen den Merker)
    onClose();
    setTimeout(() => { window.location.hash = '#/home'; }, 350); // nach dem Einrichten direkt zur Startseite (erst nach dem Schließen des Fensters)
  }
  async function chooseLang(l) {
    if (l === lang()) return;
    try {
      const r = await api('/api/device/lang', { lang: l === 'tr' ? 'en' : l }); // Türkisch gibt es nur in der App, die Uhr zeigt dann Englisch
      if (!r.ok) throw new Error();
      try { localStorage.setItem('lang', l); localStorage.setItem(KEY, '0'); } catch (e) { /* privat */ }
      toast(t('lang_restart'));
      setTimeout(() => reloadApp(), 900);
    } catch (e) { toast(t('offline'), true); }
  }
  const back = lang() === 'ar' ? chevronForward : chevronBack, fwd = lang() === 'ar' ? chevronBack : chevronForward;

  return (
    <IonModal isOpen={open} backdropDismiss={false} className="onboarding">
      <IonContent className="ion-padding">
        <div className="ob">
          <div className="ob-head">
            <div className="ob-dots">{STEPS.map((s, i) => <i key={s} className={i === step ? 'on' : i < step ? 'past' : ''} />)}</div>
            {!last && <button className="ob-skip" onClick={() => setStep(step + 1)} aria-label={t('ob_skip_step')}>{t('ob_skip')}</button>}
          </div>

          {id === 'welcome' && <div className="ob-hero"><div className="ob-name">بلال</div><div className="ob-latin">B I L A L</div></div>}
          <h1 className="ob-title">{t('ob_' + id + '_title')}</h1>
          <p className="ob-text">{t('ob_' + id + '_text')}</p>

          {!S ? <div className="center pad"><IonSpinner /></div> : <>
            {id === 'welcome' && (
              <IonList inset>
                {Object.entries(LANGS).map(([k, n]) => (
                  <IonItem key={k} button detail={false} onClick={() => chooseLang(k)} lang={k}>
                    <IonIcon slot="start" icon={checkmark} className={'check' + (k === lang() ? '' : ' hidden')} />
                    <IonLabel>{n}</IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
            {id === 'place' && <PlaceStep S={S} />}
            {id === 'times' && <TimesStep S={S} />}
            {id === 'azan' && <AzanStep S={S} />}
            {id === 'alarm' && <AlarmStep S={S} />}
            {id === 'display' && <DisplayStep S={S} />}
            {id === 'light' && <LightStep />}
            {id === 'done' && (
              <ul className="ob-summary">
                <li><b>{t('nav_prayer')}</b> · {S.source === 'mawaqit' ? S.mawaqit.name : t('source_calc')} · {S.city}</li>
                <li><b>{t('nav_alarm')}</b> · {S.alarms[0] && S.alarms[0].on ? S.alarms[0].time : '—'}{S.tahajjud.on ? ' · ' + t('tj_title') : ''}</li>
                <li><b>{t('nav_display')}</b> · {S.pages.filter(p => p.on).length} {t('ob_pages')}</li>
              </ul>
            )}
          </>}

          <div className="ob-nav">
            {step > 0 ? <IonButton fill="clear" onClick={() => setStep(step - 1)}><IonIcon slot="start" icon={back} />{t('ob_back')}</IonButton> : <span />}
            {last
              ? <IonButton shape="round" onClick={finish}>{t('ob_finish')}</IonButton>
              : <IonButton shape="round" onClick={() => setStep(step + 1)}>{t('ob_next')}<IonIcon slot="end" icon={fwd} /></IonButton>}
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
}
