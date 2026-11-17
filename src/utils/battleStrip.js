/**
 * The battle's comic strip (2026-11-17, "Fantasminha de plantão"): after a
 * Champion battle the mascot plays its three moments back in panels — how it
 * opened, the turn it turned on, how it ended — each with his face and the
 * battle's own line. Pure: the timeline in (`battleTimeline.toTimeline`), at
 * most three panels out.
 *
 * The panels travel to the Diário as part of `sharedChallenge` (`strip`):
 * species, move names, the kind of moment and his mood — the battle's own
 * words, never text a trainer typed. `readStrip` checks every field on the
 * way back.
 */

/**
 * His face for the moments a strip shows — `battleMood`'s own faces
 * (utils/mascot/assistant.js), kept here so this file stays light enough for
 * the share card and the server: rooting for the trainer, never gloating.
 */
const momentMood = (event, mySide) => {
    const mine = event?.side === mySide;
    switch (event?.type) {
        case 'mega':
        case 'tera':
        case 'zpower': return mine ? 'brilhando' : 'surpreso';
        case 'faint': return mine ? 'triste' : 'animado';
        case 'effect': return mine ? 'assustado' : 'empolgado';
        default: return 'concentrado';
    }
};

const TYPES = new Set(['intro', 'switch', 'move', 'effect', 'faint', 'mega', 'tera', 'zpower', 'end']);
const KINDS = new Set(['supereffective', 'crit', 'resisted', 'immune', 'miss']);
const NAME = /^[\p{L}\p{N} .'’:%-]{1,40}$/u;

/** The minimal event a panel needs to be worded again (`eventText`). */
const slim = (event) => {
    if (!event) return null;
    const out = { type: event.type, side: event.side === 'p2' ? 'p2' : 'p1' };
    if (event.species) out.species = String(event.species);
    if (event.move) out.move = String(event.move);
    if (event.kind) out.kind = event.kind;
    if (event.mega) out.mega = String(event.mega);
    if (event.teraType) out.teraType = String(event.teraType);
    return out;
};

/**
 * @param {object[]} events  the battle's timeline
 * @param {{ mySide?: string, won?: boolean }} opts
 * @returns {Array<{ mood: string, events: object[] }>}
 */
export function pickStrip(events = [], { mySide = 'p1', won = false } = {}) {
    const list = events.filter((e) => e && TYPES.has(e.type));
    if (!list.length) return [];
    const mine = (e) => e.side === mySide;
    const panels = [];

    // 1 · how it opened: her first Pokémon sent out
    const opening = list.find((e) => e.type === 'switch' && !mine(e) && !e.drag) || list.find((e) => e.type === 'intro');
    if (opening) panels.push({ mood: 'desafiador', events: [slim(opening)] });

    // 2 · the turn it turned on: the trainer's own gimmick, else the big hit
    //     on the side that lost, else the first knock-out
    const moveBefore = (index) => {
        for (let i = index - 1; i >= Math.max(0, index - 6); i -= 1) if (list[i].type === 'move') return list[i];
        return null;
    };
    let climax = null;
    const gimmick = list.findIndex((e) => ['mega', 'tera', 'zpower'].includes(e.type) && mine(e));
    if (gimmick >= 0) climax = { at: gimmick, events: [list[gimmick]] };
    if (!climax) {
        const hit = list.findIndex((e) => e.type === 'effect' && (e.kind === 'supereffective' || e.kind === 'crit') && (won ? !mine(e) : mine(e)));
        if (hit >= 0) climax = { at: hit, events: [moveBefore(hit), list[hit]].filter(Boolean) };
    }
    if (!climax) {
        const ko = list.findIndex((e) => e.type === 'faint');
        if (ko >= 0) climax = { at: ko, events: [moveBefore(ko), list[ko]].filter(Boolean) };
    }
    if (climax) {
        const key = climax.events[climax.events.length - 1];
        panels.push({ mood: momentMood(key, mySide), events: climax.events.map(slim) });
    }

    // 3 · how it ended
    const end = list.find((e) => e.type === 'end');
    if (end) panels.push({ mood: won ? 'radiante' : 'triste', events: [{ type: 'end', side: mySide, won: Boolean(won) }] });
    return panels;
}

/** The strip as `sharedChallenge.strip`: checked and clamped, or null. */
export function cleanStrip(panels) {
    if (!Array.isArray(panels)) return null;
    const out = panels.slice(0, 3).map((panel) => {
        if (!panel || typeof panel.mood !== 'string' || !/^[a-z]{2,20}$/.test(panel.mood)) return null;
        const events = (Array.isArray(panel.events) ? panel.events : []).slice(0, 2).map((e) => {
            if (!e || !TYPES.has(e.type)) return null;
            const clean = { type: e.type, side: e.side === 'p2' ? 'p2' : 'p1' };
            for (const field of ['species', 'move', 'mega', 'teraType']) {
                if (e[field] != null) {
                    if (typeof e[field] !== 'string' || !NAME.test(e[field])) return null;
                    clean[field] = e[field];
                }
            }
            if (e.kind != null) {
                if (!KINDS.has(e.kind)) return null;
                clean.kind = e.kind;
            }
            if (e.type === 'end') clean.won = e.won === true;
            return clean;
        });
        if (!events.length || events.some((e) => !e)) return null;
        return { mood: panel.mood, events };
    });
    return out.length && out.every(Boolean) ? out : null;
}

/** Read back from the forum: the same checks; what fails is not shown. */
export const readStrip = (raw) => cleanStrip(raw);

/**
 * The event `eventText` needs for a panel's line. An end carries `won`, so
 * the winner is named the way `eventText` expects.
 */
export const stripEvent = (event, championName) => (event.type === 'end'
    ? { type: 'end', winner: event.won ? '__trainer__' : championName }
    : event);
