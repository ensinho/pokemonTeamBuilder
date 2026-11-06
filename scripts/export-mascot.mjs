// Renders the mascot rig to GIFs, WebP stickers and a Telegram WebM.
//
//   npm run mascot:export                 → mascot-export/{gif,webp}
//   npm run mascot:export -- --only=gif   (or webp)
//
// The frames are the rig's own (src/utils/mascot), stepped through time and
// screenshotted in Chromium; ffmpeg encodes them. Neither is a project
// dependency: it needs `playwright` (or `playwright-core` with a browser)
// resolvable and `ffmpeg` on PATH. See docs/modules/mascot.md.
import { mkdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { mascotInner, VIEWS } from '../src/utils/mascot/rig.js';
import { merge, evalSeq } from '../src/utils/mascot/motion.js';

const OUT = path.resolve('mascot-export');
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7) || 'all';

// Channel rules: GIF for e-mail (the first frame carries the message — Outlook
// for Windows shows only that one), WebP 512 for WhatsApp (≤ 500 KB animated),
// WebM VP9 with alpha for Telegram (≤ 256 KB, ≤ 3 s, no audio).
const GIFS = [
    { id: 'ola', seq: 'wave', dur: 1400 },
    { id: 'comemorando', seq: 'celebrate', dur: 1800 },
    { id: 'carregando', seq: 'capture', dur: 2800 },
    { id: 'dormindo', seq: 'sleep', dur: 2600 },
    { id: 'erro', seq: 'oops', dur: 1700 },
    { id: 'pensando', seq: 'think', dur: 2400 },
    { id: 'evolucao', seq: 'evolve', dur: 3000 },
    { id: 'carinho', seq: 'pet', dur: 1800 },
    { id: 'shadow-ball', seq: 'charge', dur: 1600 },
    { id: 'sumindo', seq: 'vanish', dur: 2000 },
    { id: 'espiando', seq: 'float', dur: 2400, base: { prop: 'ledge', paws: 'edge', eyes: 'open', mouth: 'smallO', y: 150 } },
    { id: '404', seq: 'float', dur: 2400, base: { eyes: 'moon', mouth: 'wavy', paws: 'chin', fx: ['question'], earL: 14, earR: 14, sparks: 'none' } },
];
const STICKERS = [
    { id: 'oi', seq: 'wave', dur: 1400, telegram: true },
    { id: 'gg', seq: 'celebrate', dur: 1800 },
    { id: 'carinho', seq: 'pet', dur: 1800 },
    { id: 'bravo', seq: 'angry', dur: 800 },
    { id: 'zzz', seq: 'sleep', dur: 2600 },
    { id: 'shiny', seq: 'shiny', dur: 1600 },
    { id: 'oops', seq: 'oops', dur: 1700 },
    { id: 'nem-vi', seq: 'cover', dur: 1600 },
];

// The dark palette (index.css brand layer) as plain values: a sticker has no theme.
const TOKENS = `--m-line:#B860F8;--m-eye:#F8F4FF;--m-fang:#F8F4FF;--m-fang-edge:transparent;--m-mouth:#B860F8;--m-blush:#B860F8;
--m-bg:#200048;--m-glint:#FFFFFF;--m-heart:#F95587;--m-tear:#B4CBF8;--m-anger:#DA8683;--m-gold:#FFD23F;--m-gold-ink:#8D6E29;
--m-live:#FF3D9A;--m-shadow:rgba(0,0,0,.35);--m-smoke:#9C8FB8;--m-hat:#3A1A6E;--m-shade:#1B0A3D;--m-orb:#3F1A7A;--m-sil:#FFFFFF;
--m-cape:#3A1A6E;--m-ledge:#2A1060;--m-tongue:#FCA9C9;--m-tone-mix:#F4F1FA;--mascot-shiny:#5CC8FF`;
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700&display=swap" rel="stylesheet">
<style>html,body{margin:0;background:transparent}#stage{${TOKENS}}#stage.tile{background:radial-gradient(circle at 50% 42%,#34106C 0,#200048 62%)}#stage svg{display:block}</style>
</head><body><div id="stage"></div><svg width="0" height="0" style="position:absolute"><defs><filter id="diecut" x="-20%" y="-20%" width="140%" height="140%">
<feMorphology in="SourceAlpha" operator="dilate" radius="20" result="d"/><feFlood flood-color="#fff"/><feComposite in2="d" operator="in" result="w"/>
<feOffset in="w" dy="10" result="o"/><feFlood flood-color="#000" flood-opacity=".25"/><feComposite in2="o" operator="in" result="s"/>
<feMerge><feMergeNode in="s"/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg></body></html>`;

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const kb = (f) => Math.round(statSync(f).size / 1024);

async function loadChromium() {
    // require(), not import(): a globally installed Playwright is found through NODE_PATH
    const require = createRequire(import.meta.url);
    for (const name of ['playwright', 'playwright-core']) {
        try { return require(name).chromium; } catch { /* try the next */ }
    }
    throw new Error('export-mascot needs playwright (or playwright-core) resolvable — e.g. run it where `npx playwright` works.');
}

const frameSvg = (spec, t, { size, view, sticker }) => {
    const pose = merge({ shadow: !sticker, ...(spec.base || {}) }, evalSeq(spec.seq, t), { t });
    const inner = mascotInner(pose);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${view}">${sticker ? `<g filter="url(#diecut)">${inner}</g>` : inner}</svg>`;
};

async function render(page, dir, spec, { fps, size, view, sticker }) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    await page.evaluate(([s, tile, fill]) => {
        const el = document.getElementById('stage');
        el.className = tile ? 'tile' : '';
        el.style.cssText = `width:${s}px;height:${s}px;${fill ? '--m-fill:#200048' : ''}`;
    }, [size, !sticker, sticker]);
    const stage = await page.$('#stage');
    const n = Math.round((spec.dur / 1000) * fps);
    for (let i = 0; i < n; i += 1) {
        const html = frameSvg(spec, (i * 1000) / fps, { size, view, sticker });
        await page.evaluate((h) => { document.getElementById('stage').innerHTML = h; }, html);
        await stage.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.png`), omitBackground: sticker });
    }
    return n;
}

const chromium = await loadChromium();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 560, height: 560 } });
await page.setContent(PAGE, { waitUntil: 'networkidle' }).catch(() => page.setContent(PAGE));
await page.evaluate(() => document.fonts.ready);
const frames = path.join(OUT, '.frames');

if (only === 'all' || only === 'gif') {
    mkdirSync(path.join(OUT, 'gif'), { recursive: true });
    for (const g of GIFS) {
        const dir = path.join(frames, `gif-${g.id}`);
        const n = await render(page, dir, g, { fps: 20, size: 360, view: '-500 -540 1000 1000', sticker: false });
        const out = path.join(OUT, 'gif', `mascote-${g.id}.gif`);
        ff(['-framerate', '20', '-i', path.join(dir, 'f%04d.png'), '-vf', 'split[a][b];[a]palettegen=max_colors=96:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a', '-loop', '0', out]);
        console.log(`gif  ${g.id.padEnd(12)} ${n} frames  ${kb(out)} KB`);
    }
}
if (only === 'all' || only === 'webp') {
    mkdirSync(path.join(OUT, 'webp'), { recursive: true });
    for (const s of STICKERS) {
        const dir = path.join(frames, `st-${s.id}`);
        const n = await render(page, dir, s, { fps: 15, size: 512, view: '-520 -560 1040 1040', sticker: true });
        const out = path.join(OUT, 'webp', `sticker-${s.id}.webp`);
        ff(['-framerate', '15', '-i', path.join(dir, 'f%04d.png'), '-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', '62', '-compression_level', '6', '-loop', '0', '-an', out]);
        console.log(`webp ${s.id.padEnd(12)} ${n} frames  ${kb(out)} KB${kb(out) > 500 ? '  ← over WhatsApp\'s 500 KB' : ''}`);
        if (s.telegram) {
            const tg = path.join(OUT, 'webp', `sticker-${s.id}-telegram.webm`);
            ff(['-framerate', '15', '-i', path.join(dir, 'f%04d.png'), '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '38', '-an', tg]);
            console.log(`webm ${s.id.padEnd(12)} telegram  ${kb(tg)} KB`);
        }
    }
}
rmSync(frames, { recursive: true, force: true });
await browser.close();
console.log(`→ ${OUT} (viewbox body: ${VIEWS.body})`);
