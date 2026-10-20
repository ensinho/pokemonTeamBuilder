/**
 * Fixed rules of the Champion Challenge. Zero imports, so anything may read
 * them — including the endpoint's static import graph.
 */

/**
 * The battle format, chosen for what it does *at battle time* — no team
 * validator ever runs (the challenge checks teams itself, `validateTeam.js`):
 *
 *  - **`gen9anythinggoes`, not `gen9customgame`.** Custom Game is a debug format:
 *    it reports every Pokémon's *exact* HP to both sides (`reportExactHP`), so the
 *    player would read Cynthia's HP to the point and Cynthia the player's, which
 *    is enough to infer EV spreads. Anything Goes carries HP Percentage Mod and
 *    no debug flag: each side sees its own HP exactly and the other's in percent,
 *    like the DS did. Its other rules (Obtainable, EV limits) are validator-only.
 *  - **`!Team Preview`.** Preview prints both teams (`|poke|`) before the lead —
 *    which would reveal the wildcard the Pokétch keeps as "?" until it comes out.
 *    The lead is slot 1 on both sides, as in the games.
 *  - **Terastal Clause.** There is no Tera button; the sim refuses the choice.
 *  - **Sleep Clause Mod** acts in battle. Species, OHKO and Evasion Moves clauses
 *    are validator rules, so `validateTeam` enforces them instead.
 */
export const FORMAT = 'gen9anythinggoes@@@!Team Preview,Sleep Clause Mod,Terastal Clause';

/** Everyone plays at 50, Cynthia included — Battle Tower rules. */
export const LEVEL = 50;

/** Recorded on every run: a replay is only valid on the engine that made it. */
export const ENGINE_VERSION = 'pkmn-sim@0.10.11';

/** OHKO Clause + Evasion Moves Clause, by move id. */
export const BANNED_MOVES = ['fissure', 'guillotine', 'horndrill', 'sheercold', 'doubleteam', 'minimize'];

/** A Showdown team text this long is not a six-Pokémon team. */
export const MAX_TEAM_TEXT = 8 * 1024;

/** Display names are protocol text (`|player|p1|…`); keep them short and plain. */
export const MAX_NAME_LENGTH = 20;

/** The one choice grammar the endpoint accepts before it reaches the sim. */
// `move N mega` — a Pokémon holding its Mega Stone Mega Evolves as it moves.
export const CHOICE_PATTERN = /^(move [1-4]( mega)?|switch [1-6]|default)$/;

/**
 * Champions the engine knows. Only Cynthia ships (premise A5): the engine is
 * generic by `championId` so another one is data, not code.
 */
export const CHAMPIONS = {
    cynthia: { name: 'Cynthia', trainerSprite: 'cynthia-gen4', aceSpecies: 'Garchomp' },
};

export const DEFAULT_CHAMPION = 'cynthia';
