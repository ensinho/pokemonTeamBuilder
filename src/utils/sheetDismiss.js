// When does letting go of a dragged sheet close it?
//
// The same two rules every native sheet follows: it closes when it has been
// pulled far enough that the user plainly meant it (past a fraction of its own
// height), or when it was flicked down hard, however short the pull — a flick
// is the gesture, and making the user drag a tall sheet a third of the screen
// to dismiss it is what makes a web sheet feel stuck. Anything else springs
// back.

export const SHEET_DISMISS_FRACTION = 0.3;
export const SHEET_DISMISS_VELOCITY = 0.45; // px per ms, downward

/**
 * @param {object} gesture
 * @param {number} gesture.dy        how far down the sheet was pulled, px (≥ 0)
 * @param {number} gesture.height    the sheet's height, px
 * @param {number} gesture.velocity  release velocity, px/ms, positive = down
 */
export function shouldDismissSheet({ dy, height, velocity }) {
    if (!(dy > 0)) return false;
    if (velocity >= SHEET_DISMISS_VELOCITY) return true;
    if (!(height > 0)) return false;
    return dy >= height * SHEET_DISMISS_FRACTION;
}

/**
 * Release velocity from the last few touch samples, px/ms. Uses the oldest and
 * newest of the window so a single jittery frame cannot fake a flick.
 *
 * @param {{ y: number, t: number }[]} samples  oldest first
 */
export function releaseVelocity(samples) {
    if (!samples || samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = last.t - first.t;
    if (!(dt > 0)) return 0;
    return (last.y - first.y) / dt;
}

/**
 * The same rule sideways, for a toast swiped off either edge: far enough along
 * its own width, or flicked hard *in the direction it is travelling* — a flick
 * back toward the centre is the user changing their mind, not a dismissal.
 *
 * @param {object} gesture
 * @param {number} gesture.dx        signed horizontal travel, px
 * @param {number} gesture.width     the toast's width, px
 * @param {number} gesture.velocity  signed release velocity, px/ms
 */
export function shouldDismissSwipe({ dx, width, velocity }) {
    const direction = Math.sign(dx);
    if (direction === 0) return false;
    return shouldDismissSheet({ dy: Math.abs(dx), height: width, velocity: velocity * direction });
}
