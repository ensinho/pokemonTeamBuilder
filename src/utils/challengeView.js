/**
 * Pure helpers for the Champion Challenge screen. Store-free and DOM-free, so
 * they are tested without a browser.
 *
 * Team Preview is off in the challenge (the wildcard must stay a surprise), so
 * the log has no `|poke|` lines: the player's own roster comes from their
 * latest `|request|`, and Cynthia's from the day's public lineup, each slot
 * revealed only once that Pokémon has been sent out.
 */

import { SHOWDOWN_SPRITES_BASE } from './assetHost';

const speciesOf = (details) => String(details || '').split(',')[0].trim();

const lastRequest = (lines) => {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        if (!lines[i].startsWith('|request|')) continue;
        try {
            return JSON.parse(lines[i].slice('|request|'.length));
        } catch {
            return null;
        }
    }
    return null;
};

/**
 * The player's six, in team order, from their latest request.
 * @returns {Array<{species: string, active: boolean, fainted: boolean, hpPct: number}>}
 */
export const myRoster = (lines = []) => {
    const request = lastRequest(lines);
    return (request?.side?.pokemon || []).map((mon) => {
        const condition = String(mon.condition || '');
        const fainted = condition.endsWith(' fnt') || condition === '0 fnt';
        const [current, max] = condition.split(' ')[0].split('/').map(Number);
        return {
            species: speciesOf(mon.details),
            active: Boolean(mon.active),
            fainted,
            hpPct: fainted ? 0 : max > 0 ? Math.round((100 * current) / max) : 100,
        };
    });
};

/**
 * Cynthia's six in sending order. A slot is `revealed` once its Pokémon has come
 * out; the wildcard (`{wildcard: true}` in the public lineup) takes the species
 * of whichever Pokémon came out that isn't in the lineup.
 *
 * @param {string[]} lines the player's log
 * @param {Array<{species?: string, dexNum?: number, wildcard?: true}>} lineup the day's public lineup
 * @returns {Array<{species: string|null, dexNum: number|null, wildcard: boolean, revealed: boolean, fainted: boolean}>}
 */
export const championRoster = (lines = [], lineup = []) => {
    const seen = new Map(); // nickname → species, in order of appearance
    const fainted = new Set();
    for (const line of lines) {
        const parts = line.split('|');
        if ((parts[1] === 'switch' || parts[1] === 'drag') && parts[2]?.startsWith('p2')) {
            seen.set(parts[2].split(': ')[1], speciesOf(parts[3]));
        } else if (parts[1] === 'faint' && parts[2]?.startsWith('p2')) {
            const species = seen.get(parts[2].split(': ')[1]);
            if (species) fainted.add(species);
        }
    }
    const seenSpecies = new Set(seen.values());
    const known = new Set(lineup.filter((mon) => !mon.wildcard).map((mon) => mon.species));
    const wildcardSpecies = [...seenSpecies].find((species) => !known.has(species)) || null;

    return lineup.map((mon) => {
        const species = mon.wildcard ? wildcardSpecies : mon.species;
        const revealed = Boolean(species && seenSpecies.has(species));
        return {
            species: mon.wildcard && !revealed ? null : species,
            dexNum: mon.dexNum || null,
            wildcard: Boolean(mon.wildcard),
            revealed,
            fainted: revealed && fainted.has(species),
        };
    });
};

/** Milliseconds → `{hours, minutes}` until the next team, never negative. */
export const timeUntil = (targetMs, nowMs = Date.now()) => {
    const left = Math.max(0, (targetMs || 0) - nowMs);
    return { hours: Math.floor(left / 3_600_000), minutes: Math.floor((left % 3_600_000) / 60_000) };
};

/**
 * Which screen to show.
 * @returns {'loading'|'error'|'guest'|'pick'|'battle'|'result'}
 */
export const challengePhase = ({ status, hasLoaded, isAnonymous, run, pickingPractice }) => {
    if (!hasLoaded) return status === 'error' ? 'error' : 'loading';
    if (isAnonymous) return 'guest';
    if (pickingPractice) return 'pick';
    if (!run) return 'pick';
    return run.status === 'active' ? 'battle' : 'result';
};

/** Showdown's trainer sprite — the same host every other trainer sprite in the app uses. */
export const trainerSpriteUrl = (id) => `${SHOWDOWN_SPRITES_BASE}/trainers/${id}.png`;

/** Species of `side` that have fainted in these lines (nicknames resolved). */
export const faintedSpecies = (lines = [], side = 'p1') => {
    const names = new Map();
    const fainted = new Set();
    for (const line of lines) {
        const parts = line.split('|');
        if ((parts[1] === 'switch' || parts[1] === 'drag') && parts[2]?.startsWith(side)) {
            names.set(parts[2].split(': ')[1], speciesOf(parts[3]));
        } else if (parts[1] === 'detailschange' && parts[2]?.startsWith(side)) {
            // A Mega Evolution renames the species from here on, as the request
            // does — and a fainted Mega is renamed back to its base (`[silent]`),
            // so the faint follows the name.
            const nickname = parts[2].split(': ')[1];
            const before = names.get(nickname);
            const after = speciesOf(parts[3]);
            names.set(nickname, after);
            if (fainted.delete(before)) fainted.add(after);
        } else if (parts[1] === 'faint' && parts[2]?.startsWith(side)) {
            const species = names.get(parts[2].split(': ')[1]);
            if (species) fainted.add(species);
        }
    }
    return fainted;
};

/** How many times each side has sent a Pokémon in — a key that changes per switch-in. */
export const switchCounts = (lines = []) => {
    const counts = { p1: 0, p2: 0 };
    for (const line of lines) {
        const match = /^\|(switch|drag|replace)\|(p[12])/.exec(line);
        if (match) counts[match[2]] += 1;
    }
    return counts;
};

/** `137/186 par` → 74, `55/100` → 55, `0 fnt` → 0; null when there is no figure. */
const hpPctOf = (condition) => {
    const text = String(condition || '').trim();
    if (!text) return null;
    if (/\bfnt$/.test(text)) return 0;
    const [current, max] = text.split(' ')[0].split('/').map(Number);
    if (!Number.isFinite(current)) return null;
    return Math.max(0, Math.min(100, Math.round(max > 0 ? (100 * current) / max : current)));
};

/**
 * HP % per species of one side, as of these lines — from switches, damage,
 * heals and faints. The desktop rails draw it from the lines the playback has
 * shown, never from the latest request, which already knows how the turn ends.
 * A Pokémon not in the map has not come out yet: it is at full HP.
 * @returns {Map<string, number>}
 */
export const sideHp = (lines = [], side = 'p1') => {
    const names = new Map();
    const hp = new Map();
    for (const line of lines) {
        const parts = line.split('|');
        if (!parts[2]?.startsWith(side)) continue;
        const nickname = parts[2].split(': ')[1];
        const tag = parts[1];
        if (tag === 'switch' || tag === 'drag' || tag === 'replace') names.set(nickname, speciesOf(parts[3]));
        if (tag === 'detailschange') {
            // A Mega Evolution: the same Pokémon under its new species, as the request names it.
            const before = names.get(nickname);
            const after = speciesOf(parts[3]);
            names.set(nickname, after);
            if (before && hp.has(before)) {
                hp.set(after, hp.get(before));
                hp.delete(before);
            }
            continue;
        }
        const species = names.get(nickname);
        if (!species) continue;
        if (tag === 'faint') {
            hp.set(species, 0);
            continue;
        }
        const condition = tag === 'switch' || tag === 'drag' || tag === 'replace' ? parts[4]
            : tag === '-damage' || tag === '-heal' || tag === '-sethp' ? parts[3] : null;
        const pct = hpPctOf(condition);
        if (pct !== null) hp.set(species, pct);
    }
    return hp;
};

/**
 * Both teams for the desktop rails, as of `shown` (the lines the playback has
 * drawn): your six in team order from the latest request in `lines` — order
 * and species give nothing away — with HP and faints from `shown`; her six as
 * the dossier (`championRoster`, or `rosterOf(shown)` for a friend's team),
 * with HP once each is out.
 */
export const railTeams = (lines = [], lineup = [], shown = lines, rosterOf = null) => {
    const myHp = sideHp(shown, 'p1');
    const foeHp = sideHp(shown, 'p2');
    const mine = myRoster(lines).map(({ species }) => {
        const hpPct = myHp.has(species) ? myHp.get(species) : 100;
        return { species, hpPct, fainted: hpPct === 0 };
    });
    const foe = (rosterOf ? rosterOf(shown) : championRoster(shown, lineup)).map((mon) => ({
        ...mon,
        hpPct: mon.species && foeHp.has(mon.species) ? foeHp.get(mon.species) : 100,
    }));
    return { mine, foe };
};
