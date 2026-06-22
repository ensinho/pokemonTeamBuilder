import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../styles/pokemon-detail-view.css';

import { typeChart, typeColors, typeIcons } from '../../constants/types';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import {
    resolvePokemonDetail,
    getPokemonSpeciesData,
    getEvolutionChainData,
    getStaticPokemonDetail,
    getPokemonApiData,
} from '../../services/pokemonDataCache';
import { buildPokemonForms } from '../../utils/pokemonForms';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useToastStore } from '../../store/useToastStore';
import { StatBar } from '../StatBar';
import { TypeBadge } from '../TypeBadge';
import { AbilityChip } from '../AbilityChip';
import { EmptyState } from '../EmptyState';
import { PokeballIcon, SparklesIcon, StarIcon, PlusIcon, ChevronLeftIcon, ShareIcon } from '../icons';

const ALL_TYPES = Object.keys(typeIcons);
const toChartKey = (type) => type.charAt(0).toUpperCase() + type.slice(1);

// Full offensive matchup of attacking types against this Pokémon's defending types.
function getTypeMatchups(defendingTypes = []) {
    const weaknesses = [];
    const resistances = [];
    for (const attack of ALL_TYPES) {
        const multiplier = defendingTypes.reduce((product, def) => {
            const taken = typeChart[def]?.damageTaken;
            return product * (taken?.[toChartKey(attack)] ?? 1);
        }, 1);
        if (multiplier > 1) weaknesses.push({ type: attack, multiplier });
        else if (multiplier < 1) resistances.push({ type: attack, multiplier });
    }
    weaknesses.sort((a, b) => b.multiplier - a.multiplier || a.type.localeCompare(b.type));
    resistances.sort((a, b) => a.multiplier - b.multiplier || a.type.localeCompare(b.type));
    return { weaknesses, resistances };
}

function MultBadge({ type, multiplier }) {
    const { t } = useTranslation();
    return (
        <span className="pdv__mult" style={{ borderColor: `${typeColors[type]}55`, background: `${typeColors[type]}14` }}>
            <img src={typeIcons[type]} alt="" aria-hidden="true" />
            <span>{t(`types.${type}`, { defaultValue: type })}</span>
            <span className="pdv__mult-x" style={{ color: typeColors[type] }}>×{multiplier}</span>
        </span>
    );
}

export function PokemonDetailView({
    colors,
    favoritePokemons,
    onToggleFavoritePokemon,
    onAdd,
    currentTeam = [],
}) {
    const { idOrName } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const showToast = useToastStore((s) => s.showToast);
    const allPokemons = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    const [detail, setDetail] = useState(null);
    const [status, setStatus] = useState('loading'); // loading | ready | error
    const [showShiny, setShowShiny] = useState(false);
    const [evolution, setEvolution] = useState([]);
    const [forms, setForms] = useState([]);
    const [tab, setTab] = useState('overview');

    // Resolve the index entry (so a name route maps to a numeric id).
    const indexEntry = useMemo(() => {
        const key = String(idOrName || '').toLowerCase();
        return allPokemons.find((p) => String(p.id) === key || p.name?.toLowerCase() === key) || null;
    }, [allPokemons, idOrName]);

    const resolvedId = indexEntry?.id ?? Number.parseInt(idOrName, 10);

    useEffect(() => {
        let cancelled = false;
        setStatus('loading');
        setDetail(null);
        setEvolution([]);
        setForms([]);
        setTab('overview');
        setShowShiny(false);

        if (!Number.isInteger(resolvedId) || resolvedId <= 0) {
            setStatus('error');
            return undefined;
        }

        (async () => {
            const data = await resolvePokemonDetail(resolvedId);
            if (cancelled) return;
            if (!data) { setStatus('error'); return; }
            setDetail(data);
            setStatus('ready');

            // Evolution chain — prefer a pre-baked url, else fetch the species.
            try {
                let chainUrl = data.evolution_chain_url;
                if (!chainUrl) {
                    const species = await getPokemonSpeciesData(resolvedId);
                    chainUrl = species?.evolution_chain?.url || null;
                }
                if (!chainUrl || cancelled) return;
                const chainData = await getEvolutionChainData(chainUrl);
                const chain = [];
                let node = chainData.chain;
                while (node) {
                    const evoId = Number.parseInt(node.species.url.split('/').filter(Boolean).pop(), 10);
                    chain.push({ id: evoId, name: node.species.name });
                    node = node.evolves_to?.[0];
                }
                const withSprites = await Promise.all(chain.map(async (evo) => {
                    const staticDetail = await getStaticPokemonDetail(evo.id).catch(() => null);
                    return { ...evo, sprite: staticDetail?.sprite || getPokemonArtworkSpriteUrl(evo.id) };
                }));
                if (!cancelled) setEvolution(withSprites);
            } catch (_) {
                /* evolution is optional flavour */
            }

            // Alternate battle forms (megas / regionals / gmax) — base species only.
            try {
                if (resolvedId <= 1025) {
                    const species = await getPokemonSpeciesData(resolvedId);
                    if (species?.varieties?.length) {
                        const built = await buildPokemonForms(species, { fetchPokemon: getPokemonApiData });
                        if (!cancelled) setForms(built);
                    }
                }
            } catch (_) {
                /* forms are optional flavour */
            }
        })();

        return () => { cancelled = true; };
    }, [resolvedId]);

    const matchups = useMemo(() => getTypeMatchups(detail?.types || []), [detail]);
    const statTotal = useMemo(
        () => (detail?.stats || []).reduce((sum, s) => sum + (s.base_stat || 0), 0),
        [detail]
    );

    if (status === 'error') {
        return (
            <EmptyState
                title={t('pdetail.notFound')}
                message={t('pdetail.notFoundDesc')}
                action={{ label: t('pdetail.backToList'), onClick: () => navigate('/pokedex') }}
            />
        );
    }

    if (status === 'loading' || !detail) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '50vh', color: 'var(--color-primary)' }} role="status" aria-label="Loading">
                <PokeballIcon className="w-14 h-14 animate-spin opacity-70" />
            </div>
        );
    }

    const isFavorite = favoritePokemons?.has?.(detail.id);
    const isOnTeam = currentTeam.some((m) => m.id === detail.id);
    const art = showShiny ? getPokemonArtworkSpriteUrl(detail.id, { shiny: true }) : getPokemonArtworkSpriteUrl(detail.id);

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            showToast(t('pdetail.shareCopied'), 'success');
        } catch (_) {
            showToast(window.location.href, 'info');
        }
    };

    return (
        <div className="pdv">
            <button type="button" className="pdv__back" onClick={() => navigate('/pokedex')}>
                <ChevronLeftIcon className="w-4 h-4" /> {t('pdetail.backToList')}
            </button>

            <div className="pdv__grid">
                {/* Identity rail */}
                <aside className="pdv__identity" style={{ '--type-glow': typeColors[detail.types?.[0]] || 'var(--color-primary)' }}>
                    <div className="pdv__artwrap">
                        <img
                            src={art}
                            alt={detail.name}
                            className="pdv__art"
                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                        />
                        <div className="pdv__art-actions">
                            <button
                                type="button"
                                className={`pdv__iconbtn ${showShiny ? 'is-active' : ''}`}
                                onClick={() => setShowShiny((v) => !v)}
                                aria-pressed={showShiny}
                                title={t('modals.pokedexToggleShinyAria', { defaultValue: 'Toggle shiny' })}
                            >
                                <SparklesIcon className="w-4 h-4" />
                            </button>
                            {onToggleFavoritePokemon && (
                                <button
                                    type="button"
                                    className={`pdv__iconbtn ${isFavorite ? 'is-active' : ''}`}
                                    onClick={() => onToggleFavoritePokemon(detail.id)}
                                    aria-pressed={isFavorite}
                                    title={isFavorite ? t('modals.pokedexRemoveFromFavoritesAria', { defaultValue: 'Remove favorite' }) : t('modals.pokedexAddToFavoritesAria', { defaultValue: 'Add favorite' })}
                                >
                                    <StarIcon className="w-4 h-4" isFavorite={isFavorite} color="currentColor" />
                                </button>
                            )}
                            <button type="button" className="pdv__iconbtn" onClick={handleShare} title={t('common.share', { defaultValue: 'Share' })}>
                                <ShareIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <span className="pdv__dex">#{String(detail.id).padStart(4, '0')}</span>
                    <h1 className="pdv__name">{detail.name?.replace(/-/g, ' ')}</h1>
                    <div className="pdv__types">
                        {detail.types?.map((type) => <TypeBadge key={type} type={type} />)}
                    </div>

                    <div className="pdv__facts">
                        <div className="pdv__fact">
                            <div className="pdv__fact-label">{t('pdetail.height')}</div>
                            <div className="pdv__fact-value">{detail.height ? `${detail.height} m` : '—'}</div>
                        </div>
                        <div className="pdv__fact">
                            <div className="pdv__fact-label">{t('pdetail.weight')}</div>
                            <div className="pdv__fact-value">{detail.weight ? `${detail.weight} kg` : '—'}</div>
                        </div>
                        <div className="pdv__fact">
                            <div className="pdv__fact-label">{t('pdetail.generation')}</div>
                            <div className="pdv__fact-value">{(detail.generation || indexEntry?.generation || '—').replace('generation-', '').toUpperCase()}</div>
                        </div>
                    </div>

                    {onAdd && (
                        isOnTeam ? (
                            <span className="pdv__cta pdv__cta--owned">{t('builder.onTeam', { defaultValue: 'On your team' })}</span>
                        ) : (
                            <button type="button" className="pdv__cta" onClick={() => onAdd(detail)}>
                                <PlusIcon className="w-4 h-4" /> {t('pdetail.addToTeam')}
                            </button>
                        )
                    )}
                </aside>

                {/* Stats + matchups */}
                <div>
                    <section className="pdv__panel">
                        <div className="pdv__panel-title">
                            <span>{t('pdetail.baseStats')}</span>
                            <span className="pdv__total">{t('pdetail.total')} {statTotal}</span>
                        </div>
                        <div className="pdv__stats">
                            {detail.stats?.map((s) => <StatBar key={s.name} stat={s.name} value={s.base_stat} colors={colors} />)}
                        </div>
                    </section>

                    <section className="pdv__panel">
                        <div className="pdv__matchups">
                            <div>
                                <div className="pdv__matchup-label pdv__matchup-label--weak">{t('pdetail.weaknesses')}</div>
                                <div className="pdv__badges">
                                    {matchups.weaknesses.length
                                        ? matchups.weaknesses.map(({ type, multiplier }) => <MultBadge key={type} type={type} multiplier={multiplier} />)
                                        : <span className="text-sm text-muted">—</span>}
                                </div>
                            </div>
                            <div>
                                <div className="pdv__matchup-label pdv__matchup-label--resist">{t('pdetail.resistances')}</div>
                                <div className="pdv__badges">
                                    {matchups.resistances.length
                                        ? matchups.resistances.map(({ type, multiplier }) => <MultBadge key={type} type={type} multiplier={multiplier} />)
                                        : <span className="text-sm text-muted">—</span>}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="pdv__panel">
                        <div className="pdv__tabs">
                            <button type="button" className={`pdv__tab ${tab === 'overview' ? 'is-active' : ''}`} onClick={() => setTab('overview')}>{t('pdetail.abilitiesTab')}</button>
                            <button type="button" className={`pdv__tab ${tab === 'moves' ? 'is-active' : ''}`} onClick={() => setTab('moves')}>{t('pdetail.movesTab')}</button>
                            {evolution.length > 1 && (
                                <button type="button" className={`pdv__tab ${tab === 'evolution' ? 'is-active' : ''}`} onClick={() => setTab('evolution')}>{t('pdetail.evolutionTab')}</button>
                            )}
                        </div>

                        {tab === 'overview' && (
                            <div className="pdv__chips">
                                {detail.abilities?.length
                                    ? detail.abilities.map((a, i) => <AbilityChip key={a.name || i} ability={a} />)
                                    : <span className="text-sm text-muted">—</span>}
                            </div>
                        )}

                        {tab === 'moves' && (
                            <div className="pdv__chips">
                                {detail.moves?.length
                                    ? detail.moves.map((m) => <span key={m.name} className="pdv__move">{m.name.replace(/-/g, ' ')}</span>)
                                    : <span className="text-sm text-muted">—</span>}
                            </div>
                        )}

                        {tab === 'evolution' && (
                            <div className="pdv__evo">
                                {evolution.map((evo, i) => (
                                    <React.Fragment key={evo.id}>
                                        <button type="button" className="pdv__evo-node" onClick={() => navigate(`/pokemon/${evo.id}`)}>
                                            <img src={evo.sprite} alt={evo.name} onError={(e) => { e.currentTarget.src = getPokemonFrontSpriteUrl(evo.id); }} />
                                            <span>{evo.name.replace(/-/g, ' ')}</span>
                                        </button>
                                        {i < evolution.length - 1 && <span className="pdv__evo-arrow" aria-hidden="true">→</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </section>

                    {forms.length > 0 && (
                        <section className="pdv__panel">
                            <div className="pdv__panel-title"><span>{t('pdetail.forms')}</span></div>
                            <div className="pdv__forms">
                                {forms.map((form) => (
                                    <button
                                        key={form.id}
                                        type="button"
                                        className="pdv__form"
                                        onClick={() => navigate(`/pokemon/${form.id}`)}
                                        title={form.displayName}
                                    >
                                        <img src={form.sprite || POKEBALL_PLACEHOLDER_URL} alt={form.displayName} onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }} />
                                        <span>{form.displayName}</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
