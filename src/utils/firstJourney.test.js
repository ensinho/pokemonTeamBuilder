import { describe, it, expect } from 'vitest';
import {
    JOURNEY_STEPS, STEP_LOOK, INTEREST_MOOD, LEVEL_MOOD, SPARK_POOL, SPARK_START, PARTNER_CHOICES,
    canContinue, journeyActivation, journeyAnswers, journeyHasChrome, journeyProgress, journeyStepMeta,
    journeySteps, journeyXp, nextJourneyStep, toggleSparkMember,
} from './firstJourney';
import { MOODS, POSES } from './mascot/catalog';
import { SEQ } from './mascot/motion';
import { HATS } from './mascot/rig';
import { XP_RULES } from './trainerLevel';

describe('the journey\'s screens (Primeira Jornada 2.0)', () => {
    it('keeps first-run onboarding to 4 focused steps, adapting Step 3 by interest', () => {
        expect(journeySteps({ interests: ['competitive'] })).toEqual(['play', 'interests', 'level', 'blueprint']);
        expect(journeySteps({ interests: ['franchise'] })).toEqual(['play', 'interests', 'partner', 'blueprint']);
        expect(journeySteps({ interests: ['minigames'] })).toEqual(['play', 'interests', 'partner', 'blueprint']);
        expect(journeySteps({ interests: [] })).toEqual(['play', 'interests', 'partner', 'blueprint']);
    });

    it('never gates new visitors behind an account screen during welcome', () => {
        expect(journeySteps({ interests: ['competitive'], isAnonymous: true })).not.toContain('account');
        expect(journeySteps({ interests: ['minigames'], isAnonymous: true })).not.toContain('account');
    });

    it('goes straight to questions on redo, and straight to account on "Entrar"', () => {
        expect(journeySteps({ entry: 'redo', interests: ['minigames'] })).toEqual(['interests', 'partner', 'blueprint']);
        expect(journeySteps({ entry: 'redo', interests: ['competitive'] })).toEqual(['interests', 'level', 'blueprint']);
        expect(journeySteps({ entry: 'signIn' })).toEqual(['account', 'done']);
    });

    it('navigates step by step and reports segmented progress cleanly', () => {
        const steps = journeySteps({ interests: ['competitive'] });
        expect(nextJourneyStep(steps, 'play')).toBe('interests');
        expect(nextJourneyStep(steps, 'interests')).toBe('level');
        expect(nextJourneyStep(steps, 'level')).toBe('blueprint');
        expect(nextJourneyStep(steps, 'blueprint')).toBeNull();
        expect(journeyStepMeta(steps, 'play')).toEqual({ index: 0, total: 4 });
        expect(journeyStepMeta(steps, 'blueprint')).toEqual({ index: 3, total: 4 });
        expect(journeyProgress(steps, 'play')).toBe(0.25);
        expect(journeyProgress(steps, 'blueprint')).toBe(1);
        expect(journeyHasChrome('play')).toBe(true);
        expect(journeyHasChrome('done')).toBe(false);
    });

    it('needs an interest before leaving the interests screen', () => {
        expect(canContinue('interests', { interests: [] })).toBe(false);
        expect(canContinue('interests', { interests: ['minigames'] })).toBe(true);
        expect(canContinue('play')).toBe(true);
        expect(canContinue('partner')).toBe(true);
    });
});

describe('live spark & partner choices', () => {
    it('toggles members in the live spark without emptying the mini-team', () => {
        const added = toggleSparkMember(SPARK_START, 598);
        expect(added).toContain(598);
        expect(added.length).toBe(3);

        const removed = toggleSparkMember(SPARK_START, 6);
        expect(removed).toEqual([445]);
        // Never drops to 0 members
        expect(toggleSparkMember([445], 445)).toEqual([445]);
        expect(SPARK_POOL.length).toBe(4);
    });

    it('offers 6 distinct partner choices', () => {
        expect(PARTNER_CHOICES.length).toBe(6);
        expect(new Set(PARTNER_CHOICES.map((p) => p.id)).size).toBe(6);
    });
});

describe('personalized activation & mascot choreography', () => {
    it('maps each persona to a concrete #1 activation path and mission', () => {
        expect(journeyActivation({ interests: ['competitive'], answeredAt: 1 })).toMatchObject({
            personaId: 'strategist',
            path: '/builder',
            missionId: 'addPokemon',
            heroKind: 'team',
        });
        expect(journeyActivation({ interests: ['franchise'], answeredAt: 1 })).toMatchObject({
            personaId: 'traveler',
            path: '/pokedex',
            missionId: 'pokedex',
        });
        expect(journeyActivation({ interests: ['minigames'], answeredAt: 1 })).toMatchObject({
            personaId: 'challenger',
            path: '/challenge',
            missionId: 'challenge',
            heroKind: 'challenge',
        });
        expect(journeyActivation({ interests: ['competitive', 'franchise', 'minigames'], answeredAt: 1 })).toMatchObject({
            personaId: 'master',
            path: '/challenge',
            missionId: 'challenge',
        });
    });

    it('only names moods, poses and gestures the mascot has', () => {
        expect(JOURNEY_STEPS.length).toBe(5);
        for (const look of Object.values(STEP_LOOK)) {
            expect(MOODS[look.mood], look.mood).toBeTruthy();
            if (look.pose) expect(POSES[look.pose], look.pose).toBeTruthy();
            if (look.play) expect(SEQ[look.play], look.play).toBeTruthy();
        }
        for (const mood of [...Object.values(INTEREST_MOOD), ...Object.values(LEVEL_MOOD)]) {
            expect(MOODS[mood], mood).toBeTruthy();
        }
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
