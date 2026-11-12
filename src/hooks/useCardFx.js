import { useEffect } from 'react';
import { typeColors } from '../constants/types';

/**
 * The Carta Holo (2026-11-12): the Home's cards behave like a holo-rare from
 * the trading card game. Enzo: "traga unicidade para estes cards… algo que
 * grite design UAU", with ruixen.com and obsidianui.dev as references.
 *
 * One delegated listener on `root` drives every `[data-fx]` card and the
 * `[data-fx-hero]` banner inside it — no per-card handlers, one frame at a
 * time (rAF). It only writes CSS custom properties and classes; the look is
 * styles/card-fx.css:
 * - on a fine pointer: `--fx-x/--fx-y` (the pointer, %) and `.is-fx-on` on
 *   the card under it (no tilt since Enzo's call, 2026-11-12); `--fx-px/--fx-py`
 *   (-1…1) on the hero for its parallax;
 * - on any pointer, a press: a Poké Ball capture ring and a burst of sparks
 *   in the card's type colour (`--tone`) at the press point — the trainer's
 *   own act, once (the design system's reward rule).
 * Under reduced motion nothing travels; the press keeps a still ring.
 */
const SPARKS = 10;
const FALLBACK_TONES = ['fire', 'water', 'grass', 'electric', 'psychic', 'dragon'].map((k) => typeColors[k]);

const reducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const finePointer = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches);

function burst(card, clientX, clientY) {
    const rect = card.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const layer = document.createElement('span');
    layer.className = 'fx-burst';
    layer.style.left = `${x}px`;
    layer.style.top = `${y}px`;
    layer.setAttribute('aria-hidden', 'true');
    const ring = document.createElement('span');
    ring.className = 'fx-burst__ring';
    layer.append(ring);
    if (!reducedMotion()) {
        const tone = getComputedStyle(card).getPropertyValue('--tone').trim();
        for (let i = 0; i < SPARKS; i += 1) {
            const spark = document.createElement('span');
            spark.className = 'fx-burst__spark';
            const angle = (360 / SPARKS) * i + (Math.random() * 24 - 12);
            spark.style.setProperty('--a', `${angle}deg`);
            spark.style.setProperty('--d', `${2.2 + Math.random() * 1.6}rem`);
            spark.style.setProperty('--c', tone || FALLBACK_TONES[i % FALLBACK_TONES.length]);
            layer.append(spark);
        }
    }
    card.append(layer);
    window.setTimeout(() => layer.remove(), 900);
}

/**
 * `rootRef` scopes the motor when it is mounted; until it is (a view that
 * renders a loading state first), the document is the root — `[data-fx]`
 * only exists where the Carta Holo is drawn, so either is safe.
 */
export function useCardFx(rootRef) {
    useEffect(() => {
        const root = rootRef?.current || document;
        let frame = 0;
        let pending = null;
        let current = null;
        let hero = null;

        const release = (el, cls) => {
            if (!el) return;
            el.classList.remove(cls);
            el.style.removeProperty('--fx-px');
            el.style.removeProperty('--fx-py');
        };

        const apply = () => {
            frame = 0;
            const e = pending;
            if (!e) return;
            const target = e.target instanceof Element ? e.target : null;
            const card = target?.closest('[data-fx]');
            const banner = target?.closest('[data-fx-hero]');
            if (card !== current) { release(current, 'is-fx-on'); current = card || null; }
            if (banner !== hero) { release(hero, 'is-fx-hero-on'); hero = banner || null; }
            if (current) {
                const r = current.getBoundingClientRect();
                const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
                const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
                current.style.setProperty('--fx-x', `${(x * 100).toFixed(1)}%`);
                current.style.setProperty('--fx-y', `${(y * 100).toFixed(1)}%`);
                current.classList.add('is-fx-on');
            }
            if (hero) {
                const r = hero.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width;
                const y = (e.clientY - r.top) / r.height;
                hero.style.setProperty('--fx-x', `${(x * 100).toFixed(1)}%`);
                hero.style.setProperty('--fx-y', `${(y * 100).toFixed(1)}%`);
                hero.style.setProperty('--fx-px', ((x - 0.5) * 2).toFixed(3));
                hero.style.setProperty('--fx-py', ((y - 0.5) * 2).toFixed(3));
                hero.classList.add('is-fx-hero-on');
            }
        };

        const onMove = (e) => {
            if (e.pointerType !== 'mouse' || reducedMotion() || !finePointer()) return;
            pending = e;
            if (!frame) frame = requestAnimationFrame(apply);
        };
        const onLeave = () => {
            pending = null;
            release(current, 'is-fx-on'); current = null;
            release(hero, 'is-fx-hero-on'); hero = null;
        };
        const onDown = (e) => {
            if (e.button !== 0) return;
            const card = e.target instanceof Element ? e.target.closest('[data-fx]') : null;
            if (!card) return;
            // a control inside the card (a menu, a team's name) is its own press
            if (e.target.closest('.home-tile__foot button, [aria-haspopup]')) return;
            burst(card, e.clientX, e.clientY);
        };

        root.addEventListener('pointermove', onMove, { passive: true });
        root.addEventListener('pointerleave', onLeave, { passive: true });
        // the pointer left the window: nothing stays lit
        const onOut = (e) => { if (!e.relatedTarget) onLeave(); };
        root.addEventListener('pointerout', onOut, { passive: true });
        root.addEventListener('pointerdown', onDown, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            root.removeEventListener('pointermove', onMove);
            root.removeEventListener('pointerleave', onLeave);
            root.removeEventListener('pointerout', onOut);
            root.removeEventListener('pointerdown', onDown);
            onLeave();
        };
    }, [rootRef]);
}

export default useCardFx;
