import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { noteFreq, parseTrack, SONGS, isMusicOn, setMusicOn, startMusic, stopMusic } from './battleMusic';
import { resetForTests, unlock } from './challengeSfx';

describe('noteFreq', () => {
    it('tunes A4 to 440 and walks the octaves', () => {
        expect(noteFreq('A4')).toBe(440);
        expect(noteFreq('A5')).toBeCloseTo(880);
        expect(noteFreq('C#6')).toBeCloseTo(1108.73, 1);
        expect(noteFreq('Bb1')).toBeCloseTo(58.27, 1);
        expect(noteFreq('H2')).toBeNull();
        expect(noteFreq('-')).toBeNull();
    });
});

describe('parseTrack', () => {
    it('reads a start per note and holds through the dashes', () => {
        expect(parseTrack(['D5 - - - F5 - . . A4 . . . . . . -'])).toEqual([
            { step: 0, freq: noteFreq('D5'), len: 4 },
            { step: 4, freq: noteFreq('F5'), len: 2 },
            { step: 8, freq: noteFreq('A4'), len: 1 },
        ]);
    });

    it('holds a note across a bar line', () => {
        const [note] = parseTrack(['. . . . . . . . . . . . . . . E5', '- - . . . . . . . . . . . . . .']);
        expect(note).toEqual({ step: 15, freq: noteFreq('E5'), len: 3 });
    });
});

describe('the songs', () => {
    const sections = Object.entries(SONGS).flatMap(([id, s]) => [[`${id}.intro`, s.intro], [`${id}.loop`, s.loop]]);

    it.each(sections)('%s: every track has the same bars, sixteen steps each', (_, section) => {
        const bars = section.lead.length;
        for (const track of ['lead', 'bass', 'arp', 'drums']) {
            expect(section[track]).toHaveLength(bars);
            section[track].forEach((bar) => expect(bar.trim().split(/\s+/)).toHaveLength(16));
        }
    });

    it.each(sections)('%s: every token is a note, a hold, a rest or a drum', (_, section) => {
        for (const track of ['lead', 'bass', 'arp']) {
            section[track].flatMap((bar) => bar.trim().split(/\s+/))
                .forEach((token) => expect(token === '-' || token === '.' || noteFreq(token) !== null).toBe(true));
        }
        section.drums.flatMap((bar) => bar.trim().split(/\s+/))
            .forEach((token) => expect(['k', 's', 'h', '.']).toContain(token));
    });
});

describe('the player', () => {
    const created = { osc: 0 };
    const param = () => ({
        value: 0.5, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(),
    });
    const node = () => ({ connect: vi.fn((next) => next), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() });
    class FakeAudioContext {
        constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.destination = {}; }
        createGain() { return { ...node(), gain: param() }; }
        createOscillator() { created.osc += 1; return { ...node(), type: 'sine', frequency: param(), setPeriodicWave: vi.fn() }; }
        createPeriodicWave() { return {}; }
        createBiquadFilter() { return { ...node(), type: 'lowpass', frequency: param() }; }
        createBuffer(_c, length) { return { sampleRate: 8000, getChannelData: () => new Float32Array(length) }; }
        createBufferSource() { return { ...node(), buffer: null }; }
    }
    const store = new Map();

    beforeEach(() => {
        vi.useFakeTimers();
        store.clear();
        created.osc = 0;
        vi.stubGlobal('localStorage', { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) });
        vi.stubGlobal('AudioContext', FakeAudioContext);
        vi.stubGlobal('document', { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
        vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
        resetForTests();
        setMusicOn(true);
    });
    afterEach(() => {
        stopMusic({ fade: 0 });
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('waits for the first gesture before making a sound', () => {
        startMusic('rival');
        expect(created.osc).toBe(0);
        expect(window.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    });

    it('schedules notes once the sound is unlocked', () => {
        unlock();
        startMusic('champion');
        vi.advanceTimersByTime(100);
        expect(created.osc).toBeGreaterThan(0);
    });

    it('stays silent with its switch off, and remembers it', () => {
        setMusicOn(false);
        unlock();
        startMusic('champion');
        vi.advanceTimersByTime(100);
        expect(created.osc).toBe(0);
        expect(isMusicOn()).toBe(false);
        expect(store.get('ptb:battle:music')).toBe('0');
    });
});
