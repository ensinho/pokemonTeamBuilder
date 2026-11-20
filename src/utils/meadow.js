/**
 * The meadow (2026-11-17, "Fantasminha de plantão"): the friends as ghosts —
 * the dusk bot's row of small bots, each in the colour its trainer chose
 * (`publicProfiles.mascot`, Profile → Mascote) — standing in a pixel field
 * at dusk. Whoever played today is awake, with the day's games as pips over
 * the head; whoever has not is dozing, and can be poked (once a day).
 *
 * Pure, over what the Centre already reads (useCenterStore → friendActivity):
 * a Champion board, a PokéPuzzle row, a Diário post carrying a quiz, a tier
 * list or a day's receipt. A friend's quiz and tier list are only on their
 * device unless they posted them, so a pip there means "shared it".
 *
 * Dozing is not failing: the meadow keeps no count of who did not play.
 */

import { DAILY_GAMES } from './gamesToday.js';
import { TONES } from './mascot/constants.js';
import { COSTUMES } from './mascot/assistant.js';

export const MEADOW_MAX = 7;
export const POKES_KEY = 'ptb:pokes';

/** A friend's public mascot (`publicProfiles.mascot`), checked: `{ tone, hat }` or nulls. */
export function readPublicMascot(raw) {
    const tone = raw && (TONES.includes(raw.tone) || raw.tone === 'shiny') ? raw.tone : null;
    const hat = raw && COSTUMES.includes(raw.hat) ? raw.hat : null;
    return { tone, hat };
}

/** Which of the day's games an event shows this friend played. */
const gameOfEvent = (e) => {
    if (e.kind === 'champion') return ['challenge'];
    if (e.kind === 'puzzle') return ['pokepuzzle'];
    if (e.kind === 'post') {
        if (e.attachment === 'challenge') return ['challenge'];
        if (e.attachment === 'puzzle') return ['pokepuzzle'];
        if (e.attachment === 'quiz') return ['quiz'];
        if (e.attachment === 'tierlist') return ['tierList'];
        if (e.attachment === 'receipt') return DAILY_GAMES;
    }
    return [];
};

/** Parse an ISO string, YYYY-MM-DD day key, number, or Firestore Timestamp into ms (0 if invalid). */
const timestampMs = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'object' && typeof value.toMillis === 'function') {
        const ms = value.toMillis();
        return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') {
        return value.seconds * 1000;
    }
    const str = String(value).trim();
    if (!str) return 0;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const ms = Date.parse(`${str}T00:00:00Z`);
        return Number.isFinite(ms) ? ms : 0;
    }
    const ms = Date.parse(str);
    return Number.isFinite(ms) ? ms : 0;
};

/**
 * @param {object} p
 * @param {object[]} p.friends        useFriendsStore friends (public profiles)
 * @param {object[]} p.events         buildFriendActivity events
 * @param {string[]} p.todayKeys      today's day keys (local and the Champion's)
 * @param {number} [p.max]
 * @returns {{ ghosts: object[], more: number }}
 */
export function meadowRoster({ friends = [], events = [], todayKeys = [], max = MEADOW_MAX } = {}) {
    const days = new Set(todayKeys.filter(Boolean));
    const played = new Map();
    const lastEventAt = new Map();
    events.forEach((e) => {
        if (!e?.uid) return;
        const eventMs = Math.max(timestampMs(e.at), timestampMs(e.dayKey));
        if (eventMs > (lastEventAt.get(e.uid) || 0)) {
            lastEventAt.set(e.uid, eventMs);
        }
        const isToday = e.dayKey ? days.has(e.dayKey) : days.has(String(e.at || '').slice(0, 10));
        if (!isToday) return;
        const games = gameOfEvent(e);
        if (!games.length) return;
        const set = played.get(e.uid) || new Set();
        games.forEach((game) => set.add(game));
        played.set(e.uid, set);
    });
    const ghosts = friends
        .filter((f) => f?.userId)
        .map((f) => {
            const games = played.get(f.userId) || new Set();
            const lastActivityAt = Math.max(
                lastEventAt.get(f.userId) || 0,
                timestampMs(f.lastActiveAt),
                timestampMs(f.updatedAt),
                timestampMs(f.streak?.lastVisit),
            );
            return {
                uid: f.userId,
                name: f.displayName || null,
                ...readPublicMascot(f.mascot),
                games: Object.fromEntries(DAILY_GAMES.map((game) => [game, games.has(game)])),
                played: games.size,
                awake: games.size > 0,
                lastActivityAt,
                profile: f,
            };
        })
        // Awake today first (most recent activity first, then games played),
        // then sleeping friends ordered by most recent activity / streak.lastVisit / updatedAt,
        // falling back to name only as a tiebreaker.
        .sort((a, b) => (Number(b.awake) - Number(a.awake))
            || (b.lastActivityAt - a.lastActivityAt)
            || (b.played - a.played)
            || String(a.name || '').localeCompare(String(b.name || '')));
    return { ghosts: ghosts.slice(0, max), more: Math.max(0, ghosts.length - max) };
}

/** The pokes sent today, whatever was stored: `{ day, uids }`. */
export function normalizePokes(raw, day) {
    if (!raw || typeof raw !== 'object' || raw.day !== day || !Array.isArray(raw.uids)) return { day, uids: [] };
    return { day, uids: raw.uids.filter((uid) => typeof uid === 'string').slice(0, 200) };
}

export const pokedToday = (pokes, uid) => Boolean(pokes?.uids?.includes(uid));

export const withPoke = (pokes, uid) => (pokedToday(pokes, uid) ? pokes : { ...pokes, uids: [...pokes.uids, uid] });

/**
 * Where each ghost stands across the field (0–1): spread evenly, nudged off
 * the edges so a name label never leaves the scene.
 */
export const meadowSpots = (count) => Array.from({ length: count }, (_, i) => (count === 1 ? 0.5 : 0.1 + (0.8 * i) / (count - 1)));
