import { describe, expect, it } from 'vitest';
import {
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
        const answered = normalizeTrainerProfile({ interests: ['franchise'], answeredAt: 300 });
        const skipped = normalizeTrainerProfile({ skippedAt: 100 });
        expect(mergeTrainerProfiles(skipped, answered).interests).toEqual(['franchise']);
    });

    it('an empty account copy never erases this device', () => {
        const local = profile(['franchise']);
        expect(mergeTrainerProfiles(local, undefined).interests).toEqual(['franchise']);
    });
});

describe('derivePersona', () => {
    it('is null with no interests', () => {
        expect(derivePersona(normalizeTrainerProfile({}))).toBeNull();
    });

    it('follows the first interest in priority order', () => {
        expect(derivePersona(profile(['minigames'])).id).toBe('challenger');
        expect(derivePersona(profile(['franchise', 'minigames'])).id).toBe('traveler');
        expect(derivePersona(profile(['minigames', 'competitive'])).id).toBe('strategist');
    });

    it('all three make a master', () => {
        expect(derivePersona(profile(['competitive', 'franchise', 'minigames'])).id).toBe('master');
    });
});

describe('personaPicks', () => {
    it('every pick is a known destination', () => {
        for (const interests of [['competitive'], ['franchise'], ['minigames'], ['competitive', 'franchise', 'minigames']]) {
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
        expect(picks).toContain('pokepuzzle');
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

describe('the rail', () => {
    it('keeps the shipped order with no profile', () => {
        expect(personaNavOrder(normalizeTrainerProfile({}))).toEqual(DEFAULT_NAV_ORDER);
    });

    it('pulls the interests up', () => {
        expect(personaNavOrder(profile(['minigames']))).toEqual(['guessing', 'dashboard', 'teamBuilding', 'database']);
        expect(personaNavOrder(profile(['franchise']))[0]).toBe('database');
    });

    it('sorts groups and keeps unknown sections (admin) last', () => {
        const groups = ['teamBuilding', 'guessing', 'database', 'dashboard', 'management'].map((key) => ({ key }));
        expect(sortNavGroups(groups, profile(['franchise'])).map((g) => g.key))
            .toEqual(['database', 'teamBuilding', 'guessing', 'dashboard', 'management']);
    });

    it('gives the dock slot to the puzzle unless the trainer does not play', () => {
        expect(personaDockSlot(normalizeTrainerProfile({}))).toBe('pokepuzzle');
        expect(personaDockSlot(profile(['competitive', 'minigames']))).toBe('pokepuzzle');
        expect(personaDockSlot(profile(['competitive']))).toBe('meta');
        expect(personaDockSlot(profile(['franchise']))).toBe('types');
    });
});

describe('journeys', () => {
    it('recommends only journeys that exist', () => {
        for (const id of recommendedJourneyIds(profile(['competitive', 'franchise', 'minigames']))) {
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
    it('starts a games-only trainer in playthrough mode', () => {
        expect(builderRegulationSeed(profile(['franchise']))).toBe('none');
        expect(builderRegulationSeed(profile(['franchise', 'minigames']))).toBe('none');
    });

    it('starts a singles player on OU and leaves doubles on the default', () => {
        expect(builderRegulationSeed(profile(['competitive'], { battleFormat: 'singles' }))).toBe('gen9ou');
        expect(builderRegulationSeed(profile(['competitive'], { battleFormat: 'doubles' }))).toBeNull();
        expect(builderRegulationSeed(profile(['competitive', 'franchise'], { battleFormat: 'both' }))).toBeNull();
    });

    it('changes nothing without an answer', () => {
        expect(builderRegulationSeed(normalizeTrainerProfile({}))).toBeNull();
        expect(builderRegulationSeed(profile(['minigames']))).toBeNull();
    });
});

describe('personaHomeOrder', () => {
    const answered = (p) => normalizeTrainerProfile({ ...p, answeredAt: 1 });
    it('keeps the shipped order with no profile', async () => {
        const { personaHomeOrder, DEFAULT_HOME_ORDER } = await import('./trainerProfile');
        expect(personaHomeOrder(null)).toEqual(DEFAULT_HOME_ORDER);
        expect(personaHomeOrder(answered({ interests: ['competitive', 'franchise', 'minigames'] }))).toEqual(DEFAULT_HOME_ORDER);
    });
    it('leads with what each persona reaches for', async () => {
        const { personaHomeOrder } = await import('./trainerProfile');
        expect(personaHomeOrder(answered({ interests: ['minigames'] }))[0]).toBe('yourDay');
        expect(personaHomeOrder(answered({ interests: ['competitive'], competitiveLevel: 'ranked' }))[0]).toBe('teams');
        expect(personaHomeOrder(answered({ interests: ['franchise'] }))).toEqual(['badges', 'forYou', 'teams', 'yourDay']);
    });
    it('every order has the same blocks', async () => {
        const { personaHomeOrder, DEFAULT_HOME_ORDER } = await import('./trainerProfile');
        for (const interests of [['minigames'], ['competitive'], ['franchise']]) {
            // The Traveler adds the Badge Case; nobody loses a block.
            expect(personaHomeOrder(answered({ interests })).filter((id) => id !== 'badges').sort()).toEqual([...DEFAULT_HOME_ORDER].sort());
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
    it('is the team in progress with no profile, or a skipped one', async () => {
        const { personaHero } = await import('./trainerProfile');
        expect(personaHero(null)).toBe('team');
        expect(personaHero(normalizeTrainerProfile({ interests: ['minigames'], skippedAt: 1 }))).toBe('team');
    });
    it('is the day\'s Champion battle for the minigames trainer only', async () => {
        const { personaHero } = await import('./trainerProfile');
        expect(personaHero(answered({ interests: ['minigames'] }))).toBe('challenge');
        expect(personaHero(answered({ interests: ['competitive'] }))).toBe('team');
        expect(personaHero(answered({ interests: ['franchise'] }))).toBe('team');
        // All three interests make the Pokémon Master: the team leads.
        expect(personaHero(answered({ interests: ['competitive', 'franchise', 'minigames'] }))).toBe('team');
    });
    it('only ever names a known hero', async () => {
        const { personaHero, HOME_HEROES } = await import('./trainerProfile');
        for (const interests of [[], ['minigames'], ['competitive'], ['franchise'], ['minigames', 'franchise']]) {
            expect(HOME_HEROES).toContain(personaHero(answered({ interests })));
        }
    });
});
