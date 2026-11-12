/**
 * The bot's controller (2026-11-11): the line mascot's `MascotStage` — taps,
 * the double-click spin, the Shadow Ball, petting, dragging, dozing off, the
 * shiny easter egg, the app's reactions — with the drawing swapped for the 3D
 * body (`utils/mascot/bot/frame.js`).
 *
 * What changes with a body:
 * - It is alive while it is on screen: the open-bot-avatar engine breathes,
 *   sways, blinks and lets its eyes wander every frame (one shared rAF loop,
 *   `ticker.js`; off screen, in a background tab or under reduced motion it
 *   stops and stays still).
 * - It looks with the whole body: the pointer anywhere on the page turns it
 *   (`pointerGaze` → the engine's eased `createAnimator`), for a few seconds
 *   after the pointer last moved, then it goes back to its own idle.
 * - Its mood moves the body too: joy hops, thinking tilts and looks up
 *   (`botMotion`), easing from one to the next.
 * - Dragged, it leans into the movement (the view turns with the velocity).
 */
import { MascotStage } from './stage.js';
import { addJob } from './ticker.js';
import { clamp } from '../../utils/mascot/rig.js';
import { botInner, botDefs, botMotion } from '../../utils/mascot/bot/frame.js';
import { RIG_SCALE } from '../../utils/mascot/bot/definition.js';
import { createAnimator } from '../../vendor/open-bot-avatar/animator.js';
import { pointerGaze } from '../../vendor/open-bot-avatar/follow.js';

const now = () => performance.now();
/** How long the body keeps following a pointer that stopped moving, ms. */
const FOLLOW_MS = 3500;
const EYES_Y = 30; // the rig's eye line
let seq = 0;

export class BotStage extends MascotStage {
    constructor(options) {
        super(options);
        const { getMotion, followPointer = true } = options;
        this.getMotion = getMotion || (() => 'idle');
        this.uid = `mb${(seq += 1)}-`;
        this.animator = createAnimator();
        this.t0 = now();
        this.client = null;
        this.svg.innerHTML = `<defs>${botDefs(this.uid)}</defs><g class="bot-frame"></g>`;
        this.host = this.svg.querySelector('.bot-frame');
        this.measure();

        // on screen again, or the tab back: the life resumes
        this.io?.disconnect();
        if (typeof IntersectionObserver !== 'undefined') {
            this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (this.visible) this.ensure(); });
            this.io.observe(this.wrapper);
        }
        this.onVisibility = () => { if (!document.hidden) this.ensure(); };
        document.addEventListener('visibilitychange', this.onVisibility);
        this.onResize = () => this.measure();
        window.addEventListener('resize', this.onResize, { passive: true });
        if (followPointer) {
            this.onWindowPointer = (e) => { this.client = { x: e.clientX, y: e.clientY, t: now() }; this.ensure(); };
            window.addEventListener('pointermove', this.onWindowPointer, { passive: true });
        }
        this.ensure();
    }

    destroy() {
        super.destroy();
        document.removeEventListener('visibilitychange', this.onVisibility);
        window.removeEventListener('resize', this.onResize);
        if (this.onWindowPointer) window.removeEventListener('pointermove', this.onWindowPointer);
    }

    /** CSS px per box unit (to drop sections closer than a pixel) and where the eyes sit in the box. */
    measure() {
        const w = this.svg.getBoundingClientRect?.().width || 240;
        this.pxPerUnit = (w / (this.vb[2] || 1)) / RIG_SCALE;
        this.origin = { x: (0 - this.vb[0]) / this.vb[2], y: (EYES_Y - this.vb[1]) / this.vb[3] };
    }

    lookLayer() { return null; }

    /** The engine blinks on its own clock (open eyes only); the line's ambient blink would double it. */
    layers(t, still) {
        this.blinkT0 = -1e9;
        return super.layers(t, still);
    }

    /** Alive while on screen; `frame()` itself stops when hidden. */
    busy() { return !this.reduced; }

    ensure() {
        if (this.destroyed) return;
        if (this.reduced) { this.renderStill(); return; }
        if (!this.stopJob) this.stopJob = addJob((t) => this.frame(t));
    }

    motion() {
        switch (this.mode) {
            case 'drag': case 'pet': return 'happy';
            case 'sleep': case 'yawn': case 'tired': case 'charge': case 'angry': case 'hidden': return 'idle';
            default: return this.reaction?.name === 'spin' ? 'happy' : this.getMotion();
        }
    }

    target(t) {
        if (this.mode === 'sleep' || this.mode === 'yawn' || this.mode === 'hidden') return null;
        const p = this.client;
        if (!p || (t - p.t > FOLLOW_MS && !this.ptr.in)) return null;
        const r = this.svg.getBoundingClientRect();
        return pointerGaze(p, { left: r.left, top: r.top, width: r.width, height: r.height }, this.origin);
    }

    draw(pose, frameT) {
        const t = now();
        // ~60 fps is all the motion needs: a 120/144 Hz screen would paint twice the markup for nothing
        if (frameT != null && t - (this.lastDraw || 0) < 15) return;
        this.lastDraw = t;
        const step = this.animator.step({ now: t, motion: this.motion(), target: this.target(t), hold: this.mode === 'drag', reducedMotion: this.reduced });
        const lean = this.mode === 'drag' ? { yaw: clamp(this.pos.vx * 0.03, -0.7, 0.7), pitch: clamp(-this.pos.vy * 0.015, -0.35, 0.35) } : undefined;
        this.host.innerHTML = botInner(pose, {
            time: (t - this.t0) / 1000,
            motion: this.motion(),
            gaze: step.gaze,
            motionBlend: step.motionBlend,
            view: lean,
            reducedMotion: this.reduced,
            uid: this.uid,
            pxPerUnit: this.pxPerUnit,
        });
    }
}

export { botMotion };
