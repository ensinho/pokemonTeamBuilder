import { Dex, toID } from '@pkmn/sim';

/**
 * What Cynthia has seen of the player — read only from her own channel of the
 * log (p2's view), which holds exactly what a player across the table would
 * see. This is the line that keeps the AI fair (invariant I5): an item,
 * ability or move of the player's counts as known only once a line here has
 * revealed it; everything else is a belief (`fog.js`).
 *
 * One pass over the log also yields the event list `memory.js` derives the
 * player's habits from, so the log is read once per decision.
 */

const SUBJECT = /^(p[12])[a-z]?: (.*)$/;

/** `'p1a: Pelipper'` → `{side: 'p1', name: 'Pelipper'}`. */
const parseSubject = (text) => {
    const match = SUBJECT.exec(String(text || '').trim());
    return match ? { side: match[1], name: match[2] } : null;
};

const tagValue = (parts, tag) => {
    const part = parts.find((p) => p.startsWith(`[${tag}]`));
    return part ? part.slice(tag.length + 2).trim() : null;
};

const emptyMon = (species) => ({
    species,
    moves: new Set(),
    item: null,
    itemKnown: false,
    ability: null,
    fainted: false,
    hpPct: 100,
    status: '',
});

/**
 * @param {string[]} lines p2's channel
 * @returns {Knowledge}
 */
export const knowledgeFrom = (lines = []) => {
    const nameToSpecies = { p1: new Map(), p2: new Map() };
    const foe = new Map();
    const foeOrder = [];
    const events = [];
    let foeTeamSize = 6;
    let myTeamSize = 6;
    let turn = 0;
    let activeFoe = null;
    let activeMine = null;
    let foeActiveFaintedSinceSwitch = true;
    let sleptByMe = null;

    const monOf = (subject) => {
        if (!subject || subject.side !== 'p1') return null;
        const species = nameToSpecies.p1.get(subject.name);
        return species ? foe.get(species) : null;
    };

    const revealFrom = (parts, subject) => {
        const from = tagValue(parts, 'from');
        if (!from) return;
        const owner = parseSubject(tagValue(parts, 'of')) || subject;
        const mon = monOf(owner);
        if (!mon) return;
        if (from.startsWith('item:')) {
            mon.item = toID(from.slice(5));
            mon.itemKnown = true;
        } else if (from.startsWith('ability:')) {
            mon.ability = toID(from.slice(8));
        }
    };

    for (const line of lines) {
        if (!line.startsWith('|')) continue;
        const parts = line.slice(1).split('|');
        const tag = parts[0];

        switch (tag) {
            case 'teamsize':
                if (parts[1] === 'p1') foeTeamSize = Number(parts[2]) || foeTeamSize;
                if (parts[1] === 'p2') myTeamSize = Number(parts[2]) || myTeamSize;
                break;
            case 'turn':
                turn = Number(parts[1]) || turn;
                events.push({ type: 'turn', turn });
                break;
            case 'switch':
            case 'drag':
            case 'replace': {
                const subject = parseSubject(parts[1]);
                if (!subject) break;
                const species = Dex.species.get(String(parts[2] || '').split(',')[0]).name;
                nameToSpecies[subject.side].set(subject.name, species);
                const hp = String(parts[3] || '').split(' ')[0];
                if (subject.side === 'p1') {
                    if (!foe.has(species)) {
                        foe.set(species, emptyMon(species));
                        foeOrder.push(species);
                    }
                    const mon = foe.get(species);
                    if (hp.includes('/')) mon.hpPct = Math.round((100 * Number(hp.split('/')[0])) / Number(hp.split('/')[1] || 100));
                    events.push({ type: 'switch', side: 'p1', species, turn, forced: foeActiveFaintedSinceSwitch || tag === 'drag', drag: tag === 'drag' });
                    activeFoe = species;
                    foeActiveFaintedSinceSwitch = false;
                } else {
                    events.push({ type: 'switch', side: 'p2', species, turn, forced: activeMine === null || tag === 'drag' });
                    activeMine = species;
                }
                break;
            }
            case 'faint': {
                const subject = parseSubject(parts[1]);
                if (!subject) break;
                const species = nameToSpecies[subject.side].get(subject.name);
                if (subject.side === 'p1') {
                    const mon = foe.get(species);
                    if (mon) { mon.fainted = true; mon.hpPct = 0; }
                    foeActiveFaintedSinceSwitch = true;
                } else {
                    activeMine = null;
                }
                events.push({ type: 'faint', side: subject.side, species, turn });
                break;
            }
            case 'move': {
                const subject = parseSubject(parts[1]);
                if (!subject) break;
                const moveId = toID(parts[2]);
                // Moves called by another move (Sleep Talk, Metronome) or a
                // locked repeat are still the player's moves, but a `[from]`
                // naming an *item* or *ability* is not a move choice.
                const from = tagValue(parts, 'from');
                if (subject.side === 'p1') {
                    const mon = monOf(subject);
                    if (mon && !(from && /^(item|ability):/.test(from))) mon.moves.add(moveId);
                }
                events.push({ type: 'move', side: subject.side, moveId, turn, locked: from === 'lockedmove' });
                break;
            }
            case '-damage':
            case '-heal':
            case '-sethp': {
                const subject = parseSubject(parts[1]);
                const mon = monOf(subject);
                const hp = String(parts[2] || '').split(' ')[0];
                if (mon && hp.includes('/')) mon.hpPct = Math.round((100 * Number(hp.split('/')[0])) / Number(hp.split('/')[1] || 100));
                if (mon && hp === '0') mon.hpPct = 0;
                revealFrom(parts, subject);
                break;
            }
            case '-status': {
                const subject = parseSubject(parts[1]);
                const mon = monOf(subject);
                if (mon) mon.status = parts[2];
                // Sleep Clause Mod: a sleep Cynthia caused (not the player's own Rest).
                if (subject?.side === 'p1' && parts[2] === 'slp' && tagValue(parts, 'from') !== 'move: Rest') {
                    sleptByMe = nameToSpecies.p1.get(subject.name) || null;
                }
                revealFrom(parts, subject);
                break;
            }
            case '-curestatus': {
                const subject = parseSubject(parts[1]);
                const mon = monOf(subject);
                if (mon) mon.status = '';
                if (subject?.side === 'p1' && parts[2] === 'slp' && sleptByMe === nameToSpecies.p1.get(subject.name)) sleptByMe = null;
                break;
            }
            case '-item': {
                const subject = parseSubject(parts[1]);
                const mon = monOf(subject);
                if (mon) { mon.item = toID(parts[2]); mon.itemKnown = true; }
                break;
            }
            case '-enditem': {
                const subject = parseSubject(parts[1]);
                const mon = monOf(subject);
                // Consumed or knocked off: known, and now gone.
                if (mon) { mon.item = ''; mon.itemKnown = true; }
                break;
            }
            case '-ability': {
                const subject = parseSubject(parts[1]);
                const mon = monOf(subject);
                if (mon) mon.ability = toID(parts[2]);
                revealFrom(parts, subject);
                break;
            }
            case '-boost':
            case '-unboost': {
                const subject = parseSubject(parts[1]);
                if (!subject) break;
                const amount = Number(parts[3]) || 0;
                events.push({ type: 'boost', side: subject.side, stat: parts[2], amount: tag === '-boost' ? amount : -amount, turn, from: tagValue(parts, 'from') });
                break;
            }
            default:
                // Field lines (`-weather`, `-fieldstart`…) have no subject but
                // may name the source: `[from] ability: Drizzle|[of] p1a: …`.
                revealFrom(parts, parseSubject(parts[1]));
        }
    }

    // A sleeper that fainted no longer holds the clause.
    if (sleptByMe && foe.get(sleptByMe)?.fainted) sleptByMe = null;

    const foeFainted = [...foe.values()].filter((mon) => mon.fainted).length;
    return {
        foe,
        foeOrder,
        foeTeamSize,
        myTeamSize,
        foeFainted,
        foeRemaining: Math.max(0, foeTeamSize - foeFainted),
        activeFoe,
        activeMine,
        turn,
        sleepClauseActive: Boolean(sleptByMe),
        events,
    };
};

/**
 * @typedef {object} Knowledge
 * @property {Map<string, {species, moves: Set<string>, item: ?string, itemKnown: boolean, ability: ?string, fainted: boolean, hpPct: number, status: string}>} foe
 * @property {string[]} foeOrder  species in the order they were first seen
 * @property {number} foeTeamSize
 * @property {number} foeFainted
 * @property {number} foeRemaining
 * @property {boolean} sleepClauseActive
 * @property {Array<object>} events  moves, switches, faints, boosts, turns — for memory.js
 */
