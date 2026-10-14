import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Copy, Pencil, Share2, Star, Trash2, Trophy, Shield, Swords,
    AlertTriangle, Sparkles, ArrowUpRight,
} from 'lucide-react';

import '../../styles/team-detail-view.css';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors } from '../../constants/types';
import { getTeamPokemonDisplaySprite, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { analyzeTeam, rateTeam } from '../../utils/teamAnalysis';
import { suggestItemsForPokemon, itemSpriteUrl } from '../../utils/itemSuggestions';
import { TypeChip } from '../TypeChip';
import { TeamRatingBadge } from '../TeamIdentitySummary';
import { ShowdownIcon } from '../icons';
import { CompactStatBar, getPokemonWeaknessEntries, WeaknessBadge } from '../modals/pokemonModalShared';
import { useTranslation } from '../../hooks/useTranslation';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useCompetitiveUsage } from '../../hooks/useCompetitiveUsage';
import { useSmogonData } from '../../hooks/useSmogonData';
import { EmptyState } from '../EmptyState';

// A type in the coverage panel: the standard TypeChip (canon colour mixed into
// theme tokens), plus how many members it applies to. It used to be a bespoke
// chip with the canon colour as its text, upper-cased — illegible for half the
// types on the light themes.
function CoverageChip({ type, count }) {
    return (
        <span className="team-detail-chip-wrap">
            <TypeChip type={type} size="sm" />
            {count > 1 && <span className="count-badge">{count}×</span>}
        </span>
    );
}

export function TeamDetailView({
    teams = [],
    onEdit,
    onShare,
    onExport,
    onDuplicate,
    requestDelete,
    onToggleFavorite,
    activeTeamId,
    setActiveTeamId,
    colors,
    fetchPokemonDetails,
    showDetails,
}) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, language } = useTranslation();
    const showTeraType = useThemeStore((state) => state.showTeraType);
    const { goToMove, goToAbility, goToItem } = useEntityNavigate();

    const team = React.useMemo(() => teams.find((tm) => tm.id === id) || null, [teams, id]);

    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    const { partnersFor, popular, status: tournamentStatus } = useTournamentData();
    const { usageFor } = useCompetitiveUsage();
    const { smogonFor } = useSmogonData();
    React.useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    // Saved members store only id/name/sprites + customization; resolve full
    // types/stats/abilities so we can analyze coverage and show stat spreads.
    const [members, setMembers] = React.useState([]);
    React.useEffect(() => {
        if (!team) { setMembers([]); return undefined; }
        let cancelled = false;
        (async () => {
            const base = team.pokemons || [];
            // Seed immediately with what we have (sprites/names) for a fast paint.
            setMembers(base);
            if (typeof fetchPokemonDetails !== 'function') return;
            const enriched = await Promise.all(base.map(async (m) => {
                const detail = await fetchPokemonDetails(m.id).catch(() => null);
                return detail ? { ...detail, ...m, types: detail.types || m.types, stats: detail.stats, abilities: detail.abilities } : m;
            }));
            if (!cancelled) setMembers(enriched);
        })();
        return () => { cancelled = true; };
    }, [team, fetchPokemonDetails]);

    const { teamAnalysis } = React.useMemo(
        () => analyzeTeam(members, pokemonIndex),
        [members, pokemonIndex],
    );

    const offenseTypes = React.useMemo(() => Array.from(teamAnalysis.strengths || []).sort(), [teamAnalysis]);
    const resistEntries = React.useMemo(
        () => Object.entries(teamAnalysis.defensiveCoverage || {}).sort(([, a], [, b]) => b - a),
        [teamAnalysis],
    );
    const weaknessEntries = React.useMemo(
        () => Object.entries(teamAnalysis.weaknesses || {}).sort(([, a], [, b]) => b - a),
        [teamAnalysis],
    );

    // Tournament meta usage map: pokemon id → appearance count across all tournament teams.
    const usageMap = React.useMemo(() => new Map(popular.map((p) => [p.id, p.count])), [popular]);

    // The same grade the builder shows for this roster (one tested formula,
    // utils/teamAnalysis.js). This page used to add a tournament-presence bonus
    // of its own, so a saved team read 72 here and "Arriscado" in the builder.
    const rating = React.useMemo(() => rateTeam(teamAnalysis, members.length), [teamAnalysis, members.length]);

    const partnerSuggestions = React.useMemo(() => {
        if (tournamentStatus !== 'ready' || members.length === 0 || members.length >= 6) return [];
        const ids = members.map((m) => m.id);
        const byId = new Map(pokemonIndex.map((p) => [p.id, p]));
        return partnersFor(ids, ids[ids.length - 1] ?? null, 12)
            .map(({ id: pid }) => byId.get(pid) || { id: pid, name: `#${pid}`, types: [] })
            .filter((entry) => !ids.includes(entry.id));
    }, [members, partnersFor, pokemonIndex, tournamentStatus]);

    if (!team) {
        return (
            <main className="team-detail-view">
                <button type="button" onClick={() => navigate('/teams')} className="team-detail-back">
                    <ChevronLeft className="w-4 h-4" /> {t('savedTeams.backToTeams')}
                </button>
                <EmptyState
                    title={t('savedTeams.notFoundTitle')}
                    message={t('savedTeams.notFoundDesc')}
                    action={{ label: t('savedTeams.viewSaved'), onClick: () => navigate('/teams') }}
                />
            </main>
        );
    }

    const isActive = team.id === activeTeamId;
    const favLabel = team.isFavorite ? t('savedTeams.unpin') : t('savedTeams.pin');

    return (
        <main className="team-detail-view">
            <button type="button" onClick={() => navigate('/teams')} className="team-detail-back">
                <ChevronLeft className="w-4 h-4" /> {t('savedTeams.backToTeams')}
            </button>

            {/* Header */}
            <section className="team-builder-panel team-detail-header p-4 md:p-5">
                <div className="team-detail-header__main">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="team-detail-title">{team.name}</h1>
                            {members.length > 0 && <TeamRatingBadge score={rating.score} grade={rating.grade} />}
                            {team.isFavorite && <span className="team-detail-pill">{t('savedTeams.pinned')}</span>}
                        </div>
                        <p className="team-detail-subtitle">{t('savedTeams.teamSlots', { count: members.length })}</p>
                    </div>

                    {/* One active control — the toggle. A "★ Ativo" badge beside
                        the title said the same thing a second time. */}
                    <div className="team-detail-actions">
                        <button type="button" onClick={() => onEdit?.(team)} className="btn btn-primary">
                            <Pencil className="w-4 h-4" /> {t('common.edit')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTeamId?.(isActive ? null : team.id)}
                            aria-pressed={isActive}
                            className="btn btn-secondary team-detail-active-toggle"
                        >
                            {isActive ? `★ ${t('common.active')}` : t('savedTeams.setActive')}
                        </button>
                        <button type="button" onClick={() => onExport?.(team)} className="btn btn-ghost btn-icon btn-sm touch-target" title={t('savedTeams.exportShowdown')} aria-label={t('savedTeams.exportShowdown')}>
                            <ShowdownIcon className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => onShare?.(team)} className="btn btn-ghost btn-icon btn-sm touch-target" title={t('savedTeams.share')} aria-label={t('savedTeams.share')}>
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => onDuplicate?.(team)} className="btn btn-ghost btn-icon btn-sm touch-target" title={t('savedTeams.duplicateTitle')} aria-label={t('savedTeams.duplicateTitle')}>
                            <Copy className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => onToggleFavorite?.(team)} aria-pressed={!!team.isFavorite} className={`btn btn-ghost btn-icon btn-sm touch-target ${team.isFavorite ? 'team-builder-icon-button--accent' : ''}`} title={favLabel} aria-label={favLabel}>
                            <Star className="w-4 h-4" fill={team.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                        <button type="button" onClick={() => requestDelete?.(team.id, team.name)} className="btn btn-ghost btn-icon btn-sm touch-target team-builder-icon-button--danger" title={t('common.delete')} aria-label={t('builder.deleteTeamAria', { name: team.name })}>
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="team-detail-roster">
                    {team.pokemons.map((p) => (
                        <button
                            key={p.instanceId || `${team.id}-${p.id}`}
                            type="button"
                            onClick={() => showDetails?.(p)}
                            className="team-detail-roster__chip"
                            title={p.name}
                        >
                            <img
                                src={getTeamPokemonDisplaySprite(p)}
                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                alt={p.name}
                                className="team-detail-roster__sprite"
                            />
                            <span className="team-detail-roster__name">{p.name}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Coverage — the one place these numbers live. Five metric tiles
                above it repeated its three counts (and the member count the
                subtitle already gave). Weaknesses lead, as in the builder. */}
            <section className="team-builder-panel team-detail-coverage-panel p-4">
                <div className="team-detail-coverage">
                    <div className="team-detail-coverage__col">
                        <h3 className="team-detail-coverage__title team-detail-coverage__title--danger">
                            <AlertTriangle className="w-3.5 h-3.5" /> {t('savedTeams.weaknesses')}
                            <span className="count-badge">{weaknessEntries.length}</span>
                        </h3>
                        <div className="team-detail-chips">
                            {weaknessEntries.length > 0
                                ? weaknessEntries.map(([type, count]) => <CoverageChip key={type} type={type} count={count} />)
                                : <p className="team-detail-note">{t('builder.noWeaknesses')}</p>}
                        </div>
                    </div>
                    <div className="team-detail-coverage__col">
                        <h3 className="team-detail-coverage__title team-detail-coverage__title--primary">
                            <Shield className="w-3.5 h-3.5" /> {t('savedTeams.defense')}
                            <span className="count-badge">{resistEntries.length}</span>
                        </h3>
                        <div className="team-detail-chips">
                            {resistEntries.length > 0
                                ? resistEntries.map(([type, count]) => <CoverageChip key={type} type={type} count={count} />)
                                : <p className="team-detail-note">{t('builder.noResistances')}</p>}
                        </div>
                    </div>
                    <div className="team-detail-coverage__col">
                        <h3 className="team-detail-coverage__title team-detail-coverage__title--success">
                            <Swords className="w-3.5 h-3.5" /> {t('savedTeams.offense')}
                            <span className="count-badge">{offenseTypes.length}</span>
                        </h3>
                        <div className="team-detail-chips">
                            {offenseTypes.length > 0
                                ? offenseTypes.map((type) => <CoverageChip key={type} type={type} />)
                                : <p className="team-detail-note">{t('builder.noOffense')}</p>}
                        </div>
                    </div>
                </div>
            </section>

            {/* Members */}
            <section className="team-builder-panel team-detail-members-panel p-5 md:p-6">
                <h2 className="team-detail-section-title">{t('savedTeams.roster')}</h2>
                <div className="team-detail-members">
                    {members.map((m) => {
                        const cz = m.customization || {};
                        const weaknesses = getPokemonWeaknessEntries(m.types || []).slice(0, 6);
                        const usage = usageFor(m.id);
                        const smogon = smogonFor(m.id);
                        const itemPicks = suggestItemsForPokemon(m, language, usage, smogon);
                        const itemsFromMeta = Boolean(usage && usage.n >= 2 && usage.items?.length);
                        const itemsFromSmogon = !itemsFromMeta && Boolean(smogon?.sets?.length);
                        const moves = (cz.moves || []).filter(Boolean);
                        return (
                            <article key={m.instanceId || m.id} className="team-detail-member">
                                <div className="team-detail-member__head">
                                    <img
                                        src={getTeamPokemonDisplaySprite(m)}
                                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                        alt={m.name}
                                        className="team-detail-member__sprite"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button type="button" onClick={() => showDetails?.(m)} className="team-detail-member__name">
                                                {m.name} <span className="team-detail-member__id">#{m.id}</span>
                                            </button>
                                            {usageMap.get(m.id) > 0 && (
                                                <span className="team-detail-meta-pill" title={t('savedTeams.appearsIn', { count: usageMap.get(m.id) })}>
                                                    <Trophy className="w-2.5 h-2.5" />{usageMap.get(m.id)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(m.types || []).map((type) => <TypeChip key={type} type={type} size="sm" />)}
                                        </div>
                                    </div>
                                </div>

                                {/* Build line */}
                                <div className="team-detail-member__build">
                                    {cz.item && (
                                        <span className="team-detail-build-pill">
                                            <img src={itemSpriteUrl(cz.item)} alt="" className="w-4 h-4 image-pixelated" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                            {cz.item.replace(/-/g, ' ')}
                                        </span>
                                    )}
                                    {cz.ability && cz.ability !== 'unknown' && (
                                        <button type="button" onClick={(e) => goToAbility(cz.ability, e)} className="team-detail-build-pill capitalize cursor-pointer transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                            {cz.ability.replace(/-/g, ' ')}
                                        </button>
                                    )}
                                    {showTeraType && cz.teraType && (
                                        <span className="team-detail-build-pill team-detail-build-pill--tera" style={{ '--type-chip': typeColors[cz.teraType] }}>
                                            <Sparkles className="w-3 h-3" /> Tera {cz.teraType}
                                        </span>
                                    )}
                                </div>

                                {/* Stats */}
                                {m.stats?.length > 0 && (
                                    <div className="team-detail-member__stats">
                                        {m.stats.map((s) => (
                                            <CompactStatBar key={s.name} stat={s.name} value={s.base_stat} />
                                        ))}
                                    </div>
                                )}

                                {/* Moves */}
                                {moves.length > 0 && (
                                    <div className="team-detail-member__moves">
                                        {moves.map((mv) => (
                                            <button key={mv} type="button" onClick={(e) => goToMove(mv, e)} className="team-detail-move capitalize cursor-pointer transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                                {mv.replace(/-/g, ' ')}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Per-pokemon weaknesses */}
                                {weaknesses.length > 0 && (
                                    <div className="team-detail-member__weak">
                                        <p className="team-detail-member__sub">{t('savedTeams.weakTo')}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {weaknesses.map(({ type, multiplier }) => (
                                                <WeaknessBadge key={type} type={type} multiplier={multiplier} colors={colors} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Item suggestions */}
                                {itemPicks.length > 0 && (
                                    <div className="team-detail-member__items">
                                        <p className="team-detail-member__sub">
                                            {itemsFromMeta
                                                ? <><Trophy className="w-3 h-3 inline -mt-0.5" /> {t('savedTeams.tournamentItems')}</>
                                                : itemsFromSmogon
                                                    ? <><Sparkles className="w-3 h-3 inline -mt-0.5" /> {t('savedTeams.smogonItems')}</>
                                                    : <><Sparkles className="w-3 h-3 inline -mt-0.5" /> {t('savedTeams.suggestedItems')}</>}
                                        </p>
                                        <div className="team-detail-item-list">
                                            {itemPicks.map((it) => (
                                                <button
                                                    key={it.slug}
                                                    type="button"
                                                    onClick={() => goToItem(it.slug)}
                                                    className="team-detail-item"
                                                    title={t('savedTeams.viewItem', { name: it.label })}
                                                >
                                                    <img src={itemSpriteUrl(it.slug)} alt="" className="w-6 h-6 image-pixelated shrink-0" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                                    <div className="min-w-0 flex-1">
                                                        <span className="team-detail-item__name">{it.label}</span>
                                                        <span className="team-detail-item__reason">{it.reason}</span>
                                                    </div>
                                                    <ArrowUpRight className="team-detail-item__go w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* Tournament partner suggestions */}
            {partnerSuggestions.length > 0 && (
                <section className="team-builder-panel p-5 md:p-6">
                    <h2 className="team-detail-section-title">
                        <Trophy className="w-4 h-4 text-primary inline -mt-1 mr-1.5" />
                        {t('savedTeams.metaPartners')}
                    </h2>
                    <p className="team-detail-note mb-3">{t('savedTeams.metaPartnersDesc')}</p>
                    <div className="team-detail-partners">
                        {partnerSuggestions.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => showDetails?.(p)}
                                className="team-detail-partner"
                                title={(p.name || '').replace(/-/g, ' ')}
                            >
                                <img
                                    src={getPokemonFrontSpriteUrl(p.id)}
                                    alt=""
                                    loading="lazy"
                                    className="w-10 h-10 image-pixelated"
                                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                />
                                <span className="team-detail-partner__name capitalize">{(p.name || '').replace(/-/g, ' ')}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
