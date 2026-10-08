// Sprache für App und Display; die Uhr startet dafür neu, die App lädt mit neuer Leserichtung
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonIcon } from '@ionic/react';
import { checkmark } from 'ionicons/icons';
import { Bar } from '../components/Header.jsx';
import Section from '../components/Section.jsx';
import { t, lang, LANGS } from '../lib/i18n.js';
import { api, toast } from '../lib/store.js';
import { reloadApp } from '../lib/errors.js';

export default function Language() {
  async function choose(l) {
    if (l === lang()) return;
    try {
      const r = await api('/api/device/lang', { lang: l });
      if (!r.ok) throw new Error();
      try { localStorage.setItem('lang', l); } catch (e) { /* privat */ }
      toast(t('lang_restart'));
      setTimeout(() => reloadApp(), 900);
    } catch (e) { toast(t('offline'), true); }
  }
  return (
    <IonPage>
      <Bar title={t('nav_lang')} back="/settings" />
      <IonContent>
        <Section hint={t('language_hint')}>
          <IonList inset>
            {Object.entries(LANGS).map(([k, n]) => (
              <IonItem key={k} button detail={false} onClick={() => choose(k)} lang={k}>
                <IonIcon slot="start" icon={checkmark} className={'check' + (k === lang() ? '' : ' hidden')} />
                <IonLabel>{n}</IonLabel>
              </IonItem>
            ))}
          </IonList>
        </Section>
      </IonContent>
    </IonPage>
  );
}
