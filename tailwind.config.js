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
                primary: 'var(--color-primary)',
                'primary-soft': 'var(--color-primary-soft)',
                accent: 'var(--color-accent)',
                'accent-soft': 'var(--color-accent-soft)',
                bg: 'var(--color-bg)',
                surface: 'var(--color-surface)',
                'surface-raised': 'var(--color-surface-raised)',
                fg: 'var(--color-fg)',
                muted: 'var(--color-muted)',
                border: 'var(--color-border)',
                success: 'var(--color-success)',
                danger: 'var(--color-danger)',
                warning: 'var(--color-warning)',
                info: 'var(--color-info)',
            },
            fontFamily: {
                // Main fonts
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                display: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                // Monospace & Detail fonts mapping to JetBrains Mono
                mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
                pixel: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            boxShadow: {
                'elevation-1': 'var(--elevation-1)',
                'elevation-2': 'var(--elevation-2)',
                'elevation-3': 'var(--elevation-3)',
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
            animation: {
                'fade-in': 'fade-in 0.2s ease-out forwards',
                'scale-in': 'scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                'slide-up': 'slide-up 0.3s ease-out forwards',
                shimmer: 'shimmer 1.5s infinite',
                'fade-in-out': 'fade-in-out 3s ease-out forwards',
            },
        },
    },
    plugins: [],
};
