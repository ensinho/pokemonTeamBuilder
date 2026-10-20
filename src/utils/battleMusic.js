/**
 * Battle music: two original chiptune loops synthesized with WebAudio — no
 * files, nothing to download. `champion` (D minor, driving) plays against
 * Cynthia, `rival` (E minor, bright) against a friend. Both melodies were
 * written for this app; neither is, or quotes, a game's theme.
 *
 * It plays through the sound effects' context and master gain
 * (`challengeSfx.audioGraph`), so the console's mute silences it too; it has
 * its own switch on top (`ptb:battle:music`, on by default).
 *
 * ## The scheduler
 *
 * The classic lookahead pattern: a 25 ms timer schedules every sixteenth note
 * due in the next 120 ms on the audio clock, so timing never depends on the
 * main thread being free — a long render can delay the timer, not the beat.
 * While the tab is hidden nothing is scheduled at all (no CPU for a page
 * nobody hears), and the song picks up where it was on return.
 *
 * `setPinch(true)` — your Pokémon low on HP — plays the same loop faster, as
 * the games do.
 */

import { audioGraph, isMuted, unlock } from './challengeSfx';

const MUSIC_KEY = 'ptb:battle:music';
const MUSIC_GAIN = 0.55;
const LOOKAHEAD_S = 0.12;
const TICK_MS = 25;
const PINCH_SPEED = 1.14;
const STEPS_PER_BAR = 16;

/* ── Notes ───────────────────────────────────────────────────────────── */

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** `'A4'` → 440, `'C#6'`, `'Bb3'`; null for anything else. */
export const noteFreq = (name) => {
    const match = /^([A-G])([#b]?)(-?\d)$/.exec(String(name || ''));
    if (!match) return null;
    const [, letter, accidental, octave] = match;
    const midi = 12 * (Number(octave) + 1) + SEMITONES[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
    return 440 * 2 ** ((midi - 69) / 12);
};

/**
 * One track's bars → its notes, each with the step it starts on and how many
 * steps it lasts. A token per sixteenth: a note starts, `-` holds the one
 * before, `.` rests.
 *
 * @param {string[]} bars
 * @returns {Array<{step: number, freq: number, len: number}>}
 */
export const parseTrack = (bars = []) => {
    const tokens = bars.flatMap((bar) => bar.trim().split(/\s+/));
    const events = [];
    tokens.forEach((token, step) => {
        if (token === '-' || token === '.') return;
        const freq = noteFreq(token);
        if (!freq) return;
        let len = 1;
        while (tokens[step + len] === '-') len += 1;
        events.push({ step, freq, len });
    });
    return events;
};

/* ── The songs ───────────────────────────────────────────────────────── */

// A chord per bar → the bass (a galloping octave figure) and the arpeggio.
const bassBar = ([low, high]) => `${low} . ${low} ${high} . ${low} ${high} . ${low} . ${low} ${high} . ${low} ${high} .`;
const arpBar = (tones) => Array.from({ length: STEPS_PER_BAR }, (_, i) => tones[i % tones.length]).join(' ');

const CHORDS = {
    Dm: { bass: ['D2', 'D3'], arp: ['D4', 'F4', 'A4', 'D5'] },
    Bb: { bass: ['Bb1', 'Bb2'], arp: ['Bb3', 'D4', 'F4', 'Bb4'] },
    C: { bass: ['C2', 'C3'], arp: ['C4', 'E4', 'G4', 'C5'] },
    Gm: { bass: ['G1', 'G2'], arp: ['G3', 'Bb3', 'D4', 'G4'] },
    A: { bass: ['A1', 'A2'], arp: ['A3', 'C#4', 'E4', 'A4'] },
    Em: { bass: ['E2', 'E3'], arp: ['E4', 'G4', 'B4', 'E5'] },
    D: { bass: ['D2', 'D3'], arp: ['D4', 'F#4', 'A4', 'D5'] },
    B: { bass: ['B1', 'B2'], arp: ['B3', 'D#4', 'F#4', 'B4'] },
    Am: { bass: ['A1', 'A2'], arp: ['A3', 'C4', 'E4', 'A4'] },
};

const REST_BAR = '. . . . . . . . . . . . . . . .';

/**
 * @typedef {{bpm: number, intro: object, loop: object}} Song — `intro` plays
 * once, `loop` forever; each has `lead`, `bass`, `arp`, `drums` (bar strings).
 */
const song = ({ bpm, chords, lead, drums, introLead, introDrums, introChord }) => ({
    bpm,
    intro: {
        lead: introLead,
        bass: [bassBar(CHORDS[introChord].bass), bassBar(CHORDS[introChord].bass)],
        arp: [arpBar(CHORDS[introChord].arp), arpBar(CHORDS[introChord].arp)],
        drums: introDrums,
    },
    loop: {
        lead,
        bass: chords.map((c) => bassBar(CHORDS[c].bass)),
        arp: chords.map((c) => arpBar(CHORDS[c].arp)),
        drums,
    },
});

const GROOVE_CHAMPION = 'k . h . s . h . k . k h s . h .';
const GROOVE_RIVAL = 'k . h h s . h . k k h . s . h h';

export const SONGS = {
    champion: song({
        bpm: 168,
        introChord: 'Dm',
        introLead: [REST_BAR, '. . . . . . . . . . . . A4 - C5 -'],
        introDrums: ['k . . . . . . . k . . . . . . .', 'k . . . s . . . k . s . s s s s'],
        chords: ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A'],
        lead: [
            'D5 - - - F5 - E5 - D5 - C5 - A4 - - -',
            'D5 - - - F5 - G5 - A5 - - - G5 - F5 -',
            'F5 - - - D5 - Bb4 - F5 - - - E5 - D5 -',
            'E5 - - - C5 - - - E5 - G5 - C6 - Bb5 -',
            'A5 - - - - - D6 - C6 - A5 - G5 - F5 -',
            'G5 - A5 - F5 - - - E5 - D5 - E5 - F5 -',
            'G5 - - - Bb5 - A5 - G5 - F5 - D5 - G5 -',
            'A5 - - - - - - - C#6 - - - E6 - - -',
        ],
        drums: [...Array(7).fill(GROOVE_CHAMPION), 'k . h . s . h . s . s s s s s s'],
    }),
    rival: song({
        bpm: 152,
        introChord: 'Em',
        introLead: [REST_BAR, '. . . . . . . . . . . . B4 - D5 -'],
        introDrums: ['k . . . k . . . k . . . k . s s', 'k . h . s . h . k . h . s s s s'],
        chords: ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B'],
        lead: [
            'E5 - G5 - B5 - - - A5 - G5 - F#5 - E5 -',
            'G5 - - - E5 - C5 - E5 - G5 - C6 - B5 -',
            'A5 - - - F#5 - D5 - F#5 - A5 - D6 - C6 -',
            'B5 - - - - - D#5 - F#5 - - - B5 - A5 -',
            'G5 - - - B5 - E6 - D6 - B5 - G5 - E5 -',
            'C6 - - - G5 - E5 - G5 - C6 - E6 - D6 -',
            'C6 - B5 - A5 - E5 - A5 - C6 - B5 - A5 -',
            'B5 - - - - - - - D#6 - - - F#6 - - -',
        ],
        drums: [...Array(7).fill(GROOVE_RIVAL), 'k . h . s . h . s s . s s . s s'],
    }),
};

/** A section's tracks, parsed once: notes by step, drum hits by step. */
const compile = (section) => {
    const byStep = (events) => {
        const map = new Map();
        events.forEach((event) => map.set(event.step, [...(map.get(event.step) || []), event]));
        return map;
    };
    const drums = new Map();
    section.drums.flatMap((bar) => bar.trim().split(/\s+/)).forEach((token, step) => {
        if (token !== '.' && token !== '-') drums.set(step, token);
    });
    return {
        length: section.lead.length * STEPS_PER_BAR,
        lead: byStep(parseTrack(section.lead)),
        bass: byStep(parseTrack(section.bass)),
        arp: byStep(parseTrack(section.arp)),
        drums,
    };
};

const compiled = new Map();
const compiledSong = (id) => {
    if (!compiled.has(id)) {
        const { bpm, intro, loop } = SONGS[id];
        compiled.set(id, { bpm, intro: compile(intro), loop: compile(loop) });
    }
    return compiled.get(id);
};

/* ── Instruments ─────────────────────────────────────────────────────── */

const pulseWaves = new WeakMap();
/** A pulse wave of the given duty, as the old sound chips had (cached per context). */
const pulse = (ctx, duty) => {
    let byDuty = pulseWaves.get(ctx);
    if (!byDuty) {
        byDuty = new Map();
        pulseWaves.set(ctx, byDuty);
    }
    if (!byDuty.has(duty)) {
        const n = 32;
        const real = new Float32Array(n);
        const imag = new Float32Array(n);
        for (let k = 1; k < n; k += 1) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
        byDuty.set(duty, ctx.createPeriodicWave(real, imag));
    }
    return byDuty.get(duty);
};

let noiseBuffer = null;
const noiseOf = (ctx) => {
    if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
        const length = ctx.sampleRate;
        noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
};

const voice = (ctx, out, t, { wave, type, freq, dur, gain, release = 0.04 }) => {
    const osc = ctx.createOscillator();
    if (wave) osc.setPeriodicWave(wave);
    else osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.setValueAtTime(gain * 0.8, t + Math.max(0.01, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
};

const hit = (ctx, out, t, { dur, gain, type, freq }) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseOf(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
};

const DRUMS = {
    k: (ctx, out, t) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.42, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        osc.connect(g);
        g.connect(out);
        osc.start(t);
        osc.stop(t + 0.16);
    },
    s: (ctx, out, t) => {
        hit(ctx, out, t, { dur: 0.12, gain: 0.2, type: 'bandpass', freq: 1800 });
        voice(ctx, out, t, { type: 'triangle', freq: 190, dur: 0.06, gain: 0.12, release: 0.03 });
    },
    h: (ctx, out, t) => hit(ctx, out, t, { dur: 0.035, gain: 0.07, type: 'highpass', freq: 7000 }),
};

/* ── The player ──────────────────────────────────────────────────────── */

const readEnabled = () => {
    try {
        return localStorage.getItem(MUSIC_KEY) !== '0';
    } catch (_) {
        return true;
    }
};

let enabled = readEnabled();
let wanted = null; // the song the screen asked for, playing or not
let playing = null; // { id, song, out, section, step, nextTime, timer }
let pinch = false;
let gestureHooked = false;

const stepSeconds = (song) => 60 / song.bpm / 4 / (pinch ? PINCH_SPEED : 1);

const scheduleStep = (ctx, out, section, step, t, stepDur) => {
    const play = (map, render) => (map.get(step) || []).forEach(render);
    play(section.lead, (n) => voice(ctx, out, t, { wave: pulse(ctx, 0.25), freq: n.freq, dur: n.len * stepDur * 0.95, gain: 0.085 }));
    play(section.bass, (n) => voice(ctx, out, t, { type: 'triangle', freq: n.freq, dur: n.len * stepDur * 0.9, gain: 0.26 }));
    play(section.arp, (n) => voice(ctx, out, t, { wave: pulse(ctx, 0.125), freq: n.freq, dur: stepDur * 0.7, gain: 0.032, release: 0.02 }));
    const drum = section.drums.get(step);
    if (drum && DRUMS[drum]) DRUMS[drum](ctx, out, t);
};

const tick = () => {
    const graph = audioGraph();
    if (!playing || !graph) return;
    const { ctx } = graph;
    const { song, out } = playing;
    // Behind the clock (the tab slept, the timer was late): skip ahead, never burst.
    if (playing.nextTime < ctx.currentTime - 0.2) playing.nextTime = ctx.currentTime + 0.05;
    while (playing.nextTime < ctx.currentTime + LOOKAHEAD_S) {
        const section = playing.section === 'intro' ? song.intro : song.loop;
        const stepDur = stepSeconds(song);
        // Muted: the clock keeps running, so the song resumes in place.
        if (!isMuted()) scheduleStep(ctx, out, section, playing.step, playing.nextTime, stepDur);
        playing.nextTime += stepDur;
        playing.step += 1;
        if (playing.step >= section.length) {
            playing.step = 0;
            playing.section = 'loop';
        }
    }
};

const startTimer = () => {
    if (!playing || playing.timer || document.hidden) return;
    const graph = audioGraph();
    if (graph) playing.nextTime = Math.max(playing.nextTime, graph.ctx.currentTime + 0.05);
    playing.timer = setInterval(tick, TICK_MS);
    tick();
};

const stopTimer = () => {
    if (playing?.timer) clearInterval(playing.timer);
    if (playing) playing.timer = null;
};

const onVisibility = () => (document.hidden ? stopTimer() : startTimer());

const begin = () => {
    const graph = audioGraph();
    if (!graph || !wanted || !enabled || playing?.id === wanted) return;
    if (playing) halt(0.25);
    const { ctx, master } = graph;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(MUSIC_GAIN, ctx.currentTime + 0.4);
    out.connect(master);
    playing = { id: wanted, song: compiledSong(wanted), out, section: 'intro', step: 0, nextTime: ctx.currentTime + 0.08, timer: null };
    document.addEventListener('visibilitychange', onVisibility);
    startTimer();
};

/** Stop what is playing, fading over `fade` seconds. */
const halt = (fade = 0.6) => {
    if (!playing) return;
    stopTimer();
    document.removeEventListener('visibilitychange', onVisibility);
    const graph = audioGraph();
    const { out } = playing;
    playing = null;
    if (!graph) return;
    const now = graph.ctx.currentTime;
    try {
        out.gain.cancelScheduledValues(now);
        out.gain.setValueAtTime(Math.max(0.0001, out.gain.value || MUSIC_GAIN), now);
        out.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.02, fade));
        setTimeout(() => out.disconnect(), (fade + 0.1) * 1000);
    } catch (_) { /* a fade is never worth an error */ }
};

/**
 * Before the first gesture there is no audio context (autoplay policy): the
 * song waits, and the first press anywhere unlocks the sound and starts it.
 */
const hookGesture = () => {
    if (gestureHooked || typeof window === 'undefined') return;
    gestureHooked = true;
    const once = () => {
        window.removeEventListener('pointerdown', once, true);
        window.removeEventListener('keydown', once, true);
        gestureHooked = false;
        if (unlock()) begin();
    };
    window.addEventListener('pointerdown', once, true);
    window.addEventListener('keydown', once, true);
};

/** Ask for a song (`'champion'` or `'rival'`). Plays now if it can, at the first gesture otherwise. */
export const startMusic = (id) => {
    if (!SONGS[id]) return;
    wanted = id;
    if (!enabled) return;
    if (audioGraph()) begin();
    else hookGesture();
};

/** Stop the music (the screen left, the battle ended). */
export const stopMusic = ({ fade = 0.6 } = {}) => {
    wanted = null;
    halt(fade);
};

export const isMusicOn = () => enabled;

export const setMusicOn = (value) => {
    enabled = Boolean(value);
    try {
        localStorage.setItem(MUSIC_KEY, enabled ? '1' : '0');
    } catch (_) { /* a convenience, best-effort */ }
    if (!enabled) halt(0.3);
    else if (wanted) startMusic(wanted);
};

/** Faster while your Pokémon is in danger. */
export const setPinch = (value) => {
    pinch = Boolean(value);
};
