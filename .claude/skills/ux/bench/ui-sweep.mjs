// Site-wide UI sweep (2026-10-22): for every route at 390 (touch) and 1440,
// count bordered boxes, boxes nested in a bordered box (the design-system's
// "never nest a border" rule), controls under the touch / pointer minimum
// (44 / 24 CSS px — measured by box, so a `.touch-target` hit area still
// counts as small), sideways overflow, and the scroller's height. Run it on a
// base and a candidate server and diff the JSON (docs/audits/2026-10-22-*).
//   BASE=http://localhost:5174/pokemonTeamBuilder node ui-sweep.mjs > out.json
// Browser: CHROME=<path> for a bundled Chromium; installed Edge otherwise.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:5174/pokemonTeamBuilder';
const routes = ['/pt', '/pt/builder', '/pt/pokedex', '/pt/teams', '/pt/feed', '/pt/journeys', '/pt/journeys?tab=badges', '/pt/journeys?tab=rewards', '/pt/profile', '/pt/profile?tab=appearance', '/pt/profile?tab=preferences', '/pt/profile?tab=account', '/pt/quiz', '/pt/pokepuzzle', '/pt/types', '/pt/meta', '/pt/damage-calculator', '/pt/speed-tiers', '/pt/moves', '/pt/friends', '/pt/challenge'];
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, headless: true } : { channel: 'msedge', headless: true });
const out = [];
for (const [w, h, phone] of [[390, 844, true], [1440, 900, false]]) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce', locale: 'pt-BR' });
  await context.addInitScript(() => { localStorage.setItem('patchNotesVersion', '1.17.0'); localStorage.setItem('tb-onboarding-seen', '1'); localStorage.setItem('syncPromptDismissed', '1'); localStorage.setItem('theme', 'dark'); });
  for (const r of routes) {
    const page = await context.newPage();
    if (r !== '/pt') await page.addInitScript(() => localStorage.setItem('ptb:landingSeen', '1'));
    else await page.addInitScript(() => localStorage.removeItem('ptb:landingSeen'));
    await page.goto(BASE + r, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const m = await page.evaluate((phone) => {
      const root = document.querySelector('.app-shell__content') || document.body;
      const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const bordered = (el) => { const cs = getComputedStyle(el); return ['Top', 'Right', 'Bottom', 'Left'].filter((s) => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' && cs['border' + s + 'Color'] !== 'rgba(0, 0, 0, 0)').length >= 3; };
      const all = [...root.querySelectorAll('*')].filter((el) => !el.closest('.toast, .app-shell__sidebar, .ds-screen'));
      const boxes = all.filter((el) => vis(el) && bordered(el));
      const nested = boxes.filter((el) => { let p = el.parentElement; while (p && p !== root) { if (bordered(p)) return true; p = p.parentElement; } return false; });
      const ctrls = [...root.querySelectorAll('button, a[href], [role=button], input, select')].filter((el) => vis(el) && !el.closest('.toast'));
      const small = ctrls.filter((el) => { const r = el.getBoundingClientRect(); const lim = phone ? 44 : 24; return Math.min(r.width, r.height) < lim && Math.min(r.width, r.height) > 0; });
      const overflow = document.documentElement.scrollWidth > window.innerWidth + 1 || root.scrollWidth > root.clientWidth + 1;
      const sample = nested.slice(0, 3).map((el) => (el.className && typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName));
      return { boxes: boxes.length, nested: nested.length, ctrls: ctrls.length, small: small.length, overflow, height: root.scrollHeight, sample };
    }, phone);
    out.push({ w, r, ...m });
    await page.close();
  }
  await context.close();
}
await browser.close();
console.log(JSON.stringify(out));
