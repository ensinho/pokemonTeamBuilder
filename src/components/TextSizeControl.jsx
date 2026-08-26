import React from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { stepUiScale, isMinUiScale, isMaxUiScale, formatUiScale, DEFAULT_UI_SCALE } from '../utils/uiScale';

/**
 * A− / percentage / A+ stepper for the interface scale.
 *
 * Two shapes for two homes: `menu` inside the account popover (labelled row,
 * matching the theme and language sections) and `compact` in the page footer,
 * which is the one place a signed-out visitor can reach it.
 *
 * The percentage is also the reset: pressing it returns to 100%.
 */
export function TextSizeControl({ variant = 'menu' }) {
    const { t } = useTranslation();
    const uiScale = useThemeStore((state) => state.uiScale);
    const setUiScale = useThemeStore((state) => state.setUiScale);

    const applyScale = (nextScale) => {
        if (nextScale === uiScale) return;
        setUiScale(nextScale);
        // Signed-in trainers keep the choice across sessions on this account;
        // a no-op for guests, whose localStorage value is the whole story.
        useAuthStore.getState().savePreferences({ uiScale: nextScale });
    };

    const atMin = isMinUiScale(uiScale);
    const atMax = isMaxUiScale(uiScale);

    return (
        <div className={`text-size-control text-size-control--${variant}`} role="group" aria-label={t('textSize.label')}>
            <button
                type="button"
                onClick={() => applyScale(stepUiScale(uiScale, -1))}
                disabled={atMin}
                className="text-size-control__step"
                aria-label={t('textSize.decrease')}
                title={t('textSize.decrease')}
            >
                <span className="text-size-control__glyph text-size-control__glyph--small">A</span>
            </button>

            <button
                type="button"
                onClick={() => applyScale(DEFAULT_UI_SCALE)}
                className="text-size-control__value"
                aria-label={t('textSize.reset')}
                title={t('textSize.reset')}
            >
                {formatUiScale(uiScale)}
            </button>

            <button
                type="button"
                onClick={() => applyScale(stepUiScale(uiScale, 1))}
                disabled={atMax}
                className="text-size-control__step"
                aria-label={t('textSize.increase')}
                title={t('textSize.increase')}
            >
                <span className="text-size-control__glyph text-size-control__glyph--large">A</span>
            </button>
        </div>
    );
}
