import { Dex, PRNG, Teams } from '@pkmn/sim';
import { TeamGenerators } from '@pkmn/randoms';

/**
 * Random-battle team generation.
 *
 * This is Showdown's *own* generator, not an imitation of it: `@pkmn/randoms` is
 * the packaged form of `data/random-battles/*` from the pokemon-showdown repo —
 * the modern descendant of the `randomSet`/`randomTeam` script this feature was
 * modelled on. Everything that makes a random battle feel fair comes from there:
 *
 *  - **Level balance.** Each species carries a level chosen so that a weak
 *    Pokémon and a strong one are roughly matched — Smogon's tiering expressed as
 *    a number (the gen-5 script's `levelScale`/`customScale` tables; gen 9 keeps
 *    per-species levels in the sets data). A Magikarp comes in near L95, a
 *    Landorus near L74. That is the entire reason not to hand-roll this: the
 *    tables *are* the balance, and they are maintained upstream every ladder
 *    shift.
 *  - **Sets.** Move pools, abilities, items, EV/IV spreads and Tera types, all
 *    with the same coherence rules (no Solar Beam without sun, no Blaze without a
 *    Fire move, no two redundant STABs).
 *
 * ## Why we roll the team ourselves instead of letting the simulator do it
 *
 * `gen9randombattle` can generate teams on its own — but `Battle#getTeam` only
 * does so when no team was supplied, and a team it generates is a function of the
 * battle seed *and the installed generator version*. Our resolver replays every
 * battle from scratch on every turn (see ./battleResolver.js), so a mid-battle
 * `@pkmn/randoms` upgrade would silently deal both players a different team on
 * the next replay, contradicting the protocol lines they had already been sent.
 *
 * Rolling here, once, and storing the result as Showdown text means the team is
 * as fixed as a hand-built one. The format is still `gen9randombattle`, so the
 * battle keeps the ruleset that belongs with these sets (Species Clause, Sleep
 * Clause Mod, HP Percentage Mod, and no team preview — you meet your opponent's
 * lead when it comes out, exactly as on the ladder).
 */

/** The format random battles are played under — also the source of the sets. */
export const RANDOM_BATTLE_FORMAT = 'gen9randombattle';

/**
 * Registering the factory mutates module-level state inside `@pkmn/sim`, so it's
 * done once and guarded: a second call would be harmless today, but the guard
 * makes the intent ("this is setup, not part of the request") explicit.
 */
let generatorRegistered = false;
const ensureGenerator = () => {
    if (generatorRegistered) return;
    Teams.setGeneratorFactory(TeamGenerators);
    generatorRegistered = true;
};

export class RandomTeamError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'RandomTeamError';
        this.code = code;
    }
}

/**
 * Two seeds from one, so both sides are decided by the battle's single stored
 * seed and nothing else.
 *
 * Drawn from the sim's own PRNG rather than mixed by hand: the same battle seed
 * always yields the same pair, in the same order, which is what lets the roll be
 * recomputed and audited later. Passing the battle seed to both sides directly
 * would be the bug this avoids — identical seeds generate identical teams, and
 * the mirror match would look like a bug in the generator rather than in us.
 *
 * @param {number[]} battleSeed the four-integer sim seed stored on the battle
 * @param {number}   count      how many side seeds to draw
 * @returns {number[][]}
 */
export const deriveTeamSeeds = (battleSeed, count = 2) => {
    if (!Array.isArray(battleSeed) || battleSeed.length !== 4) {
        throw new RandomTeamError('A random battle needs a four-part seed.', 'badSeed');
    }
    const prng = new PRNG(battleSeed);
    return Array.from({ length: count }, () => (
        [0, 1, 2, 3].map(() => prng.random(0x10000))
    ));
};

/**
 * The roster a client needs to draw six sprites, and nothing more.
 *
 * `num` is the National Dex number, which is what the app's sprite helpers key
 * on. Regional forms report their base number (Raichu-Alola → 26), so the
 * pre-battle bar shows Raichu; in battle the sprites come from the protocol,
 * which names the form exactly.
 */
const describeRoster = (sets) => sets.map((set) => {
    const species = Dex.species.get(set.species || set.name);
    return {
        id: species?.num || 0,
        name: set.species || set.name || '',
        level: set.level || 100,
    };
});

/**
 * Roll one random team.
 *
 * @param {object} input
 * @param {string} input.format e.g. 'gen9randombattle'
 * @param {number[]} input.seed the four-integer seed for *this side*
 * @returns {{showdownText: string, roster: Array<{id: number, name: string, level: number}>}}
 */
export const generateRandomTeam = ({ format = RANDOM_BATTLE_FORMAT, seed }) => {
    ensureGenerator();

    let sets;
    try {
        sets = Teams.generate(format, { seed });
    } catch (err) {
        throw new RandomTeamError(`Could not roll a ${format} team: ${err.message}`, 'generatorFailed');
    }
    if (!Array.isArray(sets) || sets.length === 0) {
        throw new RandomTeamError(`The ${format} generator produced no Pokémon.`, 'emptyTeam');
    }

    // Exported rather than packed because that is what every other team in this
    // app is: `battles/{id}/teams/{uid}.showdownText`, which the resolver hands
    // to `Teams.import()`. One shape for hand-built and rolled teams alike means
    // the resolver, the rules and the client need no idea which is which.
    const showdownText = Teams.export(sets);
    if (!showdownText.trim()) {
        throw new RandomTeamError('The rolled team could not be exported.', 'exportFailed');
    }

    return { showdownText, roster: describeRoster(sets) };
};

/**
 * Roll both sides of a battle from its stored seed.
 *
 * @returns {{p1: {showdownText, roster}, p2: {showdownText, roster}}}
 */
export const generateRandomTeams = ({ format = RANDOM_BATTLE_FORMAT, seed }) => {
    const [p1Seed, p2Seed] = deriveTeamSeeds(seed, 2);
    return {
        p1: generateRandomTeam({ format, seed: p1Seed }),
        p2: generateRandomTeam({ format, seed: p2Seed }),
    };
};
