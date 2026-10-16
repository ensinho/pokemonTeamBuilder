import { useEffect, useRef, useState } from 'react';

import { play } from '../../../../utils/challengeSfx';

/**
 * The DS text box: the line types itself out, a blinking arrow says there is
 * more, and a tap (or A) moves on — the first press finishes the line, the
 * next one advances, as in the games. Real text — readable by screen readers
 * (`aria-live`) and translated like any other copy. With reduced motion the
 * line appears whole.
 *
 * `advanceRef` receives the same press, for the console's A button.
 * `variant`: 'box' (a dialogue box), 'band' (the BW battle message across a
 * phone's top screen) or 'hud' (the message slot of the desktop strip).
 */
export function DsTextBox({
    text, speaker = null, showArrow = false, onAdvance, advanceRef, reducedMotion = false, msPerChar = 16, blip = false, variant = 'box',
}) {
    const [count, setCount] = useState(reducedMotion ? Infinity : 0);
    const timerRef = useRef(null);

    useEffect(() => {
        if (reducedMotion || !text) {
            setCount(Infinity);
            return undefined;
        }
        setCount(0);
        let n = 0;
        timerRef.current = setInterval(() => {
            n += 1;
            setCount(n);
            if (blip && text[n - 1] !== ' ') play('textBlip');
            if (n >= text.length) clearInterval(timerRef.current);
        }, msPerChar);
        return () => clearInterval(timerRef.current);
    }, [text, reducedMotion, msPerChar, blip]);

    const done = count >= (text?.length || 0);
    const visible = text ? text.slice(0, count) : '';

    const advance = () => {
        if (!done) {
            // Stop the typewriter too, or its next tick takes the line back.
            clearInterval(timerRef.current);
            setCount(Infinity);
        } else {
            onAdvance?.();
        }
    };
    if (advanceRef) advanceRef.current = advance;

    return (
        <button type="button" className={`ds-textbox is-${variant}`} onClick={advance} aria-label={text || ''} tabIndex={onAdvance ? 0 : -1}>
            <span className="ds-textbox__inner" aria-live="polite">
                {speaker && <span className="ds-textbox__speaker">{speaker}</span>}
                <span className="ds-textbox__text">
                    {visible}
                    {/* Keeps the box from re-wrapping as letters appear. */}
                    <span className="ds-textbox__ghost" aria-hidden="true">{text?.slice(visible.length)}</span>
                </span>
                {showArrow && done && <span className="ds-textbox__arrow" aria-hidden="true">▼</span>}
            </span>
        </button>
    );
}
