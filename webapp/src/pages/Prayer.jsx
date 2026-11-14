// Gebetszeiten: Ort (für Berechnung und Wetter), Quelle (Berechnung oder Mawaqit-Moschee),
// Methode, Madhhab und Korrekturen je Gebet. Ein neu gewählter Ort schaltet auf Berechnung um.
import { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonList, IonItem, IonLabel, IonNote, IonIcon, IonSegment, IonSegmentButton, IonSelect, IonSelectOption,
  IonButton, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonSearchbar, IonSpinner, IonInput,
} from '@ionic/react';
import { locationOutline, navigateOutline, logOutOutline, logInOutline, searchOutline, openOutline, clipboardOutline, linkOutline, checkmarkCircle, chevronForward, chevronBack, removeOutline, addOutline } from 'ionicons/icons';
import { Bar, BigTitle } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t, lang } from '../lib/i18n.js';
import { METHODS, PRAYERS } from '../lib/constants.js';
import { useApp, save, saveLater, toast, parseMawaqit, resolveMosque, cachedMosque, api, km, LOCAL_ONLY } from '../lib/store.js';
import { kvGet, kvSet, kvDel, hasNative } from '../lib/native.js';
import { takeSearchedPlace, takeMosque } from '../lib/place.js';

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
    if (await takeSearchedPlace(p)) { toast(t('place_saved')); onClose(); }
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

// Moschee direkt bei Mawaqit suchen. Mawaqit gibt die Suche nur mit Anmeldung frei: jeder Nutzer meldet sich
// einmal mit seinem eigenen Mawaqit-Konto an; die App behält nur den Zugangsschlüssel (nicht das Passwort).
// Die Anfragen laufen über die Uhr oder die Android-App (der Browser allein darf mawaqit.net nicht abfragen).
function MosqueSearch({ S, onPick }) {
  const [token, setToken] = useState(() => kvGet('mawaqitToken', ''));
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const usable = !LOCAL_ONLY || hasNative();
  if (!usable) return <Section title={t('mq_title')} hint={t('mq_unavailable')} />;

  async function login() {
    if (!user.trim() || !pass) return;
    setBusy(true);
    try {
      const r = await api('/api/mawaqit/login', { user: user.trim(), pass });
      if (r.ok && r.data && r.data.token) { kvSet('mawaqitToken', r.data.token); setToken(r.data.token); setPass(''); toast(t('mq_logged_in')); }
      else toast(t(r.status === 401 ? 'mq_login_bad' : 'mq_error'), true);
    } catch (e) { toast(t('mq_error'), true); }
    setBusy(false);
  }
  function logout() { kvDel('mawaqitToken'); setToken(''); setRes(null); }
  async function search(near) {
    const word = q.trim();
    if (!near && word.length < 2) return;
    setBusy(true); setRes('loading');
    try {
      const r = await api('/api/mawaqit/search', near ? { token, lat: S.latitude, lon: S.longitude } : { token, q: word });
      if (r.status === 401) { logout(); toast(t('mq_expired'), true); setBusy(false); return; }
      if (!r.ok || !Array.isArray(r.data)) throw new Error('search');
      const list = r.data.map(m => ({ ...m, km: m.lat != null && m.lon != null && (S.latitude || S.longitude) ? km(S.latitude, S.longitude, m.lat, m.lon) : null }));
      if (near) list.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
      setRes(list);
    } catch (e) { setRes(null); toast(t('mq_error'), true); }
    setBusy(false);
  }
  async function pick(m) {
    setBusy(true);
    await onPick(m.slug);
    setBusy(false);
  }

  if (!token) return (
    <Section title={t('mq_title')} hint={t('mq_login_hint')}>
      <IonList inset>
        <IonItem><IonInput label={t('mq_email')} labelPlacement="stacked" type="email" autocomplete="username" value={user} onIonInput={e => setUser(e.detail.value || '')} /></IonItem>
        <IonItem><IonInput label={t('mq_pass')} labelPlacement="stacked" type="password" autocomplete="current-password" value={pass} onIonInput={e => setPass(e.detail.value || '')}
          onKeyDown={e => e.key === 'Enter' && login()} /></IonItem>
      </IonList>
      <div className="pad-x">
        <IonButton expand="block" shape="round" onClick={login} disabled={busy || !user.trim() || !pass}>
          {busy ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={logInOutline} />{t('mq_login')}</>}
        </IonButton>
        <IonButton expand="block" fill="clear" size="small" href="https://mawaqit.net/de/backoffice/register/" target="_blank">{t('mq_register')}</IonButton>
      </div>
    </Section>
  );

  return (
    <Section title={t('mq_title')}>
      <div className="pad-x">
        <IonSearchbar value={q} onIonInput={e => setQ(e.detail.value || '')} onKeyDown={e => e.key === 'Enter' && search(false)}
          placeholder={t('mq_ph')} debounce={0} enterkeyhint="search" />
        <IonButton expand="block" shape="round" fill="outline" onClick={() => (q.trim().length >= 2 ? search(false) : search(true))} disabled={busy}>
          <IonIcon slot="start" icon={q.trim().length >= 2 ? searchOutline : navigateOutline} />
          {q.trim().length >= 2 ? t('mq_search') : t('mq_near').replace('{place}', S.city || '')}
        </IonButton>
      </div>
      {res === 'loading' && <div className="center pad"><IonSpinner /></div>}
      {Array.isArray(res) && !res.length && <div className="empty">{t('no_results')}</div>}
      {Array.isArray(res) && res.length > 0 && (
        <IonList inset>
          {res.map(m => (
            <IonItem key={m.slug} button detail={false} disabled={busy} onClick={() => pick(m)}>
              <IonIcon icon={S.mawaqit.slug === m.slug ? checkmarkCircle : locationOutline} slot="start" className="accent" />
              <IonLabel><h3>{m.name}</h3>{m.place && <p>{m.place}</p>}</IonLabel>
              {m.km != null && <IonNote slot="end">{m.km < 10 ? m.km.toFixed(1) : Math.round(m.km)} km</IonNote>}
            </IonItem>
          ))}
        </IonList>
      )}
      <div className="pad-x">
        <IonButton fill="clear" size="small" onClick={logout}><IonIcon slot="start" icon={logOutOutline} />{t('mq_logout')}</IonButton>
      </div>
    </Section>
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
    if (await takeMosque(m)) toast(t('mosque_taken'));
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
                    {S.mawaqit.slug && <p>{S.city}{S.country ? ` · ${S.country}` : ''}</p>}
                  </IonLabel>
                </IonItem>
              </IonList>
            </Section>

            <MosqueSearch S={S} onPick={slug => takeText('https://mawaqit.net/de/' + slug)} />

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
