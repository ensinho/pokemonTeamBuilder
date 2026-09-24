import React, { useId } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { toggleThemeMode } from '../store/themeChoice';
import { themeModeOf } from '../constants/theme';
import { originFromEvent } from '../utils/themeTransition';
import { useTranslation } from '../hooks/useTranslation';

// Eight rays around a 5-unit disc on a 24-unit grid — Lucide's sun geometry,
// so the glyph sits with the header's other icons.
const RAYS = [
    'M12 1.4v2.4',
    'm20.3 3.7-2.5 2.5',
    'M22.6 12h-2.4',
    'm20.3 20.3-2.5-2.5',
    'M12 22.6v-2.4',
    'm3.7 20.3 2.5-2.5',
    'M1.4 12h2.4',
    'm3.7 3.7 2.5 2.5',
];

/**
 * The header's sun ⇄ moon. It shows the mode you are in — a moon at night — and
 * morphs into the other one when pressed, while the new theme spreads from the
 * button (design system v2; drawing adapted from toggles.dev "Classic", MIT).
 * Flips to the current theme's pair (THEME_PAIRS), never cycles all six.
 */
export function ThemeToggle({ className = '' }) {
    const { t } = useTranslation();
    const theme = useThemeStore((state) => state.theme);
    const clipId = `theme-toggle-bite-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
    const isDark = themeModeOf(theme) === 'dark';
    const label = isDark ? t('layout.switchToLight') : t('layout.switchToDark');

    return (
        <button
            type="button"
            onClick={(event) => toggleThemeMode(originFromEvent(event))}
            aria-label={label}
            title={label}
            className={`theme-toggle ${isDark ? 'is-dark' : ''} ${className}`.trim()}
        >
            <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
                <defs>
                    <clipPath id={clipId}>
                        <path className="theme-toggle__bite" d="M0 0h25a1 1 0 0010 10v14H0Z" />
                    </clipPath>
                </defs>
                <g stroke="currentColor" strokeLinecap="round">
                    <circle
                        className="theme-toggle__disc"
                        cx="12"
                        cy="12"
                        r="5"
                        fill="currentColor"
                        clipPath={`url(#${clipId})`}
                    />
                    {RAYS.map((d) => (
                        <path key={d} className="theme-toggle__ray" d={d} fill="none" strokeWidth="2" />
                    ))}
                </g>
            </svg>
        </button>
    );
}
