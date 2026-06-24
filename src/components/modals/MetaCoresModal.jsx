import React, { useMemo, useState } from 'react';
import { Atom, ListChecks, Zap, Trophy, ChevronLeft, Check, Plus, Users } from 'lucide-react';

import { coreIconFor } from '../coreIcons';
import { useSmogonData } from '../../hooks/useSmogonData';
import { useCompetitiveUsage } from '../../hooks/useCompetitiveUsage';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useTranslation } from '../../hooks/useTranslation';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useReferenceStore } from '../../store/useReferenceStore';
import { buildCores } from '../../utils/metaCores';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { CloseIcon } from '../icons';

const pretty = (s = '') => s.replace(/-/g, ' ');

function PickCard({ member, accent, selected, onTeam, disabled, onToggle, addLabel }) {
    return (
        <button
            type="button"
            disabled={onTeam || disabled}
            onClick={onToggle}
            title={onTeam ? '' : addLabel}
            aria-pressed={selected}
            className={`relative flex flex-col items-center gap-1 rounded-xl border bg-surface p-2 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? 'border-transparent ring-2' : 'border-border hover:-translate-y-0.5 hover:border-primary'} ${(onTeam || disabled) ? 'cursor-not-allowed opacity-45 hover:translate-y-0' : ''}`}
            style={selected ? { '--tw-ring-color': accent } : undefined}
        >
            {selected && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: accent }}>
                    <Check className="h-3 w-3" />
                </span>
            )}
            {onTeam && (
                <span className="absolute -right-1 -top-1 rounded-full bg-success px-1.5 py-0.5 text-[8px] font-bold text-white">✓</span>
            )}
            <div className="relative">
                <img
                    src={getPokemonFrontSpriteUrl(member.id)}
                    onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                    alt=""
                    className="h-12 w-12 image-pixelated"
                    loading="lazy"
                />
                {member.usage > 0 && (
                    <span className="absolute -right-1.5 -bottom-1 inline-flex items-center gap-0.5 rounded-full bg-primary px-1 text-[8px] font-bold text-white">
                        <Trophy className="h-1.5 w-1.5" />{member.usage}
                    </span>
                )}
            </div>
            <span className="w-full truncate text-[11px] font-bold capitalize text-fg">{pretty(member.name)}</span>
            <span className="w-full truncate rounded px-1 text-[9px] font-semibold capitalize" style={{ color: accent, backgroundColor: `${accent}1f` }}>
                {pretty(member.tag)}
            </span>
        </button>
    );
}

/**
 * Guided "build around a Meta Core" flow. Step 1: choose a core. Step 2: read how
 * to build it and multi-select setters/payoff to drop straight onto the team.
 */
export function MetaCoresModal({ onClose, currentTeam = [], onAddToTeam }) {
    const { language } = useTranslation();
    const pt = language === 'pt';
    const dialogRef = useModalA11y(onClose);
    const { byId: smogonById, status: smogonStatus } = useSmogonData();
    const { byId: usageById } = useCompetitiveUsage();
    const { popular } = useTournamentData();
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);

    const [coreId, setCoreId] = useState(null);
    const [picked, setPicked] = useState(() => new Set());

    const cores = useMemo(
        () => buildCores({ smogonById, usageById, popular }),
        [smogonById, usageById, popular]
    );
    const teamIds = useMemo(() => new Set(currentTeam.map((p) => p.id)), [currentTeam]);
    const matches = useMemo(() => new Set(
        cores
            .filter((c) => c.setters.some((s) => teamIds.has(s.id)) || c.abusers.some((a) => teamIds.has(a.id)))
            .map((c) => c.id)
    ), [cores, teamIds]);
    const indexById = useMemo(() => new Map((pokemonIndex || []).map((p) => [p.id, p])), [pokemonIndex]);

    const selected = cores.find((c) => c.id === coreId) || null;
    const remainingSlots = Math.max(0, 6 - currentTeam.length);

    const memberById = useMemo(() => {
        const map = new Map();
        if (selected) for (const m of [...selected.setters, ...selected.abusers]) map.set(m.id, m);
        return map;
    }, [selected]);

    // The most-used VGC lineup for this core: lead with the top setter, then fill
    // by tournament usage from setters + payoffs (6 unique mons).
    const suggestedTeam = useMemo(() => {
        if (!selected) return [];
        const out = [];
        const seen = new Set();
        const push = (m) => { if (m && !seen.has(m.id)) { seen.add(m.id); out.push(m); } };
        push(selected.setters[0]);
        for (const m of [...selected.setters, ...selected.abusers].sort((a, b) => b.usage - a.usage)) {
            if (out.length >= 6) break;
            push(m);
        }
        return out.slice(0, 6);
    }, [selected]);

    const openCore = (id) => { setCoreId(id); setPicked(new Set()); };

    const addSuggested = () => {
        const toAdd = suggestedTeam.filter((m) => !teamIds.has(m.id)).slice(0, remainingSlots);
        for (const m of toAdd) onAddToTeam?.(indexById.get(m.id) || { id: m.id, name: m.name, types: [] });
        onClose();
    };

    const toggle = (id) => setPicked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else if (next.size < remainingSlots) next.add(id);
        return next;
    });

    const confirmAdd = () => {
        for (const id of [...picked].slice(0, remainingSlots)) {
            const m = memberById.get(id);
            onAddToTeam?.(indexById.get(id) || { id, name: m?.name || `#${id}`, types: [] });
        }
        onClose();
    };

    const loading = smogonStatus !== 'ready' && cores.length === 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-4" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="meta-cores-title"
                tabIndex={-1}
                className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-surface shadow-xl animate-scale-in focus:outline-none"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex items-center justify-between gap-3 border-b border-surface-raised px-4 py-3 sm:px-6">
                    <div className="flex min-w-0 items-center gap-2">
                        {selected && (
                            <button
                                type="button"
                                onClick={() => setCoreId(null)}
                                className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label={pt ? 'Voltar' : 'Back'}
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                        )}
                        <Atom className="h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{pt ? 'Fluxo inicial' : 'Starter flow'}</div>
                            <h2 id="meta-cores-title" className="flex items-center gap-1.5 truncate text-lg font-extrabold text-fg">
                                {selected
                                    ? (() => { const SelIcon = coreIconFor(selected.id); return <><SelIcon className="h-5 w-5 shrink-0" style={{ color: selected.accent }} />{selected.name}</>; })()
                                    : (pt ? 'Escolha um core' : 'Choose a core')}
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-muted hover:bg-surface-raised hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={pt ? 'Fechar' : 'Close'}
                    >
                        <CloseIcon />
                    </button>
                </header>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                    {loading ? (
                        <p className="py-16 text-center text-sm text-muted">{pt ? 'Carregando o meta…' : 'Loading the meta…'}</p>
                    ) : !selected ? (
                        <>
                            <p className="mb-4 text-sm text-muted">
                                {pt
                                    ? 'Cada core é um arquétipo em torno do qual times de VGC são construídos. Escolha um para ver como montá-lo e adicionar as peças.'
                                    : 'Each core is an archetype VGC teams are built around. Pick one to see how to build it and drop in the pieces.'}
                            </p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {cores.map((core) => {
                                    const CoreIcon = coreIconFor(core.id);
                                    return (
                                    <button
                                        key={core.id}
                                        type="button"
                                        onClick={() => openCore(core.id)}
                                        className="relative overflow-hidden rounded-2xl border border-border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        style={{ backgroundImage: `linear-gradient(135deg, ${core.accent}40, ${core.accent}0d 55%, transparent)` }}
                                    >
                                        <CoreIcon className="h-8 w-8" style={{ color: core.accent }} />
                                        <div className="mt-2 text-lg font-extrabold text-fg">{core.name}</div>
                                        <div className="mt-0.5 text-[11px] font-semibold text-muted">{core.memberCount} {pt ? 'Pokémon' : 'mons'}</div>
                                        {matches.has(core.id) && (
                                            <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-white">
                                                {pt ? 'no seu time' : 'on your team'}
                                            </span>
                                        )}
                                    </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Suggested team — the most-used VGC lineup for this core, shown as
                                small roster icons (mirrors the home VGC teams strip). */}
                            {suggestedTeam.length > 0 && (
                                <div className="rounded-xl border border-border bg-surface-raised p-3">
                                    <div className="mb-2.5 flex items-center justify-between gap-2">
                                        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                                            <Users className="h-4 w-4" style={{ color: selected.accent }} />
                                            {pt ? 'Time sugerido' : 'Suggested team'}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={addSuggested}
                                            disabled={remainingSlots === 0 || suggestedTeam.every((m) => teamIds.has(m.id))}
                                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                            style={{ backgroundColor: selected.accent }}
                                        >
                                            <Plus className="h-3 w-3" />
                                            {pt ? 'Adicionar time' : 'Add team'}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedTeam.map((m) => {
                                            const onTeam = teamIds.has(m.id);
                                            return (
                                                <div key={m.id} className="flex w-[3.25rem] flex-col items-center gap-0.5" title={pretty(m.name)}>
                                                    <div
                                                        className={`relative flex h-11 w-11 items-center justify-center rounded-full border bg-surface ${onTeam ? 'border-success' : 'border-border'}`}
                                                    >
                                                        <img
                                                            src={getPokemonFrontSpriteUrl(m.id)}
                                                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                                            alt=""
                                                            className="h-9 w-9 image-pixelated"
                                                            loading="lazy"
                                                        />
                                                        {onTeam && (
                                                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-success text-[8px] font-bold text-white">✓</span>
                                                        )}
                                                    </div>
                                                    <span className="w-full truncate text-center text-[9px] font-semibold capitalize text-muted">{pretty(m.name)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* How to build — compact chip steps */}
                            <div className="mt-3">
                                <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                                    <ListChecks className="h-3.5 w-3.5" style={{ color: selected.accent }} />
                                    {pt ? 'Como montar' : 'How to build it'}
                                </h3>
                                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                    {(pt ? selected.guide.pt : selected.guide.en).map((step, i) => (
                                        <span key={i} className="flex items-start gap-1.5 rounded-md bg-surface-raised px-2.5 py-1.5 text-[11px] font-medium leading-snug text-fg">
                                            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: selected.accent }}>{i + 1}</span>
                                            <span>{step}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {remainingSlots === 0 && (
                                <p className="mt-3 rounded-lg bg-surface-raised px-3 py-2 text-xs text-muted">
                                    {pt ? 'Seu time está cheio — remova um Pokémon para adicionar peças do core.' : 'Your team is full — remove a Pokémon to add core pieces.'}
                                </p>
                            )}

                            {[{ key: 'setters', list: selected.setters, icon: <Zap className="h-4 w-4" style={{ color: selected.accent }} />, label: pt ? 'Ativadores' : 'Setters' },
                            { key: 'abusers', list: selected.abusers, icon: <Trophy className="h-4 w-4" style={{ color: selected.accent }} />, label: pt ? 'Aproveitadores' : 'Payoff' }]
                                .filter((g) => g.list.length > 0)
                                .map((g) => (
                                    <div key={g.key} className="mt-4">
                                        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted">{g.icon}{g.label}</h3>
                                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                                            {g.list.map((m) => {
                                                const onTeam = teamIds.has(m.id);
                                                const isSel = picked.has(m.id);
                                                return (
                                                    <PickCard
                                                        key={m.id}
                                                        member={m}
                                                        accent={selected.accent}
                                                        selected={isSel}
                                                        onTeam={onTeam}
                                                        disabled={!isSel && (picked.size >= remainingSlots)}
                                                        onToggle={() => toggle(m.id)}
                                                        addLabel={pt ? `Selecionar ${pretty(m.name)}` : `Select ${pretty(m.name)}`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                        </>
                    )}
                </div>

                {/* Footer */}
                {selected && (
                    <footer className="flex items-center justify-between gap-3 border-t border-surface-raised px-4 py-3 sm:px-6">
                        <span className="text-xs text-muted">
                            {picked.size > 0
                                ? (pt ? `${picked.size} selecionado(s) · ${remainingSlots} vaga(s)` : `${picked.size} selected · ${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left`)
                                : (pt ? `${remainingSlots} vaga(s) livre(s)` : `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} free`)}
                        </span>
                        <button
                            type="button"
                            onClick={confirmAdd}
                            disabled={picked.size === 0}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                        >
                            <Plus className="h-4 w-4" />
                            {pt ? `Adicionar ${picked.size || ''}`.trim() + ' ao time' : `Add ${picked.size || ''}`.trim() + ' to team'}
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
}
