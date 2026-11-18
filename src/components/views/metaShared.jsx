import React, { memo } from 'react';
import { ArrowUpRight, Info } from 'lucide-react';
import { getPokemonFrontSpriteUrl, resolveMegaPokemonEntry } from '../../utils/pokemonSprites';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useMegaStones } from '../../hooks/useMegaStones';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';
import { pretty } from '../../utils/metaFormat';
import { toneInk, toneWash } from '../../utils/toneInk';
import '../../styles/meta-view.css';

/**
 * A move name rendered as a compact chip, tinted by its type (with the type
 * icon) when a type is known. Falls back to a borderless raised chip otherwise
 * so it never draws a nested border inside a card.
 * Clicking opens the move's detail page (accepts slugs or Showdown names).
 */
export const MoveChip = memo(function MoveChip({ name, type, className = '' }) {
    const { goToMove } = useEntityNavigate();
    const color = type ? (typeColors[type] || null) : null;
    const style = color
        ? { color: toneInk(color), backgroundColor: toneWash(color, 14), borderColor: toneWash(color, 45) }
        : undefined;
    return (
        <button
            type="button"
            onClick={(e) => goToMove(name, e)}
            className={`inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-2xs font-semibold capitalize transition-colors focus:outline-none ${color ? 'hover:opacity-80' : 'border-transparent bg-surface-raised text-fg hover:bg-surface-hover'} ${className}`}
            style={style}
            title={pretty(name)}
        >
            {type && typeIcons[type] && <img src={typeIcons[type]} alt="" className="h-3 w-3 shrink-0" aria-hidden="true" />}
            <span className="truncate">{pretty(name)}</span>
        </button>
    );
});

/**
 * The regulation / format selector shown on the Meta pages. Groups options by
 * their `group` (Smogon ladder family) via <optgroup>, so users can pick the
 * exact ruleset the usage numbers are drawn from.
 */
export function RegulationSelect({ formats = [], value, onChange, pt = false, className = '' }) {
    const groups = [];
    for (const f of formats) {
        let g = groups.find((x) => x.name === f.group);
        if (!g) { g = { name: f.group, items: [] }; groups.push(g); }
        g.items.push(f);
    }
    return (
        <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            aria-label={pt ? 'Regulamento' : 'Regulation'}
            className={`rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold text-fg focus:border-primary focus:outline-none ${className}`}
        >
            {groups.map((g) => (
                <optgroup key={g.name} label={g.name}>
                    {g.items.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </optgroup>
            ))}
        </select>
    );
}

/**
 * AffectUI-inspired horizontal proportion bar. `pct` drives the crisp track
 * width; `count` shows the raw frequency in tabular numerals; `color` sets
 * `--bar-tone` (mixed into theme tokens in CSS, never raw hex ink). Borderless
 * fill inside panels (0-1-2 containment); `active` uses an inset selection ring.
 */
export const UsageBar = memo(function UsageBar({
    label,
    icon,
    pct,
    count,
    color = 'var(--color-primary)',
    onClick,
    title,
    active = false,
    trailing,
}) {
    const Comp = onClick ? 'button' : 'div';
    const clampedPct = Math.min(Math.max(Number(pct) || 0, 2), 100);
    const formattedCount = typeof count === 'number' ? count.toLocaleString() : count;

    return (
        <Comp
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            title={title}
            aria-pressed={onClick ? active : undefined}
            className={`usage-bar ${active ? 'is-active' : ''}`}
            style={{ '--bar-tone': color }}
        >
            <span className="usage-bar__top">
                {icon && <span className="usage-bar__icon">{icon}</span>}
                <span className="usage-bar__label">{label}</span>
                <span className="usage-bar__pct">{pct}%</span>
                {formattedCount != null && <span className="usage-bar__count">{formattedCount}</span>}
                {trailing && <span className="usage-bar__trailing">{trailing}</span>}
            </span>
            <span className="usage-bar__track" aria-hidden="true">
                <span className="usage-bar__fill" style={{ width: `${clampedPct}%` }} />
            </span>
        </Comp>
    );
});

// Canonical credit links for the competitive datasets + design inspirations.
const SOURCE_LINKS = {
    vgcpastes: { label: 'VGCPastes', url: 'https://docs.google.com/spreadsheets/d/1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw' },
    limitless: { label: 'Limitless TCG', url: 'https://play.limitlesstcg.com/tournaments' },
    smogon: { label: 'Smogon', url: 'https://www.smogon.com/' },
    pikalytics: { label: 'Pikalytics', url: 'https://www.pikalytics.com/' },
};

/**
 * A subtle, inline credit strip linking out to the data sources / inspirations.
 * `sources` picks which links to show (defaults to all).
 */
export const SourceCredit = memo(function SourceCredit({ pt = false, sources = ['vgcpastes', 'smogon', 'limitless', 'pikalytics'], className = '' }) {
    const links = sources.map((k) => SOURCE_LINKS[k]).filter(Boolean);
    return (
        <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted ${className}`}>
            <span className="inline-flex items-center gap-1 font-medium">
                <Info className="h-3 w-3" aria-hidden="true" /> {pt ? 'Fontes' : 'Sources'}
            </span>
            {links.map((s, i) => (
                <React.Fragment key={s.url}>
                    {i > 0 && <span aria-hidden="true">·</span>}
                    <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="touch-target inline-flex items-center gap-0.5 underline-offset-2 transition-colors hover:text-primary hover:underline"
                    >
                        {s.label}<ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
                    </a>
                </React.Fragment>
            ))}
        </div>
    );
});

// A compact pixel sprite for a species id, with pokéball fallback.
export const MonSprite = memo(function MonSprite({ id, name, item, alt, className = 'h-12 w-12 image-pixelated' }) {
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const byStone = useMegaStones();

    let resolvedId = id;
    if (name || item) {
        const resolved = resolveMegaPokemonEntry({ id, name, item }, pokemonIndex, byStone);
        resolvedId = resolved.spriteId;
    }

    return (
        <img
            src={getPokemonFrontSpriteUrl(resolvedId)}
            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
            alt={alt !== undefined ? alt : (name || '')}
            loading="lazy"
            decoding="async"
            className={className}
        />
    );
});

// Section wrapper matching the app's 0-1-2 containment panel styling.
export function Panel({ title, icon, children, right, className = '' }) {
    return (
        <section className={`meta-panel ${className}`}>
            {(title || right) && (
                <div className="meta-panel__head">
                    <h2 className="meta-panel__title">{icon}{title}</h2>
                    {right}
                </div>
            )}
            {children}
        </section>
    );
}
