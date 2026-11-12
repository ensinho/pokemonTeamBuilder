/**
 * The Home's "Rota do dia" (2026-11-12, Enzo approved the proposal): the
 * day's cards as a route — what is done becomes a stamp, the first thing
 * still to do is the one big card ("Agora"), the rest wait in line. The
 * size of a card comes from its state, never from a fixed grid.
 *
 * States, per card id:
 * - `live`    — someone waits on the trainer (a friend's battle): always Agora.
 * - `open`    — something to do today (the puzzle, the Champion, the meta read).
 * - `ambient` — a standing goal (the next badge): Agora only when nothing
 *               else is open, otherwise in line.
 * - `done`    — finished today: a stamp.
 * - absent    — not shown at all.
 */

/** Where the Champion's card stands in a persona's order: after the battles and the persona's first card. */
export function routeOrder(dayCards = [], { withChampion = true } = {}) {
    const order = dayCards.filter((id) => id !== 'champion');
    if (!withChampion) return order;
    const at = Math.min(order.length, order[0] === 'battles' ? 2 : 1);
    return [...order.slice(0, at), 'champion', ...order.slice(at)];
}

/**
 * Splits an ordered list of card ids by their states.
 * @returns {{ done: string[], now: string|null, next: string[] }}
 */
export function dayRoute(order = [], states = {}) {
    const shown = order.filter((id) => states[id]);
    const done = shown.filter((id) => states[id] === 'done');
    const now = shown.find((id) => states[id] === 'live')
        || shown.find((id) => states[id] === 'open')
        || shown.find((id) => states[id] === 'ambient')
        || null;
    const next = shown.filter((id) => id !== now && states[id] !== 'done');
    return { done, now, next };
}
