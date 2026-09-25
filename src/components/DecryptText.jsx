import React, { useEffect, useState } from 'react';
import { decryptDuration, decryptFrame } from '../utils/decrypt';

const TICK_MS = 40;

function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/**
 * A name that decrypts into place — random letters resolving left to right,
 * the "Who's that Pokémon?" reveal (DecryptedText, React Bits). A v2 reward:
 * it plays only while `play` is true, which the caller sets from the user's own
 * winning guess — opening a day that was already solved shows the name still.
 * The display face is mono, so the scramble never changes the line's width.
 * Screen readers get the real text; the scramble is aria-hidden.
 */
export function DecryptText({ text, play = false, className = '' }) {
    const [frame, setFrame] = useState(() => ({ resolved: String(text ?? ''), noise: '' }));

    useEffect(() => {
        const full = String(text ?? '');
        if (!play || prefersReducedMotion()) {
            setFrame({ resolved: full, noise: '' });
            return undefined;
        }
        const total = Array.from(full).length;
        const duration = decryptDuration(full);
        const started = Date.now();
        setFrame(decryptFrame(full, 0));
        const id = window.setInterval(() => {
            const progress = (Date.now() - started) / duration;
            if (progress >= 1) {
                window.clearInterval(id);
                setFrame({ resolved: full, noise: '' });
                return;
            }
            setFrame(decryptFrame(full, progress * total));
        }, TICK_MS);
        return () => window.clearInterval(id);
    }, [text, play]);

    return (
        <span className={`decrypt-text ${className}`.trim()}>
            <span className="sr-only">{text}</span>
            <span aria-hidden="true">
                {frame.resolved}
                {frame.noise && <span className="decrypt-text__noise">{frame.noise}</span>}
            </span>
        </span>
    );
}
