// Navigation reach: clicks/taps from Home to each destination through the
// visible navigation (no search, no in-page cards), guest session.
//   node ux-reach.mjs --port 4181 --out reach-base.json
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const PORT = arg('port', '4181');
const OUT = arg('out', 'reach.json');
const BASE = `http://localhost:${PORT}/pokemonTeamBuilder`;

// Destination → URL fragment that proves we arrived.
const DEST = {
  'Construtor': '/builder', 'Pokédex': '/pokedex', 'Meus times': '/favorites', 'Pokémon favoritos': 'tab=pokemon',
  'Fórum': '/feed', 'Meta': '/meta', 'Torneios': '/tournaments', 'Calculadora': '/damage-calculator',
  'Velocidades': '/speed-tiers', 'Movimentos': '/moves', 'Habilidades': '/abilities', 'Itens': '/items',
  'Ginásios': '/gyms', 'PokéPuzzle': '/pokepuzzle', 'Quiz de gerações': '/quiz', 'PokéQuiz': '/guesser',
  'PokéRoom': '/pokeroom', 'Amigos': '/friends', 'Batalhas': '/battles', 'Perfil': '/profile',
};

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const result = {};

async function collect(page) {
  // every visible element that navigates (button/a) with its label
  return page.evaluate(() => [...document.querySelectorAll('a[href], button')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .map((el) => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' '))
    .filter(Boolean));
}

// Click each candidate navigation label and record which URL it lands on.
// Mark the navigation controls a person can actually see and hit: the
// element (or one of its children) must be what sits on top at its centre.
// Playwright's own "visible" counts items clipped inside a folded section.
const markHittable = (page, scopeSel) => page.evaluate((sel) => {
  let n = 0;
  for (const el of document.querySelectorAll(`${sel} a[href], ${sel} button`)) {
    el.removeAttribute('data-reach');
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (top && (top === el || el.contains(top))) el.setAttribute('data-reach', String(n++));
  }
  return n;
}, scopeSel);

// Wait until the navigation has stopped moving (section folds, sheet rise):
// hit-testing a rail mid-animation reports an in-between state.
async function settle(page, sel) {
  await page.waitForTimeout(400);
  await page.waitForFunction((s) => [...document.querySelectorAll(s)]
    .every((el) => el.getAnimations({ subtree: true }).every((a) => a.playState !== 'running' || a.effect?.getTiming?.().iterations === Infinity)), sel, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function probe(page, scopeSel, depthLabel, open) {
  const found = {};
  const fresh = async () => {
    await page.goto(BASE + '/'); await page.waitForSelector('.app-shell');
    await settle(page, '.app-shell__sidebar, .app-shell__tabbar');
    if (open) { await open(); await settle(page, scopeSel); }
    const n = await markHittable(page, scopeSel);
    if (process.env.REACH_DEBUG) console.log('  fresh', depthLabel, n, await page.evaluate((sel) => [...document.querySelectorAll('[data-reach]')].map((e) => (e.textContent || e.getAttribute('aria-label') || '?').trim().slice(0, 12)).join('|') + ' || exp=' + [...document.querySelectorAll('.app-shell__sidebar [aria-expanded]')].map((h) => h.textContent.trim() + ':' + h.getAttribute('aria-expanded')).join(',') + ' || ls=' + localStorage.getItem('ptb-sidebar-open-groups'), scopeSel));
    return n;
  };
  const count = await fresh();
  for (let idx = 0; idx < count; idx++) {
    if (idx > 0) await fresh();
    const before = page.url();
    try { await page.click(`[data-reach="${idx}"]`, { timeout: 2000 }); } catch { continue; }
    await page.waitForTimeout(600);
    const after = page.url();
    if (process.env.REACH_DEBUG) console.log('   ', depthLabel, idx, '->', after.replace(BASE, ''));
    if (after !== before) {
      for (const [name, frag] of Object.entries(DEST)) {
        if (after.includes(frag) && !(name === 'Meus times' && after.includes('tab=pokemon'))) found[name] ??= depthLabel;
      }
    }
  }
  return found;
}

for (const vp of ['desktop', 'mobile']) {
  const ctx = await browser.newContext(vp === 'mobile'
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' }
    : { viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { localStorage.setItem('patchNotesVersion', '1.13.0'); localStorage.setItem('tb-onboarding-seen', '1'); localStorage.setItem('language', 'pt'); localStorage.setItem('syncPromptDismissed', '1'); localStorage.removeItem('ptb-sidebar-open-groups'); localStorage.removeItem('ptb-sidebar-collapse-pref'); });
  await ctx.route(/firestore\.googleapis\.com.*(\/Write\/|:commit)/, (r) => (/public(%2F|\/)/i.test(r.request().postData() || '') ? r.abort() : r.continue()));
  const page = await ctx.newPage();
  await page.goto(BASE + '/'); await page.waitForSelector('.app-shell'); await page.waitForTimeout(3000);
  const reach = {};
  if (vp === 'desktop') {
    Object.assign(reach, await probe(page, '.app-shell__sidebar', 1));
    // folded sections: open each header (1 click) then its items (2nd click)
    const headers = await page.evaluate(() => [...document.querySelectorAll('.app-shell__sidebar [aria-expanded="false"]')].map((h) => h.textContent.trim()));
    for (const h of headers) {
      const open = async () => { await page.locator('.app-shell__sidebar [aria-expanded="false"]', { hasText: h }).first().click(); };
      const f = await probe(page, '.app-shell__sidebar', 2, open);
      for (const [k, v] of Object.entries(f)) reach[k] ??= v;
    }
  } else {
    Object.assign(reach, await probe(page, '.app-shell__tabbar', 1));
    const openMore = async () => { await page.locator('.app-shell__tabbar button', { hasText: 'Mais' }).click(); await page.waitForSelector('.more-sheet'); };
    const f = await probe(page, '.more-sheet', 2, openMore);
    for (const [k, v] of Object.entries(f)) reach[k] ??= v;
  }
  const rows = Object.keys(DEST).map((name) => [name, reach[name] ?? null]);
  result[vp] = Object.fromEntries(rows);
  const vals = rows.map(([, v]) => v);
  result[`${vp}.summary`] = { oneClick: vals.filter((v) => v === 1).length, twoClicks: vals.filter((v) => v === 2).length, unreachable: rows.filter(([, v]) => v == null).map(([n]) => n), avgClicks: +(vals.filter((v) => v != null).reduce((s, v) => s + v, 0) / vals.filter((v) => v != null).length).toFixed(2) };
  console.log(vp, JSON.stringify(result[`${vp}.summary`]));
  await ctx.close();
}
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
await browser.close();
