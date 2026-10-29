import { typeMultiplier } from './homeStatus';

/**
 * Two saved teams, head to head. Pure: the modal hands in the rosters, the
 * Pokédex index (types + base stats) and the battle dex's moves, and gets back
 * every one-on-one duel plus the totals the comparison shows.
 *
 * A duel is decided by type matchup, the thing a team builder actually
 * controls: each side's best hit on the other (its saved damaging moves, or
 * its own types when no moves are saved), with STAB counted, and base Speed as
 * the tiebreak. Items, abilities, EVs and natures are deliberately out — the
 * modal says so instead of pretending to simulate a battle.
 */

const STAB = 1.5;
const EPSILON = 1e-6;

const toId = (name = '') => String(name).toLowerCase().replace(/[^a-z0-9]/g, '');

const typeName = (entry) => (typeof entry === 'string' ? entry : entry?.type?.name || entry?.name || null);

/**
 * The types a member attacks with: its saved damaging moves' types when the
 * dex knows them, otherwise its own types (an unbuilt member still has STAB).
 * `moveDex` is battle-dex.json's `moves` ({ id: [name, type, category, …] }).
 */
export const attackTypesOf = (types = [], moves = [], moveDex = null) => {
    const fromMoves = [];
    if (moveDex) {
        for (const move of moves) {
            const record = move && moveDex[toId(move)];
            if (record && record[2] !== 'Status' && record[1]) fromMoves.push(String(record[1]).toLowerCase());
        }
    }
    return fromMoves.length > 0
        ? { types: [...new Set(fromMoves)], fromMoves: true }
        : { types: [...types], fromMoves: false };
};

/** One member, resolved: types, base Speed and what it attacks with. */
export const profileMember = (member, { indexById = new Map(), moveDex = null } = {}) => {
    const entry = indexById.get(member?.id) || null;
    const ownTypes = (Array.isArray(member?.types) && member.types.length > 0 ? member.types : entry?.types || [])
        .map(typeName)
        .filter(Boolean);
    const speed = entry?.baseStats?.speed
        ?? member?.stats?.find?.((s) => s?.name === 'speed')?.base_stat
        ?? null;
    const moves = (member?.customization?.moves || []).filter(Boolean);
    return {
        member,
        id: member?.id ?? null,
        name: member?.name || entry?.name || '',
        types: ownTypes,
        speed: typeof speed === 'number' ? speed : null,
        attack: attackTypesOf(ownTypes, moves, moveDex),
    };
};

/**
 * The hardest hit `attacker` lands on a Pokémon of `defenderTypes`:
 * `{ type, multiplier, power }`, power being the multiplier with STAB applied.
 * `type` is null when the attacker has nothing to hit with.
 */
export const bestHit = (attacker, defenderTypes = []) => {
    let best = { type: null, multiplier: 1, power: 0 };
    for (const type of attacker.attack.types) {
        const multiplier = typeMultiplier(type, defenderTypes);
        const power = multiplier * (attacker.types.includes(type) ? STAB : 1);
        if (best.type === null || power > best.power + EPSILON) best = { type, multiplier, power };
    }
    return best;
};

/**
 * One member of A against one of B. `winner` is 'a', 'b' or 'even': the
 * harder hitter wins; equal hits go to the faster one.
 */
export const duel = (a, b) => {
    const aHit = bestHit(a, b.types);
    const bHit = bestHit(b, a.types);
    let faster = null;
    if (a.speed !== null && b.speed !== null) {
        faster = a.speed > b.speed ? 'a' : b.speed > a.speed ? 'b' : 'tie';
    }
    let winner = 'even';
    if (aHit.power > bHit.power + EPSILON) winner = 'a';
    else if (bHit.power > aHit.power + EPSILON) winner = 'b';
    else if (aHit.power > 0 && (faster === 'a' || faster === 'b')) winner = faster;
    return { aHit, bHit, faster, winner };
};

/**
 * Team A against team B, from A's side.
 *
 * @returns {{
 *   a: object[], b: object[],                 // member profiles
 *   grid: object[][],                          // grid[i][j] = duel(a[i], b[j])
 *   wins: number, losses: number, evens: number, total: number,
 *   share: number,                             // A's share of the decided duels, 0..1
 *   verdict: 'a'|'b'|'even'|null,              // null when a side is empty
 *   pressure: { a: number, b: number },        // members of the other side each team hits super effectively
 *   faster: { a: number, b: number },          // duels in which each side moves first
 *   threatsToA: object[], threatsToB: object[],// members the other side has no winning answer to
 * }}
 */
export const compareTeams = (teamA = [], teamB = [], options = {}) => {
    const a = teamA.filter(Boolean).map((m) => profileMember(m, options));
    const b = teamB.filter(Boolean).map((m) => profileMember(m, options));
    const grid = a.map((x) => b.map((y) => duel(x, y)));

    let wins = 0;
    let losses = 0;
    let evens = 0;
    let fasterA = 0;
    let fasterB = 0;
    grid.flat().forEach((d) => {
        if (d.winner === 'a') wins += 1;
        else if (d.winner === 'b') losses += 1;
        else evens += 1;
        if (d.faster === 'a') fasterA += 1;
        if (d.faster === 'b') fasterB += 1;
    });
    const total = wins + losses + evens;
    const decided = wins + losses;
    const share = decided > 0 ? wins / decided : 0.5;

    let verdict = null;
    if (a.length > 0 && b.length > 0) {
        // A margin of a tenth of the duels (at least one) is a draw, not a
        // verdict: 18–17 says nothing about which team is better.
        const margin = Math.max(1, Math.round(total * 0.1));
        verdict = Math.abs(wins - losses) <= margin ? 'even' : wins > losses ? 'a' : 'b';
    }

    const pressure = {
        a: b.filter((_, j) => a.some((_, i) => grid[i][j].aHit.multiplier >= 2)).length,
        b: a.filter((_, i) => b.some((_, j) => grid[i][j].bHit.multiplier >= 2)).length,
    };
    const threatsToA = a.length ? b.filter((_, j) => !grid.some((row) => row[j].winner === 'a')) : [];
    const threatsToB = b.length ? a.filter((_, i) => !grid[i].some((d) => d.winner === 'b')) : [];

    return {
        a, b, grid,
        wins, losses, evens, total, share, verdict,
        pressure,
        faster: { a: fasterA, b: fasterB },
        threatsToA, threatsToB,
    };
};
