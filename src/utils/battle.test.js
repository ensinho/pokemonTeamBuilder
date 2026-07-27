import { describe, it, expect } from 'vitest';
import {
    battleOpponentId, describeBattle, battleSortRank, buildBattleTeamText, battleAttentionNotice,
} from './battle';

const ME = 'uid-me';
const THEM = 'uid-them';

const make = (overrides = {}) => ({
    id: 'b1',
    players: [ME, THEM],
    challenger: ME,
    status: 'pending',
    ready: {},
    playerNames: { [ME]: 'Me', [THEM]: 'Them' },
    ...overrides,
});

describe('battleOpponentId', () => {
    it('finds the other player', () => {
        expect(battleOpponentId(make(), ME)).toBe(THEM);
        expect(battleOpponentId(make(), THEM)).toBe(ME);
    });

    it('returns null for a battle the viewer is not in', () => {
        expect(battleOpponentId(make(), 'someone-else')).toBeNull();
    });

    it('tolerates junk', () => {
        expect(battleOpponentId(null, ME)).toBeNull();
        expect(battleOpponentId(make({ players: undefined }), ME)).toBeNull();
    });
});

describe('describeBattle', () => {
    it('refuses to describe a battle the viewer is not part of', () => {
        expect(describeBattle(make(), 'intruder')).toBeNull();
    });

    // The transitions here must match what firestore.rules allows, or the UI
    // offers buttons that fail.
    it('lets only the challenged player accept or decline', () => {
        const asChallenger = describeBattle(make(), ME);
        expect(asChallenger.canAccept).toBe(false);
        expect(asChallenger.canDecline).toBe(false);
        expect(asChallenger.canCancel).toBe(true);

        const asChallenged = describeBattle(make(), THEM);
        expect(asChallenged.canAccept).toBe(true);
        expect(asChallenged.canDecline).toBe(true);
        expect(asChallenged.canCancel).toBe(false);
    });

    it('offers team submission only until the viewer has submitted', () => {
        const fresh = describeBattle(make({ status: 'teamSelect' }), ME);
        expect(fresh.canSubmitTeam).toBe(true);
        expect(fresh.canStart).toBe(false);

        const submitted = describeBattle(make({ status: 'teamSelect', ready: { [ME]: true } }), ME);
        expect(submitted.canSubmitTeam).toBe(false);
        expect(submitted.canStart).toBe(false);
    });

    it('only allows starting once BOTH teams are in', () => {
        const oneReady = describeBattle(make({ status: 'teamSelect', ready: { [ME]: true } }), ME);
        expect(oneReady.canStart).toBe(false);

        const bothReady = describeBattle(
            make({ status: 'teamSelect', ready: { [ME]: true, [THEM]: true } }), ME);
        expect(bothReady.canStart).toBe(true);
        // …and from either side.
        expect(describeBattle(make({ status: 'teamSelect', ready: { [ME]: true, [THEM]: true } }), THEM).canStart)
            .toBe(true);
    });

    it('tracks who the battle is waiting on', () => {
        expect(describeBattle(make(), ME).waitingOn).toBe('them');
        expect(describeBattle(make(), THEM).waitingOn).toBe('me');

        const selecting = make({ status: 'teamSelect' });
        expect(describeBattle(selecting, ME).waitingOn).toBe('me');

        const iAmReady = make({ status: 'teamSelect', ready: { [ME]: true } });
        expect(describeBattle(iAmReady, ME).waitingOn).toBe('them');
        expect(describeBattle(iAmReady, THEM).waitingOn).toBe('me');

        const bothReady = make({ status: 'teamSelect', ready: { [ME]: true, [THEM]: true } });
        expect(describeBattle(bothReady, ME).waitingOn).toBeNull();
    });

    it('tracks whose move it is once the battle is active, from awaitingChoiceFrom', () => {
        const myTurn = make({ status: 'active', awaitingChoiceFrom: [ME] });
        expect(describeBattle(myTurn, ME).waitingOn).toBe('me');
        expect(describeBattle(myTurn, THEM).waitingOn).toBe('them');

        const bothOwe = make({ status: 'active', awaitingChoiceFrom: [ME, THEM] });
        expect(describeBattle(bothOwe, ME).waitingOn).toBe('me');

        // Before the opening bootstrap runs, the field is empty/absent.
        expect(describeBattle(make({ status: 'active', awaitingChoiceFrom: [] }), ME).waitingOn).toBeNull();
        expect(describeBattle(make({ status: 'active' }), ME).waitingOn).toBeNull();
    });

    it('marks finished battles as over and offers no actions', () => {
        for (const status of ['ended', 'declined', 'cancelled']) {
            const described = describeBattle(make({ status }), ME);
            expect(described.isOver).toBe(true);
            expect(described.canAccept).toBe(false);
            expect(described.canSubmitTeam).toBe(false);
            expect(described.canStart).toBe(false);
            expect(described.canDelete).toBe(true);
        }
    });

    it('never offers a pre-battle action once the battle is active', () => {
        const active = describeBattle(make({ status: 'active', ready: { [ME]: true, [THEM]: true } }), ME);
        expect(active.canAccept).toBe(false);
        expect(active.canDecline).toBe(false);
        expect(active.canCancel).toBe(false);
        expect(active.canSubmitTeam).toBe(false);
        expect(active.canStart).toBe(false);
        // Any battle may be discarded/deleted by its participants.
        expect(active.canDelete).toBe(true);
    });

    it('falls back to pending for an unknown status', () => {
        expect(describeBattle(make({ status: 'weird' }), ME).status).toBe('pending');
    });
});

describe('describeBattle — random battles', () => {
    const random = (overrides = {}) => make({ mode: 'random', ...overrides });

    it('offers no team picking or starting: the server deals and starts it', () => {
        const dealt = describeBattle(random({ status: 'teamSelect' }), ME);
        expect(dealt.isRandom).toBe(true);
        expect(dealt.canSubmitTeam).toBe(false);
        expect(dealt.canStart).toBe(false);

        // …not even once both `ready` flags are set by the roll, which is the
        // one moment the ordinary flow would light up a "start" button.
        const rolled = describeBattle(
            random({ status: 'teamSelect', ready: { [ME]: true, [THEM]: true } }), ME);
        expect(rolled.canStart).toBe(false);
    });

    it('lets either player trigger the roll, until it has been rolled', () => {
        expect(describeBattle(random({ status: 'teamSelect' }), ME).canRollRandomTeams).toBe(true);
        expect(describeBattle(random({ status: 'teamSelect' }), THEM).canRollRandomTeams).toBe(true);

        const rolled = random({ status: 'teamSelect', randomTeamsRolledAt: '2026-07-27T00:00:00.000Z' });
        expect(describeBattle(rolled, ME).canRollRandomTeams).toBe(false);

        // The roll is what makes a battle active, so there is nothing left to do.
        expect(describeBattle(random({ status: 'active' }), ME).canRollRandomTeams).toBe(false);
        // And a challenge nobody has accepted is too early — the endpoint refuses it.
        expect(describeBattle(random({ status: 'pending' }), ME).canRollRandomTeams).toBe(false);
    });

    it('waits on whoever is looking while the teams are undealt', () => {
        expect(describeBattle(random({ status: 'teamSelect' }), ME).waitingOn).toBe('me');
        expect(describeBattle(random({ status: 'teamSelect' }), THEM).waitingOn).toBe('me');
    });

    it('leaves an ordinary battle unchanged', () => {
        const standard = describeBattle(make({ status: 'teamSelect' }), ME);
        expect(standard.isRandom).toBe(false);
        expect(standard.canRollRandomTeams).toBe(false);
        expect(standard.canSubmitTeam).toBe(true);
    });
});

describe('battleSortRank', () => {
    it('puts the viewer\'s move first and finished battles last', () => {
        const myMove = describeBattle(make({ status: 'teamSelect' }), ME);
        const active = describeBattle(make({ status: 'active' }), ME);
        const theirMove = describeBattle(make(), ME);
        const over = describeBattle(make({ status: 'ended' }), ME);

        const ranks = [myMove, active, theirMove, over].map(battleSortRank);
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
        expect(battleSortRank(myMove)).toBeLessThan(battleSortRank(over));
    });

    it('sinks anything it cannot describe', () => {
        expect(battleSortRank(null)).toBe(99);
    });
});

describe('buildBattleTeamText', () => {
    const mon = (name, moves, item = '') => ({
        name,
        types: ['normal'],
        abilities: [{ name: 'blaze' }],
        customization: { moves, item, nature: 'timid', teraType: 'fire', ability: 'blaze' },
    });

    it('strips the "@ Nothing" placeholder so the paste is valid Showdown', () => {
        const { text } = buildBattleTeamText([mon('garchomp', ['earthquake'])]);
        expect(text).not.toContain('Nothing');
        expect(text).toContain('Garchomp');
        // A real item must still survive.
        const withItem = buildBattleTeamText([mon('charizard', ['flamethrower'], 'choice-specs')]);
        expect(withItem.text).toContain('Charizard @ Choice Specs');
    });

    it('keeps the Level: 50 the format expects', () => {
        const { text } = buildBattleTeamText([mon('pikachu', ['thunderbolt'])]);
        expect(text).toContain('Level: 50');
    });

    it('reports a member with no moves instead of shipping a dud', () => {
        const { errors } = buildBattleTeamText([
            mon('charizard', ['flamethrower']),
            mon('blastoise', []),
        ]);
        expect(errors).toEqual([{ name: 'blastoise', reason: 'noMoves' }]);
    });

    it('reports an empty team', () => {
        expect(buildBattleTeamText([]).errors).toEqual([{ name: '', reason: 'empty' }]);
        expect(buildBattleTeamText().errors[0].reason).toBe('empty');
    });

    it('has no errors for a fully-specified team', () => {
        const { text, errors } = buildBattleTeamText([
            mon('charizard', ['flamethrower', 'air-slash'], 'choice-specs'),
            mon('garchomp', ['earthquake'], 'life-orb'),
        ]);
        expect(errors).toEqual([]);
        expect(text.split('\n\n')).toHaveLength(2);
    });
});

describe('battleAttentionNotice', () => {
    it('has nothing to say when the battle is not waiting on the viewer', () => {
        expect(battleAttentionNotice(describeBattle(make(), ME))).toBeNull();
        expect(battleAttentionNotice(null)).toBeNull();
    });

    it('flags a fresh challenge received', () => {
        const view = describeBattle(make(), THEM); // THEM did not send this one
        expect(battleAttentionNotice(view)).toMatchObject({
            titleKey: 'battle.notifyChallengeTitle',
            bodyKey: 'battle.notifyChallengeBody',
            params: { name: 'Me' },
        });
    });

    it('flags an unsubmitted team', () => {
        const view = describeBattle(make({ status: 'teamSelect' }), ME);
        expect(battleAttentionNotice(view).titleKey).toBe('battle.notifyTeamTitle');
    });

    it('flags an owed move once active', () => {
        const view = describeBattle(make({ status: 'active', awaitingChoiceFrom: [ME] }), ME);
        expect(battleAttentionNotice(view).titleKey).toBe('battle.notifyTurnTitle');
    });

    // "Pick your team" would be wrong for a random battle: there is nothing to
    // pick, and a trainer told to go and choose one finds no way to do it.
    it('says the teams are waiting, not that a team is owed, for a random battle', () => {
        const view = describeBattle(make({ mode: 'random', status: 'teamSelect' }), ME);
        expect(battleAttentionNotice(view).titleKey).toBe('battle.notifyRandomTitle');
    });
});
