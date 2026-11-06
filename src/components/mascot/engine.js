/**
 * The mascot's lazy chunk: the rig, the motion, the vocabulary and the
 * interactive controller. Loaded by `useMascotEngine` after first paint
 * (and warmed on idle by AppLayout), so the boot path pays only for the
 * static icon. See docs/modules/mascot.md.
 */
import { mascotInner } from '../../utils/mascot/rig.js';
import { merge, evalSeq, SEQ } from '../../utils/mascot/motion.js';
import { resolvePose, sizeTraits } from '../../utils/mascot/catalog.js';
import { addJob, prefersReducedMotion } from './ticker.js';

export { mascotInner, toneColor, VIEWS } from '../../utils/mascot/rig.js';
export { SEQ, keyFrame } from '../../utils/mascot/motion.js';
export { seasonalHat, isNight, personaTone } from '../../utils/mascot/catalog.js';
export { MascotStage } from './stage.js';

/**
 * The pose a component asks for: its mood and pose, a hat, any extra fields,
 * and then the size ladder on top — at 24 px the blush and fangs go no matter
 * what the mood wanted.
 */
export function buildPose({ px = 48, mood, pose, hat, extra } = {}) {
    return { ...resolvePose({ mood, pose }), ...(hat ? { hat } : {}), ...(extra || {}), ...sizeTraits(px) };
}

/**
 * Play a sequence once into an <svg> (a loop plays `loops` times), then put
 * the still drawing back. Returns a stop function. Reduced motion: nothing
 * moves; the caller's still drawing stays.
 */
export function playSequence(svg, getBase, name, { loops = 1, onDone } = {}) {
    const s = SEQ[name];
    if (!s || prefersReducedMotion()) { onDone?.(); return () => {}; }
    const t0 = performance.now();
    const total = s.kind === 'loop' ? s.dur * loops : s.dur;
    let stopped = false;
    const stop = addJob((t) => {
        if (stopped || !svg.isConnected) return false;
        const rt = t - t0;
        if (rt >= total) { svg.innerHTML = mascotInner(getBase()); onDone?.(); return false; }
        svg.innerHTML = mascotInner(merge(getBase(), { t }, evalSeq(name, rt)));
        return true;
    });
    return () => { stopped = true; stop(); };
}
