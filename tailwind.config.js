/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
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
                // Body — used everywhere by default via index.css setting on <html>.
                sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
                // Display — reserved for the brand mark / logo only.
                display: ["'Press Start 2P'", 'monospace'],
                // Legacy alias kept so existing `font-pixel` references still work.
                pixel: ["'Press Start 2P'", 'monospace'],
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
