// Moves a Pokémon carries over from its pre-evolutions.
//
// PokéAPI lists egg moves (and some tutor/event moves) only on the first stage
// of a line: Destiny Bond is on Honedge, not on Aegislash. A fully evolved
// Pokémon still knows them in the games and on Showdown, so the builder adds
// the line's moves to its learnset, marking each with where it came from.

/**
 * @param {Array<{name:string,url?:string}>} ownMoves the Pokémon's own learnset
 * @param {Array<{from:string, moves:Array<{name:string,url?:string}>}>} prevos nearest first
 * @returns {Array<{name:string,url?:string,inheritedFrom?:string}>}
 */
export const mergeInheritedMoves = (ownMoves, prevos) => {
    const own = Array.isArray(ownMoves) ? ownMoves.filter((m) => m?.name) : [];
    const seen = new Set(own.map((m) => m.name));
    const added = [];
    for (const prevo of prevos || []) {
        for (const move of prevo?.moves || []) {
            if (!move?.name || seen.has(move.name)) continue;
            seen.add(move.name);
            added.push({ ...move, inheritedFrom: prevo.from });
        }
    }
    return [...own, ...added];
};

// In the Pokédex, a move with an egg method on a pre-evolution is shown under
// "Egg" for the evolved Pokémon too. Raw PokéAPI move entries, one version group.
export const inheritedVersionMoves = (ownApiMoves, prevoApiMoves, versionGroup) => {
    const ownNames = new Set((ownApiMoves || [])
        .filter((m) => m.version_group_details?.some((d) => d.version_group?.name === versionGroup))
        .map((m) => m.move?.name));
    const out = [];
    for (const m of prevoApiMoves || []) {
        const name = m.move?.name;
        if (!name || ownNames.has(name)) continue;
        const d = m.version_group_details?.find((v) => v.version_group?.name === versionGroup);
        if (!d) continue;
        ownNames.add(name);
        out.push({ name, url: m.move.url, learnMethod: d.move_learn_method?.name, level: d.level_learned_at });
    }
    return out;
};
