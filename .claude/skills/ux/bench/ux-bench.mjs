// UX benchmark battery — run against a *production* build served by `vite preview`.
//
//   node ux-bench.mjs --port 4181 --dist <distDir> --label base --out results-base.json
//   flags: --only=boot,routes,interactions,build  --routes=/,/builder  --runs=3
//
// Every Firestore write is blocked (the app talks to the live project). Route
// and interaction passes reuse one saved anonymous session per viewport, so the
// battery does not mint a new anonymous account per page; only the boot pass
// (first-visit scenario) signs up fresh, 3x per viewport.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');

const arg = (name, def) => {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return def;
  if (hit.includes('=')) return hit.split('=').slice(1).join('=');
  return process.argv[process.argv.indexOf(hit) + 1];
};
const PORT = arg('port', '4181');
const DIST = arg('dist', null);
const LABEL = arg('label', 'run');
const OUT = arg('out', `results-${LABEL}.json`);
const ONLY = new Set(String(arg('only', 'build,boot,routes,interactions')).split(','));
const RUNS = Number(arg('runs', 3));
const BASE = `http://localhost:${PORT}/pokemonTeamBuilder`;

const ROUTES = (arg('routes', null)?.split(',')) || [
  '/', '/builder', '/favorites', '/pokedex', '/pokemon/25', '/pokemon/charizard',
  '/moves', '/moves/thunderbolt', '/abilities/intimidate', '/items/leftovers',
  '/meta', '/tournaments', '/damage-calculator', '/speed-tiers', '/gyms',
  '/feed', '/friends', '/battles', '/pokepuzzle', '/quiz', '/guesser', '/pokeroom',
  '/profile', '/rota-inexistente',
];

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const NET = { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8 * 5, uploadThroughput: 750e3 / 8 };

const median = (xs) => { const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const gz = (file) => zlib.gzipSync(fs.readFileSync(file)).length;

const INIT = () => {
  localStorage.setItem('patchNotesVersion', localStorage.getItem('patchNotesVersion') || '1.13.0');
  localStorage.setItem('tb-onboarding-seen', '1');
  localStorage.setItem('language', 'pt');
  localStorage.setItem('theme', 'dark');
  const m = (window.__ux = { lcp: 0, cls: 0, loaf: [], events: [] });
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) m.loaf.push({ t: e.startTime, d: e.duration, b: e.blockingDuration || 0 }); }).observe({ type: 'long-animation-frame', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) m.events.push(e.duration); }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  } catch { /* older engine */ }
};

async function throttle(context, page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', NET);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return cdp;
}

async function newContext(browser, vp, storageState) {
  const ctx = await browser.newContext({ ...VIEWPORTS[vp], serviceWorkers: 'block', ...(storageState ? { storageState } : {}) });
  await ctx.addInitScript(INIT);
  // Only shared data is off limits. The app's boot writes the visitor's own
  // preferences and waits for them (the old build never leaves the splash if
  // that write hangs), so private writes must go through to measure honestly.
  const guard = (r) => (/public(%2F|\/)/i.test(r.request().postData() || '') ? r.abort() : r.continue());
  await ctx.route(/firestore\.googleapis\.com.*\/Write\//, guard);
  await ctx.route(/firestore\.googleapis\.com.*:commit/, guard);
  return ctx;
}

// "Ready" = shell painted, no boot splash / route fallback, and no visible
// loader or skeleton for 400ms in a row. Capped at 20s.
async function waitReady(page, t0) {
  const deadline = t0 + 20000;
  let quietSince = null;
  while (Date.now() < deadline) {
    const busy = await page.evaluate(() => {
      if (!document.querySelector('.app-shell')) return true;
      if (document.querySelector('.boot-splash, .route-fallback')) return true;
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
      return [...document.querySelectorAll('.loader, [aria-busy="true"], [class*="skeleton"], [class*="-skel"], .animate-pulse')].some(vis);
    }).catch(() => true);
    if (!busy) { quietSince ??= Date.now(); if (Date.now() - quietSince >= 400) return quietSince - t0; }
    else quietSince = null;
    await page.waitForTimeout(100);
  }
  return null;
}

const STRUCTURE = () => {
  const scroller = document.querySelector('.app-shell__content') || document.scrollingElement;
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const content = document.querySelector('.app-shell__content') || document.body;
  const interactive = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="link"]')].filter(vis);
  const size = (el) => el.getBoundingClientRect();
  const lt24 = interactive.filter((el) => { const r = size(el); return r.width < 24 || r.height < 24; }).length;
  const lt44 = interactive.filter((el) => { const r = size(el); return r.width < 44 || r.height < 44; }).length;
  const hasBorder = (el) => { const s = getComputedStyle(el); return ['Top', 'Right', 'Bottom', 'Left'].filter((k) => parseFloat(s[`border${k}Width`]) > 0 && s[`border${k}Style`] !== 'none').length >= 3; };
  const boxes = [...content.querySelectorAll('*')].filter((el) => vis(el) && hasBorder(el));
  const boxSet = new Set(boxes);
  const nested = boxes.filter((el) => { let p = el.parentElement; while (p && p !== content) { if (boxSet.has(p)) return true; p = p.parentElement; } return false; }).length;
  const imgs = [...document.querySelectorAll('img')].filter(vis);
  const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).length;
  const unnamed = interactive.filter((el) => !(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent.trim() || el.getAttribute('aria-labelledby') || (el.tagName === 'INPUT' && (el.labels?.length || el.placeholder)))).length;
  return {
    domNodes: document.getElementsByTagName('*').length,
    screens: scroller ? +(scroller.scrollHeight / scroller.clientHeight).toFixed(2) : null,
    interactive: interactive.length,
    targetsUnder24: lt24,
    targetsUnder44: lt44,
    borderedBoxes: boxes.length,
    nestedBorders: nested,
    brokenImages: broken,
    unnamedControls: unnamed,
    hOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    title: document.title,
  };
};

async function axe(page) {
  try {
    await page.addScriptTag({ path: AXE_PATH });
    return await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, resultTypes: ['violations'] });
      const out = { critical: 0, serious: 0, moderate: 0, minor: 0, nodes: 0, rules: {} };
      for (const v of r.violations) { out[v.impact] = (out[v.impact] || 0) + 1; out.nodes += v.nodes.length; out.rules[v.id] = v.nodes.length; }
      return out;
    });
  } catch (e) { return { error: String(e).slice(0, 120) }; }
}

// ---------------------------------------------------------------- build
function buildMetrics() {
  if (!DIST) return null;
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const boot = [...html.matchAll(/(?:src|href)="[^"]*?(assets\/[^"]+\.(js|css))"/g)].map((m) => m[1]);
  let js = 0, css = 0;
  for (const f of new Set(boot)) { const b = gz(path.join(DIST, f)); if (f.endsWith('.css')) css += b; else js += b; }
  const sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
  const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
  let pre = 0; for (const u of urls) { try { pre += fs.statSync(path.join(DIST, u)).size; } catch { /* runtime */ } }
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const all = walk(DIST);
  const imgBytes = all.filter((f) => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(f) && !f.includes(`${path.sep}data${path.sep}`)).reduce((s, f) => s + fs.statSync(f).size, 0);
  const biggestJs = all.filter((f) => f.endsWith('.js')).map((f) => fs.statSync(f).size).sort((a, b) => b - a)[0];
  return { bootJsGzipKB: +(js / 1024).toFixed(1), bootCssGzipKB: +(css / 1024).toFixed(1), precacheEntries: urls.length, precacheMB: +(pre / 1048576).toFixed(2), imageMB: +(imgBytes / 1048576).toFixed(2), biggestJsKB: +(biggestJs / 1024).toFixed(0) };
}

// ---------------------------------------------------------------- boot
async function bootPass(browser) {
  const out = {};
  for (const vp of Object.keys(VIEWPORTS)) {
    for (const scenario of ['firstVisit', 'returning']) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        const ctx = await newContext(browser, vp);
        const page = await ctx.newPage();
        await throttle(ctx, page);
        if (scenario === 'returning') {
          // A returning visitor comes back after the first visit finished signing
          // in. The new boot paints before that, so wait for the auth snapshot the
          // finished sign-in writes, or 'returning' measures a reload mid-sign-up.
          await page.goto(BASE + '/'); await page.waitForSelector('.app-shell', { timeout: 30000 });
          await page.waitForFunction(() => !!localStorage.getItem('ptb:authSnapshot'), null, { timeout: 30000 }).catch(() => {});
          await page.waitForTimeout(1000);
        }
        let bytes = 0, reqs = 0;
        page.on('response', async (r) => { reqs++; try { bytes += Number(await r.headerValue('content-length')) || 0; } catch { /* */ } });
        const t0 = Date.now();
        await page.goto(BASE + '/', { waitUntil: 'commit' });
        await page.waitForSelector('.app-shell', { timeout: 30000 }).catch(() => {});
        const shell = Date.now() - t0;
        const ready = await waitReady(page, t0);
        await page.waitForTimeout(800);
        const ux = await page.evaluate(() => window.__ux);
        runs.push({ shellMs: shell, readyMs: ready, lcpMs: Math.round(ux.lcp), cls: +ux.cls.toFixed(3), requests: reqs, transferKB: Math.round(bytes / 1024), longFrames: ux.loaf.filter((f) => f.d > 50).length, blockingMs: Math.round(ux.loaf.reduce((s, f) => s + f.b, 0)) });
        await ctx.close();
      }
      const keys = Object.keys(runs[0]);
      out[`${vp}.${scenario}`] = Object.fromEntries(keys.map((k) => [k, median(runs.map((r) => r[k]))]));
      console.log('boot', vp, scenario, JSON.stringify(out[`${vp}.${scenario}`]));
    }
  }
  return out;
}

// ---------------------------------------------------------------- session
async function makeSession(browser, vp) {
  const ctx = await newContext(browser, vp);
  const page = await ctx.newPage();
  await page.goto(BASE + '/');
  await page.waitForSelector('.app-shell', { timeout: 30000 });
  await page.waitForTimeout(4000);
  const state = await ctx.storageState({ indexedDB: true });
  await ctx.close();
  return state;
}

// ---------------------------------------------------------------- routes
async function routesPass(browser, sessions) {
  const out = {};
  for (const vp of Object.keys(VIEWPORTS)) {
    for (const route of ROUTES) {
      const ctx = await newContext(browser, vp, sessions[vp]);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
      page.on('console', (m) => { if (m.type() === 'error' && !/NotSameOrigin|ERR_BLOCKED|Failed to load resource|firestore|net::ERR_FAILED/i.test(m.text())) errors.push(m.text().slice(0, 120)); });
      const cdp = await throttle(ctx, page);
      const t0 = Date.now();
      await page.goto(BASE + route, { waitUntil: 'commit' });
      const ready = await waitReady(page, t0);
      await page.waitForTimeout(1500);
      const ux = await page.evaluate(() => window.__ux);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const structure = await page.evaluate(STRUCTURE);
      const a11y = await axe(page);
      out[`${vp} ${route}`] = {
        readyMs: ready, lcpMs: Math.round(ux.lcp), cls: +ux.cls.toFixed(3),
        longFrames: ux.loaf.filter((f) => f.d > 50).length, blockingMs: Math.round(ux.loaf.reduce((s, f) => s + f.b, 0)),
        ...structure, axe: a11y, errors: errors.slice(0, 5),
      };
      console.log('route', vp, route, ready, structure.domNodes, a11y.serious ?? '-');
      await ctx.close();
    }
  }
  return out;
}

// ---------------------------------------------------------------- interactions
async function interactionsPass(browser, sessions) {
  const out = {};
  for (const vp of Object.keys(VIEWPORTS)) {
    const ctx = await newContext(browser, vp, sessions[vp]);
    const page = await ctx.newPage();
    await page.goto(BASE + '/');
    await waitReady(page, Date.now());
    await page.waitForTimeout(2500); // let idle prefetch (if any) happen, as a real visit would
    await throttle(ctx, page);

    // click → first visible change (median of 3)
    const timeTo = async (action, done, reset) => {
      const xs = [];
      for (let i = 0; i < 3; i++) {
        const t0 = Date.now();
        await action();
        try { await page.waitForFunction(done, null, { timeout: 15000, polling: 'raf' }); xs.push(Date.now() - t0); } catch { xs.push(null); }
        await page.waitForTimeout(400);
        if (reset) await reset();
        await page.waitForTimeout(600);
      }
      return median(xs);
    };

    // search
    out[`${vp}.openSearch`] = await timeTo(
      async () => { if (vp === 'desktop') await page.click('.app-shell__search-trigger'); else await page.keyboard.press('Control+k'); },
      () => !!document.querySelector('[role="dialog"] input, .command-palette input'),
      async () => { await page.keyboard.press('Escape'); },
    );

    // route changes through the real navigation (rail on desktop, tab bar on phones)
    for (const [label, pathRe] of [['Construtor', /\/builder/], ['Pokédex', /\/pokedex/], ['Início', /\/pokemonTeamBuilder\/?$/]]) {
      const sel = vp === 'desktop' ? `.app-shell__sidebar >> text="${label}"` : `.app-shell__tabbar >> text="${label}"`;
      const before = await page.evaluate(() => { const m = window.__ux; return { n: m.loaf.length }; });
      const t0 = Date.now();
      try {
        await page.click(sel, { timeout: 5000 });
        await page.waitForURL(pathRe, { timeout: 15000 });
        const ready = await waitReady(page, t0);
        const after = await page.evaluate((n) => window.__ux.loaf.slice(n).filter((f) => f.d > 50).length, before.n);
        out[`${vp}.nav:${label}`] = { readyMs: ready, longFrames: after };
      } catch { out[`${vp}.nav:${label}`] = { readyMs: null }; }
      await page.waitForTimeout(800);
    }

    if (vp === 'mobile') {
      out['mobile.openMoreSheet'] = await timeTo(
        async () => { await page.click('.app-shell__tabbar >> text="Mais"'); },
        () => !!document.querySelector('.more-sheet'),
        async () => { await page.keyboard.press('Escape'); },
      );
    }

    // Pokédex scroll: long frames while scrolling 12 steps
    await page.goto(BASE + '/pokedex');
    await waitReady(page, Date.now());
    await page.waitForTimeout(1500);
    const n0 = await page.evaluate(() => window.__ux.loaf.length);
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => {
        // the tallest scrollable box that actually overflows (inner grid scroller on desktop, the shell on phones)
        const cands = [...document.querySelectorAll('*')].filter((e) => { const st = getComputedStyle(e).overflowY; return (st === 'auto' || st === 'scroll') && e.scrollHeight > e.clientHeight + 50 && e.clientHeight > 300; });
        const target = cands.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || document.querySelector('.app-shell__content');
        target.scrollBy(0, 700);
      });
      await page.waitForTimeout(250);
    }
    out[`${vp}.pokedexScroll`] = await page.evaluate((n) => { const f = window.__ux.loaf.slice(n); return { longFrames: f.filter((x) => x.d > 50).length, worstFrameMs: Math.round(Math.max(0, ...f.map((x) => x.d))), domNodes: document.getElementsByTagName('*').length }; }, n0);
    console.log('interactions', vp, JSON.stringify(Object.fromEntries(Object.entries(out).filter(([k]) => k.startsWith(vp)))));
    await ctx.close();
  }
  return out;
}

// ---------------------------------------------------------------- main
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const result = { label: LABEL, port: PORT, at: new Date().toISOString(), network: 'latency 150ms, ~1 MB/s, CPU 4x', build: null, boot: null, routes: null, interactions: null };
if (ONLY.has('build')) { result.build = buildMetrics(); console.log('build', JSON.stringify(result.build)); }
if (ONLY.has('boot')) result.boot = await bootPass(browser);
if (ONLY.has('routes') || ONLY.has('interactions')) {
  const sessions = { desktop: await makeSession(browser, 'desktop'), mobile: await makeSession(browser, 'mobile') };
  if (ONLY.has('routes')) result.routes = await routesPass(browser, sessions);
  if (ONLY.has('interactions')) result.interactions = await interactionsPass(browser, sessions);
}
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log('wrote', OUT);
await browser.close();
