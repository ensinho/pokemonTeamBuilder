import React, { useMemo, useState } from 'react';
import { Atom, ListChecks, Zap, Trophy, ChevronLeft, Check, Plus } from 'lucide-react';

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

    const openCore = (id) => { setCoreId(id); setPicked(new Set()); };

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
                            <p className="text-sm text-muted">{pt ? selected.summary.pt : selected.summary.en}</p>

                            {/* How to build */}
                            <div className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
                                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-fg">
                                    <ListChecks className="h-4 w-4" style={{ color: selected.accent }} />
                                    {pt ? 'Como montar' : 'How to build it'}
                                </h3>
                                <ol className="space-y-1.5">
                                    {(pt ? selected.guide.pt : selected.guide.en).map((step, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-fg">
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: selected.accent }}>{i + 1}</span>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ol>
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
