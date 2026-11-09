/**
 * The Badge Case (2026-11-05, the Traveler's Home): the trainer is playing a
 * game on their console, and taps each gym badge as they win it there. The
 * Home shows the eight leaders of that game, the badges earned lit, the next
 * leader called out. Pure; stored as `badgeCase` (localStorage + the
 * preferences doc) by useAuthStore, the copy touched last winning whole.
 *
 * Shape: `{ game: '<gym-leaders.json key>' | null, earned: { [game]: [order…] }, updatedAt }`.
 */

export const EMPTY_BADGE_CASE = Object.freeze({ game: null, earned: {}, updatedAt: null });

/** The game a case shows before the trainer picks one. */
export const DEFAULT_BADGE_GAME = 'scarlet-violet';

const KEY = /^[a-z0-9-]{1,40}$/;

export function normalizeBadgeCase(raw) {
    const value = raw && typeof raw === 'object' ? raw : {};
    const earned = {};
    for (const [game, orders] of Object.entries(value.earned && typeof value.earned === 'object' ? value.earned : {})) {
        if (!KEY.test(game) || !Array.isArray(orders)) continue;
        const clean = [...new Set(orders.filter((n) => Number.isInteger(n) && n >= 1 && n <= 20))].sort((a, b) => a - b);
        if (clean.length) earned[game] = clean;
    }
    return {
        game: typeof value.game === 'string' && KEY.test(value.game) ? value.game : null,
        earned,
        updatedAt: Number.isFinite(value.updatedAt) && value.updatedAt > 0 ? value.updatedAt : null,
    };
}

/** Two copies (this device, the account): the one touched last, whole. */
export function mergeBadgeCases(local, remote) {
    const a = normalizeBadgeCase(local);
    const b = normalizeBadgeCase(remote);
    return (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
}

/** The eight a case holds: the leaders that give a badge, in order. */
export function caseLeaders(game) {
    const leaders = (game?.leaders || []).filter((l) => l && l.badge);
    return (leaders.length ? leaders : game?.leaders || []).slice(0, 8);
}

/** Toggle one badge of one game, stamping the change. */
export function toggleBadge(badgeCase, gameKey, order, now = Date.now()) {
    const current = normalizeBadgeCase(badgeCase);
    const had = current.earned[gameKey] || [];
    const next = had.includes(order) ? had.filter((n) => n !== order) : [...had, order].sort((a, b) => a - b);
    const earned = { ...current.earned };
    if (next.length) earned[gameKey] = next; else delete earned[gameKey];
    return { ...current, game: gameKey, earned, updatedAt: now };
}

/** Pick the game the case shows. */
export const chooseGame = (badgeCase, gameKey, now = Date.now()) => ({ ...normalizeBadgeCase(badgeCase), game: gameKey, updatedAt: now });

/** The first leader not beaten yet, or null when the case is full. */
export function nextLeader(leaders = [], earnedOrders = []) {
    return leaders.find((l) => !earnedOrders.includes(l.order)) || null;
}

/**
 * The game the case shows: the trainer's pick, else the default, else the
 * first listed; null while the list has not loaded. Shared by the Badge Case
 * and the Traveler's hero, so both always show the same game.
 */
export function caseGame(games = [], badgeCase) {
    return games.find((g) => g.key === badgeCase?.game)
        || games.find((g) => g.key === DEFAULT_BADGE_GAME)
        || games[0]
        || null;
}
