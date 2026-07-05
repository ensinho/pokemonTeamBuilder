import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowUpRight, Info } from 'lucide-react';
import { getPokemonFrontSpriteUrl, resolveMegaPokemonEntry } from '../../utils/pokemonSprites';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useMegaStones } from '../../hooks/useMegaStones';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';
import { backLabelFor } from '../../utils/backNavigation';

// Pretty-print a Showdown/slug name for display.
export const pretty = (s = '') => String(s).replace(/-/g, ' ');

/**
 * A "back" handler that returns to wherever the user actually came from — the
 * same pattern as the move/ability/Pokémon detail pages. Prefers the origin URL
 * stashed in `location.state.from` (set by useEntityNavigate and detail links),
 * then plain history, and finally `fallback` on a cold deep link (router
 * `location.key` is the sentinel 'default') so the button never dead-ends.
 * Returns `{ goBack, backLabel }` — `backLabel` names the origin when known.
 */
export function useSmartBack(fallback, pt = false) {
    const navigate = useNavigate();
    const location = useLocation();
    const fromPath = location.state?.from || '';
    const goBack = React.useCallback(() => {
        if (fromPath) navigate(fromPath);
        else if (location.key && location.key !== 'default') navigate(-1);
        else navigate(fallback);
    }, [navigate, fromPath, location.key, fallback]);
    return { goBack, backLabel: backLabelFor(fromPath, pt) };
}

/**
 * A move name rendered as a compact chip, tinted by its type (with the type
 * icon) when a type is known. Falls back to a neutral chip otherwise.
 * Clicking opens the move's detail page (accepts slugs or Showdown names).
 */
export function MoveChip({ name, type, className = '' }) {
    const { goToMove } = useEntityNavigate();
    const color = type ? (typeColors[type] || null) : null;
    const style = color
        ? { color, backgroundColor: `${color}1a`, borderColor: `${color}55` }
        : undefined;
    return (
        <button
            type="button"
            onClick={(e) => goToMove(name, e)}
            className={`inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${color ? '' : 'border-border bg-surface-raised text-fg'} ${className}`}
            style={style}
            title={pretty(name)}
        >
            {type && typeIcons[type] && <img src={typeIcons[type]} alt="" className="h-3 w-3 shrink-0" aria-hidden="true" />}
            <span className="truncate">{pretty(name)}</span>
        </button>
    );
}

// Percentage of a count over a total, clamped to a whole number 0–100.
export const pctOf = (count, total) => (total > 0 ? Math.round((count / total) * 100) : 0);

// Format a compact usage EV spread ({hp,atk,def,spa,spd,spe}) → "4 HP / 252 Atk / 252 Spe".
const EV_SHORT = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
const EV_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const formatUsageSpread = (evs = {}) =>
    EV_KEYS.filter((k) => (evs[k] || 0) > 0).map((k) => `${evs[k]} ${EV_SHORT[k]}`).join(' / ');

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
            className={`rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-fg focus:border-primary focus:outline-none ${className}`}
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
 * A labelled horizontal percentage bar (pikalytics-style). `pct` drives the fill
 * width; `count` shows the raw frequency; `color` tints the fill. When used as a
 * button, `active` highlights the current selection and `trailing` renders an
 * affordance (e.g. a + / ✓ icon) at the end.
 */
export function UsageBar({ label, icon, pct, count, color = 'var(--color-primary)', onClick, title, active = false, trailing }) {
    const Comp = onClick ? 'button' : 'div';
    return (
        <Comp
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            title={title}
            aria-pressed={onClick ? active : undefined}
            className={`group relative flex w-full items-center gap-2 overflow-hidden rounded-lg border bg-surface px-2.5 py-1.5 text-left ${active ? 'border-primary ring-1 ring-primary/40' : 'border-border'} ${onClick ? 'transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary' : ''}`}
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
            {trailing && <span className="relative z-10 flex shrink-0 items-center justify-center">{trailing}</span>}
        </Comp>
    );
}

// Canonical credit links for the competitive datasets + design inspirations.
export const SOURCE_LINKS = {
    vgcpastes: { label: 'VGCPastes', url: 'https://docs.google.com/spreadsheets/d/1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw' },
    limitless: { label: 'Limitless TCG', url: 'https://play.limitlesstcg.com/tournaments' },
    smogon: { label: 'Smogon', url: 'https://www.smogon.com/' },
    pikalytics: { label: 'Pikalytics', url: 'https://www.pikalytics.com/' },
};

/**
 * A subtle, inline credit strip linking out to the data sources / inspirations.
 * `sources` picks which links to show (defaults to all).
 */
export function SourceCredit({ pt = false, sources = ['vgcpastes', 'smogon', 'limitless', 'pikalytics'], className = '' }) {
    const links = sources.map((k) => SOURCE_LINKS[k]).filter(Boolean);
    return (
        <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted ${className}`}>
            <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide opacity-70">
                <Info className="h-3 w-3" /> {pt ? 'Fontes' : 'Sources'}
            </span>
            {links.map((s, i) => (
                <React.Fragment key={s.url}>
                    {i > 0 && <span className="opacity-40" aria-hidden="true">·</span>}
                    <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 underline-offset-2 transition-colors hover:text-primary hover:underline"
                    >
                        {s.label}<ArrowUpRight className="h-2.5 w-2.5" />
                    </a>
                </React.Fragment>
            ))}
        </div>
    );
}

// A compact pixel sprite for a species id, with pokéball fallback.
export function MonSprite({ id, name, item, className = 'h-12 w-12 image-pixelated' }) {
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
