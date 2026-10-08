// Fängt Fehler beim Zeichnen ab: statt eines weißen Bildschirms ein Hinweis mit "Neu laden";
// der Fehler geht an die Uhr (siehe lib/errors.js).
import { Component } from 'react';
import { t } from '../lib/i18n.js';
import { report, reloadApp } from '../lib/errors.js';

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) { report('render', error && error.message, (error && error.stack) + ' | ' + (info && info.componentStack || '').slice(0, 200)); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash">
        <p>{t('crash_text')}</p>
        <button onClick={reloadApp}>{t('crash_reload')}</button>
      </div>
    );
  }
}
