import { describe, expect, it } from 'vitest';
import {
    SUPPORT_NUDGE_INTERVAL_MS,
    readSupportNudge,
    recordFinish,
    shouldNudgeSupport,
    writeSupportNudge,
} from './supportNudge';

const memoryStorage = () => {
    const map = new Map();
    return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) };
};

describe('shouldNudgeSupport', () => {
    it('waits for the second finish', () => {
        expect(shouldNudgeSupport({ finishes: 1 })).toBe(false);
        expect(shouldNudgeSupport({ finishes: 2 })).toBe(true);
    });

    it('asks at most once a week', () => {
        const now = 10 * SUPPORT_NUDGE_INTERVAL_MS;
        expect(shouldNudgeSupport({ finishes: 5, lastShownAt: now - 1000 }, now)).toBe(false);
        expect(shouldNudgeSupport({ finishes: 5, lastShownAt: now - SUPPORT_NUDGE_INTERVAL_MS }, now)).toBe(true);
    });

    it('never asks someone who clicked through', () => {
        expect(shouldNudgeSupport({ finishes: 9, supported: true })).toBe(false);
    });
});

describe('recordFinish', () => {
    it('shows on the second finish, then not again within the week', () => {
        const now = 10 * SUPPORT_NUDGE_INTERVAL_MS;
        let step = recordFinish({ finishes: 0, lastShownAt: 0 }, now);
        expect(step.show).toBe(false);
        step = recordFinish(step.state, now);
        expect(step.show).toBe(true);
        expect(step.state.lastShownAt).toBe(now);
        step = recordFinish(step.state, now + 1000);
        expect(step.show).toBe(false);
    });
});

describe('storage', () => {
    it('round-trips and survives junk', () => {
        const storage = memoryStorage();
        expect(readSupportNudge(storage)).toEqual({ finishes: 0, lastShownAt: 0, supported: false });
        writeSupportNudge(storage, { finishes: 3, lastShownAt: 42, supported: true });
        expect(readSupportNudge(storage)).toEqual({ finishes: 3, lastShownAt: 42, supported: true });
        storage.setItem('ptb:supportNudge', '{not json');
        expect(readSupportNudge(storage).finishes).toBe(0);
        expect(readSupportNudge(null).finishes).toBe(0);
    });
});
