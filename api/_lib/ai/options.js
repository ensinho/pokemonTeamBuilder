/**
 * The legal choices, read only from the sim's own request (invariant I6). The
 * AI never invents a choice, so it can never send one the sim refuses.
 *
 * Never offers Terastallization, Mega Evolution or Dynamax: the format's
 * Terastal Clause refuses the first, and Gen 9 has neither of the others.
 */

export const speciesFromDetails = (details) => String(details || '').split(',')[0].trim();

const isFainted = (mon) => String(mon.condition || '').endsWith(' fnt');

/**
 * After Revival Blessing the "switch" prompt asks for a *fainted* Pokémon to
 * bring back (the active entry carries `reviving`), so the usual filter flips.
 */
const switchOptions = (request) => {
    const pokemon = request.side?.pokemon || [];
    const reviving = pokemon.some((mon) => mon.reviving);
    return pokemon
        .map((mon, index) => ({ mon, index }))
        .filter(({ mon }) => !mon.active && (reviving ? isFainted(mon) : !isFainted(mon)))
        .map(({ mon, index }) => ({
            choice: `switch ${index + 1}`,
            kind: reviving ? 'revive' : 'switch',
            slot: index,
            species: speciesFromDetails(mon.details),
        }));
};

/** @returns {Array<{choice: string, kind: 'move'|'switch'|'default', moveId?: string, slot?: number, species?: string}>} */
export const legalOptions = (request) => {
    if (!request || request.wait) return [];
    if (request.teamPreview) return [{ choice: 'default', kind: 'default' }];
    if (request.forceSwitch) {
        const switches = switchOptions(request);
        return switches.length ? switches : [{ choice: 'default', kind: 'default' }];
    }

    const active = request.active?.[0];
    const moves = (active?.moves || [])
        .map((move, index) => ({ move, index }))
        // Struggle and Recharge come without PP; anything with PP needs some left.
        .filter(({ move }) => !move.disabled && (move.pp === undefined || move.pp > 0))
        .map(({ move, index }) => ({ choice: `move ${index + 1}`, kind: 'move', moveId: move.id, slot: index }));

    // `maybeTrapped` means the sim can't say yet; a refused switch would be an
    // illegal choice, so it counts as trapped.
    const trapped = Boolean(active?.trapped || active?.maybeTrapped);
    const switches = trapped ? [] : switchOptions(request);
    const options = [...moves, ...switches];
    return options.length ? options : [{ choice: 'default', kind: 'default' }];
};
