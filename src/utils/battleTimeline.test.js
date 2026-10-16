import { describe, it, expect } from 'vitest';

import {
    durationOf, initialPlayback, isPlaying, isSilent, playbackReducer, toTimeline, withDialogue,
} from './battleTimeline';

const TURN = [
    '|switch|p1a: Pelly|Pelipper, L50, M|160/160',
    '|switch|p2a: Spiritomb|Spiritomb, L50, F|100/100',
    '|turn|1',
    '|move|p1a: Pelly|Hurricane|p2a: Spiritomb',
    '|-supereffective|p2a: Spiritomb',
    '|-damage|p2a: Spiritomb|0 fnt',
    '|faint|p2a: Spiritomb',
    '|move|p2a: Garchomp|Earthquake|p1a: Pelly|[still]',
    '|-immune|p1a: Pelly',
    '|-damage|p1a: Pelly|140/160|[from] item: Life Orb',
    '|-weather|Sandstorm|[upkeep]',
    '|win|Enzo',
];

describe('toTimeline', () => {
    const events = toTimeline(TURN);

    it('turns each line that shows something into an event, with its line index', () => {
        expect(events.map((e) => e.type)).toEqual([
            'switch', 'switch', 'turn', 'move', 'effect', 'hp', 'faint', 'move', 'effect', 'hp', 'end',
        ]);
        expect(events.find((e) => e.type === 'faint')).toMatchObject({ side: 'p2', species: 'Spiritomb', lineIndex: 6 });
    });

    it('names the species behind a nickname, and reads HP as a percentage', () => {
        const move = events.find((e) => e.type === 'move');
        expect(move).toMatchObject({ side: 'p1', species: 'Pelipper', move: 'Hurricane', targetSide: 'p2', still: false });
        expect(events[0]).toMatchObject({ type: 'switch', species: 'Pelipper', hpPct: 100 });
        expect(events.find((e) => e.type === 'hp' && e.side === 'p1')).toMatchObject({ hpPct: 87.5, from: 'item: Life Orb' });
    });

    it('marks moves played without animation, and skips weather upkeep', () => {
        expect(events.filter((e) => e.type === 'move')[1].still).toBe(true);
        expect(events.some((e) => e.type === 'weather')).toBe(false);
    });

    it('emits only from a line onward, still knowing earlier nicknames', () => {
        const later = toTimeline(TURN, { from: 3 });
        expect(later[0]).toMatchObject({ type: 'move', species: 'Pelipper' });
    });
});

describe('withDialogue', () => {
    it('places a line after every event of the line it follows', () => {
        const events = toTimeline(TURN.slice(0, 7));
        const merged = withDialogue(events, [{ key: 'challenge.cynthia.firstLoss', lineIndex: 6, params: { species: 'Spiritomb' } }]);
        const at = merged.findIndex((e) => e.type === 'dialogue');
        expect(merged[at - 1].type).toBe('faint');
        expect(merged[at]).toMatchObject({ key: 'challenge.cynthia.firstLoss', params: { species: 'Spiritomb' } });
    });
});

describe('playback reducer', () => {
    it('walks the queue, revealing lines as each event plays, then catches up to the tail', () => {
        const events = toTimeline(TURN, { from: 3 });
        let state = initialPlayback(3);
        expect(isPlaying(state)).toBe(false);
        state = playbackReducer(state, { type: 'enqueue', events, tail: TURN.length });
        expect(isPlaying(state)).toBe(true);
        state = playbackReducer(state, { type: 'next' });
        expect(state.current.type).toBe('move');
        expect(state.shown).toBe(4); // the move line, not yet its damage
        while (state.queue.length) state = playbackReducer(state, { type: 'next' });
        state = playbackReducer(state, { type: 'next' });
        expect(state.current).toBe(null);
        expect(state.shown).toBe(TURN.length);
    });

    it('starts at line 0 behind an intro, and never moves backwards', () => {
        let state = initialPlayback(5, [{ type: 'intro', lineIndex: -1 }]);
        expect(state.shown).toBe(0);
        state = playbackReducer(state, { type: 'next' });
        expect(state.current.type).toBe('intro');
        expect(state.shown).toBe(0);
    });
});

describe('timing', () => {
    it('holds text longer than a silent bar drain, faster at 2× and with reduced motion', () => {
        const move = { type: 'move' };
        expect(durationOf(move)).toBeGreaterThan(durationOf({ type: 'hp' }));
        expect(durationOf(move, { fast: true })).toBeLessThan(durationOf(move));
        expect(durationOf(move, { reducedMotion: true })).toBeLessThan(durationOf(move));
        expect(isSilent({ type: 'turn' })).toBe(true);
        expect(isSilent({ type: 'hp', from: 'item: Leftovers' })).toBe(false);
    });
});
