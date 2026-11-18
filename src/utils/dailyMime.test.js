import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOODS, POSES, resolvePose } from './mascot/catalog.js';
import { mascotInner } from './mascot/rig.js';
import { TONES } from './mascot/constants.js';
import { isDeviceKey, wipeUserStorage } from './sessionWipe.js';
import {
    MIME_POOL,
    MIME_STORAGE_KEY,
    applyAccountMime,
    applyMimeGuess,
    applyMimeNextClue,
    dailyMimeFor,
    formatMimeShareLine,
    formatMimeSquares,
    heightScaleMetrics,
    mergeMimeDayStates,
    mimeClueSquares,
    mimeStageState,
    normalizeMimeDayState,
    pickMimeCandidates,
    readMimeDayState,
} from './dailyMime.js';

const pokemonIndexJson = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/data/pokemon-index.json'), 'utf8')
);
const pokemonIndex = pokemonIndexJson.pokemons;

describe('dailyMime', () => {
    it('validates every MIME_POOL entry against catalog MOODS, POSES, TONES, and rig SVG', () => {
        expect(MIME_POOL.length).toBeGreaterThanOrEqual(30);
        const ids = new Set();
        for (const item of MIME_POOL) {
            expect(ids.has(item.id), `duplicate id ${item.id}`).toBe(false);
            ids.add(item.id);
            expect(TONES).toContain(item.type);
            expect(item.height).toBeGreaterThan(0);
            expect(MOODS[item.mood], `${item.slug} mood ${item.mood}`).toBeDefined();
            expect(POSES[item.pose], `${item.slug} pose ${item.pose}`).toBeDefined();
            const svg = mascotInner({ ...resolvePose({ mood: item.mood, pose: item.pose }), tone: item.type });
            expect(/NaN|undefined|Infinity/.test(svg), `rig svg for ${item.slug}`).toBe(false);
        }
    });

    it('rotates through the entire MIME_POOL without repeating before a full cycle', () => {
        const seen = new Set();
        for (let day = 20750; day < 20750 + MIME_POOL.length; day += 1) {
            const { entry, number } = dailyMimeFor(day);
            expect(number).toBeGreaterThanOrEqual(1);
            seen.add(entry.id);
        }
        expect(seen.size).toBe(MIME_POOL.length);
    });

    it('builds 4 deterministic plausible candidates from pokemon-index.json (and fallback)', () => {
        for (let day = 20750; day < 20765; day += 1) {
            const { entry } = dailyMimeFor(day);
            const fromIndex = pickMimeCandidates(entry, pokemonIndex, day);
            const fromIndexAgain = pickMimeCandidates(entry, pokemonIndex, day);
            expect(fromIndex).toEqual(fromIndexAgain);
            expect(fromIndex).toHaveLength(4);
            const uniqueIds = new Set(fromIndex.map((c) => c.id));
            expect(uniqueIds.size).toBe(4);
            expect(uniqueIds.has(entry.id)).toBe(true);

            const fromFallback = pickMimeCandidates(entry, null, day);
            expect(fromFallback).toHaveLength(4);
            expect(fromFallback.some((c) => c.id === entry.id)).toBe(true);
        }
    });

    it('reveals clues in strict order and shows silhouette ONLY on clue 5', () => {
        const { entry } = dailyMimeFor(20750);
        const c1 = mimeStageState({ entry, clue: 1, solved: false });
        expect(c1.sceneKind).toBe('morning');
        expect(c1.showRuler).toBe(false);
        expect(c1.showRegion).toBe(false);
        expect(c1.showSilhouette).toBe(false);
        expect(c1.mascotPose).toBe('parado');

        const c2 = mimeStageState({ entry, clue: 2, solved: false });
        expect(c2.showRuler).toBe(true);
        expect(c2.showSilhouette).toBe(false);

        const c3 = mimeStageState({ entry, clue: 3, solved: false });
        expect(c3.mascotPose).toBe(entry.pose);
        expect(c3.mascotMood).toBe(entry.mood);
        expect(c3.showSilhouette).toBe(false);

        const c4 = mimeStageState({ entry, clue: 4, solved: false });
        expect(c4.sceneKind).toBe('night');
        expect(c4.showRegion).toBe(true);
        expect(c4.showSilhouette).toBe(false);

        const c5 = mimeStageState({ entry, clue: 5, solved: false });
        expect(c5.showSilhouette).toBe(true);
        expect(c5.revealArtwork).toBe(false);

        const won = mimeStageState({ entry, clue: 2, solved: true });
        expect(won.mascotMood).toBe('radiante');
        expect(won.mascotPose).toBe('comemorando');
        expect(won.showSilhouette).toBe(false);
        expect(won.revealArtwork).toBe(true);
    });

    it('computes proportional 1.6 m trainer vs Pokémon height bars across tiny and giant species', () => {
        const tiny = heightScaleMetrics(0.4);
        expect(tiny.band).toBe('tiny');
        expect(tiny.trainerPct).toBe(100);
        expect(tiny.pokemonPct).toBeLessThan(tiny.trainerPct);

        const giant = heightScaleMetrics(8.8);
        expect(giant.band).toBe('giant');
        expect(giant.pokemonPct).toBe(100);
        expect(giant.trainerPct).toBeLessThan(giant.pokemonPct);
    });

    it('advances clues on wrong guesses, locks solved clue count, and formats spoiler-free share text', () => {
        const dayKey = '2026-11-18';
        let state = normalizeMimeDayState(null, dayKey);
        expect(state.clue).toBe(1);

        const miss = applyMimeGuess(state, 37, 4);
        expect(miss.outcome).toBe('wrong');
        state = miss.nextState;
        expect(state.clue).toBe(2);
        expect(state.wrongIds).toEqual([37]);

        state = applyMimeNextClue(state);
        expect(state.clue).toBe(3);

        const hit = applyMimeGuess(state, 4, 4);
        expect(hit.outcome).toBe('won');
        state = hit.nextState;
        expect(state.solved).toBe(true);
        expect(state.solvedAtClue).toBe(3);

        // Reload on same day preserves solved state; next day resets cleanly
        expect(normalizeMimeDayState(state, dayKey).solved).toBe(true);
        expect(normalizeMimeDayState(state, '2026-11-19').solved).toBe(false);

        expect(mimeClueSquares(2)).toEqual([true, true, false, false, false]);
        expect(formatMimeSquares(2)).toBe('🟪🟪⬜⬜⬜');
        const line = formatMimeShareLine({ number: 37, clue: 2 });
        expect(line).toContain('37');
        expect(line).toContain('🟪🟪⬜⬜⬜');
        expect(line.toLowerCase()).not.toContain('charmander');
    });

    it('uses a trainer-scoped storage key wiped on sign-out', () => {
        expect(isDeviceKey(MIME_STORAGE_KEY)).toBe(false);
        const map = new Map([[MIME_STORAGE_KEY, '{"v":1}']]);
        const local = {
            get length() { return map.size; },
            key: (i) => Array.from(map.keys())[i] ?? null,
            getItem: (k) => map.get(k) ?? null,
            removeItem: (k) => map.delete(k),
        };
        const removed = wipeUserStorage({ local });
        expect(removed).toContain(MIME_STORAGE_KEY);
    });

    it('merges local and account mime progress for the same day', () => {
        const dayKey = '2026-11-18';
        const merged = mergeMimeDayStates(
            { dayKey, clue: 2, wrongIds: [37], solved: false },
            { dayKey, clue: 3, wrongIds: [58], solved: true, solvedAtClue: 3, shared: true },
            dayKey
        );
        expect(merged.solved).toBe(true);
        expect(merged.solvedAtClue).toBe(3);
        expect(merged.wrongIds).toEqual([37, 58]);
        expect(merged.shared).toBe(true);

        const map = new Map();
        const storage = {
            get length() { return map.size; },
            key: (i) => Array.from(map.keys())[i] ?? null,
            getItem: (k) => map.get(k) ?? null,
            setItem: (k, v) => map.set(k, String(v)),
            removeItem: (k) => map.delete(k),
        };
        applyAccountMime(merged, dayKey, storage);
        expect(readMimeDayState(dayKey, storage)).toEqual(merged);
    });
});
