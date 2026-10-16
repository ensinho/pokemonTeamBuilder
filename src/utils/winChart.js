/**
 * The Champion Challenge's post-battle chart, as pure data and geometry —
 * tested without a browser (`DsWinChart` draws it).
 *
 * `curve[i]` is the player's chance of winning after their i-th decision (0 is
 * the opening), computed by the server's M1 model with full information.
 * `marks[i]` says where that point was taken: the battle turn and how long the
 * player's log was — so what happened between two points is a slice of the log.
 */

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

/** Curve + marks → points. Marks are optional (older runs have none). */
export const toPoints = (curve = [], marks = null) => {
    const usable = Array.isArray(marks) && marks.length === curve.length;
    return curve.map((p, i) => ({
        i,
        p: clamp01(p),
        turn: usable ? marks[i].turn : null,
        line: usable ? marks[i].line : null,
    }));
};

/** Below this, no step is called a "swing" — the battle simply drifted. */
export const MIN_SWING = 0.08;

/** The step with the largest change in either direction: `{index, delta}` (index = the point after it), or null. */
export const biggestSwing = (points) => {
    let best = null;
    for (let i = 1; i < points.length; i += 1) {
        const delta = points[i].p - points[i - 1].p;
        if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { index: i, delta };
    }
    return best && Math.abs(best.delta) >= MIN_SWING ? best : null;
};

const sideOf = (ident = '') => ident.slice(0, 2);
const nameOf = (ident = '') => ident.replace(/^p\d[a-z]?:\s*/, '');
const hpFraction = (condition = '') => {
    if (/fnt/.test(condition)) return 0;
    const match = /^(\d+)\/(\d+)/.exec(condition);
    return match ? Number(match[1]) / Number(match[2]) : null;
};

/**
 * What caused the swing, read from the player's log between two points: the
 * first knockout (and the move before it), or else the move that took the
 * most HP. Each carries the battle turn it happened in.
 * @returns {{kind:'faint', target, targetSide, by, move, turn} | {kind:'move', by, move, turn} | null}
 */
export const swingCause = (lines = [], from = 0, to = lines.length, startTurn = null) => {
    let turn = startTurn;
    let lastMove = null;
    let hardest = null;
    let moveDamage = 0;
    const hp = new Map();
    // HP before the slice, so the first hit in it measures from the right place.
    for (const line of lines.slice(0, from)) {
        const parts = line.split('|');
        if (['switch', 'drag', 'replace', '-damage', '-heal'].includes(parts[1])) {
            const fraction = hpFraction(parts[parts[1] === '-damage' || parts[1] === '-heal' ? 3 : 4]);
            if (fraction !== null) hp.set(nameOf(parts[2]) + sideOf(parts[2]), fraction);
        }
    }
    const settle = () => {
        if (lastMove && moveDamage > (hardest?.damage ?? 0)) hardest = { ...lastMove, damage: moveDamage };
    };
    for (const line of lines.slice(from, to)) {
        const parts = line.split('|');
        const kind = parts[1];
        if (kind === 'turn') turn = Number(parts[2]);
        else if (kind === 'move') {
            settle();
            lastMove = { by: nameOf(parts[2]), bySide: sideOf(parts[2]), move: parts[3], turn };
            moveDamage = 0;
        } else if (kind === 'switch' || kind === 'drag' || kind === 'replace') {
            const fraction = hpFraction(parts[4]);
            if (fraction !== null) hp.set(nameOf(parts[2]) + sideOf(parts[2]), fraction);
        } else if (kind === '-damage' || kind === '-heal') {
            const key = nameOf(parts[2]) + sideOf(parts[2]);
            const now = hpFraction(parts[3]);
            const before = hp.get(key);
            if (kind === '-damage' && now !== null && before !== undefined) moveDamage += Math.max(0, before - now);
            if (now !== null) hp.set(key, now);
        } else if (kind === 'faint') {
            return {
                kind: 'faint',
                target: nameOf(parts[2]),
                targetSide: sideOf(parts[2]),
                by: lastMove && lastMove.bySide !== sideOf(parts[2]) ? lastMove.by : null,
                move: lastMove && lastMove.bySide !== sideOf(parts[2]) ? lastMove.move : null,
                turn,
            };
        }
    }
    settle();
    return hardest ? { kind: 'move', by: hardest.by, move: hardest.move, turn: hardest.turn } : null;
};

/**
 * Where everything sits in a `width × height` box (DS pixels), leaving `pad`
 * for the axis labels on the left: x per decision, y = chance (top = 100%).
 * `area` closes the curve against the 50% line, for the diverging fill.
 */
export const chartGeometry = (points, { width, height, left = 0, top = 0, right = 0, bottom = 0 }) => {
    const n = points.length;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const x = (i) => left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (p) => top + (1 - p) * plotH;
    const fmt = (v) => Math.round(v * 10) / 10;
    const line = points.map((pt, k) => `${k ? 'L' : 'M'}${fmt(x(pt.i))},${fmt(y(pt.p))}`).join('');
    const midY = y(0.5);
    const area = n ? `${line}L${fmt(x(points[n - 1].i))},${fmt(midY)}L${fmt(x(points[0].i))},${fmt(midY)}Z` : '';
    return { x, y, line, area, midY: fmt(midY), plotTop: top, plotBottom: top + plotH, plotLeft: left, plotRight: left + plotW };
};

/** The point nearest to an x position (for the crosshair). */
export const nearestIndex = (points, xPos, geometry) => {
    let best = 0;
    let bestDistance = Infinity;
    for (const pt of points) {
        const distance = Math.abs(geometry.x(pt.i) - xPos);
        if (distance < bestDistance) { best = pt.i; bestDistance = distance; }
    }
    return best;
};

export const percent = (p) => Math.round(clamp01(p) * 100);
