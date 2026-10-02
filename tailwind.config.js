/**
 * A theme colour that also answers Tailwind's opacity modifier.
 *
 * The colours are CSS variables holding hex values, which Tailwind 3 cannot
 * split into channels — so `bg-primary/15`, `hover:bg-surface-raised/60` or
 * `border-primary/40` compiled to *nothing at all*. 88 of them sat in the
 * components doing nothing: tinted badges with no tint, hover states with no
 * hover. Returning a function lets Tailwind hand us the opacity, and
 * `color-mix()` applies it to the variable at runtime, so it still follows the
 * theme. A plain `bg-primary` (no modifier) stays the bare variable.
 */
const themeColor = (name) => ({ opacityValue }) => {
    if (opacityValue === undefined || String(opacityValue).startsWith('var(')) {
        return `var(${name})`;
    }
    const pct = Math.round(parseFloat(opacityValue) * 1000) / 10;
    return `color-mix(in srgb, var(${name}) ${pct}%, transparent)`;
};

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        // Canonical responsive breakpoints — the single source of truth for the
        // whole app. These equal Tailwind's defaults (so no existing utility
        // changes), but declaring them explicitly documents intent and keeps
        // hand-written CSS media queries + src/constants/breakpoints.js in sync.
        //   sm  tablet portrait      md  tablet landscape
        //   lg  small laptop start   xl  desktop            2xl  large desktop
        screens: {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
        },
        extend: {
            // Semantic, theme-aware tokens. Backed by CSS variables defined
            // in src/index.css under :root[data-theme="..."]. Switching theme
            // is then a single attribute flip — no JS-driven inline styles
            // required for new code.
            colors: {
                primary: themeColor('--color-primary'),
                'primary-soft': themeColor('--color-primary-soft'),
                accent: themeColor('--color-accent'),
                'accent-soft': themeColor('--color-accent-soft'),
                bg: themeColor('--color-bg'),
                surface: themeColor('--color-surface'),
                'surface-raised': themeColor('--color-surface-raised'),
                // Interaction fills. Defined in index.css and already used by the
                // hand-written CSS; exposed here so Tailwind-only components
                // (the meta views) separate rows with a fill instead of
                // hand-rolling a tint — the drift the design system forbids.
                'surface-hover': themeColor('--color-surface-hover'),
                'surface-active': themeColor('--color-surface-active'),
                'on-primary': themeColor('--color-on-primary'),
                fg: themeColor('--color-fg'),
                // v3: the middle text step — reading text that is not a headline.
                'fg-secondary': themeColor('--color-fg-secondary'),
                muted: themeColor('--color-muted'),
                // v3: the neutral-inverted primary action (fg fill, surface ink).
                inverse: themeColor('--color-inverse'),
                'on-inverse': themeColor('--color-on-inverse'),
                border: themeColor('--color-border'),
                // The visible edge of a control, and the lifted segment of a
                // track — see the tokens' notes in src/index.css.
                'border-strong': themeColor('--color-border-strong'),
                'surface-elevated': themeColor('--color-surface-elevated'),
                success: themeColor('--color-success'),
                danger: themeColor('--color-danger'),
                warning: themeColor('--color-warning'),
                info: themeColor('--color-info'),
            },
            fontFamily: {
                // Main fonts
                sans: ['Space Grotesk', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                // `font-display` is the structural voice (JetBrains Mono), not a
                // second sans — see the typography note in src/index.css.
                display: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
                // Monospace & Detail fonts mapping to JetBrains Mono
                mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
                pixel: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            // ---- Design system v3: one scale for utilities and CSS -------------
            // Before v3, Tailwind's `text-sm` was 0.875rem while index.css's
            // `--text-sm` was 0.8125rem; `rounded-lg` was 8px while `--radius-md`
            // was 10px; `shadow-lg` was a black rgba tuned for a white page. A
            // component styled with utilities and one styled in CSS disagreed on
            // all three. These keys point the utilities at the tokens, so a size,
            // a corner or a shadow has one meaning in the whole app.
            fontSize: {
                '2xs': ['var(--text-2xs)', { lineHeight: '1.35' }],
                xs: ['var(--text-xs)', { lineHeight: '1.4' }],
                sm: ['var(--text-sm)', { lineHeight: '1.45' }],
                base: ['var(--text-base)', { lineHeight: '1.5' }],
                md: ['var(--text-md)', { lineHeight: '1.45' }],
                lg: ['var(--text-lg)', { lineHeight: '1.35' }],
                xl: ['var(--text-xl)', { lineHeight: '1.25' }],
                '2xl': ['var(--text-2xl)', { lineHeight: '1.15' }],
                '3xl': ['var(--text-3xl)', { lineHeight: '1.1' }],
            },
            // Three weights (see --weight-* in index.css). `bold` and heavier
            // resolve to semibold: 344 `font-bold`s made every screen shout.
            fontWeight: {
                normal: 'var(--weight-regular)',
                medium: 'var(--weight-medium)',
                semibold: 'var(--weight-semibold)',
                bold: 'var(--weight-semibold)',
                extrabold: 'var(--weight-semibold)',
                black: 'var(--weight-semibold)',
            },
            borderRadius: {
                DEFAULT: 'var(--radius-sm)',
                sm: 'var(--radius-sm)',
                md: 'var(--radius-sm)',
                lg: 'var(--radius-md)',
                xl: 'var(--radius-lg)',
                '2xl': 'var(--radius-lg)',
                '3xl': 'var(--radius-xl)',
                full: 'var(--radius-full)',
            },
            boxShadow: {
                DEFAULT: 'var(--shadow-sm)',
                sm: 'var(--shadow-sm)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
                xl: 'var(--shadow-xl)',
                '2xl': 'var(--shadow-xl)',
                inner: 'none',
                'elevation-1': 'var(--elevation-1)',
                'elevation-2': 'var(--elevation-2)',
                'elevation-3': 'var(--elevation-3)',
            },
            // `transition-all` animates layout too (width, padding…), which the
            // design system forbids; 65 utilities used it. It now means "every
            // visual property", the list the skill prescribes, on the house curve.
            transitionProperty: {
                all: 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter',
            },
            transitionTimingFunction: {
                DEFAULT: 'var(--ease-smooth)',
            },
            transitionDuration: {
                DEFAULT: 'var(--duration-fast)',
            },
            keyframes: {
                'fade-in': {
                    from: { opacity: '0', transform: 'scale(0.95)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                'scale-in': {
                    from: { opacity: '0', transform: 'scale(0.9)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                'slide-up': {
                    from: { opacity: '0', transform: 'translateY(20px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '100%': { transform: 'translateX(100%)' },
                },
                'fade-in-out': {
                    '0%': { opacity: '0', transform: 'translateY(-8px)' },
                    '15%, 85%': { opacity: '1', transform: 'translateY(0)' },
                    '100%': { opacity: '0', transform: 'translateY(-8px)' },
                },
            },
            // On the motion tokens: Tailwind's bare `ease-out` settles on a
            // different curve from every hand-written transition next to it.
            animation: {
                'fade-in': 'fade-in var(--duration-slow) var(--ease-out) forwards',
                'scale-in': 'scale-in var(--duration-slow) var(--ease-out) forwards',
                'slide-up': 'slide-up var(--duration-entrance) var(--ease-out) forwards',
                shimmer: 'shimmer 1.5s infinite',
                'fade-in-out': 'fade-in-out 3s var(--ease-out) forwards',
            },
        },
    },
    // `hover:` only where the device can hover. On a phone a hover state has no
    // "off": tapping a card left it highlighted until the next tap elsewhere,
    // which is website behaviour. Anything that is *hidden* until hover (e.g.
    // `opacity-0 group-hover:opacity-100`) is now invisible on touch — give it a
    // `[@media(hover:none)]:` state instead. See the design-system skill, Touch.
    future: {
        hoverOnlyWhenSupported: true,
    },
    plugins: [],
};
