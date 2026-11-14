// Bildschirmfotos der App (Handygröße) für die Anleitungen; nur lesen, nichts an der Uhr ändern
const { chromium } = require('playwright-core');
const path = require('path');
const BASE = 'http://localhost:5173/';
const OUT = path.join(__dirname, 'shots2');

const SHOTS = [
  ['home', '#/home'],
  ['prayer', '#/prayer'],
  ['mawaqit', '#/prayer', { mawaqit: true }],
  ['azan', '#/azan'],
  ['azan2', '#/azan', { scroll: 520 }],
  ['alarm', '#/alarm'],
  ['alarm2', '#/alarm', { bottom: true }],
  ['settings', '#/settings'],
  ['display', '#/settings/display'],
  ['display2', '#/settings/display', { scroll: 1400 }],
  ['device', '#/settings/device'],
  ['device2', '#/settings/device', { scroll: 420 }],
];

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  for (const lang of (process.argv[2] ? [process.argv[2]] : ['ar', 'de'])) {
    for (const [name, hash, opt = {}] of SHOTS) {
      const file = path.join(OUT, `${lang}-${name}.png`);
      try { if (require('fs').statSync(file).size > 60000) continue; } catch (e) { /* fehlt */ }
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: lang });
      await ctx.addInitScript(l => { try { localStorage.setItem('lang', l); localStorage.setItem('installBanner', 'off'); } catch (e) {} }, lang);
      // Nur lesen: Schreibanfragen an die Uhr werden abgefangen
      await ctx.route('**/api/**', async route => {
        const req = route.request();
        if (req.method() !== 'GET') {
          
          // statt zu schreiben: aktuellen Stand lesen (die Uhr bleibt unverändert)
          try { const r = await route.fetch({ method: 'GET', postData: null }); if (r.ok()) return route.fulfill({ response: r }); } catch (e) { /* kein GET */ }
          return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
        const r = await route.fetch();
        let j = null;
        try {
          // Beispielort statt des echten Ortes (die Anleitung wird weitergegeben)
          const txt = (await r.text()).replace(/Koblenz/g, 'Berlin').replace(/كوبلنتس|كوبلنز/g, 'برلين');
          j = JSON.parse(txt);
        } catch (e) { return route.fulfill({ response: r }); }
        if (j && j.mawaqit && j.mawaqit.name) j.mawaqit.name = lang === 'ar' ? 'مسجد الهدى' : 'Al-Huda Moschee';
        if (j && j.name && j.slug && req.url().includes('mawaqit')) j.name = lang === 'ar' ? 'مسجد الهدى' : 'Al-Huda Moschee';
        if (j && typeof j === 'object' && !Array.isArray(j)) {
          if ('lang' in j) j.lang = lang; // Sprache der Uhr nur für die App vortäuschen
          if (opt.mawaqit && req.url().endsWith('/api/settings')) j.source = 'mawaqit';
        }
        return route.fulfill({ response: r, json: j });
      });
      const page = await ctx.newPage();
      await page.goto(BASE + hash, { waitUntil: 'load' });
      try { await page.waitForSelector('.ion-page:not(.ion-page-hidden) ion-content .section', { timeout: 20000 }); } catch (e) { console.log('langsam', name); }
      await page.waitForTimeout(2500);
      if (opt.scroll || opt.bottom) {
        await page.evaluate(o => {
          if (!document.querySelector('ion-content')) return null;
          const all = [...document.querySelectorAll('.ion-page:not(.ion-page-hidden) ion-content')];
          const c = all[all.length - 1] || [...document.querySelectorAll('ion-content')].pop();
          return o.bottom ? c.scrollToBottom(0) : c.scrollToPoint(0, o.scroll, 0);
        }, opt);
        await page.waitForTimeout(600);
      }
      await page.screenshot({ path: path.join(OUT, `${lang}-${name}.png`) });
      await ctx.unrouteAll({ behavior: 'ignoreErrors' });
      await ctx.close();
      console.log(lang, name);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  await browser.close();
})();
