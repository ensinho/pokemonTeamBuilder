/**
 * The battles' sound: short effects synthesized with WebAudio — no files (tech
 * spec §3.12). The music (`battleMusic.js`) plays through the same context and
 * the same master gain, so one mute silences both. Nothing plays before `unlock()`, which the
 * route calls on the first gesture inside it (autoplay policy). Muting is
 * remembered in localStorage and the button lives on the console's bar.
 *
 * Every recipe is a few oscillators or a burst of filtered noise with an
 * exponential envelope, scheduled on the context's clock, so a sound costs
 * nothing until it plays and never blocks the main thread.
 */

const MUTED_KEY = 'ptb:challenge:muted';
const VOLUME = 0.18;
const BLIP_GAP_MS = 40;

const readMuted = () => {
    try {
        return localStorage.getItem(MUTED_KEY) === '1';
    } catch (_) {
        return false;
    }
};

let ctx = null;
let master = null;
let muted = readMuted();
let lastBlip = -Infinity;

export const isMuted = () => muted;

/** The context and master gain once unlocked — the music plays through them. */
export const audioGraph = () => (ctx && master ? { ctx, master } : null);

export const setMuted = (value) => {
    muted = Boolean(value);
    try {
        localStorage.setItem(MUTED_KEY, muted ? '1' : '0');
    } catch (_) { /* a convenience, best-effort */ }
    if (master) master.gain.value = muted ? 0 : VOLUME;
};

/** Create (or resume) the audio context. Call from a user gesture. */
export const unlock = () => {
    if (ctx) {
        if (ctx.state === 'suspended') ctx.resume?.().catch?.(() => {});
        return true;
    }
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) return false;
    try {
        ctx = new AudioCtx();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : VOLUME;
        master.connect(ctx.destination);
        return true;
    } catch (_) {
        ctx = null;
        master = null;
        return false;
    }
};

/* ── Building blocks ─────────────────────────────────────────────────── */

const envelope = (g, t0, peak, dur, attack = 0.004) => {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
};

const tone = (t0, { type = 'square', freq, to = null, dur, gain = 0.3 }) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    envelope(g, t0, gain, dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
};

const noise = (t0, { dur, gain = 0.3, from = 2000, to = null }) => {
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, t0);
    if (to) filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = ctx.createGain();
    envelope(g, t0, gain, dur, 0.002);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
};

const notes = (t0, freqs, { dur, type = 'square', gain = 0.22, last = dur }) => {
    freqs.forEach((freq, i) => tone(t0 + i * dur, { type, freq, dur: i === freqs.length - 1 ? last : dur * 0.9, gain }));
};

const hit = (t0, gain = 0.4) => {
    noise(t0, { dur: 0.12, gain, from: 3000, to: 300 });
    tone(t0, { type: 'triangle', freq: 160, to: 60, dur: 0.12, gain: gain * 0.8 });
};

/* ── The recipes (tech spec §3.12) ───────────────────────────────────── */

const RECIPES = {
    textBlip: (t) => tone(t, { freq: 880, dur: 0.018, gain: 0.08 }),
    cursor: (t) => tone(t, { freq: 660, dur: 0.04, gain: 0.14 }),
    confirm: (t) => tone(t, { freq: 990, dur: 0.04, gain: 0.14 }),
    cancel: (t) => tone(t, { freq: 440, dur: 0.04, gain: 0.14 }),
    step: (t) => noise(t, { dur: 0.02, gain: 0.12, from: 1200 }),
    bump: (t) => tone(t, { type: 'triangle', freq: 110, dur: 0.06, gain: 0.3 }),
    encounter: (t) => notes(t, [660, 990], { dur: 0.06, gain: 0.2 }),
    ballOpen: (t) => {
        noise(t, { dur: 0.06, gain: 0.18, from: 4000 });
        tone(t, { freq: 300, to: 1200, dur: 0.15, gain: 0.16 });
    },
    hit: (t) => hit(t),
    hitSuper: (t) => { hit(t, 0.45); hit(t + 0.09, 0.4); },
    hitWeak: (t) => noise(t, { dur: 0.09, gain: 0.22, from: 800, to: 200 }),
    faint: (t) => tone(t, { freq: 600, to: 80, dur: 0.5, gain: 0.22 }),
    heal: (t) => notes(t, [523, 659, 784, 1047], { dur: 0.06, type: 'triangle', gain: 0.2 }),
    statUp: (t) => tone(t, { freq: 300, to: 900, dur: 0.2, gain: 0.16 }),
    statDown: (t) => tone(t, { freq: 900, to: 300, dur: 0.2, gain: 0.16 }),
    // The VS card's slam: a crash, a falling boom and a bright three-note stab.
    versus: (t) => {
        noise(t, { dur: 0.5, gain: 0.32, from: 6000, to: 700 });
        tone(t, { type: 'square', freq: 110, to: 48, dur: 0.38, gain: 0.3 });
        notes(t + 0.04, [523, 784, 1047], { dur: 0.05, gain: 0.14, last: 0.2 });
    },
    // A Mega Evolution: a fast rising arpeggio, then a long bright shimmer.
    mega: (t) => {
        notes(t, [392, 523, 659, 784, 1047, 1319], { dur: 0.07, type: 'triangle', gain: 0.18, last: 0.45 });
        noise(t + 0.32, { dur: 0.7, gain: 0.12, from: 9000, to: 2500 });
    },
    // The band sweeping in.
    whoosh: (t) => noise(t, { dur: 0.28, gain: 0.14, from: 400, to: 5000 }),
    // An original eight-note figure, rising and resolving; never a game's jingle.
    victory: (t) => notes(t, [523, 659, 784, 659, 784, 1047, 988, 1047], { dur: 0.1, gain: 0.18, last: 0.45 }),
    defeat: (t) => notes(t, [392, 330, 262, 196], { dur: 0.16, type: 'triangle', gain: 0.22, last: 0.5 }),
};

export const SOUND_NAMES = Object.keys(RECIPES);

/** Play a sound by name. A no-op before `unlock()`, while muted, or for an unknown name. */
export const play = (name) => {
    if (!ctx || !master || muted || !RECIPES[name]) return;
    if (name === 'textBlip') {
        const now = ctx.currentTime * 1000;
        if (now - lastBlip < BLIP_GAP_MS) return;
        lastBlip = now;
    }
    try {
        RECIPES[name](ctx.currentTime);
    } catch (_) { /* a sound is never worth an error */ }
};

/**
 * The sound a battle moment makes (a `battleTimeline` event), or null.
 * Effectiveness arrives after the damage in the log, so a hit sounds on the
 * damage and "super effective" adds a second impact.
 */
export const soundFor = (event, { championName = 'Cynthia' } = {}) => {
    if (!event) return null;
    switch (event.type) {
        case 'switch': return 'ballOpen';
        case 'hp': return event.heal ? 'heal' : (event.from ? null : 'hit');
        case 'effect':
            if (event.kind === 'supereffective' || event.kind === 'crit') return 'hitSuper';
            if (event.kind === 'resisted') return 'hitWeak';
            return null;
        case 'faint': return 'faint';
        case 'mega': return 'mega';
        case 'stat': return event.amount > 0 ? 'statUp' : 'statDown';
        case 'end': return event.winner && event.winner !== championName ? 'victory' : 'defeat';
        default: return null;
    }
};

/** Test-only: forget the context, as a fresh page would. */
export const resetForTests = () => {
    ctx = null;
    master = null;
    muted = readMuted();
    lastBlip = -Infinity;
};
