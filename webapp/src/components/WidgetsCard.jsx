// Widgets für den Startbildschirm (Android-App): Auswahl mit Beschreibung; Hinzufügen über Android
import { IonList, IonItem, IonLabel, IonButton, IonIcon } from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import Section from './Section.jsx';
import { t } from '../lib/i18n.js';
import { native } from '../lib/native.js';
import { toast } from '../lib/store.js';

const WIDGETS = ['prayers', 'next', 'third', 'hijri', 'azan', 'dhikr'];

export default function WidgetsCard() {
  const n = native();
  if (!n || !n.pinWidget) return null;
  const add = k => { if (!n.pinWidget(k)) toast(t('widget_manual'), true); };
  return (
    <Section title={t('widgets_title')} hint={t('widgets_hint')}>
      <IonList inset>
        {WIDGETS.map(k => (
          <IonItem key={k} lines="full">
            <IonLabel><h3>{t('wg_' + k)}</h3><p>{t('wgd_' + k)}</p></IonLabel>
            <IonButton slot="end" size="small" shape="round" fill="outline" onClick={() => add(k)} aria-label={t('widget_add')}><IonIcon slot="icon-only" icon={addOutline} /></IonButton>
          </IonItem>
        ))}
      </IonList>
    </Section>
  );
}
