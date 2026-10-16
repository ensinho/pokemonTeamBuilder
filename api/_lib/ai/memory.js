/**
 * The player's habits in this battle, derived from the log on every decision.
 *
 * There is no stored AI state: memory is recomputed from the same lines each
 * time, so the AI stays a pure function of its input (I3) and a replay never
 * needs it (I4).
 *
 * @param {import('./knowledge.js').Knowledge} knowledge
 */
export const memoryFrom = (knowledge) => {
    const { events, turn } = knowledge;
    const foeMoves = events.filter((e) => e.type === 'move' && e.side === 'p1');
    const foeVoluntarySwitches = events.filter((e) => e.type === 'switch' && e.side === 'p1' && !e.forced);
    const mySwitches = events.filter((e) => e.type === 'switch' && e.side === 'p2');
    const myVoluntarySwitches = mySwitches.filter((e) => !e.forced);
    const myMoves = events.filter((e) => e.type === 'move' && e.side === 'p2');

    // The same move on consecutive turns, counted back from the latest.
    let repeat = null;
    for (let i = foeMoves.length - 1; i >= 0; i -= 1) {
        const move = foeMoves[i];
        if (!repeat) {
            repeat = { moveId: move.moveId, count: 1, lastTurn: move.turn };
            continue;
        }
        if (move.moveId !== repeat.moveId || move.turn !== repeat.lastTurn - 1) break;
        repeat.count += 1;
        repeat.lastTurn = move.turn;
    }

    // Setup = the player raising its own stats with its own move.
    const setupCount = events.filter((e) => e.type === 'boost' && e.side === 'p1' && e.amount > 0 && !e.from).length;
    const lastMySwitch = mySwitches.length ? mySwitches[mySwitches.length - 1].turn : 0;
    const lastMyMove = myMoves.length ? myMoves[myMoves.length - 1] : null;

    return {
        turns: turn,
        switchRate: foeVoluntarySwitches.length / Math.max(1, turn - 1),
        foeSwitches: foeVoluntarySwitches.length,
        repeat: repeat && repeat.count >= 1 ? { moveId: repeat.moveId, count: repeat.count } : null,
        setupCount,
        lastFoeMove: foeMoves.length ? foeMoves[foeMoves.length - 1].moveId : null,
        lastMyMove: lastMyMove?.moveId || null,
        lastMyMoveTurn: lastMyMove?.turn ?? null,
        myVoluntarySwitches: myVoluntarySwitches.length,
        recentMySwitches: myVoluntarySwitches.filter((e) => e.turn >= turn - 2).length,
        turnsSinceMySwitch: turn - lastMySwitch,
        myFaints: events.filter((e) => e.type === 'faint' && e.side === 'p2').length,
        foeFaints: events.filter((e) => e.type === 'faint' && e.side === 'p1').length,
    };
};
