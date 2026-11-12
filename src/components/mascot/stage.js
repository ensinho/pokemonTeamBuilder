/**
 * The interactive mascot (2026-11-06): what happens when the trainer touches it.
 *
 * One controller per interactive mascot, imperative on purpose — pointer
 * input turns into frames written straight into the <svg>, no React render
 * per frame. It runs a frame loop only while something is moving (a hop, a
 * blink, the pointer over it, a drag); at rest the drawing is static and any
 * loop left (breathing, Zzz) is CSS.
 *
 * Like a Pokémon's status, it has one main state at a time (`mode`: idle,
 * asleep, charging a Shadow Ball, being dragged…) and volatile effects on top
 * (a blink, an ear twitch, a one-shot `reaction`). Every interactive mascot
 * looks at the pointer and answers a click; the `playground` (Profile, the
 * 404) also takes petting, a long press, a drag, and falls asleep when left
 * alone. Under reduced motion every state still changes — without travel.
 */
import { mascotInner, clamp } from '../../utils/mascot/rig.js';
import { merge, evalSeq, SEQ } from '../../utils/mascot/motion.js';
import { addJob, prefersReducedMotion } from './ticker.js';

const LOOKABLE = new Set(['idle', 'pet', 'tired']);
const now = () => performance.now();

export class MascotStage {
    constructor({ wrapper, svg, view, getBase, playground = false, idleMs = 25000, onBubble, onShiny }) {
        this.wrapper = wrapper; this.svg = svg; this.getBase = getBase; this.playground = playground; this.idleMs = idleMs;
        this.onBubble = onBubble || (() => {}); this.onShiny = onShiny || (() => {});
        this.vb = String(view).split(/\s+/).map(Number);
        this.mode = 'idle'; this.modeT0 = 0; this.reaction = null; this.shiny = false;
        this.ptr = { x: 0, y: 0, in: false }; this.look = { x: 0, y: 0, tilt: 0, ears: 0 };
        this.pos = { x: 0, y: 0, vx: 0, vy: 0 }; this.down = null;
        this.blinkT0 = -1e9; this.earT0 = -1e9; this.clicks = []; this.sparkClicks = [];
        this.rub = { dir: 0, acc: 0, strokes: [], lastX: null, pets: 0, tiredUntil: 0 };
        this.lastInput = now(); this.visible = true; this.stopJob = null; this.timers = new Set(); this.destroyed = false;
        this.reduced = prefersReducedMotion();
        this.listeners = [];
        this.bind();
        if (typeof IntersectionObserver !== 'undefined') {
            this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; });
            this.io.observe(wrapper);
        }
        this.ambient();
    }

    /* ---------- lifecycle ---------- */
    later(fn, ms) { const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms); this.timers.add(id); return id; }
    destroy() {
        this.destroyed = true;
        this.stopJob?.(); this.stopJob = null;
        for (const id of this.timers) clearTimeout(id);
        this.timers.clear();
        this.io?.disconnect();
        for (const [type, fn, opts] of this.listeners) this.wrapper.removeEventListener(type, fn, opts);
    }
    on(type, fn, opts) { this.wrapper.addEventListener(type, fn, opts); this.listeners.push([type, fn, opts]); }

    /** Blinks, ear twitches and (on the playground) dozing off, on a lazy timer — no frames in between. */
    ambient() {
        this.later(() => {
            const t = now();
            if (this.visible && !this.reduced && !document.hidden && this.mode === 'idle' && !this.down) {
                if (Math.random() < 0.8) this.blinkT0 = t; else this.earT0 = t;
                this.ensure();
            }
            if (this.playground && this.mode === 'idle' && !this.down && t - this.lastInput > this.idleMs) {
                this.setMode('yawn');
                this.later(() => { if (this.mode === 'yawn') this.setMode('sleep'); }, 1100);
            }
            this.ambient();
        }, 2500 + Math.random() * 3500);
    }

    /* ---------- state ---------- */
    setMode(mode, ms = 0) {
        this.mode = mode; this.modeT0 = now();
        this.wrapper.dataset.mode = mode;
        if (ms) this.later(() => { if (this.mode === mode) this.setMode('idle'); }, ms);
        this.ensure();
    }
    react(name, from = 0) {
        if (!SEQ[name]) return;
        if (name === 'shiny') this.shiny = true;
        if (this.reduced) { this.renderStill(); return; }
        this.reaction = { name, t0: now() - from };
        this.ensure();
    }
    poke() {
        this.lastInput = now();
        if (this.mode === 'sleep' || this.mode === 'yawn') { this.setMode('idle'); this.react('wake'); this.onBubble('wake'); }
    }

    /* ---------- drawing ---------- */
    layers(t, still) {
        const L = [];
        const mt = t - this.modeT0;
        switch (this.mode) {
            case 'yawn': L.push({ eyes: 'sleepy', mouth: 'yawn', sparks: 'none', earL: 8, earR: 8 }); break;
            case 'sleep': L.push({ eyes: 'sleepy', mouth: 'smallO', sparks: 'none', tiltSet: 22, earL: 10, earR: 10, fx: ['zzz'], y: 20 }); break;
            case 'charge': { const c = Math.min(1, mt / 1000); L.push({ paws: 'charge', prop: 'orb', propS: 0.2 + c * 1.3, propG: 0.5 + 0.5 * Math.sin(t / 60), eyes: 'determined', mouth: 'grit', crest: c, x: still ? 0 : Math.sin(t / 30) * 3 * c, sparks: 'triple' }); break; }
            case 'drag': { const v = Math.hypot(this.pos.vx, this.pos.vy), sy = 1 + Math.min(0.16, v * 0.004); L.push({ eyes: 'excited', mouth: 'big', sy, sx: 1 / Math.sqrt(sy), rot: clamp(this.pos.vx * 0.35, -14, 14), sparks: 'triple' }); break; }
            case 'hidden': L.push({ opacity: 0 }); break;
            case 'angry': L.push(still ? { eyes: 'angry', mouth: 'grit', crest: 1.2, earL: -18, earR: -18, fxHead: ['anger'], sparks: 'none' } : evalSeq('angry', mt)); break;
            case 'pet': L.push(still ? { eyes: 'calm', mouth: 'cat', blush: 'strong' } : evalSeq('pet', mt)); break;
            case 'tired': L.push({ eyes: 'flat', mouth: 'tiny', blush: 'strong', earL: 8, earR: 8 }); break;
            default: break;
        }
        if (this.shiny) L.push({ tone: 'shiny' });
        if (still) return L;
        L.push(this.lookLayer());
        if (t - this.blinkT0 < 220) L.push(evalSeq('blink', t - this.blinkT0));
        if (t - this.earT0 < 460) L.push(evalSeq('ear', t - this.earT0));
        if (this.reaction) {
            const s = SEQ[this.reaction.name], rt = t - this.reaction.t0;
            if (rt > s.dur) this.reaction = null; else L.push(evalSeq(this.reaction.name, rt));
        }
        L.push({ t, x: this.pos.x, y: this.pos.y });
        return L;
    }
    /** The face toward the pointer (the bot looks with its whole body instead: `BotStage`). */
    lookLayer() {
        const k = this.look;
        return k.x || k.y || k.tilt ? { faceX: k.x, faceY: k.y, tilt: k.tilt, earL: k.ears, earR: k.ears } : null;
    }
    /** Write a frame (`t` null: at rest). The bot overrides this one method to paint its body. */
    draw(pose) { this.svg.innerHTML = mascotInner(pose); }
    renderStill() { if (!this.destroyed) this.draw(merge(this.getBase(), ...this.layers(now(), true)), null); }

    busy(t) {
        const lookTarget = this.ptr.in && !this.down && LOOKABLE.has(this.mode);
        const settled = Math.abs(this.look.x) + Math.abs(this.look.y) + Math.abs(this.look.tilt) < 0.4;
        return Boolean(this.reaction || this.down || lookTarget || !settled || ['charge', 'drag', 'angry', 'pet'].includes(this.mode)
            || Math.abs(this.pos.x) + Math.abs(this.pos.y) > 0.5 || t - this.blinkT0 < 220 || t - this.earT0 < 460);
    }
    ensure() {
        if (this.destroyed) return;
        if (this.reduced) { this.renderStill(); return; }
        if (!this.stopJob) this.stopJob = addJob((t) => this.frame(t));
    }
    frame(t) {
        if (this.destroyed) return false;
        // ease the face toward the pointer (or back home)
        const lookable = this.ptr.in && !this.down && LOOKABLE.has(this.mode);
        const dx = this.ptr.x - this.pos.x, dy = this.ptr.y - this.pos.y;
        const target = lookable
            ? { x: clamp(dx * 0.045, -22, 22), y: clamp((dy + 120) * 0.03, -14, 14), tilt: clamp(dx * 0.012, -7, 7), ears: -5 }
            : { x: 0, y: 0, tilt: 0, ears: 0 };
        for (const k of ['x', 'y', 'tilt', 'ears']) {
            this.look[k] += (target[k] - this.look[k]) * 0.2;
            if (Math.abs(target[k] - this.look[k]) < 0.05) this.look[k] = target[k];
        }
        // drag follows the finger; let go and it springs home (semi-implicit Euler, under-damped)
        if (this.down?.drag) {
            const nx = this.pos.x + (this.down.tx - this.pos.x) * 0.22, ny = this.pos.y + (this.down.ty - this.pos.y) * 0.22;
            this.pos.vx = nx - this.pos.x; this.pos.vy = ny - this.pos.y; this.pos.x = nx; this.pos.y = ny;
        } else if (Math.abs(this.pos.x) + Math.abs(this.pos.y) > 0.5 || Math.abs(this.pos.vx) + Math.abs(this.pos.vy) > 0.5) {
            this.pos.vx = (this.pos.vx - this.pos.x * 0.06) * 0.82; this.pos.vy = (this.pos.vy - this.pos.y * 0.06) * 0.82;
            this.pos.x += this.pos.vx; this.pos.y += this.pos.vy;
        } else { this.pos = { x: 0, y: 0, vx: 0, vy: 0 }; }

        if (!this.visible || document.hidden) { this.stopJob = null; this.renderStill(); return false; }
        if (!this.busy(t)) { this.stopJob = null; this.renderStill(); return false; }
        this.draw(merge(this.getBase(), ...this.layers(t, false)), t);
        return true;
    }

    /* ---------- input ---------- */
    toRig(e) {
        const r = this.svg.getBoundingClientRect();
        return { x: this.vb[0] + ((e.clientX - r.left) / (r.width || 1)) * this.vb[2], y: this.vb[1] + ((e.clientY - r.top) / (r.height || 1)) * this.vb[3] };
    }
    zone(p) {
        const x = p.x - this.pos.x, y = p.y - this.pos.y;
        if (x > 100 && x < 310 && y > -440 && y < -250) return 'sparks';
        if (Math.abs(x) < 260 && y > -330 && y < -110) return 'top';
        if (Math.abs(x) > 130 && Math.abs(x) < 280 && y > 40 && y < 160) return 'cheek';
        if (Math.abs(x) < 110 && y > 90 && y < 240) return 'mouth';
        return null;
    }
    bind() {
        this.on('pointermove', (e) => {
            const p = this.toRig(e); this.ptr = { x: p.x, y: p.y, in: true }; this.poke();
            if (this.down) {
                const moved = Math.hypot(e.clientX - this.down.cx, e.clientY - this.down.cy);
                if (this.playground && !this.down.drag && !this.down.pet && this.mode !== 'charge' && moved > 8) {
                    this.down.drag = true; clearTimeout(this.down.lp); this.setMode('drag');
                }
                if (this.down.drag) { this.down.tx = p.x - this.down.ox; this.down.ty = p.y - this.down.oy; }
            }
            if (this.playground && ((!this.down && e.pointerType === 'mouse') || this.down?.pet)) this.rubAt(p);
            this.ensure();
        }, { passive: true });
        this.on('pointerleave', () => { this.ptr.in = false; this.rub.lastX = null; this.ensure(); }, { passive: true });
        this.on('pointerdown', (e) => {
            const p = this.toRig(e); this.poke();
            const z = this.zone(p);
            this.down = { cx: e.clientX, cy: e.clientY, ox: p.x - this.pos.x, oy: p.y - this.pos.y, tx: this.pos.x, ty: this.pos.y, drag: false, pet: e.pointerType !== 'mouse' && z === 'top', zone: z, lp: 0 };
            if (this.playground) {
                try { this.wrapper.setPointerCapture(e.pointerId); } catch { /* not capturable: fine */ }
                this.down.lp = setTimeout(() => { if (this.down && !this.down.drag && !this.down.pet) { this.setMode('charge'); this.onBubble('charge'); } }, 450);
            }
        });
        const up = (e) => {
            if (!this.down) return;
            clearTimeout(this.down.lp);
            const d = this.down; this.down = null;
            if (e.type === 'pointercancel') { if (this.mode === 'drag' || this.mode === 'charge') this.setMode('idle'); return; }
            if (this.mode === 'charge') { const held = now() - this.modeT0; this.setMode('idle'); this.react('charge', 1100); if (held > 700) this.onBubble('shadowBall'); return; }
            if (d.drag) { this.setMode('idle'); this.onBubble('again'); return; }
            if (d.pet) return;
            this.click(d.zone);
        };
        this.on('pointerup', up);
        this.on('pointercancel', up);
        this.on('dblclick', (e) => { e.preventDefault(); this.react('spin'); });
        if (this.playground) {
            this.on('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.poke(); if (e.shiftKey) this.react('spin'); else this.click(null); }
                else if (e.key === 'p' || e.key === 'P') { this.poke(); this.pet(); }
            });
        }
    }
    click(zone) {
        const t = now();
        if (this.mode === 'hidden') return;
        this.clicks = this.clicks.filter((c) => t - c < 2500); this.clicks.push(t);
        if (zone === 'sparks') {
            this.sparkClicks = this.sparkClicks.filter((c) => t - c < 2000); this.sparkClicks.push(t);
            if (this.sparkClicks.length >= 3) {
                this.sparkClicks = []; this.shiny = !this.shiny;
                if (this.shiny) { this.react('shiny'); this.onShiny(); this.onBubble('shiny'); } else { this.react('sparks'); this.onBubble('unshiny'); }
                return;
            }
        }
        if (this.clicks.length >= 8) {
            this.clicks = []; this.setMode('angry', 1300); this.onBubble('angry');
            this.later(() => { this.setMode('hidden', 1600); this.later(() => { this.react('shake'); this.onBubble('back'); }, 1650); }, 1300);
            return;
        }
        if (zone === 'mouth') { this.react('hop'); this.onBubble('bite'); return; }
        if (zone === 'cheek') { this.react('nod'); return; }
        this.react('hop');
    }
    pet() {
        const t = now();
        if (t < this.rub.tiredUntil) { this.onBubble('tired'); return; }
        this.rub.pets += 1;
        this.setMode('pet', 1800);
        if (this.rub.pets >= 5) {
            // the Refresh rule: affection has a ceiling, then he has had enough for a while
            this.rub.pets = 0; this.rub.tiredUntil = t + 20000;
            this.later(() => { this.setMode('tired', 2400); this.onBubble('tired'); }, 1800);
        } else this.onBubble(`pet${this.rub.pets}`);
    }
    rubAt(p) {
        if (this.zone(p) !== 'top' || this.mode === 'pet') { this.rub.lastX = this.zone(p) === 'top' ? p.x : null; return; }
        if (this.rub.lastX == null) { this.rub.lastX = p.x; return; }
        const dx = p.x - this.rub.lastX; this.rub.lastX = p.x;
        const dir = Math.sign(dx);
        if (!dir) return;
        const t = now();
        if (dir !== this.rub.dir) { if (Math.abs(this.rub.acc) > 40) this.rub.strokes.push(t); this.rub.dir = dir; this.rub.acc = 0; } else this.rub.acc += dx;
        this.rub.strokes = this.rub.strokes.filter((s) => t - s < 1400);
        if (this.rub.strokes.length >= 4) { this.rub.strokes = []; this.pet(); }
    }
}
