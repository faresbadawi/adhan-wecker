// Seiten der App. Die vier Tabs haben ihre Startseite; Einstellungen und Unterseiten öffnen sich im aktuellen Tab.
import Home from './pages/Home.svelte';
import Prayer from './pages/Prayer.svelte';
import Alarm from './pages/Alarm.svelte';
import Azan from './pages/Azan.svelte';
import Settings from './pages/Settings.svelte';
import Location from './pages/Location.svelte';
import Display from './pages/Display.svelte';
import Language from './pages/Language.svelte';
import Wifi from './pages/Wifi.svelte';
import Device from './pages/Device.svelte';

export default [
  { path: '/', component: Home },
  { path: '/prayer/', component: Prayer },
  { path: '/alarm/', component: Alarm },
  { path: '/azan/', component: Azan },
  { path: '/settings/', component: Settings },
  { path: '/settings/location/', component: Location },
  { path: '/settings/display/', component: Display },
  { path: '/settings/lang/', component: Language },
  { path: '/settings/wifi/', component: Wifi },
  { path: '/settings/device/', component: Device },
];
