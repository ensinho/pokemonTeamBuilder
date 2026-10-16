import { describe, it, expect } from 'vitest';
import { Dex } from '@pkmn/sim';

import { createMatch, snapshot } from '../challenge/engine.js';
import { createEstimator } from './estimate.js';
import { estimationClone } from './fog.js';

const match = createMatch({
    seed: [5, 6, 7, 8],
    teams: {
        p1: 'Togekiss @ Assault Vest\nAbility: Serene Grace\nEVs: 252 HP / 252 SpD\n- Air Slash\n- Moonblast\n\nBlissey\n- Soft-Boiled',
        p2: 'Garchomp @ Yache Berry\nAbility: Rough Skin\nEVs: 252 Atk / 252 Spe\nJolly Nature\n- Dragon Claw\n- Stone Edge\n\nLucario\nAbility: Inner Focus\n- Beat Up',
    },
    names: { p1: 'A', p2: 'C' },
});

describe('estimator', () => {
    it('gets every move in the dex through without throwing (scenario 20)', () => {
        const est = createEstimator(estimationClone(snapshot(match.battle)));
        const [p1, p2] = est.battle.sides;
        const moves = Dex.moves.all().filter((move) => move.exists && !move.isZ && !move.isMax);
        expect(moves.length).toBeGreaterThan(800);
        for (const move of moves) {
            expect(() => est.damage(p2.active[0], p1.active[0], move.id), move.id).not.toThrow();
            expect(() => est.damage(p1.active[0], p2.active[0], move.id), move.id).not.toThrow();
        }
    });

    it('falls back on moves that need a live execution, and says so', () => {
        const est = createEstimator(estimationClone(snapshot(match.battle)));
        const [p1, p2] = est.battle.sides;
        const beatUp = est.damage(p2.pokemon[1], p1.active[0], 'beatup');
        expect(beatUp.fallback).toBe(true);
        expect(est.fallbacks).toBeGreaterThan(0);
    });

    it('reads immunity, range and KO chance', () => {
        const est = createEstimator(estimationClone(snapshot(match.battle)));
        const [p1, p2] = est.battle.sides;
        expect(est.damage(p2.active[0], p1.active[0], 'dragonclaw').immune).toBe(true); // Fairy
        expect(est.damage(p2.active[0], p1.active[0], 'earthquake').immune).toBe(true); // Flying
        const edge = est.damage(p2.active[0], p1.active[0], 'stoneedge');
        expect(edge.max).toBeGreaterThan(edge.min);
        expect(edge.acc).toBe(0.8);
        expect(edge.ko).toBeGreaterThanOrEqual(0);
        expect(edge.ko).toBeLessThanOrEqual(1);
    });

    it("doesn't let a berry be eaten by an estimate", () => {
        const est = createEstimator(estimationClone(snapshot(match.battle)));
        const [p1, p2] = est.battle.sides;
        const first = est.damage(p1.active[0], p2.active[0], 'icebeam');
        est.damage(p1.active[0], p2.active[0], 'icebeam'); // memoised
        expect(p2.active[0].item).toBe('yacheberry');
        const fresh = createEstimator(estimationClone(snapshot(match.battle)));
        expect(fresh.damage(fresh.battle.sides[0].active[0], fresh.battle.sides[1].active[0], 'icebeam').max).toBe(first.max);
    });

    it('orders by priority, then speed', () => {
        const est = createEstimator(estimationClone(snapshot(match.battle)));
        const [p1, p2] = est.battle.sides;
        expect(est.actsFirst(p2.active[0], 'dragonclaw', p1.active[0], 'airslash')).toBe(1); // Garchomp is faster
        expect(est.actsFirst(p2.active[0], 'dragonclaw', p1.active[0], 'extremespeed')).toBe(0); // priority wins
    });
});
