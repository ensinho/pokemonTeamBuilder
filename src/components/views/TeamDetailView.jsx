import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Pencil, Share2, Star, Trash2, Trophy, Shield, Swords,
    AlertTriangle, Gauge, Sparkles, CircleCheck,
} from 'lucide-react';

import '../../styles/team-detail-view.css';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';
import { getTeamPokemonDisplaySprite, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { analyzeTeam } from '../../utils/teamAnalysis';
import { suggestItemsForPokemon, itemSpriteUrl } from '../../utils/itemSuggestions';
import { TypeBadge } from '../TypeBadge';
import { ShowdownIcon } from '../icons';
import { CompactStatBar, getPokemonWeaknessEntries, WeaknessBadge } from '../modals/pokemonModalShared';
import { useTranslation } from '../../hooks/useTranslation';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTournamentData } from '../../hooks/useTournamentData';
import { EmptyState } from '../EmptyState';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function hexToRgba(hex, alpha) {
    if (typeof hex !== 'string') return `rgba(119,119,119,${alpha})`;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return `rgba(119,119,119,${alpha})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Subtle, outlined coverage chip (matches the Team Builder analysis chips).
function CoverageChip({ type, count, tone = 'neutral' }) {
    const { t } = useTranslation();
    const lower = type.toLowerCase();
    const color = typeColors[lower] || '#777';
    const icon = typeIcons[lower];
    const scoreClass = tone === 'danger' ? 'team-detail-chip__score--danger' : 'team-detail-chip__score';
    return (
        <span
            className="team-detail-chip"
            style={{ backgroundColor: hexToRgba(color, 0.13), borderColor: hexToRgba(color, 0.55), color }}
        >
            {icon && <img src={icon} alt="" className="w-3 h-3 object-contain shrink-0" aria-hidden="true" />}
            <span className="leading-none">{t(`types.${lower}`, { defaultValue: type }).toUpperCase()}</span>
            {count > 1 && <span className={scoreClass}>{count}×</span>}
        </span>
    );
}

function MetricTile({ icon, value, label, accent }) {
    return (
        <div className="team-detail-metric" style={accent ? { '--metric-color': accent } : undefined}>
            <span className="team-detail-metric__icon" style={accent ? { color: accent } : undefined}>{icon}</span>
            <span className="team-detail-metric__value">{value}</span>
            <span className="team-detail-metric__label">{label}</span>
        </div>
    );
}

export function TeamDetailView({
    teams = [],
    onEdit,
    onShare,
    onExport,
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
    const pt = language === 'pt';

    const team = React.useMemo(() => teams.find((tm) => tm.id === id) || null, [teams, id]);

    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    const { partnersFor, status: tournamentStatus } = useTournamentData();
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

    const avgBst = React.useMemo(() => {
        const totals = members
            .map((m) => (m.stats || []).reduce((sum, s) => sum + (s.base_stat ?? s.value ?? 0), 0))
            .filter((x) => x > 0);
        if (!totals.length) return 0;
        return Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
    }, [members]);

    const score = React.useMemo(() => {
        if (!members.length) return 0;
        const raw = 58 + offenseTypes.length * 2 + resistEntries.length * 1.6 - weaknessEntries.length * 8
            + (members.length === 6 ? 6 : 0);
        return Math.round(clamp(raw, 5, 100));
    }, [members.length, offenseTypes.length, resistEntries.length, weaknessEntries.length]);

    const grade = React.useMemo(() => {
        if (score >= 82) return { label: pt ? 'Excelente' : 'Excellent', color: 'var(--color-success)' };
        if (score >= 64) return { label: pt ? 'Sólido' : 'Solid', color: 'var(--color-primary)' };
        if (score >= 42) return { label: pt ? 'Ajustar' : 'Needs tuning', color: 'var(--color-accent)' };
        return { label: pt ? 'Frágil' : 'Fragile', color: 'var(--color-danger)' };
    }, [score, pt]);

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
                    <ChevronLeft className="w-4 h-4" /> {pt ? 'Voltar aos times' : 'Back to teams'}
                </button>
                <EmptyState
                    title={pt ? 'Time não encontrado' : 'Team not found'}
                    message={pt ? 'Este time pode ter sido removido.' : 'This team may have been removed.'}
                    action={{ label: pt ? 'Ver times salvos' : 'View saved teams', onClick: () => navigate('/teams') }}
                />
            </main>
        );
    }

    const isActive = team.id === activeTeamId;

    return (
        <main className="team-detail-view">
            <button type="button" onClick={() => navigate('/teams')} className="team-detail-back">
                <ChevronLeft className="w-4 h-4" /> {pt ? 'Voltar aos times' : 'Back to teams'}
            </button>

            {/* Header */}
            <section className="team-builder-panel team-detail-header p-5 md:p-6">
                <div className="team-detail-header__main">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="team-detail-title">{team.name}</h1>
                            <div
                                className="team-detail-score-badge"
                                style={{
                                    backgroundColor: hexToRgba(grade.color, 0.12),
                                    borderColor: hexToRgba(grade.color, 0.35),
                                    color: grade.color,
                                }}
                            >
                                <span className="team-detail-score-badge__value">{score}</span>
                                <span className="team-detail-score-badge__label">{grade.label}</span>
                            </div>
                            {isActive && <span className="team-detail-active-badge">★ {t('common.active')}</span>}
                            {team.isFavorite && <span className="team-detail-pill">{pt ? 'Fixado' : 'Pinned'}</span>}
                        </div>
                        <p className="team-detail-subtitle">
                            {pt
                                ? `${members.length} de 6 membros · análise de cobertura, fraquezas e itens`
                                : `${members.length} of 6 members · coverage, weakness & item analysis`}
                        </p>
                    </div>

                    <div className="team-detail-actions">
                        <button type="button" onClick={() => onEdit?.(team)} className="btn btn-primary">
                            <Pencil className="w-4 h-4" /> {t('common.edit')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTeamId?.(isActive ? null : team.id)}
                            className={`btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
                            style={isActive ? { backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff' } : undefined}
                        >
                            {isActive ? `★ ${t('common.active')}` : (pt ? 'Ativar' : 'Set Active')}
                        </button>
                        <button type="button" onClick={() => onToggleFavorite?.(team)} className={`btn btn-outline !p-2 ${team.isFavorite ? 'team-builder-icon-button--accent' : ''}`} title={pt ? 'Favoritar' : 'Favorite'}>
                            <Star className="w-4 h-4" fill={team.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                        <button type="button" onClick={() => onShare?.(team)} className="btn btn-outline !p-2" title={pt ? 'Compartilhar' : 'Share'}>
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => onExport?.(team)} className="btn btn-outline !p-2" title={pt ? 'Exportar Showdown' : 'Export Showdown'}>
                            <ShowdownIcon className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => requestDelete?.(team.id, team.name)} className="btn btn-outline !p-2 team-builder-icon-button--danger" title={pt ? 'Deletar' : 'Delete'}>
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="team-detail-headline-row">
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

                {/* Key metrics, inline in the header card */}
                <div className="team-detail-metrics">
                    <MetricTile icon={<CircleCheck className="w-4 h-4" />} value={`${members.length}/6`} label={pt ? 'Membros' : 'Members'} accent="var(--color-info)" />
                    <MetricTile icon={<Swords className="w-4 h-4" />} value={offenseTypes.length} label={pt ? 'Cobertura' : 'Coverage'} accent="var(--color-success)" />
                    <MetricTile icon={<Shield className="w-4 h-4" />} value={resistEntries.length} label={pt ? 'Resistências' : 'Resistances'} accent="var(--color-primary)" />
                    <MetricTile icon={<AlertTriangle className="w-4 h-4" />} value={weaknessEntries.length} label={pt ? 'Fraquezas' : 'Weaknesses'} accent="var(--color-danger)" />
                    <MetricTile icon={<Gauge className="w-4 h-4" />} value={avgBst || '—'} label={pt ? 'BST médio' : 'Avg BST'} accent="var(--color-accent)" />
                </div>
                </div>
            </section>

            {/* Coverage */}
            <section className="team-builder-panel team-detail-coverage-panel p-4">
                <div className="team-detail-coverage">
                    <div className="team-detail-coverage__col">
                        <h3 className="team-detail-coverage__title team-detail-coverage__title--success">
                            <Swords className="w-3.5 h-3.5" /> {pt ? 'Cobertura Ofensiva' : 'Offensive coverage'}
                        </h3>
                        <div className="team-detail-chips">
                            {offenseTypes.length > 0
                                ? offenseTypes.map((type) => <CoverageChip key={type} type={type} />)
                                : <p className="team-detail-note">{pt ? 'Sem vantagens de tipo.' : 'No type advantages.'}</p>}
                        </div>
                    </div>
                    <div className="team-detail-coverage__col">
                        <h3 className="team-detail-coverage__title team-detail-coverage__title--primary">
                            <Shield className="w-3.5 h-3.5" /> {pt ? 'Resistências' : 'Defensive coverage'}
                        </h3>
                        <div className="team-detail-chips">
                            {resistEntries.length > 0
                                ? resistEntries.map(([type, count]) => <CoverageChip key={type} type={type} count={count} />)
                                : <p className="team-detail-note">{pt ? 'Sem resistências compartilhadas.' : 'No shared resistances.'}</p>}
                        </div>
                    </div>
                    <div className="team-detail-coverage__col">
                        <h3 className="team-detail-coverage__title team-detail-coverage__title--danger">
                            <AlertTriangle className="w-3.5 h-3.5" /> {pt ? 'Fraquezas em comum' : 'Shared weaknesses'}
                        </h3>
                        <div className="team-detail-chips">
                            {weaknessEntries.length > 0
                                ? weaknessEntries.map(([type, count]) => <CoverageChip key={type} type={type} count={count} tone="danger" />)
                                : <p className="team-detail-note">{pt ? 'Defesa sólida como rocha.' : 'Rock-solid defensively.'}</p>}
                        </div>
                    </div>
                </div>
            </section>

            {/* Members */}
            <section className="team-builder-panel p-5 md:p-6">
                <h2 className="team-detail-section-title">{pt ? 'Integrantes' : 'Team members'}</h2>
                <div className="team-detail-members">
                    {members.map((m) => {
                        const cz = m.customization || {};
                        const weaknesses = getPokemonWeaknessEntries(m.types || []).slice(0, 6);
                        const itemPicks = suggestItemsForPokemon(m, language);
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
                                        <button type="button" onClick={() => showDetails?.(m)} className="team-detail-member__name">
                                            {m.name} <span className="team-detail-member__id">#{m.id}</span>
                                        </button>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(m.types || []).map((type) => <TypeBadge key={type} type={type} colors={colors} />)}
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
                                        <span className="team-detail-build-pill capitalize">{cz.ability.replace(/-/g, ' ')}</span>
                                    )}
                                    {cz.teraType && (
                                        <span className="team-detail-build-pill team-detail-build-pill--tera" style={{ color: typeColors[cz.teraType] }}>
                                            <Sparkles className="w-3 h-3" /> {pt ? 'Tera' : 'Tera'} {cz.teraType}
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
                                            <span key={mv} className="team-detail-move capitalize">{mv.replace(/-/g, ' ')}</span>
                                        ))}
                                    </div>
                                )}

                                {/* Per-pokemon weaknesses */}
                                {weaknesses.length > 0 && (
                                    <div>
                                        <p className="team-detail-member__sub">{pt ? 'Fraquezas' : 'Weak to'}</p>
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
                                        <p className="team-detail-member__sub"><Sparkles className="w-3 h-3 inline -mt-0.5" /> {pt ? 'Itens sugeridos' : 'Suggested items'}</p>
                                        <div className="team-detail-item-list">
                                            {itemPicks.map((it) => (
                                                <div key={it.slug} className="team-detail-item" title={it.reason}>
                                                    <img src={itemSpriteUrl(it.slug)} alt="" className="w-6 h-6 image-pixelated shrink-0" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                                    <div className="min-w-0">
                                                        <span className="team-detail-item__name">{it.label}</span>
                                                        <span className="team-detail-item__reason">{it.reason}</span>
                                                    </div>
                                                </div>
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
                        {pt ? 'Parceiros de torneios' : 'Tournament partners'}
                    </h2>
                    <p className="team-detail-note mb-3">
                        {pt
                            ? 'Pokémon frequentemente usados ao lado deste time em campeonatos.'
                            : 'Pokémon often built alongside this team in championships.'}
                    </p>
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
