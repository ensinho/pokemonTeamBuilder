import { describe, expect, it } from 'vitest';
import {
    INTERESTS,
    DEFAULT_NAV_ORDER,
    PICK_DESTINATIONS,
    builderRegulationSeed,
    derivePersona,
    hasAnsweredProfile,
    mergeTrainerProfiles,
    needsTrainerProfile,
    normalizeTrainerProfile,
    personaDockSlot,
    personaNavOrder,
    personaPicks,
    homeDoors,
    recommendedJourneyIds,
    sortNavGroups,
    suggestedJourney,
} from './trainerProfile';
import { JOURNEYS_BY_ID } from './journeys';

const profile = (interests, extra = {}) => normalizeTrainerProfile({ interests, answeredAt: 1, ...extra });

describe('normalizeTrainerProfile', () => {
    it('survives garbage', () => {
        for (const raw of [null, undefined, 'x', 42, [], { interests: 'competitive' }]) {
            const p = normalizeTrainerProfile(raw);
            expect(p.interests).toEqual([]);
            expect(p.answeredAt).toBeNull();
        }
    });

    it('drops unknown interests and keeps canonical order', () => {
        expect(normalizeTrainerProfile({ interests: ['minigames', 'hacking', 'competitive'] }).interests)
            .toEqual(['competitive', 'minigames']);
    });

    it('keeps the competitive answers only for a competitive trainer', () => {
        const kept = normalizeTrainerProfile({ interests: ['competitive'], competitiveLevel: 'ranked', battleFormat: 'singles' });
        expect(kept.competitiveLevel).toBe('ranked');
        expect(kept.battleFormat).toBe('singles');
        const dropped = normalizeTrainerProfile({ interests: ['franchise'], competitiveLevel: 'ranked', battleFormat: 'singles' });
        expect(dropped.competitiveLevel).toBeNull();
        expect(dropped.battleFormat).toBeNull();
        expect(normalizeTrainerProfile({ interests: ['competitive'], competitiveLevel: 'god' }).competitiveLevel).toBeNull();
    });
});

describe('needsTrainerProfile', () => {
    it('offers itself until answered or turned down', () => {
        expect(needsTrainerProfile(normalizeTrainerProfile({}))).toBe(true);
        expect(needsTrainerProfile(normalizeTrainerProfile({ skippedAt: 5 }))).toBe(false);
        expect(needsTrainerProfile(profile(['franchise']))).toBe(false);
        expect(hasAnsweredProfile(profile(['franchise']))).toBe(true);
    });
});

describe('mergeTrainerProfiles', () => {
    it('the copy touched last wins whole', () => {
        const local = normalizeTrainerProfile({ interests: ['competitive'], answeredAt: 100 });
        const remote = normalizeTrainerProfile({ interests: ['minigames'], answeredAt: 200 });
        expect(mergeTrainerProfiles(local, remote).interests).toEqual(['minigames']);
        expect(mergeTrainerProfiles(remote, local).interests).toEqual(['minigames']);
    });

    it('a later skip does not erase earlier answers on the other copy unless newer', () => {
        const answered = normalizeTrainerProfile({ interests: ['minigames'], answeredAt: 300 });
        const skipped = normalizeTrainerProfile({ skippedAt: 100 });
        expect(mergeTrainerProfiles(skipped, answered).interests).toEqual(['minigames']);
    });

    it('an empty account copy never erases this device', () => {
        const local = profile(['competitive']);
        expect(mergeTrainerProfiles(local, undefined).interests).toEqual(['competitive']);
    });
});

describe('three onboarding interests (competitive, franchise, minigames)', () => {
    it('preserves franchise as its own interest in canonical order', () => {
        expect(normalizeTrainerProfile({ interests: ['franchise'] }).interests).toEqual(['franchise']);
        expect(normalizeTrainerProfile({ interests: ['minigames', 'franchise'] }).interests).toEqual(['franchise', 'minigames']);
        expect(normalizeTrainerProfile({ interests: ['competitive', 'franchise'] }).interests).toEqual(['competitive', 'franchise']);
    });

    it('maps franchise to traveler and all three to master', () => {
        expect(derivePersona(profile(['franchise'])).id).toBe('traveler');
        expect(derivePersona({ interests: ['franchise'] }).id).toBe('traveler');
        expect(derivePersona(profile(['competitive', 'franchise', 'minigames'])).id).toBe('master');
    });

    it('offers three interests', () => {
        expect(INTERESTS).toEqual(['competitive', 'franchise', 'minigames']);
    });
});

describe('derivePersona', () => {
    it('is null with no interests', () => {
        expect(derivePersona(normalizeTrainerProfile({}))).toBeNull();
    });

    it('follows the first interest in priority order', () => {
        expect(derivePersona(profile(['minigames'])).id).toBe('challenger');
        expect(derivePersona(profile(['franchise'])).id).toBe('traveler');
        expect(derivePersona(profile(['competitive'])).id).toBe('strategist');
    });

    it('all three make a master', () => {
        expect(derivePersona(profile(['minigames', 'franchise', 'competitive'])).id).toBe('master');
    });
});

describe('personaPicks', () => {
    it('every pick is a known destination', () => {
        for (const interests of [['competitive'], ['minigames'], ['competitive', 'minigames']]) {
            for (const competitiveLevel of ['new', 'casual', 'ranked']) {
                for (const key of personaPicks(profile(interests, { competitiveLevel }))) {
                    expect(PICK_DESTINATIONS[key]).toBeDefined();
                }
            }
        }
    });

    it('a mixed trainer sees both interests in the first four, no duplicates', () => {
        const picks = personaPicks(profile(['competitive', 'minigames'], { competitiveLevel: 'ranked' }));
        expect(picks).toHaveLength(4);
        expect(new Set(picks).size).toBe(4);
        expect(picks.slice(0, 2)).toEqual(['meta', 'speedTiers']);
        expect(picks).toContain('challenge');
    });

    it('the Desafiante reaches for the daily two first', () => {
        expect(personaPicks(profile(['minigames'])).slice(0, 2)).toEqual(['challenge', 'pokepuzzle']);
    });

    it('a beginner gets guides before the meta', () => {
        const picks = personaPicks(profile(['competitive'], { competitiveLevel: 'new' }));
        expect(picks[0]).toBe('guides');
        expect(picks).not.toContain('meta');
    });

    it('is empty with no profile', () => {
        expect(personaPicks(normalizeTrainerProfile({}))).toEqual([]);
    });
});

describe('homeDoors', () => {
    it('never repeats what the hero and the route show, and still fills the row', () => {
        const doors = homeDoors(profile(['minigames']), { exclude: ['pokepuzzle', 'challenge', 'battles'] });
        expect(doors).toHaveLength(4);
        expect(doors).not.toContain('pokepuzzle');
        expect(doors).not.toContain('challenge');
        expect(doors).not.toContain('battles');
        expect(doors[0]).toBe('tierList');
        expect(new Set(doors).size).toBe(4);
    });

    it('keeps the persona order when nothing is excluded', () => {
        const p = profile(['competitive'], { competitiveLevel: 'ranked' });
        expect(homeDoors(p)).toEqual(personaPicks(p, 4));
    });

    it('every door is a known destination, even with many persona picks excluded', () => {
        const p = profile(['competitive', 'franchise', 'minigames'], { competitiveLevel: 'casual' });
        const doors = homeDoors(p, { exclude: personaPicks(p, 8) });
        expect(doors).toHaveLength(4);
        for (const key of doors) expect(PICK_DESTINATIONS[key]).toBeDefined();
    });

    it('is empty with no profile', () => {
        expect(homeDoors(normalizeTrainerProfile({}))).toEqual([]);
    });
});

describe('the rail', () => {
    it('keeps the shipped order with no profile', () => {
        expect(personaNavOrder(normalizeTrainerProfile({}))).toEqual(DEFAULT_NAV_ORDER);
    });

    it('pulls the interests up', () => {
        expect(personaNavOrder(profile(['minigames']))).toEqual(['guessing', 'database', 'teamBuilding', 'dashboard']);
        expect(personaNavOrder(profile(['competitive']))[0]).toBe('teamBuilding');
    });

    it('sorts groups and keeps unknown sections (admin) last', () => {
        const groups = ['teamBuilding', 'guessing', 'database', 'dashboard', 'management'].map((key) => ({ key }));
        expect(sortNavGroups(groups, profile(['minigames'])).map((g) => g.key))
            .toEqual(['guessing', 'database', 'teamBuilding', 'dashboard', 'management']);
    });

    it('gives the dock slot to Jogos unless the trainer does not play', () => {
        expect(personaDockSlot(normalizeTrainerProfile({}))).toBe('games');
        expect(personaDockSlot(profile(['competitive', 'minigames']))).toBe('games');
        expect(personaDockSlot(profile(['competitive']))).toBe('meta');
        expect(personaDockSlot(profile(['franchise']))).toBe('games');
    });
});

describe('journeys', () => {
    it('recommends only journeys that exist', () => {
        for (const id of recommendedJourneyIds(profile(['competitive', 'minigames']))) {
            expect(JOURNEYS_BY_ID[id]).toBeDefined();
        }
    });

    it('suggests the first unfinished recommended journey, else the first unfinished', () => {
        const journeys = [
            { id: 'first-steps', isComplete: false },
            { id: 'first-team', isComplete: true },
            { id: 'strategy', isComplete: false },
            { id: 'league', isComplete: false },
        ];
        expect(suggestedJourney(journeys, profile(['competitive'])).id).toBe('strategy');
        expect(suggestedJourney(journeys, profile(['minigames'])).id).toBe('league');
        expect(suggestedJourney(journeys, normalizeTrainerProfile({})).id).toBe('first-steps');
        expect(suggestedJourney(journeys.map((j) => ({ ...j, isComplete: true })), profile(['minigames']))).toBeNull();
    });
});

describe('builderRegulationSeed', () => {
    it('leaves a games-only trainer on the default (the Champion battles with competitive sets)', () => {
        expect(builderRegulationSeed(profile(['franchise']))).toBeNull();
        expect(builderRegulationSeed(profile(['minigames']))).toBeNull();
    });

    it('starts a singles player on OU and leaves doubles on the default', () => {
        expect(builderRegulationSeed(profile(['competitive'], { battleFormat: 'singles' }))).toBe('gen9ou');
        expect(builderRegulationSeed(profile(['competitive'], { battleFormat: 'doubles' }))).toBeNull();
        expect(builderRegulationSeed(profile(['competitive', 'minigames'], { battleFormat: 'both' }))).toBeNull();
    });

    it('changes nothing without an answer', () => {
        expect(builderRegulationSeed(normalizeTrainerProfile({}))).toBeNull();
        expect(builderRegulationSeed(profile(['minigames']))).toBeNull();
    });
});

describe('personaHomeOrder', () => {
    const answered = (p) => normalizeTrainerProfile({ ...p, answeredAt: 1 });
    it('keeps the shipped order with no profile or Master', async () => {
        const { personaHomeOrder, DEFAULT_HOME_ORDER } = await import('./trainerProfile');
        expect(personaHomeOrder(null)).toEqual(DEFAULT_HOME_ORDER);
        expect(personaHomeOrder(answered({ interests: ['competitive', 'franchise', 'minigames'] }))).toEqual(DEFAULT_HOME_ORDER);
    });
    it('leads with what each persona reaches for', async () => {
        const { personaHomeOrder } = await import('./trainerProfile');
        expect(personaHomeOrder(answered({ interests: ['minigames'] }))[0]).toBe('yourDay');
        expect(personaHomeOrder(answered({ interests: ['competitive'], competitiveLevel: 'ranked' }))[0]).toBe('teams');
        expect(personaHomeOrder(answered({ interests: ['franchise'] }))[0]).toBe('forYou');
    });
    it('every order has the same blocks', async () => {
        const { personaHomeOrder, DEFAULT_HOME_ORDER } = await import('./trainerProfile');
        for (const interests of [['minigames'], ['competitive'], ['franchise']]) {
            expect([...personaHomeOrder(answered({ interests }))].sort()).toEqual([...DEFAULT_HOME_ORDER].sort());
        }
    });
});

describe('builder level flags', () => {
    it('reads the competitive level only once answered', async () => {
        const { isBeginnerTrainer, isRankedTrainer } = await import('./trainerProfile');
        expect(isBeginnerTrainer(normalizeTrainerProfile({ interests: ['competitive'], competitiveLevel: 'new', answeredAt: 1 }))).toBe(true);
        expect(isBeginnerTrainer(normalizeTrainerProfile({ interests: ['competitive'], competitiveLevel: 'new' }))).toBe(false);
        expect(isRankedTrainer(normalizeTrainerProfile({ interests: ['competitive'], competitiveLevel: 'ranked', answeredAt: 1 }))).toBe(true);
    });
});

describe('personaQuickLinks', () => {
    const destinations = [
        { key: 'home', path: '/' }, { key: 'builder', path: '/builder' }, { key: 'pokedex', path: '/pokedex' },
        { key: 'meta', path: '/meta' }, { key: 'puzzle', path: '/pokepuzzle' }, { key: 'gyms', path: '/gyms' },
    ];
    it('keeps the shell order with no profile', async () => {
        const { personaQuickLinks } = await import('./trainerProfile');
        expect(personaQuickLinks(destinations, null)).toEqual(destinations);
    });
    it('puts the persona picks first and drops nothing', async () => {
        const { personaQuickLinks } = await import('./trainerProfile');
        const out = personaQuickLinks(destinations, normalizeTrainerProfile({ interests: ['franchise'], answeredAt: 1 }));
        expect(out[0].path).toBe('/pokedex');
        expect(out).toHaveLength(destinations.length);
        expect(out.findIndex((d) => d.path === '/gyms')).toBeLessThan(out.findIndex((d) => d.path === '/'));
    });
});

describe('personaHero', () => {
    const answered = (p) => normalizeTrainerProfile({ ...p, answeredAt: 1 });
    it('is the Champion with no profile, or a skipped one (2026-11-15: the games lead)', async () => {
        const { personaHero } = await import('./trainerProfile');
        expect(personaHero(null)).toBe('challenge');
        expect(personaHero(normalizeTrainerProfile({ interests: ['competitive'], skippedAt: 1 }))).toBe('challenge');
    });
    it('is the team in progress only for the competitive-only trainer', async () => {
        const { personaHero } = await import('./trainerProfile');
        expect(personaHero(answered({ interests: ['minigames'] }))).toBe('challenge');
        expect(personaHero(answered({ interests: ['franchise'] }))).toBe('challenge');
        expect(personaHero(answered({ interests: ['competitive'] }))).toBe('team');
        expect(personaHero(answered({ interests: ['competitive', 'minigames'] }))).toBe('challenge');
    });
    it('only ever names a known hero', async () => {
        const { personaHero, HOME_HEROES } = await import('./trainerProfile');
        for (const interests of [[], ['minigames'], ['competitive'], ['franchise'], ['minigames', 'franchise']]) {
            expect(HOME_HEROES).toContain(personaHero(answered({ interests })));
        }
    });
});

describe('personaDayCards', () => {
    const answered = (p) => normalizeTrainerProfile({ ...p, answeredAt: 1 });
    it('keeps the default order with no profile', async () => {
        const { personaDayCards, DEFAULT_DAY_CARDS } = await import('./trainerProfile');
        expect(personaDayCards(null)).toEqual(DEFAULT_DAY_CARDS);
        expect(DEFAULT_DAY_CARDS.slice(1, 4)).toEqual(['puzzle', 'quiz', 'tier']);
    });
    it('keeps the day’s newer games out of the competitive-only trainer’s route', async () => {
        const { personaDayCards } = await import('./trainerProfile');
        const strategist = personaDayCards(answered({ interests: ['competitive'] }));
        expect(strategist).not.toContain('quiz');
        expect(strategist).not.toContain('tier');
    });
    it('reads the meta first for the Strategist, a friend to battle for the Challenger', async () => {
        const { personaDayCards } = await import('./trainerProfile');
        expect(personaDayCards(answered({ interests: ['competitive'] }))[1]).toBe('meta');
        const challenger = personaDayCards(answered({ interests: ['minigames'] }));
        expect(challenger).toContain('invite');
        expect(challenger).not.toContain('meta');
        // The day's quiz and tier list walk the route right after the puzzle.
        expect(challenger.slice(challenger.indexOf('puzzle'), challenger.indexOf('puzzle') + 3)).toEqual(['puzzle', 'quiz', 'tier']);
        expect(personaDayCards(answered({ interests: ['franchise'] }))).toContain('puzzle');
    });
    it('always leads with a battle that waits on the trainer', async () => {
        const { personaDayCards } = await import('./trainerProfile');
        for (const interests of [[], ['minigames'], ['competitive'], ['franchise']]) {
            expect(personaDayCards(answered({ interests }))[0]).toBe('battles');
        }
    });
});
