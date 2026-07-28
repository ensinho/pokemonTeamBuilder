import React, { useState } from 'react';
import { Dex } from '@pkmn/sim';
import { typeColors, typeIcons } from '../../../constants/types';
import { Shield, Zap, Target, Heart, Crosshair, Award, Package } from 'lucide-react';

/**
 * Get cached/resolved move details from Showdown Dex
 */
export function getMoveInfo(moveName) {
    if (!moveName) return null;
    try {
        const move = Dex.moves.get(moveName);
        if (!move || !move.exists) return null;
        return {
            name: move.name,
            type: move.type ? move.type.toLowerCase() : 'normal',
            category: move.category || 'Status',
            basePower: move.basePower || 0,
            accuracy: move.accuracy === true ? '100%' : (move.accuracy ? `${move.accuracy}%` : '—'),
            pp: move.pp || 0,
            desc: move.shortDesc || move.desc || 'No description available.',
        };
    } catch (_) {
        return null;
    }
}

/**
 * Get cached/resolved species details from Showdown Dex
 */
export function getSpeciesInfo(speciesName) {
    if (!speciesName) return null;
    try {
        const spec = Dex.species.get(speciesName);
        if (!spec || !spec.exists) return null;
        return {
            name: spec.name,
            types: (spec.types || []).map((t) => t.toLowerCase()),
            baseStats: spec.baseStats || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            abilities: Object.values(spec.abilities || {}).filter(Boolean),
            heightm: spec.heightm,
            weightkg: spec.weightkg,
        };
    } catch (_) {
        return null;
    }
}

/**
 * Move Tooltip Mini-Card
 */
export function MoveTooltipCard({ moveName, currentPP, maxPP }) {
    const info = getMoveInfo(moveName);
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
    const spec = getSpeciesInfo(speciesName);
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
                    {!isMine && <span className="text-[10px] text-muted uppercase font-bold bg-surface-raised px-1 py-0.5 rounded">Enemy</span>}
                </div>
                <div className="flex items-center gap-1">
                    {spec.types.map((type) => {
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
                        <span className="text-xs font-bold text-amber-400 uppercase">{status}</span>
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
