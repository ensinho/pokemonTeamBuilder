/**
 * The Home's "Para você" doors (2026-11-12): each destination a door with the
 * colour of its subject's type and a Pokémon standing in it. The view swaps
 * in the live one where it has it — the meta's leader, the day's puzzle, the
 * lead of the team in progress — and puts a live figure under the title.
 * Every key of PICK_DESTINATIONS (utils/trainerProfile.js) has a look here
 * (a test checks).
 */
export const DOOR_LOOK = {
    builder: { type: 'fire', dex: 6 },
    pokedex: { type: 'electric', dex: 25 },
    meta: { type: 'dragon', dex: 445 },
    bestTeams: { type: 'steel', dex: 983 },
    tournaments: { type: 'fighting', dex: 727 },
    damageCalc: { type: 'water', dex: 184 },
    speedTiers: { type: 'electric', dex: 894 },
    guides: { type: 'psychic', dex: 65 },
    types: { type: 'rock', dex: 74 },
    gyms: { type: 'rock', dex: 95 },
    moves: { type: 'fighting', dex: 448 },
    pokepuzzle: { type: 'psychic', dex: 150 },
    challenge: { type: 'dragon', dex: 445 },
    generationQuiz: { type: 'grass', dex: 1 },
    battles: { type: 'fighting', dex: 448 },
};

const FALLBACK = { type: 'normal', dex: 25 };

/** The look of a door: its type and the Pokémon in it, a live one when given. */
export function doorLook(key, live = {}) {
    const base = DOOR_LOOK[key] || FALLBACK;
    return { type: live.type || base.type, dex: live.dex || base.dex };
}
