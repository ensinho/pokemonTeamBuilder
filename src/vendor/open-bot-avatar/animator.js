/**
 * The per-avatar state a live renderer keeps between frames, independent of
 * any platform: the eased look toward a target (follow.ts) and the eased
 * change between moods (mood.ts). Feed it once per frame; it returns the
 * `gaze` and `motionBlend` render options for that frame and whether it is
 * still easing.
 */
import { REST, followGaze, followStep } from './follow.js';
import { moodProgress, settleMood } from './mood.js';
export function createAnimator() {
    let follow = REST;
    let last = null;
    // The mood on screen and when its change began.
    let mood = null;
    return {
        step({ now, motion, target, hold = false, reducedMotion }) {
            const dt = last === null ? 0 : (now - last) / 1000;
            last = now;
            let moving = false;
            if (!hold)
                ({ state: follow, moving } = followStep(follow, target, dt, reducedMotion));
            // A new mood eases in from the pose on screen (a change under way included); reduced motion switches at once.
            if (mood && motion !== mood.motion) {
                const shown = { motion: mood.motion, blend: mood.blend && { from: mood.blend.from, t: moodProgress(now - mood.since) } };
                mood = { motion, blend: reducedMotion ? undefined : { from: settleMood(shown), t: 0 }, since: now };
            }
            mood ??= { motion, since: now };
            const t = reducedMotion ? 1 : moodProgress(now - mood.since);
            let motionBlend;
            if (mood.blend && t < 1)
                motionBlend = { from: mood.blend.from, t };
            else
                mood.blend = undefined;
            return { gaze: followGaze(follow), motionBlend, moving: moving || motionBlend !== undefined };
        },
        reset() {
            follow = REST;
            last = null;
            mood = null;
        },
    };
}
