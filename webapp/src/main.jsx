// Einstieg: Sprache, Ionic (überall die ruhige iOS-Darstellung), Start der App
import { createRoot } from 'react-dom/client';
import { setupIonicReact } from '@ionic/react';
import { setLang } from './lib/i18n.js';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.always.css';
import './theme.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { installErrorReporting } from './lib/errors.js';

installErrorReporting();

// Schutz gegen fremde Änderungen an der Seite (z. B. Browser-Übersetzung, die Texte in <font> verpackt):
// React will dann Knoten entfernen oder einfügen, die nicht mehr dort hängen, und stürzt ab.
// Bekannte Abhilfe (facebook/react#11538): solche Aufrufe still übergehen statt abzustürzen.
if (typeof Node === 'function' && Node.prototype) {
  const remove = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (child.parentNode) return remove.call(child.parentNode, child);
      return child;
    }
    return remove.call(this, child);
  };
  const insert = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (node, ref) {
    if (ref && ref.parentNode !== this) return this.appendChild(node);
    return insert.call(this, node, ref);
  };
}

let l = 'ar';
try { l = localStorage.getItem('lang') || 'ar'; } catch (e) { /* privat */ }
setLang(l);

setupIonicReact({ mode: 'ios', swipeBackEnabled: true, hardwareBackButton: true });

// Service Worker gibt es nur in sicheren Kontexten (HTTPS oder als sicher markierter Ursprung)
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);
