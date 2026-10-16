import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isMuted, play, resetForTests, setMuted, SOUND_NAMES, soundFor, unlock } from './challengeSfx';

// A minimal WebAudio stand-in that counts what gets scheduled.
const created = { osc: 0, noise: 0 };
const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
const node = () => ({ connect: vi.fn((next) => next), start: vi.fn(), stop: vi.fn() });
class FakeAudioContext {
    constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.destination = {}; }
    createGain() { return { ...node(), gain: param() }; }
    createOscillator() { created.osc += 1; return { ...node(), type: 'sine', frequency: param() }; }
    createBiquadFilter() { return { ...node(), type: 'lowpass', frequency: param() }; }
    createBuffer(_c, length) { return { getChannelData: () => new Float32Array(length) }; }
    createBufferSource() { created.noise += 1; return { ...node(), buffer: null }; }
}

const store = new Map();
beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
    });
    created.osc = 0;
    created.noise = 0;
    vi.stubGlobal('AudioContext', undefined);
    resetForTests();
});
afterEach(() => vi.unstubAllGlobals());

describe('challenge sound', () => {
    it('plays nothing before unlock, without throwing', () => {
        expect(() => SOUND_NAMES.forEach((name) => play(name))).not.toThrow();
        vi.stubGlobal('AudioContext', FakeAudioContext);
        play('hit');
        expect(created.osc + created.noise).toBe(0);
    });

    it('stays quiet where WebAudio does not exist', () => {
        expect(unlock()).toBe(false);
        expect(() => play('victory')).not.toThrow();
    });

    it('plays every recipe once unlocked', () => {
        vi.stubGlobal('AudioContext', FakeAudioContext);
        expect(unlock()).toBe(true);
        for (const name of SOUND_NAMES) {
            const before = created.osc + created.noise;
            play(name);
            expect(created.osc + created.noise, name).toBeGreaterThan(before);
        }
    });

    it('remembers mute across a reload, and a muted console plays nothing', () => {
        vi.stubGlobal('AudioContext', FakeAudioContext);
        unlock();
        setMuted(true);
        expect(store.get('ptb:challenge:muted')).toBe('1');
        resetForTests(); // a new page
        expect(isMuted()).toBe(true);
        unlock();
        play('hit');
        expect(created.osc + created.noise).toBe(0);
        setMuted(false);
        play('hit');
        expect(created.osc + created.noise).toBeGreaterThan(0);
    });

    it('limits the text blip to one every 40 ms', () => {
        vi.stubGlobal('AudioContext', FakeAudioContext);
        unlock();
        play('textBlip');
        play('textBlip');
        expect(created.osc).toBe(1);
    });

    it('gives each battle moment its sound', () => {
        expect(soundFor({ type: 'switch' })).toBe('ballOpen');
        expect(soundFor({ type: 'hp', heal: false })).toBe('hit');
        expect(soundFor({ type: 'hp', heal: false, from: 'psn' })).toBe(null); // residual: no impact
        expect(soundFor({ type: 'hp', heal: true })).toBe('heal');
        expect(soundFor({ type: 'effect', kind: 'supereffective' })).toBe('hitSuper');
        expect(soundFor({ type: 'effect', kind: 'resisted' })).toBe('hitWeak');
        expect(soundFor({ type: 'effect', kind: 'miss' })).toBe(null);
        expect(soundFor({ type: 'faint' })).toBe('faint');
        expect(soundFor({ type: 'stat', amount: 2 })).toBe('statUp');
        expect(soundFor({ type: 'stat', amount: -1 })).toBe('statDown');
        expect(soundFor({ type: 'end', winner: 'Ash' }, { championName: 'Cynthia' })).toBe('victory');
        expect(soundFor({ type: 'end', winner: 'Cynthia' }, { championName: 'Cynthia' })).toBe('defeat');
        expect(soundFor(null)).toBe(null);
    });
});
