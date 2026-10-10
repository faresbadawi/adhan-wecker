// Gebetszeiten: Ort (für Berechnung und Wetter), Quelle (Berechnung oder Mawaqit-Moschee),
// Methode, Madhhab und Korrekturen je Gebet. Ein neu gewählter Ort schaltet auf Berechnung um.
import { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonList, IonItem, IonLabel, IonNote, IonIcon, IonSegment, IonSegmentButton, IonSelect, IonSelectOption,
  IonButton, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonSearchbar, IonSpinner, IonInput,
} from '@ionic/react';
import { locationOutline, searchOutline, openOutline, clipboardOutline, linkOutline, checkmarkCircle, chevronForward, chevronBack, removeOutline, addOutline } from 'ionicons/icons';
import { Bar, BigTitle } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t, lang } from '../lib/i18n.js';
import { METHODS, PRAYERS } from '../lib/constants.js';
import { useApp, save, saveLater, toast, parseMawaqit, resolveMosque, cachedMosque, km } from '../lib/store.js';

// Ort suchen (Open-Meteo-Geocoding, direkt vom Handy) und antippen
function PlaceSheet({ open, onClose }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  useEffect(() => { if (!open) { setQ(''); setRes(null); } }, [open]);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setRes(null); return; }
    const ctl = new AbortController();
    const id = setTimeout(async () => {
      setRes('loading');
      try {
        const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=8&language=${lang()}&name=` + encodeURIComponent(s), { signal: ctl.signal })).json();
        setRes(r.results || []);
      } catch (e) { if (e.name !== 'AbortError') setRes([]); }
    }, 350);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [q]);
  async function pick(p) {
    const ok = await save({
      city: p.name, country: p.country_code || '', latitude: Number(p.latitude.toFixed(4)), longitude: Number(p.longitude.toFixed(4)),
      source: 'calculated',
    }, true);
    if (ok) { toast(t('place_saved')); onClose(); }
  }
  const sep = lang() === 'ar' ? '، ' : ', ';
  return (
    <IonModal isOpen={open} onDidDismiss={onClose} initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]} className="sheet">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('place_title')}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onClose}>{t('cancel')}</IonButton></IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar value={q} onIonInput={e => setQ(e.detail.value || '')} placeholder={t('place_ph')} autoFocus debounce={0} enterkeyhint="search" />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {res === 'loading' && <div className="center pad"><IonSpinner /></div>}
        {Array.isArray(res) && !res.length && <div className="empty">{t('no_results')}</div>}
        {Array.isArray(res) && res.length > 0 && (
          <IonList inset>
            {res.map(p => (
              <IonItem key={p.id} button detail={false} onClick={() => pick(p)}>
                <IonIcon icon={locationOutline} slot="start" className="accent" />
                <IonLabel><h3>{p.name}</h3><p>{[p.admin1, p.country].filter(Boolean).join(sep)}</p></IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}
        {res === null && <p className="section-hint">{t('place_hint')}</p>}
      </IonContent>
    </IonModal>
  );
}

export default function Prayer() {
  const { S } = useApp();
  const [placeOpen, setPlaceOpen] = useState(false);
  // Teilen aus der Mawaqit-App klappt nur, wenn die App richtig installiert ist (Android, sicherer Ursprung)
  const canShare = window.isSecureContext && /android/i.test(navigator.userAgent);
  const canPaste = window.isSecureContext && !!(navigator.clipboard && navigator.clipboard.readText);
  const [link, setLink] = useState('');
  const [src, setSrc] = useState(null);
  const [off, setOff] = useState(null);
  useEffect(() => { if (S) setOff(S.offsets); }, [S]);
  const source = src || (S ? S.source : 'calculated');
  const chev = lang() === 'ar' ? chevronBack : chevronForward;

  function pickSource(v) {
    setSrc(v);
    if (v === 'calculated' || (S && S.mawaqit.slug)) save({ source: v });
  }
  // Link oder geteilten Text einfügen: sobald darin eine Mawaqit-Moschee steckt, prüft die Uhr sie
  // und übernimmt sie mit ihrem echten Namen (kein "Speichern" nötig)
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null); // Angaben zur gewählten Moschee (Name, Land, Koordinaten)
  useEffect(() => {
    if (!S || !S.mawaqit.slug) { setInfo(null); return; }
    const c = cachedMosque(S.mawaqit.slug);
    if (c) { setInfo(c); return; }
    resolveMosque({ slug: S.mawaqit.slug }).then(setInfo);
  }, [S && S.mawaqit.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  async function takeText(text) {
    const ref = parseMawaqit(text);
    if (!ref) return false;
    setBusy(true);
    const m = await resolveMosque(ref);
    setBusy(false);
    if (!m) { toast(t('mosque_not_found'), true); return true; }
    setLink(''); setSrc('mawaqit'); setInfo(m);
    if (await save({ source: 'mawaqit', mawaqit: { slug: m.slug, name: m.name } }, true)) toast(t('mosque_taken') + ': ' + m.name);
    return true;
  }
  function onLinkInput(v) {
    setLink(v);
    if (parseMawaqit(v)) takeText(v); // eingefügter Text mit Link: sofort übernehmen
  }
  async function paste() {
    try {
      const txt = await navigator.clipboard.readText();
      if (!await takeText(txt)) { setLink(txt); toast(t('mosque_link_bad'), true); }
    } catch (e) { toast(t('paste_denied'), true); }
  }
  // Entfernung der Moschee vom eingestellten Ort (Hinweis, wenn Zeiten und Ort nicht zusammenpassen)
  const dist = info && S && info.lat ? km(S.latitude, S.longitude, info.lat, info.lon) : null;
  const far = dist !== null && dist > 50;
  const fmtKm = d => Math.round(d).toLocaleString(lang() === 'ar' ? 'ar-u-nu-latn' : lang());
  function step(k, d) {
    const n = { ...off, [k]: Math.max(-30, Math.min(30, (off[k] || 0) + d)) };
    setOff(n);
    saveLater({ offsets: n }, true);
  }

  return (
    <IonPage>
      <Bar title={t('nav_prayer')} />
      <IonContent fullscreen>
        <BigTitle title={t('nav_prayer')} />
        {!S ? <div className="center pad"><IonSpinner /></div> : <>
          <Section title={t('place_title')} hint={source === 'mawaqit' ? t('mawaqit_hint') : t('place_hint')}>
            <IonList inset>
              <IonItem button detail detailIcon={chev} onClick={() => setPlaceOpen(true)}>
                <span className="ico" slot="start"><IonIcon icon={locationOutline} /></span>
                <IonLabel><h2 className="big">{S.city || '—'}</h2><p>{t('place_change')}</p></IonLabel>
                <IonNote slot="end">{S.country}</IonNote>
              </IonItem>
            </IonList>
          </Section>

          <Section title={t('source')}>
            <div className="pad-x">
              <IonSegment value={source} onIonChange={e => pickSource(e.detail.value)}>
                <IonSegmentButton value="calculated"><IonLabel>{t('source_calc')}</IonLabel></IonSegmentButton>
                <IonSegmentButton value="mawaqit"><IonLabel>{t('source_mawaqit')}</IonLabel></IonSegmentButton>
              </IonSegment>
            </div>
          </Section>

          {source === 'mawaqit' ? <>
            <Section title={t('mosque_chosen')}>
              <IonList inset>
                <IonItem lines="none">
                  <span className="ico" slot="start"><IonIcon icon={S.mawaqit.slug ? checkmarkCircle : searchOutline} /></span>
                  <IonLabel>
                    <h2 className="big">{S.mawaqit.slug ? ((info && info.name) || S.mawaqit.name || S.mawaqit.slug) : t('mosque_none')}</h2>
                    {S.mawaqit.slug && dist !== null && (
                      <p className={far ? 'far' : ''}>{t('mosque_distance').replace('{km}', fmtKm(dist)).replace('{place}', S.city)}{info.country ? ` · ${info.country}` : ''}</p>
                    )}
                  </IonLabel>
                </IonItem>
                {far && <IonItem lines="none" className="far-hint"><IonLabel className="ion-text-wrap">{t('mosque_far_hint')}</IonLabel></IonItem>}
              </IonList>
            </Section>

            <Section title={t('mosque_how')}>
              <div className="card-pad howto">
                <ol className="steps">
                  <li>{t('mosque_step1')}</li>
                  <li>{t('mosque_step2')}</li>
                  <li>{t(canShare ? 'mosque_step3_share' : 'mosque_step3_paste')}</li>
                </ol>
                <IonButton expand="block" shape="round" fill="outline" href="https://mawaqit.net/" target="_blank" className="mt">
                  <IonIcon slot="start" icon={openOutline} />{t('mosque_open_app')}
                </IonButton>
              </div>
            </Section>

            <Section title={t('mosque_link')} hint={t('mosque_link_hint')}>
              <div className="pad-x">
                <div className="link-row">
                  <IonIcon icon={linkOutline} className="accent" />
                  <IonInput value={link} placeholder={t('mosque_link_ph')} onIonInput={e => onLinkInput(e.detail.value || '')} disabled={busy}
                    onKeyDown={e => e.key === 'Enter' && takeText(link).then(ok => ok || toast(t('mosque_link_bad'), true))} />
                  {busy ? <IonSpinner name="crescent" className="small-spin" />
                    : canPaste && !link.trim() && <IonButton size="small" shape="round" fill="outline" onClick={paste}><IonIcon slot="start" icon={clipboardOutline} />{t('paste')}</IonButton>}
                </div>
              </div>
            </Section>
          </> : (
            <Section title={t('calc_settings')}>
              <IonList inset>
                <IonItem>
                  <IonSelect label={t('method')} value={S.method} interface="action-sheet" cancelText={t('cancel')}
                    onIonChange={e => save({ method: Number(e.detail.value) })}>
                    {METHODS.map(([id, ar, en]) => <IonSelectOption key={id} value={id}>{lang() === 'ar' ? ar : en}</IonSelectOption>)}
                  </IonSelect>
                </IonItem>
                <IonItem>
                  <IonSelect label={t('madhhab')} value={S.madhhab} interface="action-sheet" cancelText={t('cancel')}
                    onIonChange={e => save({ madhhab: Number(e.detail.value) })}>
                    {[0, 1].map(v => <IonSelectOption key={v} value={v}>{t('madhhab_' + v)}</IonSelectOption>)}
                  </IonSelect>
                </IonItem>
              </IonList>
            </Section>
          )}

          <Section title={t('offsets')} hint={t('offsets_hint')}>
            <IonList inset>
              {PRAYERS.map(k => (
                <IonItem key={k}>
                  <IonLabel>{t(k)}</IonLabel>
                  <div slot="end" className="stepper ltr">
                    <button onClick={() => step(k, -1)} aria-label="-1"><IonIcon icon={removeOutline} /></button>
                    <span className={off && off[k] ? 'nz' : ''}>{off ? (off[k] > 0 ? '+' : '') + (off[k] || 0) : 0}</span>
                    <button onClick={() => step(k, 1)} aria-label="+1"><IonIcon icon={addOutline} /></button>
                  </div>
                </IonItem>
              ))}
            </IonList>
          </Section>
        </>}
        <PlaceSheet open={placeOpen} onClose={() => setPlaceOpen(false)} />
      </IonContent>
    </IonPage>
  );
}
