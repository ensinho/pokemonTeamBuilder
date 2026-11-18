/**
 * scenes.js — Living pixel-art Bayer skies, 3D interactive PBMascot engine loop,
 * and rolling odometer digits for PokemonBuilder Design System v4 Showcase.
 */
import {
    botDefs,
    botInner,
    botMotion,
    botStill,
    resolvePose,
    clamp,
} from './pb-mascot.js';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const isReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia(REDUCED_QUERY).matches;

/* ═══════════════════════════════════════════════════════════════════════════
   1. SHARED BOT <DEFS> + STATIC / ALIVE 3D MASCOT CONTROLLERS
   ═══════════════════════════════════════════════════════════════════════════ */

let defsInjected = false;
export function ensureBotDefs() {
    if (defsInjected || typeof document === 'undefined') return;
    if (document.getElementById('pb-bot-defs-host')) {
        defsInjected = true;
        return;
    }
    const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.id = 'pb-bot-defs-host';
    host.setAttribute('aria-hidden', 'true');
    host.setAttribute('width', '0');
    host.setAttribute('height', '0');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    host.innerHTML = `<defs>${botDefs('mb-')}</defs>`;
    document.body.prepend(host);
    defsInjected = true;
}

/**
 * Render a standalone crisp static 3D frame into `container`.
 */
export function stillBot(container, spec = {}) {
    if (!container) return;
    const {
        mood = 'feliz',
        pose = 'parado',
        px = 120,
        view = '-480 -520 960 960',
        className = '',
        label = '',
        extra = {},
    } = spec;
    const resolved = resolvePose({ mood, pose, ...extra });
    const inner = botStill(resolved, { uid: 'mb-', px, view });
    const roleAttr = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
    container.innerHTML =
        `<svg class="mascot-svg bot ${className}" viewBox="${view}" width="${px}" height="${px}" ${roleAttr}>${inner}</svg>`;
}

const activeAliveBots = new Set();

export function destroyAllAliveBots() {
    for (const bot of [...activeAliveBots]) {
        bot.destroy();
    }
}

/**
 * Interactive pointer-following + breathing 3D mascot controller.
 */
export class AliveBot {
    constructor(container, options = {}) {
        this.container = container;
        this.px = options.px || 168;
        this.view = options.view || '-480 -520 960 960';
        this.className = options.className || '';
        this.label = options.label || 'Mascote Fantasminha do PokemonBuilder';
        this.followPointer = options.followPointer !== false;
        this.baseSpec = {
            mood: options.mood || 'feliz',
            pose: options.pose || 'parado',
            extra: options.extra || {},
        };
        this.overrideSpec = null;
        this.overrideTimer = null;

        this.gaze = { x: 0, y: 0 };
        this.targetGaze = { x: 0, y: 0 };
        this.t0 = performance.now();
        this.raf = null;
        this.visible = true;
        this.destroyed = false;

        ensureBotDefs();
        this._buildSvg();
        this._bind();
        activeAliveBots.add(this);
        this.renderFrame(performance.now());
        if (!isReducedMotion()) this._tick();
    }

    _buildSvg() {
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('class', `mascot-svg bot is-alive ${this.className}`.trim());
        this.svg.setAttribute('viewBox', this.view);
        this.svg.setAttribute('width', String(this.px));
        this.svg.setAttribute('height', String(this.px));
        this.svg.setAttribute('role', 'img');
        this.svg.setAttribute('aria-label', this.label);
        this.container.innerHTML = '';
        this.container.appendChild(this.svg);
    }

    _bind() {
        if (this.followPointer && typeof window !== 'undefined') {
            this._onMove = (ev) => {
                if (this.destroyed || !this.svg.isConnected) return;
                const rect = this.svg.getBoundingClientRect();
                if (!rect.width) return;
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                this.targetGaze.x = clamp((ev.clientX - cx) / 340, -1, 1);
                this.targetGaze.y = clamp((ev.clientY - cy) / 340, -1, 1);
            };
            window.addEventListener('pointermove', this._onMove, { passive: true });
        }

        if (typeof IntersectionObserver !== 'undefined') {
            this._io = new IntersectionObserver(
                (entries) => {
                    this.visible = Boolean(entries[0]?.isIntersecting);
                    if (this.visible && !this.raf && !this.destroyed && !isReducedMotion()) {
                        this._tick();
                    }
                },
                { threshold: 0.05 }
            );
            this._io.observe(this.container);
        }
    }

    set(spec = {}) {
        const next = {
            mood: spec.mood ?? this.baseSpec.mood,
            pose: spec.pose ?? this.baseSpec.pose,
            extra: { ...this.baseSpec.extra, ...(spec.extra || {}) },
        };
        this.baseSpec = next;
        this.renderFrame(performance.now());
    }

    react(mood, pose, durationMs = 2200, extra = {}) {
        if (this.overrideTimer) clearTimeout(this.overrideTimer);
        this.overrideSpec = {
            mood,
            pose,
            extra: { ...this.baseSpec.extra, ...extra },
        };
        this.renderFrame(performance.now());
        if (durationMs > 0) {
            this.overrideTimer = setTimeout(() => {
                this.overrideSpec = null;
                this.renderFrame(performance.now());
            }, durationMs);
        }
    }

    renderFrame(now) {
        if (this.destroyed || !this.svg.isConnected) return;
        const spec = this.overrideSpec || this.baseSpec;
        const poseObj = resolvePose({ mood: spec.mood, pose: spec.pose, ...spec.extra });
        const motion = botMotion(spec.mood, spec.pose);
        const reduced = isReducedMotion();
        const elapsed = (now - this.t0) / 1000;

        this.gaze.x += (this.targetGaze.x - this.gaze.x) * 0.14;
        this.gaze.y += (this.targetGaze.y - this.gaze.y) * 0.14;

        const w = Number(String(this.view).split(/\s+/)[2]) || 960;
        const pxPerUnit = (this.px / w) / 0.36;

        this.svg.innerHTML = botInner(poseObj, {
            time: elapsed,
            motion,
            gaze: this.followPointer ? { x: this.gaze.x, y: this.gaze.y } : undefined,
            view: this.view,
            reducedMotion: reduced,
            uid: 'mb-',
            pxPerUnit,
            standalone: false,
        });
    }

    _tick() {
        if (this.destroyed || !this.visible || isReducedMotion()) {
            this.raf = null;
            return;
        }
        this.renderFrame(performance.now());
        this.raf = requestAnimationFrame(() => this._tick());
    }

    destroy() {
        this.destroyed = true;
        activeAliveBots.delete(this);
        if (this.raf) cancelAnimationFrame(this.raf);
        if (this.overrideTimer) clearTimeout(this.overrideTimer);
        if (this._onMove) window.removeEventListener('pointermove', this._onMove);
        if (this._io) this._io.disconnect();
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. 64-CELL BAYER PIXEL-ART LIVING SCENES (<canvas class="scene">)
   ═══════════════════════════════════════════════════════════════════════════ */

const BAYER4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
];

const SCENES = {
    night: {
        stops: ['#080510', '#130B28', '#221445', '#342061'],
        horizon: '#0D0819',
        accent: '#7C3AFF',
        gold: '#FFD23F',
        stars: 22,
        hills: [0.68, 0.72, 0.76],
    },
    morning: {
        stops: ['#91C8FF', '#BCE0FF', '#E2F2FF', '#FFF5D6'],
        horizon: '#3B6F4A',
        accent: '#63B86A',
        gold: '#FFD23F',
        stars: 0,
        hills: [0.74, 0.78, 0.72],
    },
    dusk: {
        stops: ['#140C2A', '#3B1B54', '#8F316A', '#F4916E'],
        horizon: '#1A0F30',
        accent: '#FF3D9A',
        gold: '#FFD23F',
        stars: 10,
        hills: [0.70, 0.76, 0.68],
    },
    route: {
        stops: ['#73B8FF', '#A9D6FF', '#DCEEFF', '#F2F9FF'],
        horizon: '#2F6440',
        accent: '#59A85B',
        gold: '#FFD23F',
        stars: 0,
        hills: [0.64, 0.70, 0.66],
    },
    mountain: {
        stops: ['#110E26', '#25204B', '#42397A', '#6D5FA6'],
        horizon: '#1B1633',
        accent: '#E9E2FF',
        gold: '#FFD23F',
        stars: 16,
        hills: [0.56, 0.48, 0.62],
    },
};

function seededRand(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

export function paintScene(canvas, kind = 'night', phase = 0) {
    if (!canvas || !canvas.getContext) return;
    const cfg = SCENES[kind] || SCENES.night;
    const w = Number(canvas.getAttribute('data-w')) || 96;
    const h = Number(canvas.getAttribute('data-h')) || 54;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const bands = cfg.stops.length - 1;
    for (let y = 0; y < h; y++) {
        const ny = (y / (h - 1)) * bands;
        const idx = Math.min(bands - 1, Math.floor(ny));
        const frac = ny - idx;
        for (let x = 0; x < w; x++) {
            const thresh = (BAYER4[y & 3][x & 3] + 0.5) / 16;
            const pick = frac > thresh ? idx + 1 : idx;
            ctx.fillStyle = cfg.stops[pick];
            ctx.fillRect(x, y, 1, 1);
        }
    }

    // Distant ridge / horizon silhouettes
    const horizonBase = Math.round(h * cfg.hills[1]);
    for (let x = 0; x < w; x++) {
        const wave =
            kind === 'mountain'
                ? Math.round(Math.abs(((x + 9) % 28) - 14) * -0.9 + h * 0.72)
                : Math.round(horizonBase + Math.sin(x * 0.14) * 2.5 + Math.cos(x * 0.07) * 1.5);
        ctx.fillStyle = cfg.horizon;
        ctx.fillRect(x, wave, 1, h - wave);

        if (kind === 'mountain' && wave < Math.round(h * 0.58)) {
            ctx.fillStyle = cfg.accent;
            ctx.fillRect(x, wave, 1, 2);
        }
        if (kind === 'route' || kind === 'morning') {
            ctx.fillStyle = cfg.accent;
            ctx.fillRect(x, wave, 1, 1);
        }
    }

    // Subtle town grid or trail lights
    if (kind === 'night' || kind === 'dusk') {
        const rndTown = seededRand(8129);
        for (let i = 0; i < 12; i++) {
            const tx = Math.floor(rndTown() * (w - 4)) + 2;
            const ty = Math.min(h - 3, horizonBase + 3 + Math.floor(rndTown() * (h - horizonBase - 5)));
            ctx.fillStyle = i % 3 === 0 ? cfg.gold : cfg.accent;
            ctx.globalAlpha = 0.65;
            ctx.fillRect(tx, ty, 2, 1);
        }
        ctx.globalAlpha = 1;
    }

    // Twinkling stars
    if (cfg.stars > 0) {
        const rnd = seededRand(kind === 'night' ? 94 : kind === 'mountain' ? 248 : 131);
        for (let i = 0; i < cfg.stars; i++) {
            const sx = Math.floor(rnd() * (w - 2)) + 1;
            const sy = Math.floor(rnd() * (horizonBase - 6)) + 2;
            const gold = i % 4 === 0;
            const twinkle = (phase + i) % 5 === 0 ? 0.35 : 0.92;
            ctx.fillStyle = gold ? cfg.gold : '#EDE9FE';
            ctx.globalAlpha = twinkle;
            ctx.fillRect(sx, sy, 1, 1);
        }
        ctx.globalAlpha = 1;
    }
}

let sceneInterval = null;
export function initScenes(root = document) {
    const canvases = [...root.querySelectorAll('canvas.scene[data-scene]')];
    let phase = 0;
    canvases.forEach((c) => paintScene(c, c.dataset.scene || 'night', phase));

    if (sceneInterval) clearInterval(sceneInterval);
    if (!isReducedMotion() && canvases.some((c) => c.dataset.scene === 'night' || c.dataset.scene === 'dusk')) {
        sceneInterval = setInterval(() => {
            phase = (phase + 1) % 20;
            document.querySelectorAll('canvas.scene[data-scene]').forEach((c) => {
                const k = c.dataset.scene;
                if (k === 'night' || k === 'dusk') paintScene(c, k, phase);
            });
        }, 560);
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. ODOMETER DIGITS (Rolling numeric figure — rolls ONLY on change)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Update `el` with rolling digit columns (`0..9`).
 * Initial mount sets position directly without counting up from zero.
 */
export function odo(el, value) {
    if (!el) return;
    const str = String(value);
    const prev = el.dataset.odoVal;
    const animate = prev !== undefined && prev !== str && !isReducedMotion();

    if (el.dataset.odoInit !== '1' || el.children.length !== str.length) {
        el.dataset.odoInit = '1';
        el.innerHTML = [...str]
            .map((ch) => {
                if (!/\d/.test(ch)) return `<span class="odo-sep">${ch}</span>`;
                const d = Number(ch);
                return (
                    `<span class="odo-col">` +
                    `<span class="odo-track" style="transform:translateY(${-d * 10}%);transition:none">` +
                    `0123456789`.split('').map((n) => `<span>${n}</span>`).join('') +
                    `</span></span>`
                );
            })
            .join('');
    }

    el.dataset.odoVal = str;
    const tracks = el.querySelectorAll('.odo-track');
    let ti = 0;
    for (const ch of str) {
        if (!/\d/.test(ch)) continue;
        const track = tracks[ti++];
        if (!track) continue;
        const d = Number(ch);
        if (animate) {
            track.style.transition = '';
        } else {
            track.style.transition = 'none';
        }
        requestAnimationFrame(() => {
            track.style.transform = `translateY(${-d * 10}%)`;
        });
    }
}
