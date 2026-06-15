/* eslint-disable react-refresh/only-export-components */
import React from 'react';

import { typeChart, typeColors, typeIcons } from '../../constants/types';
import { useTranslation } from '../../hooks/useTranslation';

const ALL_POKEMON_TYPES = Object.keys(typeIcons);

const toChartKey = (type) => type.charAt(0).toUpperCase() + type.slice(1);

export function getPokemonWeaknessEntries(defendingTypes = []) {
    if (!Array.isArray(defendingTypes) || defendingTypes.length === 0) {
        return [];
    }

    return ALL_POKEMON_TYPES
        .map((attackType) => {
            const multiplier = defendingTypes.reduce((product, defendingType) => {
                const damageTaken = typeChart[defendingType]?.damageTaken;
                return product * (damageTaken?.[toChartKey(attackType)] ?? 1);
            }, 1);

            return { type: attackType, multiplier };
        })
        .filter(({ multiplier }) => multiplier > 1)
        .sort((a, b) => b.multiplier - a.multiplier || a.type.localeCompare(b.type));
}

export function CompactStatBar({ stat, value }) {
    const formattedStat = stat.replace(/special-/g, 'sp. ').replace(/-/g, ' ');
    const width = `${Math.min(100, (value / 255) * 100)}%`;

    return (
        <div className="grid grid-cols-[3.9rem_minmax(0,1fr)_2rem] items-center gap-2 text-xs">
            <span className="truncate capitalize text-muted">
                {formattedStat}
            </span>
            <div className="h-2 rounded-full bg-surface-raised">
                <div className="h-full rounded-full bg-primary" style={{ width }} />
            </div>
            <span className="text-right font-bold font-mono text-fg">
                {value}
            </span>
        </div>
    );
}

export function WeaknessBadge({ type, multiplier }) {
    const { t } = useTranslation();
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold text-fg"
            style={{
                backgroundColor: `${typeColors[type]}18`,
                borderColor: `${typeColors[type]}33`,
            }}
        >
            <img src={typeIcons[type]} alt={type} className="h-4 w-4" />
            <span className="capitalize">{t(`types.${type.toLowerCase()}`, { defaultValue: type })}</span>
            <span className="text-danger font-mono font-bold">x{multiplier}</span>
        </span>
    );
}