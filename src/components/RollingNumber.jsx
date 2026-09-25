import React from 'react';
import { splitRollingDigits } from '../utils/rollingDigits';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * A figure that rolls to its new value, odometer-style, when it changes while
 * on screen (design system v2; styles in interactions.css). It renders its
 * first value still — counting up on load is the template tell this avoids.
 *
 * Use it for numbers the user is *changing*: EVs left, a count that moves as
 * they pick. `format` turns the value into the displayed string; anything that
 * is not a digit (%, /, separators) is drawn still between the columns.
 */
export function RollingNumber({ value, format, className = '' }) {
    const text = format ? format(value) : String(value ?? '');
    const tokens = splitRollingDigits(text);

    return (
        <span className={`rolling-number ${className}`.trim()}>
            <span className="sr-only">{text}</span>
            {tokens.map((token) => (token.digit === null ? (
                <span key={token.key} aria-hidden="true">{token.char}</span>
            ) : (
                <span key={token.key} className="rolling-number__digit" aria-hidden="true">
                    <span className="rolling-number__sizer">{token.char}</span>
                    <span className="rolling-number__strip" style={{ '--digit': token.digit }}>
                        {DIGITS.map((digit) => <span key={digit}>{digit}</span>)}
                    </span>
                </span>
            )))}
        </span>
    );
}
