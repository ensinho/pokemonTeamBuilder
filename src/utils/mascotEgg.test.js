import { describe, expect, it } from 'vitest';
import { HATS, mascotInner } from './mascot/rig.js';
import { resolvePose } from './mascot/catalog.js';
import { MASCOT_COSTUME_CHOICES } from '../store/useMascotStore.js';
import { isDeviceKey, wipeUserStorage } from './sessionWipe.js';
import {
    EGG_CYCLE_DAYS,
    EGG_HATS,
    EGG_STORAGE_KEY,
    applyAccountEgg,
    deriveEggProgress,
    hatchEggCycle,
    mergeEggStates,
    normalizeEggState,
    readEggState,
    rewardForCycle,
    storeCostumeForEggHat,
    withEquippedEggHat,
    writeEggState,
} from './mascotEgg.js';

const makeMemoryStorage = () => {
    const map = new Map();
    return {
        get length() { return map.size; },
        key: (i) => Array.from(map.keys())[i] ?? null,
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => { map.set(k, String(v)); },
        removeItem: (k) => { map.delete(k); },
    };
};

describe('mascotEgg', () => {
    it('keeps every surprise hat aligned with rig.js HATS and valid store costumes', () => {
        expect(EGG_HATS).toEqual(['witch', 'cap', 'headphones', 'party', 'straw', 'professor', 'crown']);
        for (const hat of EGG_HATS) {
            expect(HATS[hat], `rig HATS.${hat}`).toBeTypeOf('function');
            const svg = mascotInner({ ...resolvePose({ mood: 'radiante', pose: 'comemorando' }), hat });
            expect(/NaN|undefined|Infinity/.test(svg), `svg for ${hat}`).toBe(false);
            expect(MASCOT_COSTUME_CHOICES).toContain(storeCostumeForEggHat(hat));
        }
    });

    it('uses a trainer-scoped storage key wiped on sign-out', () => {
        expect(isDeviceKey(EGG_STORAGE_KEY)).toBe(false);
        const local = makeMemoryStorage();
        writeEggState({ hatchedCycles: 1, unlocked: ['witch'], equippedHat: 'witch' }, local);
        expect(readEggState(local).unlocked).toEqual(['witch']);
        const removed = wipeUserStorage({ local });
        expect(removed).toContain(EGG_STORAGE_KEY);
        expect(readEggState(local)).toEqual({ v: 1, hatchedCycles: 0, unlocked: [], equippedHat: null });
    });

    it('tracks progressive 0..4 cracks and hatches only on trainer action at 5 full days', () => {
        expect(EGG_CYCLE_DAYS).toBe(5);
        for (let d = 0; d <= 4; d += 1) {
            const p = deriveEggProgress(d, null);
            expect(p.stepDays).toBe(d);
            expect(p.cracks).toBe(d);
            expect(p.readyToHatch).toBe(false);
            expect(p.hatched).toBe(false);
        }

        // At 5 full days before clicking hatch: readyToHatch, NOT gold/hatched yet
        const ready = deriveEggProgress(5, null);
        expect(ready.stepDays).toBe(5);
        expect(ready.crackCountVisible).toBe(5);
        expect(ready.readyToHatch).toBe(true);
        expect(ready.hatched).toBe(false);
        expect(ready.rewardHat).toBe('witch');

        // Clicking hatch unlocks cycle 1 hat and enters hatched state
        const afterHatch = hatchEggCycle(null, 5);
        expect(afterHatch.hatchedCycles).toBe(1);
        expect(afterHatch.unlocked).toEqual(['witch']);

        const hatchedView = deriveEggProgress(5, afterHatch);
        expect(hatchedView.readyToHatch).toBe(false);
        expect(hatchedView.hatched).toBe(true);
        expect(hatchedView.rewardHat).toBe('witch');

        // Day 6 begins cycle 2 cleanly at 1/5 while retaining unlocked hats
        const nextCycleDay1 = deriveEggProgress(6, afterHatch);
        expect(nextCycleDay1.stepDays).toBe(1);
        expect(nextCycleDay1.cracks).toBe(1);
        expect(nextCycleDay1.hatched).toBe(false);
        expect(nextCycleDay1.readyToHatch).toBe(false);
        expect(nextCycleDay1.activeCycle).toBe(2);
        expect(nextCycleDay1.rewardHat).toBe(rewardForCycle(2));
        expect(nextCycleDay1.unlocked).toEqual(['witch']);
    });

    it('equips only unlocked hats and ignores locked or unknown ones', () => {
        const base = normalizeEggState({ hatchedCycles: 1, unlocked: ['witch'] });
        expect(withEquippedEggHat(base, 'crown').equippedHat).toBeNull();
        const equipped = withEquippedEggHat(base, 'witch');
        expect(equipped.equippedHat).toBe('witch');
        expect(withEquippedEggHat(equipped, null).equippedHat).toBeNull();
    });

    it('merges local and account egg progress without losing hatched cycles or unlocked hats', () => {
        const local = makeMemoryStorage();
        writeEggState({ hatchedCycles: 1, unlocked: ['witch'], equippedHat: null }, local);
        const merged = applyAccountEgg(
            { hatchedCycles: 2, unlocked: ['witch', 'cap'], equippedHat: 'cap' },
            local
        );
        expect(merged).toEqual({
            v: 1,
            hatchedCycles: 2,
            unlocked: ['witch', 'cap'],
            equippedHat: 'cap',
        });
        expect(readEggState(local)).toEqual(merged);

        // Local higher cycle wins when account is older
        const ahead = mergeEggStates(
            { hatchedCycles: 3, unlocked: ['witch', 'cap', 'headphones'], equippedHat: 'headphones' },
            { hatchedCycles: 1, unlocked: ['witch'], equippedHat: null }
        );
        expect(ahead.hatchedCycles).toBe(3);
        expect(ahead.unlocked).toEqual(['witch', 'cap', 'headphones']);
        expect(ahead.equippedHat).toBe('headphones');
    });
});
