import React from 'react';
import { Trophy, ShieldCheck, Sparkles } from 'lucide-react';

import { coreIconFor } from './coreIcons';
import { CORES } from '../utils/metaCores';
import { useTranslation } from '../hooks/useTranslation';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../constants/theme';

const ACCENT = Object.fromEntries(CORES.map((c) => [c.id, c.accent]));
const pretty = (s = '') => s.replace(/-/g, ' ');

// Icon + colour that identify WHY a Pokémon is suggested (by ability/core,
// tournament partner, or type coverage).
function reasonVisual(reason) {
    if (reason?.kind === 'ability') return { Icon: coreIconFor(reason.coreId), color: ACCENT[reason.coreId] || 'var(--color-primary)' };
    if (reason?.kind === 'partner') return { Icon: Trophy, color: 'var(--color-primary)' };
    if (reason?.kind === 'type') return { Icon: ShieldCheck, color: '#38bdf8' };
    return { Icon: Sparkles, color: 'var(--color-primary)' };
}

/**
 * Horizontal strip of team-aware synergy picks. Each card carries a small badge
 * identifying the reason (ability/core, tournament partner, type coverage), so a
 * suggestion reads as "Excadrill — Sand: Sand Rush" rather than an opaque list.
 */
export function SynergySuggestions({ suggestions = [], onAdd, disabled = false }) {
    const { language } = useTranslation();
    const pt = language === 'pt';
    if (!suggestions.length) return null;

    return (
        <div className="mt-3">
            <div className="mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{pt ? 'Sinergia' : 'Synergy picks'}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {suggestions.map((s) => {
                    const { Icon, color } = reasonVisual(s.primary);
                    const reasonText = s.reasons.map((r) => r.label).join(' · ');
                    return (
                        <button
                            key={s.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => onAdd?.(s)}
                            title={`${pretty(s.name)} — ${reasonText}`}
                            className="group relative flex w-[4.75rem] shrink-0 flex-col items-center gap-0.5 rounded-lg border border-border bg-bg p-1.5 transition-all hover:-translate-y-0.5 hover:border-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-surface" style={{ backgroundColor: color }}>
                                <Icon className="h-2.5 w-2.5 text-white" />
                            </span>
                            <img
                                src={getPokemonFrontSpriteUrl(s.id)}
                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                alt=""
                                aria-hidden="true"
                                loading="lazy"
                                className="h-9 w-9 image-pixelated"
                            />
                            <span className="w-full truncate text-center text-[9px] capitalize text-muted">{pretty(s.name)}</span>
                            <span className="w-full truncate text-center text-[8px] font-semibold capitalize" style={{ color }}>{s.primary?.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
