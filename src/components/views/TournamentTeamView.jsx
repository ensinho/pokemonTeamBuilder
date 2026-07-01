import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ChevronLeft, Shield, Swords, AlertTriangle, Sparkles, ExternalLink, Medal,
} from 'lucide-react';

import { typeColors, typeIcons } from '../../constants/types';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { analyzeTeam } from '../../utils/teamAnalysis';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useTranslation } from '../../hooks/useTranslation';
import { useMoveTypes } from '../../hooks/useMoveTypes';
import { EmptyState } from '../EmptyState';
import { ShowdownIcon } from '../icons';
import { MoveChip, pretty, useSmartBack } from './metaShared';

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
    const goBack = useSmartBack('/tournaments');
    const { language } = useTranslation();
    const pt = language === 'pt';

    const { teams, status } = useTournamentData();
    const { typeForMove } = useMoveTypes();
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    React.useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    const team = useMemo(() => teams.find((tm) => tm.id === id) || null, [teams, id]);

    const indexById = useMemo(() => new Map(pokemonIndex.map((p) => [p.id, p])), [pokemonIndex]);
    const members = useMemo(
        () => (team?.pokemons || []).map((p) => ({ ...p, types: indexById.get(p.id)?.types || p.types || [] })),
        [team, indexById],
    );

    const { teamAnalysis } = useMemo(() => analyzeTeam(members, pokemonIndex), [members, pokemonIndex]);
    const offense = useMemo(() => Array.from(teamAnalysis.strengths || []).sort(), [teamAnalysis]);
    const resists = useMemo(() => Object.entries(teamAnalysis.defensiveCoverage || {}).sort(([, a], [, b]) => b - a), [teamAnalysis]);
    const weaknesses = useMemo(() => Object.entries(teamAnalysis.weaknesses || {}).sort(([, a], [, b]) => b - a), [teamAnalysis]);

    if (status === 'loading' && !team) {
        return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted">{pt ? 'Carregando…' : 'Loading…'}</div>;
    }

    if (!team) {
        return (
            <main className="mx-auto max-w-5xl px-4 py-10">
                <button type="button" onClick={goBack} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
                    <ChevronLeft className="h-4 w-4" /> {pt ? 'Voltar' : 'Back'}
                </button>
                <EmptyState title={pt ? 'Time não encontrado' : 'Team not found'} message={pt ? 'Este time pode não estar mais no conjunto de dados.' : 'This team may no longer be in the dataset.'} />
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1400px] px-3 py-5 sm:px-5">
            <button type="button" onClick={goBack} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
                <ChevronLeft className="h-4 w-4" /> {pt ? 'Voltar' : 'Back'}
            </button>

            {/* Header */}
            <section className="mb-5 rounded-2xl border border-border bg-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-extrabold text-fg sm:text-2xl">{team.tournament || team.title || (pt ? 'Time de torneio' : 'Tournament team')}</h1>
                            {team.featured && <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent"><Medal className="h-3 w-3" /> {pt ? 'Destaque' : 'Featured'}</span>}
                        </div>
                        <p className="mt-1 text-sm text-muted">
                            {[team.placement, team.player && `${pt ? 'por' : 'by'} ${team.player}`, team.date].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {team.format && <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">{team.format}</span>}
                        {onImport && (
                            <button
                                type="button"
                                onClick={() => onImport({ name: team.title || team.tournament || 'Tournament Team', pokemons: team.pokemons || [] })}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-bold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                            >
                                <ShowdownIcon className="h-4 w-4" /> {pt ? 'Importar' : 'Import to builder'}
                            </button>
                        )}
                        {(team.pokepaste || team.sourceUrl) && (
                            <a href={team.pokepaste || team.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-[12px] font-semibold text-fg transition-colors hover:border-primary" title={team.pokepaste ? 'Poképaste' : (pt ? 'Fonte' : 'Source')}>
                                <ExternalLink className="h-3.5 w-3.5" /> {team.pokepaste ? 'Poképaste' : (pt ? 'Fonte' : 'Source')}
                            </a>
                        )}
                    </div>
                </div>

                {/* Coverage */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                        <h3 className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-success"><Swords className="h-3.5 w-3.5" /> {pt ? 'Ofensa' : 'Offense'}</h3>
                        <div className="flex flex-wrap gap-1">
                            {offense.length ? offense.map((tp) => <TypeChip key={tp} type={tp} />) : <span className="text-[11px] text-muted">—</span>}
                        </div>
                    </div>
                    <div>
                        <h3 className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-primary"><Shield className="h-3.5 w-3.5" /> {pt ? 'Resistências' : 'Resists'}</h3>
                        <div className="flex flex-wrap gap-1">
                            {resists.length ? resists.map(([tp, c]) => <TypeChip key={tp} type={tp} count={c} />) : <span className="text-[11px] text-muted">—</span>}
                        </div>
                    </div>
                    <div>
                        <h3 className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-danger"><AlertTriangle className="h-3.5 w-3.5" /> {pt ? 'Fraquezas' : 'Weaknesses'}</h3>
                        <div className="flex flex-wrap gap-1">
                            {weaknesses.length ? weaknesses.map(([tp, c]) => <TypeChip key={tp} type={tp} count={c} danger />) : <span className="text-[11px] text-muted">—</span>}
                        </div>
                    </div>
                </div>
            </section>

            {/* Members with full sets */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {members.map((m, i) => {
                    const accent = typeColors[m.types?.[0]] || 'var(--color-primary)';
                    const evs = formatEvs(m.evs);
                    return (
                        <article key={`${m.id}-${i}`} className="rounded-2xl border border-border bg-surface p-3.5" style={{ borderLeftColor: accent, borderLeftWidth: 3 }}>
                            <div className="flex items-center gap-3">
                                <Link to={`/pokemon/${m.id}`} title={pretty(m.name)}>
                                    <img src={getPokemonArtworkSpriteUrl(m.id)} alt={m.name} className="h-14 w-14 shrink-0 object-contain" onError={(e) => { e.currentTarget.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='; }} />
                                </Link>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Link to={`/meta/${m.id}`} className="truncate text-[14px] font-extrabold capitalize text-fg hover:text-primary">{pretty(m.name)}</Link>
                                        {m.level && <span className="shrink-0 text-[10px] font-semibold text-muted">Lv{m.level}</span>}
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap gap-1">
                                        {(m.types || []).map((tp) => (
                                            <span key={tp} className="inline-flex items-center gap-0.5 text-[10px] font-bold capitalize" style={{ color: typeColors[tp] }}>
                                                {typeIcons[tp] && <img src={typeIcons[tp]} alt="" className="h-3 w-3" />}{cap(tp)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
                                {m.item && (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-raised px-1.5 py-0.5 capitalize text-fg">
                                        <img src={itemSpriteUrl((m.item || '').toLowerCase().replace(/[.'’:]/g, '').replace(/\s+/g, '-'))} alt="" className="h-4 w-4 image-pixelated" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        {pretty(m.item)}
                                    </span>
                                )}
                                {m.ability && <span className="rounded-md border border-border bg-surface-raised px-1.5 py-0.5 capitalize text-fg">{pretty(m.ability)}</span>}
                                {m.nature && <span className="rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-fg">{m.nature}</span>}
                                {m.tera && (
                                    <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold" style={{ color: typeColors[m.tera?.toLowerCase()] || 'var(--color-primary)', backgroundColor: `${typeColors[m.tera?.toLowerCase()] || '#888'}1f` }}>
                                        <Sparkles className="h-3 w-3" /> {pt ? 'Tera' : 'Tera'} {m.tera}
                                    </span>
                                )}
                            </div>

                            {evs && <p className="mt-2 text-[11px] text-muted"><span className="font-semibold text-fg">EVs:</span> {evs}</p>}

                            {Array.isArray(m.moves) && m.moves.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
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
