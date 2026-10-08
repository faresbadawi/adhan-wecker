// Hinweise (Toast) und Rückfragen (Alert) für die ganze App, gesteuert über den Zustand
import { IonToast, IonAlert } from '@ionic/react';
import { useApp, set } from '../lib/store.js';
import { t } from '../lib/i18n.js';

export default function Hosts() {
  const { toast, ask } = useApp();
  return (
    <>
      <IonToast key={toast ? toast.id : 0} isOpen={!!toast} message={toast ? toast.text : ''} duration={2200} position="top"
        positionAnchor={undefined} cssClass={toast && toast.err ? 'toast-err' : 'toast-ok'} onDidDismiss={() => set({ toast: null })} />
      <IonAlert isOpen={!!ask} header={ask ? ask.title : ''} message={ask ? ask.text : ''}
        buttons={[
          { text: t('cancel'), role: 'cancel', handler: () => ask && ask.resolve(false) },
          { text: t('confirm'), role: ask && ask.danger ? 'destructive' : 'confirm', handler: () => ask && ask.resolve(true) },
        ]}
        onDidDismiss={e => { if (ask && e.detail.role === 'backdrop') ask.resolve(false); set({ ask: null }); }} />
    </>
  );
}
