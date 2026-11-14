const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const mk = async (lang) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: lang,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  // GitHub-Downloadseite (öffentlich)
  let ctx = await mk('de'); let p = await ctx.newPage();
  await p.goto('https://github.com/faresbadawi/adhan-wecker/releases/latest', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: path.join(__dirname, 'shots2/github.png') });
  // bis zu den Dateien scrollen
  const el = await p.$('a[href$="Bilal.apk"]');
  if (el) { await el.scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, 200)); await p.waitForTimeout(800); }
  await p.screenshot({ path: path.join(__dirname, 'shots2/github2.png') });
  await ctx.close();
  // Web-App im Netz (iPhone)
  for (const lang of ['ar', 'de']) {
    ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: lang,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    await ctx.addInitScript(l => { try { localStorage.setItem('lang', l); } catch (e) {} }, lang);
    p = await ctx.newPage();
    await p.goto('https://faresbadawi.github.io/adhan-wecker/', { waitUntil: 'load' });
    await p.waitForTimeout(4000);
    await p.screenshot({ path: path.join(__dirname, `shots2/${lang}-pwa.png`) });
    await ctx.close();
  }
  await b.close();
})();
