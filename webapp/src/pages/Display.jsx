// Anzeige der Uhr: Reihenfolge der Seiten (am Griff ziehen), Hintergrund mit eigenem Bild,
// Farbvorlagen und eigene Farben, Helligkeit mit Nachtdimmung, RGB-LED
import { useEffect, useRef, useState } from 'react';
import {
  IonPage, IonContent, IonList, IonItem, IonLabel, IonToggle, IonReorderGroup, IonReorder, IonRange, IonIcon, IonNote, IonSpinner,
  IonSegment, IonSegmentButton, IonCheckbox,
} from '@ionic/react';
import { addOutline, trashOutline, sunnyOutline, moonOutline, lockClosedOutline, chevronForward, chevronBack } from 'ionicons/icons';
import { Bar } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import Svg from '../components/Svg.jsx';
import ColorSheet from '../components/ColorSheet.jsx';
import { t, lang } from '../lib/i18n.js';
import { PAGE_ICON } from '../lib/icons.js';
import { PRESETS, LED_PRESETS, THEME_SWATCHES } from '../lib/constants.js';
import { hex2hsl, hsl2hex } from '../lib/color.js';
import { cropImage } from '../lib/crop.js';
import { useApp, set, api, save, toast, confirmBox, applyTheme } from '../lib/store.js';
import { loadLed, ledSend } from '../lib/led.js';

const same = (a, b) => (a || '').toUpperCase() === (b || '').toUpperCase();

export default function Display() {
  const { S } = useApp();
  const chev = lang() === 'ar' ? chevronBack : chevronForward;

  // Seiten
  const [pages, setPages] = useState([]);
  useEffect(() => { if (S) setPages(S.pages.map(p => ({ ...p }))); }, [S]);
  function reorder(e) {
    const list = e.detail.complete(pages.slice());
    setPages(list);
    save({ pages: list }, true);
  }
  function togglePage(i, on) {
    const list = pages.map((p, j) => (j === i ? { ...p, on } : p));
    setPages(list); save({ pages: list }, true);
  }

  // Seiten automatisch wechseln: Intervall und beteiligte Seiten
  const ROT_STEPS = [30, 60, 120, 300];
  const rot = (S && S.rotate) || { seconds: 0, pages: [] };
  const rotOn = rot.seconds > 0;
  const setRot = part => save({ rotate: { seconds: rot.seconds || 60, pages: rot.pages, ...part } }, true);
  const rotLabel = sec => (sec < 60 ? `${sec} ${t('seconds_short')}` : `${sec / 60} ${t('minutes_short')}`);
  function toggleRotPage(id, on) {
    const list = pages.map(p => p.id).filter(k => (k === id ? on : rot.pages.includes(k)));
    setRot({ pages: list });
  }

  // Hintergründe; das eigene Bild ("custom") steht vorne, "+" lädt ein neues hoch (ersetzt das alte)
  const [bgs, setBgs] = useState(null);
  const [bgVer, setBgVer] = useState(Date.now());
  const fileRef = useRef(null);
  const takeBgs = names => { setBgs(names.slice().sort((a, b) => (a === 'custom' ? -1 : b === 'custom' ? 1 : 0))); setBgVer(Date.now()); };
  useEffect(() => { api('/api/backgrounds').then(r => takeBgs(r.data || [])).catch(() => setBgs('offline')); }, []);
  async function delBg() {
    if (!await confirmBox(t('bg_delete_q'), '', true)) return;
    const r = await api('/api/background/delete', {});
    if (r.ok) { takeBgs(r.data || []); toast(t('saved')); if (S.background === 'custom') set({ S: { ...S, background: 'noir' } }); }
  }
  async function upload(e) {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    const out = await cropImage(f, S.colors, t, () => toast(t('error'), true));
    if (!out) return;
    toast(t('bg_uploading'));
    try {
      const fd = new FormData();
      fd.append('bin', out.bin, 'custom.bin');
      fd.append('jpg', out.jpg, 'custom.jpg');
      const r = await fetch('/api/background/upload', { method: 'POST', body: fd });
      if (!r.ok) throw new Error();
      takeBgs(await r.json());
      await save({ background: 'custom' });
    } catch (err) { toast(t('error'), true); }
  }

  // Farben
  const [colorReq, setColorReq] = useState(null);
  function editColor(role) {
    const base = { ...S.colors };
    setColorReq({
      title: t('col_' + role), value: base[role], swatches: THEME_SWATCHES[role],
      live: hex => applyTheme({ ...base, [role]: hex }),
      done: v => { if (v && !same(v, base[role])) save({ colors: { ...base, [role]: v } }); else applyTheme(S.colors); },
    });
  }

  const [led, setLed] = useState(loadLed);
  const ledSet = part => { const n = { ...led, ...part }; setLed(n); ledSend(n); };

  return (
    <IonPage>
      <Bar title={t('nav_display')} back="/settings" />
      <IonContent>
        {!S ? <div className="center pad"><IonSpinner /></div> : <>
          <Section title={t('pages')} hint={t('pages_hint')}>
            <IonList inset>
              <IonReorderGroup disabled={false} onIonItemReorder={reorder}>
                {pages.map((p, i) => (
                  <IonItem key={p.id} className={p.on ? '' : 'off'}>
                    <span className="idx" slot="start">{i + 1}</span>
                    <span className="ico" slot="start"><Svg html={PAGE_ICON[p.id] || ''} /></span>
                    <IonToggle checked={p.on} onIonChange={e => togglePage(i, e.detail.checked)}>{t('page_' + p.id)}</IonToggle>
                    <IonReorder slot="end" />
                  </IonItem>
                ))}
              </IonReorderGroup>
              <IonItem lines="none" className="off">
                <span className="idx" slot="start">{pages.length + 1}</span>
                <span className="ico" slot="start"><IonIcon icon={lockClosedOutline} /></span>
                <IonLabel>{t('page_settings')}</IonLabel>
              </IonItem>
            </IonList>
          </Section>

          <Section title={t('rotate_title')} hint={t('rotate_hint')}>
            <IonList inset>
              <IonItem>
                <IonToggle checked={rotOn} onIonChange={e => setRot({ seconds: e.detail.checked ? (rot.seconds || 60) : 0, pages: rot.pages.length ? rot.pages : ['prayer', 'clock', 'weather'] })}>{t('rotate_on')}</IonToggle>
              </IonItem>
              {rotOn && <>
                <IonItem>
                  <IonLabel>{t('rotate_every')}</IonLabel>
                  <IonSegment slot="end" className="rot-seg" value={String(rot.seconds)} onIonChange={e => setRot({ seconds: Number(e.detail.value) })}>
                    {ROT_STEPS.map(v => <IonSegmentButton key={v} value={String(v)}><IonLabel>{rotLabel(v)}</IonLabel></IonSegmentButton>)}
                  </IonSegment>
                </IonItem>
                {pages.filter(p => p.on).map(p => (
                  <IonItem key={p.id}>
                    <span className="ico" slot="start"><Svg html={PAGE_ICON[p.id] || ''} /></span>
                    <IonCheckbox checked={rot.pages.includes(p.id)} onIonChange={e => toggleRotPage(p.id, e.detail.checked)} justify="space-between">{t('page_' + p.id)}</IonCheckbox>
                  </IonItem>
                ))}
              </>}
            </IonList>
          </Section>

          <Section title={t('background')}>
            <div className="pad-x">
              {bgs === null && <div className="center pad"><IonSpinner /></div>}
              {bgs === 'offline' && <div className="empty">{t('offline')}</div>}
              {Array.isArray(bgs) && (
                <div className="bgs">
                  <button className="bgadd" onClick={() => fileRef.current.click()}><IonIcon icon={addOutline} /><span>{t(bgs.includes('custom') ? 'bg_replace' : 'bg_own')}</span></button>
                  {bgs.map(n => (
                    <div className="bgwrap" key={n}>
                      <button className={'bg' + (n === S.background ? ' sel' : '')} onClick={() => save({ background: n })}>
                        <img src={`/bg/${encodeURIComponent(n)}.jpg?v=${bgVer}`} alt={n} loading="lazy" />
                      </button>
                      {n === 'custom' && <button className="bgdel" aria-label={t('delete')} onClick={delBg}><IonIcon icon={trashOutline} /></button>}
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
            </div>
          </Section>

          <Section title={t('presets')}>
            <div className="pad-x themes">
              {PRESETS.map(([k, m, a, mu]) => (
                <button key={k} className={same(S.colors.main, m) && same(S.colors.accent, a) && same(S.colors.muted, mu) ? 'on' : ''}
                  onClick={() => save({ colors: { main: m, accent: a, muted: mu } })}>
                  <span className="tprev"><b style={{ color: m }}>12:30</b><i style={{ background: a }} /><small style={{ color: mu }}>{t('fajr')}</small></span>
                  <span className="tname">{t(k)}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title={t('custom_colors')}>
            <IonList inset>
              {['main', 'accent', 'muted'].map(r => (
                <IonItem key={r} button detail detailIcon={chev} onClick={() => editColor(r)}>
                  <span className="sw" slot="start" style={{ background: S.colors[r] }} />
                  <IonLabel>{t('col_' + r)}</IonLabel>
                  <IonNote slot="end" className="ltr">{S.colors[r].toUpperCase()}</IonNote>
                </IonItem>
              ))}
            </IonList>
          </Section>

          <Section title={t('brightness')} hint={t('auto_dim_hint')}>
            <IonList inset>
              <IonItem>
                <IonRange min={5} max={100} value={S.brightness} pin pinFormatter={v => v + '%'} onIonKnobMoveEnd={e => save({ brightness: e.detail.value }, true)} aria-label={t('brightness')}>
                  <IonIcon slot="start" icon={sunnyOutline} className="accent" />
                </IonRange>
              </IonItem>
              <IonItem>
                <IonToggle checked={S.autoDim} onIonChange={e => save({ autoDim: e.detail.checked })}>{t('auto_dim')}</IonToggle>
              </IonItem>
              {S.autoDim && (
                <IonItem lines="none">
                  <IonRange min={5} max={100} value={S.nightBrightness} pin pinFormatter={v => v + '%'} label={t('night_brightness')} labelPlacement="stacked"
                    onIonKnobMoveEnd={e => save({ nightBrightness: e.detail.value }, true)}>
                    <IonIcon slot="start" icon={moonOutline} className="accent" />
                  </IonRange>
                </IonItem>
              )}
            </IonList>
          </Section>

          <Section title={t('led')} hint={t('led_hint')}>
            <IonList inset>
              <IonItem>
                <span className="ledglow" slot="start" style={{ '--c': led.on ? led.color : 'transparent' }} />
                <IonToggle checked={led.on} onIonChange={e => ledSet({ on: e.detail.checked })}>{t('led_on')}</IonToggle>
              </IonItem>
              <IonItem lines="none">
                <div className="led-box">
                  <div className="swatches big">
                    {LED_PRESETS.map(c => <button key={c} className={same(c, led.color) ? 'on' : ''} style={{ '--c': c }} aria-label={c} onClick={() => ledSet({ color: c, on: true })} />)}
                  </div>
                  <label className="f">{t('hue')}</label>
                  <input type="range" className="slider hue" min="0" max="359" value={Math.round(hex2hsl(led.color)[0])}
                    onChange={e => ledSet({ color: hsl2hex(Number(e.target.value), 1, 0.5), on: true })} />
                  <label className="f">{t('led_bri')}</label>
                  <input type="range" className="slider bri" min="5" max="100" value={led.bri} onChange={e => ledSet({ bri: Number(e.target.value), on: true })} />
                </div>
              </IonItem>
            </IonList>
          </Section>
        </>}
        <ColorSheet req={colorReq} onClose={() => setColorReq(null)} />
      </IonContent>
    </IonPage>
  );
}
