/**
 * Pure helpers that let a friend battle play on the Champion Challenge's
 * screen (`ds/DsBattleStage`). Store-free and DOM-free; tested without a
 * browser.
 *
 * The challenge's whole stack — the timeline, the text, the scene, the sheet,
 * the rails — reads the player as `p1` and the opponent as `p2`, because there
 * the player always is. In a friend battle the challenger is p1, so the trainer
 * who accepted sees the battle from p2. Rather than thread a side through every
 * reader, `asViewer` rewrites that trainer's log so they are p1 too: one
 * function at the edge, and everything downstream stays as tested.
 */

const SWAP = { 1: '2', 2: '1' };
const swapSide = (digit) => SWAP[digit] || digit;

// `p2a: Garchomp`, `p2: Gary` (a side), `p2` (a bare side field) — the side
// prefix of a field, never anything after its colon.
const SIDE_FIELD = /^p([12])([a-z]?)(?=:|$)/;
// `[of] p2a: Garchomp` — the side inside a tag.
const OF_FIELD = /^\[of\] p([12])([a-z]?):/;

const swapField = (field) => {
    if (SIDE_FIELD.test(field)) return field.replace(SIDE_FIELD, (_, d, slot) => `p${swapSide(d)}${slot}`);
    if (OF_FIELD.test(field)) return field.replace(OF_FIELD, (_, d, slot) => `[of] p${swapSide(d)}${slot}:`);
    return field;
};

const swapRequest = (json) => {
    try {
        const payload = JSON.parse(json);
        if (payload?.side) {
            payload.side = {
                ...payload.side,
                id: payload.side.id ? `p${swapSide(payload.side.id.slice(1))}` : payload.side.id,
                pokemon: (payload.side.pokemon || []).map((mon) => ({ ...mon, ident: swapField(String(mon.ident || '')) })),
            };
        }
        return JSON.stringify(payload);
    } catch {
        return json;
    }
};

/**
 * The log as the viewer's side being p1. `mySide` is 'p1' or 'p2' (the
 * challenger is p1); for p1 the lines come back untouched.
 *
 * @param {string[]} lines
 * @param {'p1'|'p2'} mySide
 */
export const asViewer = (lines = [], mySide = 'p1') => {
    if (mySide !== 'p2') return lines;
    return lines.map((line) => {
        if (!line.startsWith('|')) return line;
        if (line.startsWith('|request|')) return `|request|${swapRequest(line.slice('|request|'.length))}`;
        const parts = line.split('|');
        // parts[0] is '' and parts[1] the tag; every later field may name a side.
        for (let i = 2; i < parts.length; i += 1) parts[i] = swapField(parts[i]);
        return parts.join('|');
    });
};

const speciesOf = (details) => String(details || '').split(',')[0].trim();

/**
 * The opponent's team as far as the battle has shown it (they are `p2` after
 * `asViewer`), in the shape the challenge's dossier draws: one slot per
 * Pokémon in `|teamsize|`, each revealed — in the order they came out — once
 * it has been sent in.
 *
 * @returns {Array<{species: string|null, dexNum: null, wildcard: boolean, revealed: boolean, fainted: boolean}>}
 */
export const opponentRoster = (lines = []) => {
    let size = 0;
    const order = [];
    const names = new Map();
    const fainted = new Set();
    for (const line of lines) {
        const parts = line.split('|');
        const tag = parts[1];
        if (tag === 'teamsize' && parts[2] === 'p2') size = Number(parts[3]) || 0;
        else if (tag === 'poke' && parts[2] === 'p2') {
            // A format with Team Preview lists the six up front.
            const species = speciesOf(parts[3]);
            if (species && !order.includes(species)) order.push(species);
        } else if ((tag === 'switch' || tag === 'drag' || tag === 'replace') && parts[2]?.startsWith('p2')) {
            const species = speciesOf(parts[3]);
            names.set(parts[2].split(': ')[1], species);
            if (species && !order.includes(species)) order.push(species);
        } else if (tag === 'detailschange' && parts[2]?.startsWith('p2')) {
            // A Mega Evolution: the same slot, under its new name (and back to
            // its base when it faints — the faint follows the name).
            const nickname = parts[2].split(': ')[1];
            const before = names.get(nickname);
            const after = speciesOf(parts[3]);
            names.set(nickname, after);
            const at = order.indexOf(before);
            if (at !== -1) order[at] = after;
            if (fainted.delete(before)) fainted.add(after);
        } else if (tag === 'faint' && parts[2]?.startsWith('p2')) {
            const species = names.get(parts[2].split(': ')[1]);
            if (species) fainted.add(species);
        }
    }
    const slots = Math.min(6, Math.max(size, order.length));
    return Array.from({ length: slots }, (_, i) => {
        const species = order[i] || null;
        return {
            species,
            dexNum: null,
            wildcard: !species,
            revealed: Boolean(species),
            fainted: Boolean(species && fainted.has(species)),
        };
    });
};

/** The sim's name for a side, from `|player|` (it is what `|win|` names). */
export const simNameOf = (lines = [], side = 'p2') => {
    for (const line of lines) {
        if (line.startsWith(`|player|${side}|`)) return line.split('|')[3] || null;
    }
    return null;
};

/**
 * Merge rounds of a log, by sequence number, into one ordered list — from the
 * listener and from the turn's own response, in any order, with repeats. Only
 * a gap-free run from 0 counts: a round that arrived ahead of its predecessor
 * waits for it rather than playing out of order.
 *
 * @param {Map<number, string[]>} rounds
 * @returns {{lines: string[], upTo: number}} `upTo` = the first missing seq
 */
export const flattenRounds = (rounds) => {
    const lines = [];
    let seq = 0;
    while (rounds.has(seq)) {
        lines.push(...rounds.get(seq));
        seq += 1;
    }
    return { lines, upTo: seq };
};
