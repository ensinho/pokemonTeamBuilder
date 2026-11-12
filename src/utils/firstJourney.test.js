import { describe, it, expect } from 'vitest';
import {
    JOURNEY_STEPS, JOURNEY_TOUR, STEP_LOOK, INTEREST_MOOD, LEVEL_MOOD,
    canContinue, journeyAnswers, journeyHasChrome, journeyProgress, journeySteps, journeyXp, nextJourneyStep,
} from './firstJourney';
import { MOODS, POSES } from './mascot/catalog';
import { SEQ } from './mascot/motion';
import { HATS } from './mascot/rig';
import { XP_RULES } from './trainerLevel';

describe('the journey\'s screens', () => {
    it('asks the level only of the competitive', () => {
        expect(journeySteps({ interests: ['franchise'] })).not.toContain('level');
        expect(journeySteps({ interests: ['competitive'] })).toContain('level');
    });

    it('asks a guest for the account, never someone signed in', () => {
        expect(journeySteps({ isAnonymous: true })).toContain('account');
        expect(journeySteps({ isAnonymous: false })).not.toContain('account');
    });

    it('goes straight to the questions on a redo, and to the account on "Entrar"', () => {
        expect(journeySteps({ entry: 'redo', interests: ['minigames'] })).toEqual(['interests', 'persona', 'done']);
        expect(journeySteps({ entry: 'signIn' })).toEqual(['account', 'done']);
    });

    it('keeps the canonical order', () => {
        const steps = journeySteps({ interests: ['competitive'] });
        expect(steps).toEqual(JOURNEY_STEPS);
        expect(nextJourneyStep(steps, 'interests')).toBe('level');
        expect(nextJourneyStep(steps, 'done')).toBeNull();
    });

    it('counts progress over the questions only', () => {
        const steps = journeySteps({ interests: ['franchise'] });
        expect(journeyProgress(steps, 'peek')).toBe(0);
        expect(journeyProgress(steps, 'account')).toBe(1);
        expect(journeyProgress(steps, 'done')).toBe(1);
        expect(journeyProgress(steps, 'interests')).toBeGreaterThan(journeyProgress(steps, 'tour'));
        expect(journeyHasChrome('hello')).toBe(false);
        expect(journeyHasChrome('xp')).toBe(true);
    });

    it('needs an interest before it moves on', () => {
        expect(canContinue('interests', { interests: [] })).toBe(false);
        expect(canContinue('interests', { interests: ['minigames'] })).toBe(true);
        expect(canContinue('xp')).toBe(true);
    });
});

describe('what the journey shows', () => {
    it('only names moods, poses and gestures the mascot has', () => {
        for (const look of [...Object.values(STEP_LOOK), ...JOURNEY_TOUR]) {
            expect(MOODS[look.mood], look.mood).toBeTruthy();
            if (look.pose) expect(POSES[look.pose], look.pose).toBeTruthy();
            if (look.play) expect(SEQ[look.play], look.play).toBeTruthy();
        }
        for (const mood of [...Object.values(INTEREST_MOOD), ...Object.values(LEVEL_MOOD)]) expect(MOODS[mood], mood).toBeTruthy();
    });

    it('dresses the mascot as the persona the answers make', () => {
        expect(journeyAnswers({ interests: ['competitive'] }).persona.id).toBe('strategist');
        expect(journeyAnswers({ interests: ['competitive', 'franchise', 'minigames'] }).persona.id).toBe('master');
        for (const interests of [['competitive'], ['franchise'], ['minigames'], ['competitive', 'franchise', 'minigames']]) {
            const { hat } = journeyAnswers({ interests });
            expect(HATS[hat], hat).toBeTruthy();
        }
        expect(journeyAnswers({ interests: [] }).persona).toBeNull();
    });

    it('says the real XP rules', () => {
        const xp = journeyXp();
        expect(xp.mission).toBe(XP_RULES.mission);
        expect(xp.share).toBeGreaterThan(0);
        expect(xp.share).toBeLessThanOrEqual(1);
    });
});
