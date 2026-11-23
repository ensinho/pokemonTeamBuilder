/**
 * The app's living moments (2026-11-22, the "momentos vivos" pass — Enzo
 * approved the proposal): scenes that answer something the trainer just did,
 * in the franchise's own devices. Played by `<MomentLayer>` from
 * `useMomentStore`; the Champion Challenge's own way in and way out live in
 * utils/championMoments.js, the sign-out in the brand intro.
 *
 * - **Level up → the evolution screen:** the XP bar fills, the screen dims and
 *   the level's numeral does the evolution dance — its silhouette swapping
 *   between the old and the new figure faster and faster — until the flash;
 *   the new level lands in gold.
 * - **Full day → the fourth capture:** the last Poké Ball flies onto the belt
 *   and wobbles three times, clicks, the four light up in gold, and the day's
 *   receipt opens with its gold stamp.
 *
 * Pure: timings, the swap schedule and the keyframes built from them, so the
 * browser plays them (Web Animations) and the tests pin them.
 */
import { clamp01, sample, spring } from './brandIntro.js';

export const LEVEL_UP = Object.freeze({
    fill: 650,         // the bar fills to the top
    dim: 900,          // the screen dims, the evolution starts
    swapsFrom: 950,    // the first swap of the numerals
    swapsTo: 2550,     // no swap starts after this
    flash: 2560,       // the white flash peaks at LEVEL_UP.land
    land: 2700,        // the new level lands
    words: 2950,       // the headline and the reward rise
    done: 3600,        // everything is at rest
});

/**
 * When the numerals swap: the first after 330 ms, each next one 20% sooner,
 * never closer than 42 ms — the evolution's accelerating pulse.
 */
export function evolutionSwaps({ from = LEVEL_UP.swapsFrom, to = LEVEL_UP.swapsTo, first = 330, factor = 0.8, floor = 42 } = {}) {
    const swaps = [];
    let t = from;
    let gap = first;
    while (t < to) {
        swaps.push(Math.round(t));
        t += gap;
        gap = Math.max(floor, gap * factor);
    }
    return swaps;
}

/**
 * Opacity keyframes for the new level's numeral over the whole scene: hidden,
 * then shown on every odd swap, and shown for good from the landing. Steps,
 * not fades — a silhouette that flips. The old numeral takes the inverse.
 */
export function swapKeyframes({ newNumeral = true, total = LEVEL_UP.done } = {}) {
    const on = newNumeral ? 1 : 0;
    const off = 1 - on;
    const frames = [{ offset: 0, opacity: off, easing: 'step-end' }];
    evolutionSwaps().forEach((at, i) => {
        frames.push({ offset: at / total, opacity: i % 2 === 0 ? on : off, easing: 'step-end' });
    });
    frames.push({ offset: LEVEL_UP.land / total, opacity: on, easing: 'step-end' });
    frames.push({ offset: 1, opacity: on });
    return frames;
}

/** The new level's badge lands: from 150% back to its size on a spring. */
export function landFrames() {
    const duration = 900;
    return sample(duration, (t) => ({ transform: `scale(${t >= duration ? 1 : Math.round((1.5 - 0.5 * spring(t, 2.6, 0.42)) * 1000) / 1000})` }));
}

export const FULL_DAY = Object.freeze({
    fly: 0,            // the fourth ball flies onto the belt
    wobbles: [450, 820, 1190], // three wobbles, the capture's
    wobble: 240,
    click: 1480,       // the button flashes, the sparks
    gold: 1650,        // the four light up in gold, one after the other
    goldEach: 90,
    words: 1900,       // "Dia completo!"
    handover: 3000,    // the day's receipt opens with its stamp
});

/** The capture's wobble: three swings with a pause between them (rotation keyframes, ms → deg). */
export function wobbleFrames() {
    const total = FULL_DAY.wobbles[2] + FULL_DAY.wobble + 60;
    return sample(total, (t) => {
        let deg = 0;
        for (const at of FULL_DAY.wobbles) {
            const u = clamp01((t - at) / FULL_DAY.wobble);
            if (u > 0 && u < 1) deg += Math.sin(u * Math.PI * 2) * 22;
        }
        return { transform: `rotate(${Math.round(deg * 10) / 10}deg)` };
    }, 60);
}

/** Device record of the day whose full-day scene has played (a trainer key: wiped on sign-out). */
export const FULL_DAY_SHOWN_KEY = 'ptb:fullDayShown';
