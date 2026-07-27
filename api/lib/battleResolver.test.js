import { describe, it, expect } from 'vitest';
import {
    replayBattle, resolveTurn, packTeam, owesChoice, readBattleState, makeSeed,
    BattleResolveError,
} from './battleResolver';

const SEED = [1, 2, 3, 4];
const FORMAT = 'gen9customgame';

// Exactly the shape buildBattleTeamText() produces: no "@ Nothing", Level: 50.
const P1_TEAM = `Charizard @ Choice Specs
Ability: Blaze
Level: 50
Tera Type: Fire
EVs: 252 SpA / 252 Spe
Timid Nature
- Flamethrower
- Air Slash

Garchomp @ Life Orb
Ability: Rough Skin
Level: 50
Tera Type: Dragon
Jolly Nature
- Earthquake`;

const P2_TEAM = `Blastoise @ Leftovers
Ability: Torrent
Level: 50
Tera Type: Water
EVs: 252 HP / 252 Def
Bold Nature
- Surf
- Protect

Pikachu @ Light Ball
Ability: Static
Level: 50
Tera Type: Electric
Jolly Nature
- Thunderbolt`;

const teams = { p1: P1_TEAM, p2: P2_TEAM };
const names = { p1: 'Enzo', p2: 'Amigo' };

describe('packTeam', () => {
    it('packs a valid team', () => {
        expect(typeof packTeam(P1_TEAM, 'Enzo')).toBe('string');
    });

    it('rejects an empty team', async () => {
        expect(() => packTeam('', 'Enzo')).toThrow(BattleResolveError);
        expect(() => packTeam('   ', 'Enzo')).toThrow(/empty/i);
    });

    // The client already blocks this, but the resolver is the authority and must
    // not trust it.
    it('rejects a Pokémon with no moves', () => {
        const moveless = `Blastoise @ Leftovers\nAbility: Torrent\nLevel: 50\nBold Nature`;
        expect(() => packTeam(moveless, 'Amigo')).toThrow(/no moves/i);
    });
});

describe('owesChoice', () => {
    it('is true for a live prompt', () => {
        expect(owesChoice(['|request|{"active":[{"moves":[]}],"side":{}}'])).toBe(true);
        expect(owesChoice(['|request|{"teamPreview":true,"side":{}}'])).toBe(true);
        expect(owesChoice(['|request|{"forceSwitch":[true],"side":{}}'])).toBe(true);
    });

    it('is false while waiting on the opponent', () => {
        expect(owesChoice(['|request|{"wait":true,"side":{}}'])).toBe(false);
    });

    it('reads only the most recent request', () => {
        expect(owesChoice([
            '|request|{"active":[{}],"side":{}}',
            '|request|{"wait":true,"side":{}}',
        ])).toBe(false);
    });

    it('does not wedge the battle on junk', () => {
        expect(owesChoice([])).toBe(false);
        expect(owesChoice(['|request|not json'])).toBe(false);
        expect(owesChoice(['|request|'])).toBe(false);
    });
});

describe('readBattleState', () => {
    it('tracks the latest turn', () => {
        expect(readBattleState(['|turn|1', '|turn|2', '|turn|3']).turn).toBe(3);
    });

    it('detects a win', () => {
        const state = readBattleState(['|turn|1', '|win|Enzo']);
        expect(state).toMatchObject({ ended: true, winner: 'Enzo' });
    });

    it('detects a tie', () => {
        expect(readBattleState(['|tie']).ended).toBe(true);
    });

    // `|tier|…` names the format on the very first lines of every battle. Matching
    // ties with startsWith('|tie') marked every battle finished before turn 1.
    it('does not mistake the |tier| header for a tie', () => {
        expect(readBattleState(['|tier|[Gen 9] Custom Game', '|turn|1']))
            .toMatchObject({ ended: false, turn: 1 });
    });

    it('reports an unfinished battle', () => {
        expect(readBattleState(['|turn|1'])).toMatchObject({ ended: false, winner: null });
    });
});

describe('makeSeed', () => {
    it('produces four in-range integers', () => {
        const seed = makeSeed(() => 12345);
        expect(seed).toEqual([12345, 12345, 12345, 12345]);
        expect(makeSeed((max) => max - 1).every((n) => n < 0x10000)).toBe(true);
    });
});

describe('replayBattle', () => {
    it('rejects a malformed seed', async () => {
        await expect(replayBattle({ format: FORMAT, seed: [1, 2], teams, names }))
            .rejects.toThrow(/four-part seed/i);
    });

    it('starts at team preview and asks both players', async () => {
        const result = await replayBattle({ format: FORMAT, seed: SEED, teams, names, choices: [] });
        expect(result.log.omniscient.join('\n')).toContain('|teampreview');
        expect(result.awaiting).toEqual({ p1: true, p2: true });
        expect(result.ended).toBe(false);
    });

    it('plays a turn and reports damage', async () => {
        const result = await replayBattle({
            format: FORMAT, seed: SEED, teams, names,
            choices: ['>p1 team 1', '>p2 team 1', '>p1 move 1', '>p2 move 1'],
        });
        const text = result.log.omniscient.join('\n');
        expect(text).toContain('|move|');
        expect(text).toContain('|-damage|');
        expect(result.turn).toBeGreaterThanOrEqual(1);
    });

    // The property the whole server-authoritative design exists for.
    it("never leaks the opponent's hidden set into a player's stream", async () => {
        const result = await replayBattle({
            format: FORMAT, seed: SEED, teams, names,
            choices: ['>p1 team 1', '>p2 team 1'],
        });
        const p1 = result.log.p1.join('\n');
        const p2 = result.log.p2.join('\n');

        // Each side sees its own items (normalized ids in the request payload).
        expect(p1).toContain('choicespecs');
        expect(p2).toContain('leftovers');
        // Neither sees the other's.
        expect(p1).not.toContain('lightball');
        expect(p1).not.toContain('leftovers');
        expect(p2).not.toContain('choicespecs');
        expect(p2).not.toContain('lifeorb');
    });

    // Determinism is what lets Firestore store only the seed + choices.
    it('is byte-identical for the same seed and choices', async () => {
        const choices = ['>p1 team 1', '>p2 team 1', '>p1 move 1', '>p2 move 1'];
        const strip = (lines) => lines.filter((line) => !line.startsWith('|t:|')).join('\n');

        const a = await replayBattle({ format: FORMAT, seed: SEED, teams, names, choices });
        const b = await replayBattle({ format: FORMAT, seed: SEED, teams, names, choices });
        expect(strip(a.log.omniscient)).toBe(strip(b.log.omniscient));

        const other = await replayBattle({
            format: FORMAT, seed: [9, 9, 9, 9], teams, names, choices,
        });
        expect(strip(other.log.omniscient)).not.toBe(strip(a.log.omniscient));
    });
});

describe('resolveTurn', () => {
    it('appends both players\' choices to the history', async () => {
        const base = ['>p1 team 1', '>p2 team 1'];
        const result = await resolveTurn({
            format: FORMAT, seed: SEED, teams, names,
            choices: base,
            nextChoices: { p1: 'move 1', p2: 'move 1' },
        });
        expect(result.log.omniscient.join('\n')).toContain('|move|');
    });

    it('matches a full replay of the same history', async () => {
        const strip = (lines) => lines.filter((line) => !line.startsWith('|t:|')).join('\n');
        const viaResolve = await resolveTurn({
            format: FORMAT, seed: SEED, teams, names,
            choices: ['>p1 team 1', '>p2 team 1'],
            nextChoices: { p1: 'move 1', p2: 'move 1' },
        });
        const viaReplay = await replayBattle({
            format: FORMAT, seed: SEED, teams, names,
            choices: ['>p1 team 1', '>p2 team 1', '>p1 move 1', '>p2 move 1'],
        });
        expect(strip(viaResolve.log.omniscient)).toBe(strip(viaReplay.log.omniscient));
    });
});

// The endpoint stores only the *delta* between replays (see publishLog): it slices
// each new full log at the number of lines already sent. That is only correct if a
// longer replay extends a shorter one line-for-line — so assert it directly.
describe('replay logs extend, they do not rewrite', () => {
    const stripTs = (lines) => lines.filter((line) => !line.startsWith('|t:|'));

    it('a longer history yields a line-wise extension of the shorter one', async () => {
        const short = ['>p1 team 1', '>p2 team 1'];
        const long = [...short, '>p1 move 1', '>p2 move 1'];

        const a = await replayBattle({ format: FORMAT, seed: SEED, teams, names, choices: short });
        const b = await replayBattle({ format: FORMAT, seed: SEED, teams, names, choices: long });

        for (const side of ['p1', 'p2', 'omniscient']) {
            expect(b.log[side].length).toBeGreaterThan(a.log[side].length);
            // Everything already delivered stays identical (timestamps aside), so
            // slicing at the previous length neither repeats nor skips a line.
            expect(stripTs(b.log[side].slice(0, a.log[side].length)))
                .toEqual(stripTs(a.log[side]));
        }
    });

    it('concatenating deltas reproduces the full log', async () => {
        const rounds = [
            ['>p1 team 1', '>p2 team 1'],
            ['>p1 move 1', '>p2 move 1'],
            ['>p1 move 1', '>p2 move 1'],
        ];

        let history = [];
        let offset = 0;
        const stitched = [];
        let full = [];

        for (const round of rounds) {
            history = [...history, ...round];
            const result = await replayBattle({ format: FORMAT, seed: SEED, teams, names, choices: history });
            full = result.log.p1;
            stitched.push(...full.slice(offset));
            offset = full.length;
        }

        expect(stitched.length).toBe(full.length);
        expect(stripTs(stitched)).toEqual(stripTs(full));
    });
});
