import { Dex, Teams } from '@pkmn/sim';

import { BANNED_MOVES, LEVEL, MAX_TEAM_TEXT } from './constants.js';

/**
 * A saved team, checked before it may face the champion.
 *
 * No Showdown validator runs in battle, so the clauses that live in validators
 * are enforced here: Species Clause (`duplicateSpecies`), OHKO Clause and
 * Evasion Moves Clause (`bannedMove`). Legendaries and Ubers are allowed
 * (decision 2026-10-14) — the run is tagged with the client's tier label and
 * the fair ranking is the Time do dia one.
 *
 * Errors are a list, not the first failure, so the picker can mark every slot
 * at once.
 *
 * @returns {{ok: true, text: string, packed: string, members: Array} | {ok: false, errors: Array<{slot: number|null, code: string, detail?: string}>}}
 */
export const validateTeam = (showdownText) => {
    const text = typeof showdownText === 'string' ? showdownText : '';
    if (text.length > MAX_TEAM_TEXT) return { ok: false, errors: [{ slot: null, code: 'tooLong' }] };

    let sets;
    try {
        sets = Teams.import(text);
    } catch (err) {
        return { ok: false, errors: [{ slot: null, code: 'parse', detail: err.message }] };
    }
    if (!sets || sets.length === 0) return { ok: false, errors: [{ slot: null, code: 'empty' }] };
    if (sets.length > 6) return { ok: false, errors: [{ slot: null, code: 'tooMany', detail: String(sets.length) }] };

    const errors = [];
    const seen = new Set();
    sets.forEach((set, slot) => {
        const species = Dex.species.get(set.species);
        if (!species.exists) {
            errors.push({ slot, code: 'unknownSpecies', detail: set.species });
            return;
        }
        const base = Dex.species.get(species.baseSpecies).id;
        if (seen.has(base)) errors.push({ slot, code: 'duplicateSpecies', detail: species.baseSpecies });
        seen.add(base);

        const moves = (set.moves || []).filter(Boolean);
        if (moves.length === 0) errors.push({ slot, code: 'noMoves', detail: species.name });
        for (const name of moves) {
            const move = Dex.moves.get(name);
            if (!move.exists) errors.push({ slot, code: 'unknownMove', detail: name });
            else if (BANNED_MOVES.includes(move.id)) errors.push({ slot, code: 'bannedMove', detail: move.name });
        }
        set.level = LEVEL;
    });
    if (errors.length) return { ok: false, errors };

    return {
        ok: true,
        text: Teams.export(sets).trim(),
        packed: Teams.pack(sets),
        members: sets.map((set) => ({ species: Dex.species.get(set.species).name, dexNum: Dex.species.get(set.species).num })),
    };
};
