import React from 'react';
import '../styles/home-dashboard.css';
import { useTournamentData } from '../hooks/useTournamentData';
import { useMetaUsage } from '../hooks/useMetaUsage';
import { useTranslation } from '../hooks/useTranslation';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { Flame, Puzzle } from 'lucide-react';
import {
    SwordsIcon, SavedTeamsIcon, TrophyIcon, CalculatorIcon, GaugeIcon,
    PokeballIcon, ScrollIcon, SparklesIcon, BagIcon,
} from './icons';

const CORE_SHORTCUTS = [
    { 
        key: 'builder', 
        path: '/builder', 
        icon: <SwordsIcon className="w-5 h-5" />,
        desc: {
            pt: 'Monte e analise seu time competitivo de Pokémon.',
            en: 'Build and analyze your competitive Pokémon team.'
        }
    },
    { 
        key: 'pokemonList', 
        path: '/pokedex', 
        icon: <PokeballIcon className="w-5 h-5" />,
        desc: {
            pt: 'Consulte a Pokédex completa e estatísticas base.',
            en: 'Browse the complete Pokedex and base stats.'
        }
    },
    {
        key: 'pokepuzzle',
        path: '/pokepuzzle',
        icon: <Puzzle className="w-5 h-5" />,
        desc: {
            pt: 'Adivinhe o Pokémon do dia e teste seus conhecimentos.',
            en: 'Guess the daily Pokémon and test your knowledge.'
        }
    },
    {
        key: 'tournaments',
        path: '/tournaments',
        icon: <TrophyIcon className="w-5 h-5" />,
        desc: {
            pt: 'Explore times e o meta da VGC de torneios oficiais.',
            en: 'Explore winning teams and the tournament VGC meta.'
        }
    },
];

const UTILITY_SHORTCUTS = [
    { key: 'savedTeams', path: '/favorites?tab=teams', icon: <SavedTeamsIcon className="w-5 h-5" /> },
    { key: 'damageCalc', path: '/damage-calculator', icon: <CalculatorIcon className="w-5 h-5" /> },
    { key: 'speedTiers', path: '/speed-tiers', icon: <GaugeIcon className="w-5 h-5" /> },
    { key: 'moves', path: '/moves', icon: <ScrollIcon className="w-5 h-5" /> },
    { key: 'abilities', path: '/abilities', icon: <SparklesIcon className="w-5 h-5" /> },
    { key: 'items', path: '/items', icon: <BagIcon className="w-5 h-5" /> },
];

export function HomeDashboard({ navigate, puzzleCard }) {
    const { t, language } = useTranslation();
    const { popular, recent, status } = useTournamentData();
    // Rank the popular row by real Smogon ladder usage for the current regulation
    // (same source as the Meta page), falling back to tournament counts while it loads.
    const { ranked: metaRanked, format: metaFormat } = useMetaUsage();
    const [activePokemonId, setActivePokemonId] = React.useState(null);

    const usingMeta = metaRanked.length > 0;
    const topPopular = (usingMeta ? metaRanked : popular).slice(0, 15);
    const isLoading = status === 'loading';

    const handleMouseEnterMon = (id) => {
        setActivePokemonId(id);
    };

    const handleMouseLeaveGrid = () => {
        setActivePokemonId(null);
    };

    const filteredTeams = React.useMemo(() => {
        if (!activePokemonId) return recent.slice(0, 2);
        const matched = recent.filter(team => (team.pokemons || []).some(mon => mon.id === activePokemonId));
        return matched.length > 0 ? matched.slice(0, 2) : recent.slice(0, 2);
    }, [recent, activePokemonId]);

    return (
        <div className="hd-stack">
            {/* Quick access — dual-tiered launcher for the whole app */}
            <section className="hd-panel">
                <div className="hd-panel__head">
                    <span className="hd-panel__title"><SwordsIcon className="w-4 h-4" /> {t('home.shortcuts')}</span>
                </div>
                <div className="hd-panel__body">
                    {/* Primary Core Tools Grid */}
                    <div className="hd-core-grid">
                        {CORE_SHORTCUTS.map((l) => (
                            <button key={l.key} type="button" className="hd-core-tile" onClick={() => navigate(l.path)}>
                                <div className="hd-core-tile__icon-wrap">
                                    <span className="hd-core-tile__icon" aria-hidden="true">{l.icon}</span>
                                </div>
                                <div className="hd-core-tile__info">
                                    <span className="hd-core-tile__label">{t(`nav.${l.key}`)}</span>
                                    <span className="hd-core-tile__desc">{l.desc[language] || l.desc['en']}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                    
                    {/* Divider and Secondary Utilities Grid */}
                    <div className="hd-divider-title">
                        {language === 'pt' ? 'Bancos de Dados e Utilitários' : 'Databases & Utilities'}
                    </div>
                    <div className="hd-tiles">
                        {UTILITY_SHORTCUTS.map((l) => (
                            <button key={l.key} type="button" className="hd-tile" onClick={() => navigate(l.path)}>
                                <span className="hd-tile__icon" aria-hidden="true">{l.icon}</span>
                                <span className="hd-tile__label">{t(`nav.${l.key}`)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Daily PokéPuzzle teaser — featured right below the shortcuts on
                mobile only; on desktop it renders in the sidebar instead. */}
            {puzzleCard && <div className="xl:hidden">{puzzleCard}</div>}

            {/* Loading skeletons while the tournament + Pokémon dataset loads */}
            {isLoading && (
                <section className="hd-panel">
                    <div className="hd-panel__head">
                        <span className="hd-panel__title"><Flame className="w-4 h-4" /> {language === 'pt' ? 'VGC Meta & Equipes' : 'VGC Meta & Teams'}</span>
                    </div>
                    <div className="hd-panel__body space-y-4">
                        <div>
                            <div className="hd-meta-mons-grid">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} className="hd-skel-mon-btn" aria-hidden="true">
                                        <span className="hd-skel hd-skel-mon-icon" />
                                        <span className="hd-skel hd-skel-mon-name" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="border-t border-border pt-4">
                            <div className="hd-meta-teams-list">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <div key={i} className="hd-skel-team-row" aria-hidden="true">
                                        <div className="hd-skel-team-info">
                                            <span className="hd-skel hd-skel-team-player" />
                                            <span className="hd-skel hd-skel-team-meta" />
                                        </div>
                                        <div className="hd-skel-team-roster">
                                            {Array.from({ length: 6 }).map((__, j) => (
                                                <span key={j} className="hd-skel hd-skel-roster-icon" />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Fused VGC Meta & Teams Panel */}
            {status === 'ready' && (topPopular.length > 0 || recent.length > 0) && (
                <section className="hd-panel" onMouseLeave={handleMouseLeaveGrid}>
                    <div className="hd-panel__head">
                        <span className="hd-panel__title">
                            <Flame className="w-4 h-4 text-warning" /> {language === 'pt' ? 'VGC Meta & Equipes de Torneio' : 'VGC Meta & Tournament Teams'}
                        </span>
                        <button type="button" className="hd-panel__link" onClick={() => navigate('/tournaments')}>
                            {t('home.viewAll')}
                        </button>
                    </div>
                    <div className="hd-panel__body space-y-4">
                        {/* Popular Mons Icon Row - Grid style, no scroll */}
                        <div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2.5">
                                {language === 'pt' ? 'Pokémon Populares ' : 'Popular Pokémon '}
                                <span className="hidden sm:inline">{language === 'pt' ? '(Passe o mouse para filtrar)' : '(Hover to filter)'}</span>
                                <span className="sm:hidden">{language === 'pt' ? '(Toque para filtrar)' : '(Tap to filter)'}</span>
                                {usingMeta && metaFormat?.label && <span className="ml-1 normal-case text-primary">· {metaFormat.label}</span>}
                            </p>
                            <div className="hd-meta-mons-grid">
                                {topPopular.slice(0, 10).map((mon) => (
                                    <button 
                                        key={mon.id} 
                                        type="button" 
                                        className={`hd-meta-mon-btn ${activePokemonId === mon.id ? 'is-active' : ''}`}
                                        onMouseEnter={() => handleMouseEnterMon(mon.id)}
                                        onClick={() => setActivePokemonId(activePokemonId === mon.id ? null : mon.id)}
                                        title={(mon.name || '').replace(/-/g, ' ')}
                                    >
                                        <div className="hd-meta-mon-icon-wrap">
                                            <img src={getPokemonFrontSpriteUrl(mon.id)} alt="" aria-hidden="true" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                            <span className="hd-meta-mon-badge" title={usingMeta ? (language === 'pt' ? 'uso no ladder' : 'ladder usage') : (language === 'pt' ? 'aparições' : 'appearances')}>{usingMeta ? `${mon.count}%` : mon.count}</span>
                                        </div>
                                        <span className="hd-meta-mon-name">{(mon.name || '').replace(/-/g, ' ')}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filtered Team List */}
                        <div className="border-t border-border pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-[10px] text-muted font-bold uppercase tracking-wider">
                                    {activePokemonId ? (
                                        <span>
                                            {language === 'pt' 
                                                ? `Equipes com ${formatPokemonDisplayName((topPopular.find(p => p.id === activePokemonId) || popular.find(p => p.id === activePokemonId))?.name)}` 
                                                : `Teams with ${formatPokemonDisplayName((topPopular.find(p => p.id === activePokemonId) || popular.find(p => p.id === activePokemonId))?.name)}`
                                            }
                                        </span>
                                    ) : (
                                        <span>{language === 'pt' ? 'Equipes Recentes VGC' : 'Recent VGC Teams'}</span>
                                    )}
                                </p>
                                {activePokemonId && (
                                    <button 
                                        type="button" 
                                        onClick={() => setActivePokemonId(null)}
                                        className="text-[9px] text-primary hover:underline font-bold uppercase tracking-wider"
                                    >
                                        {language === 'pt' ? 'Limpar Filtro' : 'Clear Filter'}
                                    </button>
                                )}
                            </div>

                            <div className="hd-meta-teams-list">
                                {filteredTeams.length === 0 ? (
                                    <div className="hd-meta-teams-empty text-center py-6 text-muted text-xs font-mono">
                                        {language === 'pt' ? 'Nenhuma equipe encontrada com este Pokémon.' : 'No teams found with this Pokémon.'}
                                    </div>
                                ) : (
                                    filteredTeams.map((tm, i) => (
                                        <div 
                                            key={tm.id || i} 
                                            className="hd-meta-team-row" 
                                            onClick={() => navigate('/tournaments')} 
                                            role="button" 
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/tournaments'); } }}
                                        >
                                            <div className="hd-meta-team-info">
                                                <span className="hd-meta-team-player">{tm.title || tm.player}</span>
                                                <span className="hd-meta-team-details">
                                                    {tm.format && <span className="hd-meta-team-badge">{tm.format}</span>}
                                                    <span className="truncate">{[tm.tournament, tm.placement].filter(Boolean).join(' · ')}</span>
                                                </span>
                                            </div>
                                            <div className="hd-meta-team-roster">
                                                {Array.from({ length: 6 }).map((_, j) => {
                                                    const mon = (tm.pokemons || [])[j];
                                                    if (!mon) {
                                                        return <div key={`empty-${j}`} className="hd-meta-team-roster-sprite-wrap is-empty" aria-hidden="true" />;
                                                    }
                                                    const isHighlighted = activePokemonId === mon.id;
                                                    return (
                                                        <div
                                                            key={`${mon.id}-${j}`}
                                                            className={`hd-meta-team-roster-sprite-wrap ${isHighlighted ? 'is-highlighted' : ''}`}
                                                            title={(mon.name || '').replace(/-/g, ' ')}
                                                        >
                                                            <img src={getPokemonFrontSpriteUrl(mon.id)} alt="" aria-hidden="true" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

// Helper to format Pokémon name nicely for display (copied from HomeView for scope)
const formatPokemonDisplayName = (name = '') => {
    const overrides = {
        farfetchd: "Farfetch'd",
        sirfetchd: "Sirfetch'd",
        'mr-mime': 'Mr. Mime',
        'mime-jr': 'Mime Jr.',
        'mr-rime': 'Mr. Rime',
        'type-null': 'Type: Null',
        'porygon-z': 'Porygon-Z',
        'ho-oh': 'Ho-Oh',
        flabebe: 'Flabebe',
    };
    if (overrides[name]) return overrides[name];
    return name
        .split('-')
        .filter(Boolean)
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
};
