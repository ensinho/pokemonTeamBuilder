import React, { useState } from 'react';
import { useBattleDex, getBattleDex } from '../../../hooks/useBattleDex';
import { typeColors, typeIcons } from '../../../constants/types';
import { Shield, Zap, Target, Heart, Crosshair, Award, Package } from 'lucide-react';

const toID = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Move details for the tooltip, from public/data/battle-dex.json (built from
 * the sim by scripts/build-battle-dex.mjs — the sim itself never ships here).
 */
export function getMoveInfo(moveName, dex = getBattleDex()) {
    const row = moveName && dex?.moves?.[toID(moveName)];
    if (!row) return null;
    const [name, type, category, basePower, accuracy, pp, desc] = row;
    return {
        name,
        type: type || 'normal',
        category: category || 'Status',
        basePower: basePower || 0,
        accuracy: accuracy === true ? '100%' : (accuracy ? `${accuracy}%` : '—'),
        pp: pp || 0,
        desc: desc || 'No description available.',
    };
}

/**
 * Species details for the tooltip, from the same file.
 */
export function getSpeciesInfo(speciesName, dex = getBattleDex()) {
    const row = speciesName && dex?.species?.[toID(speciesName)];
    if (!row) return null;
    const [name, types, stats, abilities, heightm, weightkg] = row;
    const [hp, atk, def, spa, spd, spe] = stats || [];
    return {
        name,
        types: types || [],
        baseStats: { hp: hp || 0, atk: atk || 0, def: def || 0, spa: spa || 0, spd: spd || 0, spe: spe || 0 },
        abilities: abilities || [],
        heightm,
        weightkg,
    };
}

/**
 * Move Tooltip Mini-Card
 */
export function MoveTooltipCard({ moveName, currentPP, maxPP }) {
    const dex = useBattleDex();
    const info = getMoveInfo(moveName, dex);
    if (!info) return null;

    const tColor = typeColors[info.type] || '#A8A77A';
    const tIcon = typeIcons[info.type];

    return (
        <div className="battle-popover battle-popover--move">
            <div className="battle-popover__header">
                <div className="flex items-center gap-1.5">
                    {tIcon ? (
                        <img src={tIcon} alt={info.type} className="w-4 h-4 object-contain" />
                    ) : (
                        <span className="battle-popover__type-pill" style={{ backgroundColor: tColor }}>
                            {info.type}
                        </span>
                    )}
                    <span className="font-bold text-sm text-fg">{info.name}</span>
                </div>
                <span className={`battle-popover__category is-${info.category.toLowerCase()}`}>
                    {info.category}
                </span>
            </div>

            <div className="battle-popover__stats-row">
                <div className="battle-popover__stat-item">
                    <span className="battle-popover__stat-label">Power</span>
                    <span className="battle-popover__stat-value">{info.basePower || '—'}</span>
                </div>
                <div className="battle-popover__stat-item">
                    <span className="battle-popover__stat-label">Accuracy</span>
                    <span className="battle-popover__stat-value">{info.accuracy}</span>
                </div>
                <div className="battle-popover__stat-item">
                    <span className="battle-popover__stat-label">PP</span>
                    <span className="battle-popover__stat-value">
                        {currentPP != null ? `${currentPP}/${maxPP || info.pp}` : info.pp}
                    </span>
                </div>
            </div>

            <p className="battle-popover__desc">{info.desc}</p>
        </div>
    );
}

/**
 * Pokémon Tooltip Mini-Card
 */
export function MonTooltipCard({ speciesName, level = 50, hpCondition, status, item, ability, isMine = false, stats }) {
    const dex = useBattleDex();
    const spec = getSpeciesInfo(speciesName, dex);
    if (!spec) return null;

    // Calculate neutral level 50 benchmark stats if exact stats not provided
    const l50Stats = {
        hp: stats?.hp || Math.floor((2 * spec.baseStats.hp + 31) * 50 / 100) + 50 + 10,
        atk: stats?.atk || Math.floor((2 * spec.baseStats.atk + 31) * 50 / 100) + 5,
        def: stats?.def || Math.floor((2 * spec.baseStats.def + 31) * 50 / 100) + 5,
        spa: stats?.spa || Math.floor((2 * spec.baseStats.spa + 31) * 50 / 100) + 5,
        spd: stats?.spd || Math.floor((2 * spec.baseStats.spd + 31) * 50 / 100) + 5,
        spe: stats?.spe || Math.floor((2 * spec.baseStats.spe + 31) * 50 / 100) + 5,
    };

    const abilityText = isMine
        ? (ability || 'Unknown')
        : (ability ? `${ability} (Revealed)` : spec.abilities.join(' / '));

    const itemText = isMine
        ? (item || 'None')
        : (item ? `${item} (Revealed)` : 'Unrevealed');

    return (
        <div className="battle-popover battle-popover--mon">
            <div className="battle-popover__header">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-fg">{spec.name}</span>
                    {level && <span className="text-xs text-muted font-mono">L{level}</span>}
                    {!isMine && <span className="text-2xs text-muted uppercase font-bold bg-surface-raised px-1 py-0.5 rounded tracking-[0.06em]">Enemy</span>}
                </div>
                <div className="flex items-center gap-1">
                    {(spec.types || []).map((type) => {
                        const color = typeColors[type] || '#A8A77A';
                        const icon = typeIcons[type];
                        return (
                            <span
                                key={type}
                                className="battle-popover__type-chip flex items-center gap-1"
                                style={{ backgroundColor: `${color}25`, borderColor: color, color }}
                            >
                                {icon && <img src={icon} alt={type} className="w-3 h-3 object-contain" />}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="battle-popover__stats-grid">
                <div className="battle-popover__stat-cell">
                    <span className="battle-popover__stat-lbl">HP</span>
                    <span className="battle-popover__stat-num">{l50Stats.hp}</span>
                </div>
                <div className="battle-popover__stat-cell">
                    <span className="battle-popover__stat-lbl">ATK</span>
                    <span className="battle-popover__stat-num">{l50Stats.atk}</span>
                </div>
                <div className="battle-popover__stat-cell">
                    <span className="battle-popover__stat-lbl">DEF</span>
                    <span className="battle-popover__stat-num">{l50Stats.def}</span>
                </div>
                <div className="battle-popover__stat-cell">
                    <span className="battle-popover__stat-lbl">SPA</span>
                    <span className="battle-popover__stat-num">{l50Stats.spa}</span>
                </div>
                <div className="battle-popover__stat-cell">
                    <span className="battle-popover__stat-lbl">SPD</span>
                    <span className="battle-popover__stat-num">{l50Stats.spd}</span>
                </div>
                <div className="battle-popover__stat-cell">
                    <span className="battle-popover__stat-lbl">SPE</span>
                    <span className="battle-popover__stat-num">{l50Stats.spe}</span>
                </div>
            </div>

            {/* Details (Abilities, Items, Status) */}
            <div className="battle-popover__meta-list">
                <div className="battle-popover__meta-row">
                    <Award className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                    <span className="text-xs text-fg font-medium capitalize">
                        {abilityText}
                    </span>
                </div>
                <div className="battle-popover__meta-row">
                    <Package className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                    <span className="text-xs text-fg capitalize">{itemText}</span>
                </div>
                {status && (
                    <div className="battle-popover__meta-row">
                        <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-amber-400">{status}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Wrapper for interactive popover trigger
 */
export function TooltipTrigger({ children, tooltipContent, placement = 'top' }) {
    const [visible, setVisible] = useState(false);

    return (
        <div
            className="battle-tooltip-wrapper"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onClick={() => setVisible((prev) => !prev)}
        >
            {children}
            {visible && tooltipContent && (
                <div className={`battle-tooltip-portal is-${placement}`}>
                    {tooltipContent}
                </div>
            )}
        </div>
    );
}
