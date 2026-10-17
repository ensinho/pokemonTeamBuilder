import { describe, expect, it } from 'vitest';
import {
    JOURNEYS,
    JOURNEY_MARKS,
    PAGE_MARKS,
    currentJourney,
    evaluateJourneys,
    findMission,
    hasBalancedTeam,
    journeyEmphasis,
    journeyTotals,
    nextMission,
} from './journeys';
import { getBadgeById } from '../constants/badges';

const mon = (id, types) => ({ id, name: `mon-${id}`, types });

// Six Pokémon with no type shared by three of them as a weakness.
const BALANCED = [
    mon(1, ['grass', 'poison']),
    mon(6, ['fire', 'flying']),
    mon(9, ['water']),
    mon(25, ['electric']),
    mon(445, ['dragon', 'ground']),
    mon(212, ['bug', 'steel']),
];
// Six Water types: Electric and Grass hit all of them.
const MONO_WATER = [7, 8, 9, 54, 55, 60].map((id) => mon(id, ['water']));

const missionDone = (journeys, id) => findMission(journeys, id).mission.done;

describe('JOURNEYS', () => {
    it('has unique journey and mission ids', () => {
        const missionIds = JOURNEYS.flatMap((j) => j.missions.map((m) => m.id));
        expect(new Set(JOURNEYS.map((j) => j.id)).size).toBe(JOURNEYS.length);
        expect(new Set(missionIds).size).toBe(missionIds.length);
    });

    it('rewards every journey with a real journey badge', () => {
        for (const journey of JOURNEYS) {
            const badge = getBadgeById(journey.badgeId);
            expect(badge, journey.id).toBeTruthy();
            expect(badge.category).toBe('journey');
        }
    });

    it('gives every mission somewhere to go', () => {
        for (const mission of JOURNEYS.flatMap((j) => j.missions)) {
            expect(mission.to, mission.id).toMatch(/^\//);
        }
    });

    it('records every page mark as a known mark', () => {
        for (const mark of Object.values(PAGE_MARKS)) expect(JOURNEY_MARKS).toContain(mark);
    });
});

describe('evaluateJourneys', () => {
    it('starts a new trainer at level 1 with nothing done', () => {
        const journeys = evaluateJourneys({});
        expect(journeys.map((j) => j.level)).toEqual([1, 2, 3, 4, 5]);
        expect(journeys.every((j) => j.doneCount === 0 && !j.isComplete)).toBe(true);
        expect(currentJourney(journeys).id).toBe('first-steps');
        expect(nextMission(currentJourney(journeys)).id).toBe('partner');
    });

    it('does not count an anonymous-state that has not answered as an account', () => {
        expect(missionDone(evaluateJourneys({}), 'account')).toBe(false);
        expect(missionDone(evaluateJourneys({ isAnonymous: true }), 'account')).toBe(false);
        expect(missionDone(evaluateJourneys({ isAnonymous: false }), 'account')).toBe(true);
    });

    it('completes the first journey from what the trainer did', () => {
        const journeys = evaluateJourneys({
            greetingPokemonId: 25,
            marks: { pokedex: true, pokemonDetail: true },
            favoritesCount: 1,
        });
        const [first] = journeys;
        expect(first.isComplete).toBe(true);
        expect(first.percent).toBe(100);
        expect(currentJourney(journeys).id).toBe('first-team');
    });

    it('counts the team being built, not only saved ones', () => {
        const journeys = evaluateJourneys({ currentTeam: BALANCED.slice(0, 3) });
        expect(missionDone(journeys, 'addPokemon')).toBe(true);
        expect(missionDone(journeys, 'fullTeam')).toBe(false);
        expect(findMission(journeys, 'fullTeam').mission.progress).toEqual({ current: 3, target: 6 });
    });

    it('caps the six-slot progress at six', () => {
        const journeys = evaluateJourneys({ savedTeams: [{ pokemons: [...BALANCED, mon(10, ['bug'])] }] });
        expect(findMission(journeys, 'fullTeam').mission.progress).toEqual({ current: 6, target: 6 });
    });

    it('takes the forum post from the server count or from the local mark', () => {
        expect(missionDone(evaluateJourneys({ forumMessages: 2 }), 'forumPost')).toBe(true);
        expect(missionDone(evaluateJourneys({ marks: { forumPost: true } }), 'forumPost')).toBe(true);
        expect(missionDone(evaluateJourneys({ forumMessages: 0 }), 'forumPost')).toBe(false);
    });

    it('counts either way of sharing a team', () => {
        expect(missionDone(evaluateJourneys({ marks: { shareLink: true } }), 'shareTeam')).toBe(true);
        expect(missionDone(evaluateJourneys({ marks: { forumTeamShare: true } }), 'shareTeam')).toBe(true);
    });

    it('ignores marks it does not know', () => {
        const journeys = evaluateJourneys({ marks: { somethingElse: true } });
        expect(journeyTotals(journeys).missionsDone).toBe(0);
    });

    it('returns no current journey once all five are done', () => {
        const journeys = evaluateJourneys({
            greetingPokemonId: 1,
            favoritesCount: 1,
            teamsCount: 1,
            savedTeams: [{ pokemons: BALANCED }],
            isAnonymous: false,
            forumMessages: 1,
            friendsCount: 1,
            pokepuzzleWins: 1,
            battlesCount: 1,
            selectedBadgeId: 'badge_teams_1',
            marks: Object.fromEntries(JOURNEY_MARKS.map((m) => [m, true])),
        });
        expect(journeys.every((j) => j.isComplete)).toBe(true);
        expect(currentJourney(journeys)).toBeNull();
        expect(journeyTotals(journeys)).toMatchObject({ journeysDone: 5, journeysTotal: 5 });
    });
});

describe('hasBalancedTeam', () => {
    it('accepts a full team with no shared weak point', () => {
        expect(hasBalancedTeam({ savedTeams: [{ pokemons: BALANCED }] })).toBe(true);
    });

    it('refuses six members that all fear the same type', () => {
        expect(hasBalancedTeam({ savedTeams: [{ pokemons: MONO_WATER }] })).toBe(false);
    });

    it('refuses an incomplete team, however balanced', () => {
        expect(hasBalancedTeam({ currentTeam: BALANCED.slice(0, 5) })).toBe(false);
    });
});

describe('journeyEmphasis', () => {
    it('focuses the journey for a brand-new trainer', () => {
        expect(journeyEmphasis(evaluateJourneys({}), { activeDays: 1 })).toBe('focus');
    });

    it('keeps it focused through the first two levels while little is done', () => {
        const journeys = evaluateJourneys({ greetingPokemonId: 1, marks: { pokedex: true, pokemonDetail: true }, favoritesCount: 1 });
        expect(currentJourney(journeys).level).toBe(2);
        expect(journeyEmphasis(journeys, { activeDays: 2 })).toBe('focus');
    });

    it('goes compact for a trainer who already does a lot', () => {
        const journeys = evaluateJourneys({
            teamsCount: 3,
            savedTeams: [{ pokemons: BALANCED }],
            isAnonymous: false,
            forumMessages: 12,
            pokepuzzleWins: 4,
        });
        expect(journeyEmphasis(journeys, { activeDays: 2 })).toBe('compact');
    });

    it('goes compact after a week of visits, however little is done', () => {
        expect(journeyEmphasis(evaluateJourneys({}), { activeDays: 7 })).toBe('compact');
    });

    it('goes compact once past the second level', () => {
        const journeys = evaluateJourneys({
            greetingPokemonId: 1, favoritesCount: 1, teamsCount: 1,
            currentTeam: BALANCED.slice(0, 1),
            marks: { pokedex: true, pokemonDetail: true, memberEdited: true },
            savedTeams: [{ pokemons: MONO_WATER }],
        });
        expect(currentJourney(journeys).level).toBe(3);
        expect(journeyEmphasis(journeys)).toBe('compact');
    });

    it('steps aside when every journey is done', () => {
        expect(journeyEmphasis([])).toBe('none');
    });
});
