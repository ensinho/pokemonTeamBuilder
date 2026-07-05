import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../../styles/entity-detail-view.css';
import {
    ChevronLeft, Shield, Swords, AlertTriangle, Sparkles, ExternalLink, Medal,
} from 'lucide-react';

import { typeColors, typeIcons } from '../../constants/types';
import { getPokemonFrontSpriteUrl, getPokemonArtworkSpriteUrl, resolveMegaPokemonEntry } from '../../utils/pokemonSprites';
import { useMegaStones } from '../../hooks/useMegaStones';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { titleCaseSlug } from '../../utils/smogonSets';
import { analyzeTeam } from '../../utils/teamAnalysis';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useMoveTypes } from '../../hooks/useMoveTypes';
import { EmptyState } from '../EmptyState';
import { ShowdownIcon } from '../icons';
import { MoveChip, pretty, useSmartBack } from './metaShared';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';

const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
const EV_LABEL = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
const EV_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

// The paste EVs in this dataset are frequently non-standard (sum < 100); only
// surface a spread when it looks like a real 508-style EV investment.
function formatEvs(evs) {
    if (!evs) return null;
    const total = Object.values(evs).reduce((a, b) => a + (b || 0), 0);
    if (total < 100) return null;
    return EV_ORDER.filter((k) => evs[k] > 0).map((k) => `${evs[k]} ${EV_LABEL[k]}`).join(' / ');
}

function TypeChip({ type, count, danger }) {
    const c = typeColors[type] || '#777';
    return (
        <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase" style={{ color: c, borderColor: `${c}8c`, backgroundColor: `${c}22` }}>
            {typeIcons[type] && <img src={typeIcons[type]} alt="" className="h-3 w-3" />}
            {type}{count > 1 && <span className={danger ? 'text-danger' : ''}>{count}×</span>}
        </span>
    );
}

/**
 * Full detail for a single tournament team: the player's placement, the exact
 * sets each Pokémon ran (item / ability / nature / moves, EVs when reliable),
 * team-wide type coverage, and one-click import into the builder.
 */
export function TournamentTeamView({ onImport, colors }) {
    const { id } = useParams();
    const { language } = useTranslation();
    const { goToAbility, from } = useEntityNavigate();
    const pt = language === 'pt';
    const { goBack, backLabel } = useSmartBack('/tournaments', pt);

    const { teams, status } = useTournamentData();
    const { typeForMove } = useMoveTypes();
    const byStone = useMegaStones();
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    React.useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    const team = useMemo(() => teams.find((tm) => tm.id === id) || null, [teams, id]);

    const indexById = useMemo(() => new Map(pokemonIndex.map((p) => [p.id, p])), [pokemonIndex]);
    const members = useMemo(
        () => (team?.pokemons || []).map((p) => {
            const resolved = resolveMegaPokemonEntry(p, pokemonIndex, byStone);
            const indexEntry = indexById.get(resolved.spriteId) || indexById.get(p.id);
            return {
                ...p,
                resolvedId: resolved.spriteId,
                resolvedName: resolved.name,
                types: indexEntry?.types || p.types || []
            };
        }),
        [team, pokemonIndex, indexById, byStone],
    );

    const { teamAnalysis } = useMemo(() => analyzeTeam(members, pokemonIndex), [members, pokemonIndex]);
    const offense = useMemo(() => Array.from(teamAnalysis.strengths || []).sort(), [teamAnalysis]);
    const resists = useMemo(() => Object.entries(teamAnalysis.defensiveCoverage || {}).sort(([, a], [, b]) => b - a), [teamAnalysis]);
    const weaknesses = useMemo(() => Object.entries(teamAnalysis.weaknesses || {}).sort(([, a], [, b]) => b - a), [teamAnalysis]);

    const memberNames = useMemo(() => members.map((m) => titleCaseSlug(m.resolvedName || m.name)), [members]);
    useDocumentMeta(team ? {
        title: team.title,
        description: `${team.placement ? `${team.placement} at ` : ''}${team.tournament}${team.format ? ` (${team.format})` : ''} — team featuring ${memberNames.slice(0, 6).join(', ')}. Import it into Pokémon Team Builder.`,
        image: members[0] ? getPokemonArtworkSpriteUrl(members[0].resolvedId) : undefined,
        path: `/tournaments/team/${id}`,
    } : undefined);

    if (status === 'loading' && !team) {
        return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted">{pt ? 'Carregando…' : 'Loading…'}</div>;
    }

    if (!team) {
        return (
            <main className="mx-auto max-w-5xl px-4 py-10">
                <button type="button" onClick={goBack} className="edv-back mb-4">
                    <ChevronLeft className="h-4 w-4" /> {backLabel}
                </button>
                <EmptyState title={pt ? 'Time não encontrado' : 'Team not found'} message={pt ? 'Este time pode não estar mais no conjunto de dados.' : 'This team may no longer be in the dataset.'} />
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1400px] px-3 py-5 sm:px-5">
            <button type="button" onClick={goBack} className="edv-back mb-4">
                <ChevronLeft className="h-4 w-4" /> {backLabel}
            </button>

            {/* Header */}
            <section
                className="mb-6 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-md transition-all"
                style={{ background: 'radial-gradient(100% 100% at 0% 0%, var(--color-primary-soft), transparent 60%), var(--color-surface)' }}
            >
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-xl font-extrabold tracking-tight text-fg sm:text-3xl">{team.tournament || team.title || (pt ? 'Time de torneio' : 'Tournament team')}</h1>
                            {team.featured && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                                    <Medal className="h-3 w-3" /> {pt ? 'Destaque' : 'Featured'}
                                </span>
                            )}
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-muted">
                            {[team.placement, team.player && `${pt ? 'por' : 'by'} ${team.player}`, team.date].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {team.format && (
                            <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold text-primary">
                                {team.format}
                            </span>
                        )}
                        {onImport && (
                            <button
                                type="button"
                                onClick={() => onImport({ name: team.title || team.tournament || 'Tournament Team', pokemons: team.pokemons || [] })}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1 text-[12px] font-bold text-white transition-all hover:opacity-90 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                            >
                                <ShowdownIcon className="h-4 w-4" /> {pt ? 'Importar' : 'Import to builder'}
                            </button>
                        )}
                        {(team.pokepaste || team.sourceUrl) && (
                            <a
                                href={team.pokepaste || team.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3.5 py-1 text-[12px] font-bold text-fg transition-all hover:border-primary active:scale-95"
                                title={team.pokepaste ? 'Poképaste' : (pt ? 'Fonte' : 'Source')}
                            >
                                <ExternalLink className="h-3.5 w-3.5" /> {team.pokepaste ? 'Poképaste' : (pt ? 'Fonte' : 'Source')}
                            </a>
                        )}
                    </div>
                </div>
                {/* Coverage Panel */}
                <div className="mt-5 space-y-3 border-t border-border pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-success w-24 shrink-0">
                            <Swords className="h-3.5 w-3.5" /> {pt ? 'Ofensa' : 'Offense'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {offense.length ? offense.map((tp) => <TypeChip key={tp} type={tp} />) : <span className="text-[11px] text-muted">—</span>}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-primary w-24 shrink-0">
                            <Shield className="h-3.5 w-3.5" /> {pt ? 'Resistências' : 'Resists'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {resists.length ? resists.map(([tp, c]) => <TypeChip key={tp} type={tp} count={c} />) : <span className="text-[11px] text-muted">—</span>}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-danger w-24 shrink-0">
                            <AlertTriangle className="h-3.5 w-3.5" /> {pt ? 'Fraquezas' : 'Weaknesses'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {weaknesses.length ? weaknesses.map(([tp, c]) => <TypeChip key={tp} type={tp} count={c} danger />) : <span className="text-[11px] text-muted">—</span>}
                        </div>
                    </div>
                </div>
            </section>

            {/* Roster Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {members.map((m, i) => {
                    const accent = typeColors[m.types?.[0]] || 'var(--color-primary)';
                    const evs = formatEvs(m.evs);
                    return (
                        <article
                            key={`${m.id}-${i}`}
                            className="group rounded-2xl border border-border bg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-md"
                            style={{
                                borderTop: `3px solid ${accent}`,
                                background: `linear-gradient(180deg, ${accent}04, var(--color-surface) 40%), var(--color-surface)`
                            }}
                        >
                            <div className="flex items-center gap-4">
                                <Link
                                    to={`/pokemon/${m.resolvedId || m.id}`}
                                    state={{ from }}
                                    title={pretty(m.resolvedName || m.name)}
                                    className="relative flex items-center justify-center p-1.5 rounded-xl bg-surface-raised/80 group-hover:bg-surface-raised transition-colors shrink-0"
                                >
                                    <img
                                        src={getPokemonFrontSpriteUrl(m.resolvedId || m.id)}
                                        alt={m.resolvedName || m.name}
                                        className="h-14 w-14 image-pixelated shrink-0 object-contain transition-transform duration-300 group-hover:scale-110"
                                        onError={(e) => { e.currentTarget.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='; }}
                                    />
                                </Link>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Link
                                            to={`/meta/${m.resolvedId || m.id}`}
                                            state={{ from }}
                                            className="truncate text-base font-extrabold capitalize text-fg hover:text-primary transition-colors"
                                        >
                                            {pretty(m.resolvedName || m.name)}
                                        </Link>
                                        {m.level && (
                                            <span className="shrink-0 rounded bg-surface-raised px-1.5 py-0.5 text-[9px] font-bold text-muted">
                                                Lv{m.level}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {(m.types || []).map((tp) => (
                                            <span key={tp} className="inline-flex items-center gap-1 text-[10px] font-bold capitalize" style={{ color: typeColors[tp] }}>
                                                {typeIcons[tp] && <img src={typeIcons[tp]} alt="" className="h-3.5 w-3.5" />}{cap(tp)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Build info pills */}
                            <div className="mt-3.5 flex flex-wrap gap-1.5 text-[11px] font-semibold text-fg">
                                {m.item && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-surface-raised px-2 py-0.75 capitalize text-fg border border-border">
                                        <img src={itemSpriteUrl((m.item || '').toLowerCase().replace(/[.'’:]/g, '').replace(/\s+/g, '-'))} alt="" className="h-3.5 w-3.5 image-pixelated shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        {pretty(m.item)}
                                    </span>
                                )}
                                {m.ability && (
                                    <button type="button" onClick={(e) => goToAbility(m.ability, e)} className="inline-flex cursor-pointer items-center rounded-md bg-surface-raised px-2 py-0.75 capitalize text-fg border border-border transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title={pt ? 'Habilidade' : 'Ability'}>
                                        {pretty(m.ability)}
                                    </button>
                                )}
                                {m.nature && (
                                    <span className="inline-flex items-center rounded-md bg-surface-raised px-2 py-0.75 text-fg border border-border" title={pt ? 'Natureza' : 'Nature'}>
                                        {m.nature}
                                    </span>
                                )}
                                {m.tera && (
                                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.75 font-bold border" style={{ color: typeColors[m.tera?.toLowerCase()] || 'var(--color-primary)', borderColor: `${typeColors[m.tera?.toLowerCase()] || '#888'}33`, backgroundColor: `${typeColors[m.tera?.toLowerCase()] || '#888'}12` }}>
                                        <Sparkles className="h-3 w-3 shrink-0" />
                                        {m.tera}
                                    </span>
                                )}
                            </div>

                            {/* EVs display */}
                            {evs && (
                                <div className="mt-3 text-[10px] text-muted font-medium">
                                    <span className="font-bold text-fg uppercase mr-1.5">EVs:</span>
                                    {evs}
                                </div>
                            )}

                            {/* Moves display */}
                            {Array.isArray(m.moves) && m.moves.length > 0 && (
                                <div className="mt-3.5 flex flex-wrap gap-1.5">
                                    {m.moves.slice(0, 4).map((mv, mi) => (
                                        <MoveChip key={`${mv}-${mi}`} name={mv} type={typeForMove(mv)} />
                                    ))}
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </main>
    );
}
