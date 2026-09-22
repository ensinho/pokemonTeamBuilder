import { describe, it, expect } from 'vitest';
import postcss from 'postcss';

import postcssHoverGate from './postcssHoverGate.mjs';

const run = (css) => postcss([postcssHoverGate()]).process(css, { from: undefined }).css;
// New nodes carry no source whitespace, so compare structure, not formatting.
const squash = (css) => css.replace(/\s+/g, ' ').replace(/\s*([{};])\s*/g, '$1').trim();

describe('postcssHoverGate', () => {
    it('moves a hover rule behind a fine-pointer query, in place', () => {
        const out = squash(run('.a { color: red; } .a:hover { color: blue; } .b { color: green; }'));
        expect(out).toBe(squash(`
            .a { color: red; }
            @media (hover: hover) and (pointer: fine) { .a:hover { color: blue; } }
            @media not all and (hover: hover) and (pointer: fine) { .a:active { color: blue; } }
            .b { color: green; }
        `));
    });

    it('splits a selector list, leaving the non-hover selectors ungated', () => {
        const out = squash(run('.a:hover, .a:focus-visible { background: blue; }'));
        expect(out).toBe(squash(`
            .a:focus-visible { background: blue; }
            @media (hover: hover) and (pointer: fine) { .a:hover { background: blue; } }
            @media not all and (hover: hover) and (pointer: fine) { .a:active { background: blue; } }
        `));
    });

    it('turns only fills and colours into a press — never transform or opacity', () => {
        const out = squash(run('.card:hover .media { transform: scale(1.04); opacity: 1; border-color: red; }'));
        expect(out).toContain(squash('.card:active .media { border-color: red; }'));
        expect(out).not.toMatch(/:active[^}]*transform/);
        expect(out).not.toMatch(/:active[^}]*opacity/);
    });

    it('emits no press rule when nothing in the hover is a fill or colour', () => {
        const out = run('.a:hover { transform: translateY(-2px); }');
        expect(out).not.toContain(':active');
        expect(out).toContain('@media (hover: hover) and (pointer: fine)');
    });

    it('leaves rules that are already hover-gated alone', () => {
        const css = '@media (hover: hover) and (pointer: fine) { .a:hover { color: blue; } }';
        expect(squash(run(css))).toBe(squash(css));
    });

    it('gates hover rules nested inside another media query', () => {
        const out = squash(run('@media (max-width: 640px) { .a:hover { color: blue; } }'));
        expect(out).toBe(squash(`
            @media (max-width: 640px) {
                @media (hover: hover) and (pointer: fine) { .a:hover { color: blue; } }
                @media not all and (hover: hover) and (pointer: fine) { .a:active { color: blue; } }
            }
        `));
    });

    it('does not touch keyframes or selectors that merely contain the letters', () => {
        const css = '.hovercard { color: red; } @keyframes hover { from { opacity: 0; } }';
        expect(squash(run(css))).toBe(squash(css));
    });
});
