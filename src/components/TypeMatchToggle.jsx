import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { TYPE_MATCH_ALL, TYPE_MATCH_ANY } from '../utils/typeFilter';

/**
 * How a multi-type selection reads: OR (any of them) or AND (all of them).
 *
 * Two types used to mean OR with no way to say otherwise, which made the common
 * "show me the Fire *and* Water ones" question unanswerable — the answer was
 * eight Pokémon buried in about 180. One control, next to the types it governs.
 */
export function TypeMatchToggle({ value, onChange, className = '' }) {
    const { t } = useTranslation();
    const active = value === TYPE_MATCH_ALL ? TYPE_MATCH_ALL : TYPE_MATCH_ANY;

    const options = [
        { mode: TYPE_MATCH_ANY, label: t('pokedex.typeMatchAny'), hint: t('pokedex.typeMatchAnyHint') },
        { mode: TYPE_MATCH_ALL, label: t('pokedex.typeMatchAll'), hint: t('pokedex.typeMatchAllHint') },
    ];

    return (
        <div
            className={`segmented type-match-toggle ${className}`.trim()}
            role="group"
            aria-label={t('pokedex.typeMatchLabel')}
        >
            {options.map(({ mode, label, hint }) => (
                <button
                    key={mode}
                    type="button"
                    onClick={() => onChange?.(mode)}
                    className="segmented__item"
                    aria-pressed={active === mode}
                    title={hint}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
