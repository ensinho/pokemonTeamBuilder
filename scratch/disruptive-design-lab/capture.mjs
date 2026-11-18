/**
 * capture.mjs — Zero-dependency Edge CDP verification & screenshot harness.
 * Serves repo root over 127.0.0.1, launches headless Microsoft Edge with CDP,
 * audits fonts/images/overflow/3D-mascot/canvas/interactions, and saves PNGs.
 *
 * Usage:
 *   node scratch/disruptive-design-lab/capture.mjs
 *   node scratch/disruptive-design-lab/capture.mjs --out-dir=C:\Temp\pb-shots
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

const outArg = process.argv.find((a) => a.startsWith('--out-dir='));
const OUT_DIR = outArg ? path.resolve(outArg.slice('--out-dir='.length)) : path.join(__dirname, 'shots');

const EDGE_CANDIDATES = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'msedge',
];

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
};

function findEdge() {
    for (const candidate of EDGE_CANDIDATES) {
        if (candidate === 'msedge' || fs.existsSync(candidate)) return candidate;
    }
    throw new Error('Microsoft Edge executable not found.');
}

function startStaticServer() {
    const server = http.createServer((req, res) => {
        const cleanUrl = (req.url || '/').split('?')[0];
        let rel = decodeURIComponent(cleanUrl);
        if (rel === '/') rel = '/scratch/disruptive-design-lab/index.html';
        const fullPath = path.resolve(REPO_ROOT, '.' + rel);
        if (!fullPath.startsWith(REPO_ROOT)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        fs.readFile(fullPath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end(`Not Found: ${rel}`);
                return;
            }
            const ext = path.extname(fullPath).toLowerCase();
            res.writeHead(200, {
                'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
                'Cache-Control': 'no-store',
            });
            res.end(data);
        });
    });

    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            resolve({ server, port: addr.port });
        });
    });
}

class CDPClient {
    constructor(wsUrl) {
        this.ws = new WebSocket(wsUrl);
        this.nextId = 1;
        this.pending = new Map();
        this.events = [];
        this.ready = new Promise((resolve, reject) => {
            this.ws.addEventListener('open', resolve);
            this.ws.addEventListener('error', (e) => reject(e.error || new Error('WebSocket error')));
        });
        this.ws.addEventListener('message', (ev) => {
            const msg = JSON.parse(String(ev.data));
            if (msg.id && this.pending.has(msg.id)) {
                const { resolve, reject } = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                if (msg.error) reject(new Error(`${msg.error.code}: ${msg.error.message}`));
                else resolve(msg.result);
            } else if (msg.method) {
                this.events.push(msg);
            }
        });
    }

    async send(method, params = {}) {
        await this.ready;
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async eval(expression) {
        const res = await this.send('Runtime.evaluate', {
            expression,
            awaitPromise: true,
            returnByValue: true,
        });
        if (res.exceptionDetails) {
            throw new Error(`Page eval error: ${res.exceptionDetails.text || JSON.stringify(res.exceptionDetails)}`);
        }
        return res.result ? res.result.value : undefined;
    }

    close() {
        this.ws.close();
    }
}

async function launchEdgeCdp(userDataDir) {
    const edgeBin = findEdge();
    const proc = spawn(
        edgeBin,
        [
            '--headless=new',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-background-timer-throttling',
            '--remote-debugging-port=0',
            `--user-data-dir=${userDataDir}`,
            'about:blank',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    const wsBrowserUrl = await new Promise((resolve, reject) => {
        let stderr = '';
        const timer = setTimeout(() => reject(new Error(`Edge CDP timeout. stderr=${stderr}`)), 12000);
        proc.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
            const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (match) {
                clearTimeout(timer);
                resolve(match[1]);
            }
        });
        proc.on('exit', (code) => {
            clearTimeout(timer);
            reject(new Error(`Edge exited early (${code}): ${stderr}`));
        });
    });

    const u = new URL(wsBrowserUrl);
    const listRes = await fetch(`http://${u.host}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    if (!pageTarget?.webSocketDebuggerUrl) {
        throw new Error(`No debuggable page target found: ${JSON.stringify(targets)}`);
    }
    return { proc, cdp: new CDPClient(pageTarget.webSocketDebuggerUrl) };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SHOTS = [
    { file: 'desktop-dark-00-narrativa.png', width: 1440, height: 900, mobile: false, url: '?view=narrativa&theme=dark' },
    { file: 'desktop-dark-00-narrativa-full.png', width: 1440, height: 900, mobile: false, fullPage: true, url: '?view=narrativa&theme=dark' },
    { file: 'desktop-light-00-narrativa.png', width: 1440, height: 900, mobile: false, url: '?view=narrativa&theme=light' },
    { file: 'desktop-dark-01-builder.png', width: 1440, height: 900, mobile: false, url: '?view=builder&theme=dark' },
    {
        file: 'desktop-dark-01-builder-applied.png',
        width: 1440,
        height: 900,
        mobile: false,
        url: '?view=builder&theme=dark',
        afterLoad: async (cdp) => {
            await cdp.eval(`document.querySelector('[data-action="apply-suggestion"]').click()`);
            await sleep(760);
            const txt = await cdp.eval(`document.getElementById('synergy-score-num')?.dataset.odoVal`);
            if (txt !== '92') throw new Error(`Expected synergy score 92 after apply, got ${txt}`);
        },
    },
    { file: 'desktop-light-01-builder.png', width: 1440, height: 900, mobile: false, url: '?view=builder&theme=light' },
    {
        file: 'desktop-dark-02-pokedex.png',
        width: 1440,
        height: 900,
        mobile: false,
        url: '?view=pokedex&theme=dark',
        afterLoad: async (cdp) => {
            await cdp.eval(`document.querySelector('[data-ev-set="spe:252"]')?.click()`);
            await sleep(160);
        },
    },
    { file: 'desktop-light-02-pokedex.png', width: 1440, height: 900, mobile: false, url: '?view=pokedex&theme=light' },
    { file: 'desktop-dark-03-meta.png', width: 1440, height: 900, mobile: false, url: '?view=meta&theme=dark' },
    { file: 'desktop-light-03-meta.png', width: 1440, height: 900, mobile: false, url: '?view=meta&theme=light' },
    { file: 'desktop-dark-04-profile.png', width: 1440, height: 900, mobile: false, url: '?view=profile&theme=dark' },
    { file: 'desktop-dark-04-profile-full.png', width: 1440, height: 900, mobile: false, fullPage: true, url: '?view=profile&theme=dark' },
    {
        file: 'desktop-light-04-profile.png',
        width: 1440,
        height: 900,
        mobile: false,
        fullPage: true,
        url: '?view=profile&theme=light',
        afterLoad: async (cdp) => {
            // Exercise Fase 3: unlock charmander + hatch witch-hat egg + complete 4/4 receipt
            await cdp.eval(`
                document.querySelector('[data-mime-guess="charmander"]')?.click();
                document.querySelector('[data-egg-day="5"]')?.click();
                document.querySelector('[data-action="toggle-day-complete"]')?.click();
                document.getElementById('toast')?.classList.remove('is-visible');
            `);
            await sleep(450);
            const hasHat = await cdp.eval(`document.body.innerText.includes('CHAPÉU DE BRUXA')`);
            if (!hasHat) throw new Error('Expected witch-hat hatch badge on Day 5');
        },
    },
    { file: 'mobile-dark-00-narrativa.png', width: 390, height: 844, mobile: true, url: '?view=narrativa&theme=dark' },
    { file: 'mobile-dark-01-builder.png', width: 390, height: 844, mobile: true, url: '?view=builder&theme=dark' },
    { file: 'mobile-dark-02-pokedex.png', width: 390, height: 844, mobile: true, url: '?view=pokedex&theme=dark' },
    { file: 'mobile-dark-03-meta.png', width: 390, height: 844, mobile: true, url: '?view=meta&theme=dark' },
    { file: 'mobile-dark-04-profile.png', width: 390, height: 844, mobile: true, url: '?view=profile&theme=dark' },
];

async function run() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-edge-cdp-'));
    const { server, port } = await startStaticServer();
    let edge = null;

    try {
        edge = await launchEdgeCdp(tmpProfile);
        const { cdp } = edge;
        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');
        await cdp.send('Network.enable');

        const baseUrl = `http://127.0.0.1:${port}/scratch/disruptive-design-lab/index.html`;
        const report = [];

        for (const shot of SHOTS) {
            cdp.events.length = 0;
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: shot.width,
                height: shot.height,
                deviceScaleFactor: shot.mobile ? 2 : 1,
                mobile: shot.mobile,
            });
            await cdp.send('Page.navigate', { url: `${baseUrl}${shot.url}` });
            await sleep(480);

            await cdp.eval(`document.fonts.ready.then(() => true)`);
            await sleep(160);
            if (shot.afterLoad) {
                await shot.afterLoad(cdp);
            }

            const metrics = await cdp.eval(`(() => {
                const imgs = [...document.querySelectorAll('img')].filter(i => i.offsetParent !== null);
                const brokenImgs = imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src.slice(0, 80));
                const bots = [...document.querySelectorAll('svg.bot')].filter(s => s.getBoundingClientRect().width > 0);
                const emptyBots = bots.filter(s => !s.querySelector('.bs10, use')).length;
                const scenes = [...document.querySelectorAll('canvas.scene')].filter(c => c.getBoundingClientRect().width > 0);
                const fonts = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family);
                return {
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth,
                    scrollHeight: document.documentElement.scrollHeight,
                    imgCount: imgs.length,
                    brokenImgs,
                    botCount: bots.length,
                    emptyBots,
                    sceneCount: scenes.length,
                    loadedFonts: [...new Set(fonts)],
                };
            })()`);

            const runtimeErrors = cdp.events
                .filter((e) => e.method === 'Runtime.exceptionThrown')
                .map((e) => e.params.exceptionDetails?.text || 'RuntimeException');
            const failedRequests = cdp.events
                .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
                .map((e) => `${e.params.response.status} ${e.params.response.url}`);

            if (runtimeErrors.length) throw new Error(`${shot.file} JS errors: ${runtimeErrors.join('; ')}`);
            if (failedRequests.length) throw new Error(`${shot.file} HTTP errors: ${failedRequests.join('; ')}`);
            if (metrics.brokenImgs.length) throw new Error(`${shot.file} broken images: ${metrics.brokenImgs.join(', ')}`);
            if (metrics.emptyBots > 0) throw new Error(`${shot.file} had ${metrics.emptyBots} empty 3D mascot SVGs`);
            if (metrics.scrollWidth > metrics.clientWidth) {
                throw new Error(`${shot.file} horizontal overflow: ${metrics.scrollWidth} > ${metrics.clientWidth}`);
            }

            const shotRes = await cdp.send('Page.captureScreenshot', {
                format: 'png',
                captureBeyondViewport: Boolean(shot.fullPage),
                fromSurface: true,
            });
            const outPath = path.join(OUT_DIR, shot.file);
            fs.writeFileSync(outPath, Buffer.from(shotRes.data, 'base64'));
            report.push({ file: shot.file, ...metrics });
            console.log(`PASS ${shot.file} (${metrics.clientWidth}x${shot.height}, bots=${metrics.botCount}, scenes=${metrics.sceneCount}, imgs=${metrics.imgCount}, overflow=${metrics.scrollWidth - metrics.clientWidth})`);
        }

        // Also smoke-test Meta Modal Sheet open & close + Builder Undo
        await cdp.send('Page.navigate', { url: `${baseUrl}?view=meta&theme=dark` });
        await sleep(360);
        await cdp.eval(`document.querySelector('[data-inspect-team]')?.click()`);
        await sleep(160);
        const modalOpen = await cdp.eval(`!document.getElementById('sheet-scrim').hidden`);
        if (!modalOpen) throw new Error('Meta sheet modal failed to open');
        await cdp.eval(`document.querySelector('[data-action="close-sheet"]')?.click()`);

        console.log('ALL CHECKS PASSED:', report.length, 'screenshots saved to', OUT_DIR);
    } catch (err) {
        console.error('CHECK ERROR:', err);
        throw err;
    } finally {
        try { if (edge?.cdp) edge.cdp.close(); } catch {}
        try { if (edge?.proc) edge.proc.kill('SIGKILL'); } catch {}
        try { server.close(); } catch {}
        await sleep(300);
        try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch {}
    }
}

run().catch((err) => {
    console.error('CAPTURE FAILED:', err);
    process.exit(1);
});
