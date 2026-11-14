// Anzeige der Uhr: Reihenfolge der Seiten (am Griff ziehen), Hintergrund mit eigenem Bild,
// Gehäuse (schwarz/weiß) bestimmt passende Hintergründe und Farbvorlagen, eigene Farben, Helligkeit mit Nachtdimmung.
// Das LED-Licht steht als Lampen-Symbol oben auf der Startseite.
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
import { PRESETS, LIGHT_PRESETS, DARK_BGS, LIGHT_BGS, THEME_SWATCHES } from '../lib/constants.js';
import { hex2hsl } from '../lib/color.js';
import { cropImage } from '../lib/crop.js';
import { useApp, set, api, save, toast, confirmBox, applyTheme } from '../lib/store.js';

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

  // Gehäuse: weiß, wenn die Hauptschrift dunkel ist (helle Vorlagen), sonst schwarz. Die Wahl des Gehäuses
  // stellt passende Farben und einen passenden Hintergrund ein; danach zeigt die Seite nur, was dazu passt.
  const white = S ? hex2hsl(S.colors.main)[2] < 0.5 : false;
  const fitsCase = n => n === 'custom' || (white ? LIGHT_BGS.includes(n) : !LIGHT_BGS.includes(n));
  function pickCase(w) {
    if (w === white) return;
    const [, m, a, mu] = (w ? LIGHT_PRESETS : PRESETS)[0];
    const part = { colors: { main: m, accent: a, muted: mu } };
    if (S.background !== 'custom') part.background = w ? LIGHT_BGS[0] : DARK_BGS[0];
    save(part);
  }
  function pickPreset(m, a, mu, light) {
    const part = { colors: { main: m, accent: a, muted: mu } };
    if (light && !LIGHT_BGS.includes(S.background) && S.background !== 'custom') part.background = LIGHT_BGS[0];
    if (!light && LIGHT_BGS.includes(S.background)) part.background = DARK_BGS[0];
    save(part);
  }
  const presetGrid = (list, light) => (
    <div className="pad-x themes">
      {list.map(([k, m, a, mu]) => (
        <button key={k} className={same(S.colors.main, m) && same(S.colors.accent, a) && same(S.colors.muted, mu) ? 'on' : ''} onClick={() => pickPreset(m, a, mu, light)}>
          <span className={'tprev' + (light ? ' light' : '')}><b style={{ color: m }}>12:30</b><i style={{ background: a }} /><small style={{ color: mu }}>{t('fajr')}</small></span>
          <span className="tname">{t(k)}</span>
        </button>
      ))}
    </div>
  );
  const [colorReq, setColorReq] = useState(null);
  function editColor(role) {
    const base = { ...S.colors };
    setColorReq({
      title: t('col_' + role), value: base[role],
      swatches: THEME_SWATCHES[role].filter(c => role !== 'main' || (hex2hsl(c)[2] < 0.5) === white),
      live: hex => applyTheme({ ...base, [role]: hex }),
      done: v => { if (v && !same(v, base[role])) save({ colors: { ...base, [role]: v } }); else applyTheme(S.colors); },
    });
  }


  return (
    <IonPage>
      <Bar title={t('nav_display')} back="/settings" />
      <IonContent>
        {!S ? <div className="center pad"><IonSpinner /></div> : <>
          <Section title={t('case_title')} hint={t('case_hint')}>
            <div className="pad-x cases">
              {[false, true].map(w => (
                <button key={String(w)} className={'case' + (w ? ' white' : ' black') + (w === white ? ' on' : '')} onClick={() => pickCase(w)}>
                  <span className="case-body"><span className="case-screen"><b>12:30</b><i /></span></span>
                  <span className="tname">{t(w ? 'case_white' : 'case_black')}</span>
                </button>
              ))}
            </div>
          </Section>

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
                  {bgs.filter(fitsCase).map(n => (
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

          <Section title={t('presets')}>{white ? presetGrid(LIGHT_PRESETS, true) : presetGrid(PRESETS, false)}</Section>

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

        </>}
        <ColorSheet req={colorReq} onClose={() => setColorReq(null)} />
      </IonContent>
    </IonPage>
  );
}
