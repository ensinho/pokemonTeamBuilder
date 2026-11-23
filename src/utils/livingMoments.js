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

/**
 * A friend battle's verdict (the VS card again, at the end): the band of the
 * trainer who won takes the screen, the other loses its colour and its
 * portrait falls; "VITÓRIA" only for your own win. Only for a battle that just
 * played to its end on this screen — never a replay, never a result opened
 * later, never a tie.
 * @param {'won'|'lost'|'tie'|'forfeitWon'|'forfeitLost'|null} outcome
 * @returns {'win'|'loss'|null}
 */
export function pvpVerdict(outcome, { playedHere = false, replay = false } = {}) {
    if (!playedHere || replay) return null;
    if (outcome === 'won' || outcome === 'forfeitWon') return 'win';
    if (outcome === 'lost' || outcome === 'forfeitLost') return 'loss';
    return null;
}

/** The verdict card's length: the bands, the fall, the word (ms). */
export const VERDICT_MS = 3300;

export const CARD_PRINT = Object.freeze({
    slide: 0,          // the card comes out of the slot
    pixels: 650,       // the banner fills in, cell by cell
    pixelsRun: 1000,
    name: 1700,        // the name types itself
    nameRun: 520,
    facts: 2300,       // persona and level
    gold: 2700,        // the one gold pixel: "training since"
    done: 3100,
});

/**
 * The order the banner's cells light up in: a permutation of 0…count-1 drawn
 * from the trainer's own seed, so no two trainers see the same sequence.
 * Returns each cell's delay in ms from the card's start.
 */
export function printDelays(count, seed) {
    let h = 2166136261;
    for (const ch of String(seed || 'trainer')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rand = () => {
        h = Math.imul(h ^ (h >>> 15), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    };
    const order = Array.from({ length: count }, (_, i) => i);
    for (let i = count - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    const delays = new Array(count);
    order.forEach((cell, rank) => { delays[cell] = Math.round(CARD_PRINT.pixels + (count > 1 ? rank / (count - 1) : 0) * CARD_PRINT.pixelsRun); });
    return delays;
}

export const BADGE_CASE = Object.freeze({
    spin: 0,           // the badge turns in the air as it comes down
    spinRun: 1100,
    land: 1100,        // it seats in its socket, squashing
    light: 1180,       // the socket lights gold, a ring goes out
    shine: 1500,       // one shine across the badge
    shineRun: 600,
    words: 1350,       // name and description rise
});

/** The badge's descent: two turns in 3D while it drops into its socket, slowing as it seats. */
export function badgeSpinFrames() {
    return sample(BADGE_CASE.spinRun, (t) => {
        const p = t / BADGE_CASE.spinRun;
        const ease = 1 - (1 - p) ** 3;
        return {
            transform: `translateY(${Math.round((1 - ease) * -2.5 * 100) / 100}rem) rotateY(${Math.round(720 * ease)}deg) scale(${Math.round((1.35 - 0.35 * ease) * 1000) / 1000})`,
            opacity: Math.min(1, p * 4),
        };
    });
}

/** The seat: squashed wide on contact, back to round on a spring. */
export function seatFrames() {
    return sample(520, (t) => {
        const s = t >= 520 ? 1 : spring(t, 3.2, 0.38);
        return { transform: `scale(${Math.round((1.22 - 0.22 * s) * 1000) / 1000}, ${Math.round((0.8 + 0.2 * s) * 1000) / 1000})` };
    });
}

export const TEAM_SAVED = Object.freeze({
    first: 200,        // the first Pokémon turns to red light
    each: 70,          // and each next one
    red: 120,          // red, then
    shrink: 180,       // into its ball
    fly: 420,          // the ball's arc into the box
    lidOpen: 220,
    settle: 260,       // after the last ball lands, the lid closes
    done: 2600,
});

/** When the n-th ball lands in the box (ms from the scene's start). */
export const teamBallLands = (index) => TEAM_SAVED.first + index * TEAM_SAVED.each + TEAM_SAVED.red + TEAM_SAVED.shrink + TEAM_SAVED.fly;

/** A ball's arc from where its Pokémon stood to the box: (dx, dy) px, rising `lift` px on the way. */
export function arcFrames(dx, dy, lift = 120) {
    return sample(TEAM_SAVED.fly, (t) => {
        const p = t / TEAM_SAVED.fly;
        const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        const x = Math.round(dx * e * 10) / 10;
        const y = Math.round((dy * e - lift * Math.sin(Math.PI * p)) * 10) / 10;
        return { transform: `translate(${x}px, ${y}px) rotate(${Math.round(540 * p)}deg) scale(${Math.round((1 - 0.45 * p) * 1000) / 1000})` };
    });
}
