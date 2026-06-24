import React from 'react';
import { Sparkles, Swords, Shield, Zap, BookOpen } from 'lucide-react';

import { typeColors } from '../../constants/types';
import { useSmogonData } from '../../hooks/useSmogonData';
import { useTranslation } from '../../hooks/useTranslation';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { formatEvSpread, formatIvNotes } from '../../utils/smogonSets';

const pretty = (slug = '') => slug.replace(/-/g, ' ');

function MetaPill({ icon, label, value, style }) {
    if (!value) return null;
    return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2.5 py-1 text-xs font-semibold text-fg" style={style}>
            {icon}
            <span className="text-[10px] uppercase tracking-[0.06em] text-muted">{label}</span>
            <span className="capitalize">{value}</span>
        </span>
    );
}

/**
 * Read-only "meta guide" for one species: Smogon's expert-curated VGC sets +
 * the written reasoning behind each. The same sets power the one-click "apply
 * set" in the team editor — this view is where players learn *why* they work.
 */
export function SmogonCompetitivePanel({ pokemonId }) {
    const { language } = useTranslation();
    const { smogonFor, status } = useSmogonData();
    const pt = language === 'pt';
    const entry = pokemonId ? smogonFor(pokemonId) : null;

    if (status !== 'ready') {
        return <div className="py-12 text-center text-sm text-muted">{pt ? 'Carregando dados competitivos…' : 'Loading competitive data…'}</div>;
    }

    if (!entry || !entry.sets?.length) {
        return (
            <div className="py-12 bg-surface border border-border rounded-xl text-center px-4">
                <BookOpen className="w-10 h-10 text-muted mx-auto mb-3" />
                <h5 className="font-bold text-fg mb-1">{pt ? 'Sem análise competitiva' : 'No competitive analysis'}</h5>
                <p className="text-xs text-muted max-w-sm mx-auto">
                    {pt
                        ? 'O Smogon ainda não publicou conjuntos VGC para este Pokémon. Veja os itens de torneio sugeridos no construtor de times.'
                        : 'Smogon has no published VGC sets for this Pokémon yet. Check tournament-based item suggestions in the team builder.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                    <Sparkles className="w-3.5 h-3.5" /> {pt ? 'Análise Smogon' : 'Smogon analysis'} · {entry.gen}
                </span>
                <span className="text-xs text-muted">
                    {pt
                        ? `${entry.sets.length} conjunto(s) recomendado(s) por especialistas`
                        : `${entry.sets.length} expert-recommended set${entry.sets.length > 1 ? 's' : ''}`}
                </span>
            </div>

            {entry.overview && (
                <p className="text-sm leading-relaxed text-fg whitespace-pre-line border-l-2 border-primary/40 pl-3">
                    {entry.overview}
                </p>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {entry.sets.map((set, i) => {
                    const evSpread = formatEvSpread(set.evs);
                    const ivNotes = formatIvNotes(set.ivs);
                    return (
                        <article key={`${set.name}-${i}`} className="rounded-xl border border-border bg-surface p-4 space-y-3">
                            <header className="flex items-baseline justify-between gap-2">
                                <h4 className="flex items-baseline gap-2 text-base font-extrabold text-fg">
                                    {set.name}
                                    {set.source && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">{set.source}</span>}
                                </h4>
                                {set.tera?.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold capitalize" style={{ color: typeColors[set.tera[0]] }}>
                                        <Sparkles className="w-3 h-3" /> {pt ? 'Tera' : 'Tera'} {set.tera.map((tt) => pretty(tt)).join(' / ')}
                                    </span>
                                )}
                            </header>

                            <div className="flex flex-wrap gap-1.5">
                                {set.item && (
                                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2.5 py-1 text-xs font-semibold text-fg">
                                        <img src={itemSpriteUrl(set.item)} alt="" className="w-4 h-4 image-pixelated" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        <span className="capitalize">{pretty(set.item)}</span>
                                        {set.itemAlts?.length > 0 && (
                                            <span className="text-muted normal-case">/ {set.itemAlts.map(pretty).join(' / ')}</span>
                                        )}
                                    </span>
                                )}
                                <MetaPill icon={<Shield className="w-3.5 h-3.5 text-muted" />} label={pt ? 'Hab.' : 'Ability'} value={set.ability && pretty(set.ability)} />
                                <MetaPill icon={<Zap className="w-3.5 h-3.5 text-muted" />} label={pt ? 'Natureza' : 'Nature'} value={set.nature} />
                            </div>

                            {evSpread && (
                                <div className="text-xs text-muted">
                                    <span className="font-bold text-fg">EVs:</span> <span className="font-mono">{evSpread}</span>
                                    {ivNotes && <> · <span className="font-bold text-fg">IVs:</span> <span className="font-mono">{ivNotes}</span></>}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-1.5">
                                {set.moves.map((slot, j) => (
                                    <span key={j} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-raised px-2 py-1 text-xs font-semibold capitalize text-fg">
                                        <Swords className="w-3 h-3 text-muted" />
                                        {slot.map(pretty).join(' / ')}
                                    </span>
                                ))}
                            </div>

                            {set.description && (
                                <p className="text-xs leading-relaxed text-muted whitespace-pre-line">{set.description}</p>
                            )}
                        </article>
                    );
                })}
            </div>

            <p className="text-[11px] text-muted">
                {pt
                    ? 'Conjuntos curados pelo Smogon. Use “Aplicar conjunto” no editor de time para preencher movimentos, item e EVs de uma vez.'
                    : 'Sets curated by Smogon. Use “Apply set” in the team editor to fill moves, item, and EVs in one click.'}
            </p>
        </div>
    );
}
