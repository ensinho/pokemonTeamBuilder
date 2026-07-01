import React from 'react';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';

// Pretty-print a Showdown/slug name for display.
export const pretty = (s = '') => String(s).replace(/-/g, ' ');

/**
 * A move name rendered as a compact chip, tinted by its type (with the type
 * icon) when a type is known. Falls back to a neutral chip otherwise.
 */
export function MoveChip({ name, type, className = '' }) {
    const color = type ? (typeColors[type] || null) : null;
    const style = color
        ? { color, backgroundColor: `${color}1a`, borderColor: `${color}55` }
        : undefined;
    return (
        <span
            className={`inline-flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${color ? '' : 'border-border bg-surface-raised text-fg'} ${className}`}
            style={style}
            title={pretty(name)}
        >
            {type && typeIcons[type] && <img src={typeIcons[type]} alt="" className="h-3 w-3 shrink-0" aria-hidden="true" />}
            <span className="truncate">{pretty(name)}</span>
        </span>
    );
}

// Percentage of a count over a total, clamped to a whole number 0–100.
export const pctOf = (count, total) => (total > 0 ? Math.round((count / total) * 100) : 0);

/**
 * A labelled horizontal percentage bar (pikalytics-style). `pct` drives the fill
 * width; `count` shows the raw frequency; `color` tints the fill.
 */
export function UsageBar({ label, icon, pct, count, color = 'var(--color-primary)', onClick, title }) {
    const Comp = onClick ? 'button' : 'div';
    return (
        <Comp
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            title={title}
            className={`group relative flex w-full items-center gap-2 overflow-hidden rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left ${onClick ? 'transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary' : ''}`}
        >
            <span
                className="absolute inset-y-0 left-0 rounded-lg opacity-15 transition-all"
                style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: color }}
                aria-hidden="true"
            />
            {icon && <span className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>}
            <span className="relative z-10 min-w-0 flex-1 truncate text-[12px] font-semibold capitalize text-fg">{label}</span>
            <span className="relative z-10 shrink-0 text-[11px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
            {count != null && <span className="relative z-10 shrink-0 text-[10px] tabular-nums text-muted">{count}</span>}
        </Comp>
    );
}

// A compact pixel sprite for a species id, with pokéball fallback.
export function MonSprite({ id, name, className = 'h-12 w-12 image-pixelated' }) {
    return (
        <img
            src={getPokemonFrontSpriteUrl(id)}
            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
            alt={name || ''}
            loading="lazy"
            className={className}
        />
    );
}

// Section wrapper matching the app's panel styling.
export function Panel({ title, icon, children, right }) {
    return (
        <section className="rounded-2xl border border-border bg-surface p-4">
            {(title || right) && (
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-1.5 text-sm font-bold text-fg">{icon}{title}</h2>
                    {right}
                </div>
            )}
            {children}
        </section>
    );
}
