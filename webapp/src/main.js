// Einstieg: Framework7 mit den benötigten Bausteinen, Sprache, Start der App
import Framework7 from 'framework7';
import Dialog from 'framework7/components/dialog';
import Toast from 'framework7/components/toast';
import Sheet from 'framework7/components/sheet';
import Popup from 'framework7/components/popup';
import Picker from 'framework7/components/picker';
import ColorPicker from 'framework7/components/color-picker';
import Sortable from 'framework7/components/sortable';
import Swipeout from 'framework7/components/swipeout';
import Toggle from 'framework7/components/toggle';
import Range from 'framework7/components/range';
import Stepper from 'framework7/components/stepper';
import Preloader from 'framework7/components/preloader';
import PullToRefresh from 'framework7/components/pull-to-refresh';
import Tabs from 'framework7/components/tabs';
import Input from 'framework7/components/input';
import Progressbar from 'framework7/components/progressbar';
import Framework7Svelte from 'framework7-svelte';
import { mount } from 'svelte';
import { setLang } from './lib/i18n.js';
import './app.css';
import App from './App.svelte';

Framework7.use([Dialog, Toast, Sheet, Popup, Picker, ColorPicker, Sortable, Swipeout, Toggle, Range, Stepper,
  Preloader, PullToRefresh, Tabs, Input, Progressbar]);
Framework7.use(Framework7Svelte);

let l = 'ar';
try { l = localStorage.getItem('lang') || 'ar'; } catch (e) { /* privat */ }
setLang(l);

// Service Worker gibt es nur in sicheren Kontexten (HTTPS oder als sicher markierter Ursprung)
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

mount(App, { target: document.getElementById('app') });
