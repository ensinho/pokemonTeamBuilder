/**
 * One requestAnimationFrame loop for every mascot that is moving, and none
 * when nothing is: a job returns `false` when it is done. Background tabs
 * stop rAF on their own, so a hidden tab costs nothing.
 */
const jobs = new Set();
let raf = 0;

function loop(now) {
    raf = 0;
    for (const job of [...jobs]) {
        let keep = false;
        try { keep = job(now) !== false; } catch { keep = false; }
        if (!keep) jobs.delete(job);
    }
    if (jobs.size) raf = requestAnimationFrame(loop);
}

export function addJob(job) {
    jobs.add(job);
    if (!raf) raf = requestAnimationFrame(loop);
    return () => { jobs.delete(job); };
}

export const prefersReducedMotion = () => typeof window !== 'undefined'
    && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
