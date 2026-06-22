import React from 'react';
import '../styles/home-dashboard.css';
import { useTournamentData } from '../hooks/useTournamentData';
import { useTranslation } from '../hooks/useTranslation';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { Flame } from 'lucide-react';
import {
    SwordsIcon, SavedTeamsIcon, TrophyIcon, CalculatorIcon, GaugeIcon,
    PokeballIcon, ScrollIcon, SparklesIcon, BagIcon,
} from './icons';

// One flat, icon-forward set of shortcuts (Team Building + Database) so the home
// has a single compact launcher rather than two separate cards.
const SHORTCUTS = [
    { key: 'builder', path: '/builder', icon: <SwordsIcon className="w-5 h-5" /> },
    { key: 'tournaments', path: '/tournaments', icon: <TrophyIcon className="w-5 h-5" /> },
    { key: 'damageCalc', path: '/damage-calculator', icon: <CalculatorIcon className="w-5 h-5" /> },
    { key: 'speedTiers', path: '/speed-tiers', icon: <GaugeIcon className="w-5 h-5" /> },
    { key: 'savedTeams', path: '/favorites?tab=teams', icon: <SavedTeamsIcon className="w-5 h-5" /> },
    { key: 'pokemonList', path: '/pokedex', icon: <PokeballIcon className="w-5 h-5" /> },
    { key: 'moves', path: '/moves', icon: <ScrollIcon className="w-5 h-5" /> },
    { key: 'abilities', path: '/abilities', icon: <SparklesIcon className="w-5 h-5" /> },
    { key: 'items', path: '/items', icon: <BagIcon className="w-5 h-5" /> },
];

export function HomeDashboard({ navigate }) {
    const { t } = useTranslation();
    const { popular, recent, status } = useTournamentData();

    const topPopular = popular.slice(0, 16);
    const topTeams = recent.slice(0, 4);

    return (
        <div className="hd-stack">
            {/* Quick access — one compact icon launcher for the whole app */}
            <section className="hd-panel">
                <div className="hd-panel__head">
                    <span className="hd-panel__title"><SwordsIcon className="w-4 h-4" /> {t('home.shortcuts')}</span>
                </div>
                <div className="hd-panel__body">
                    <div className="hd-tiles">
                        {SHORTCUTS.map((l) => (
                            <button key={l.key} type="button" className="hd-tile" onClick={() => navigate(l.path)}>
                                <span className="hd-tile__icon" aria-hidden="true">{l.icon}</span>
                                <span className="hd-tile__label">{t(`nav.${l.key}`)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Popular in tournaments — real usage from baked results */}
            {status === 'ready' && topPopular.length > 0 && (
                <section className="hd-panel">
                    <div className="hd-panel__head">
                        <span className="hd-panel__title"><Flame className="w-4 h-4" /> {t('home.popularPokemon')}</span>
                        <button type="button" className="hd-panel__link" onClick={() => navigate('/tournaments')}>
                            {t('home.viewAll')}
                        </button>
                    </div>
                    <div className="hd-panel__body">
                        <div className="hd-popular custom-scrollbar">
                            {topPopular.map((mon) => (
                                <button key={mon.id} type="button" className="hd-mon" onClick={() => navigate(`/pokemon/${mon.id}`)} title={(mon.name || '').replace(/-/g, ' ')}>
                                    <span className="hd-mon__count">{mon.count}</span>
                                    <img src={getPokemonFrontSpriteUrl(mon.id)} alt="" aria-hidden="true" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                    <span className="hd-mon__name">{(mon.name || '').replace(/-/g, ' ')}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Recent tournament teams */}
            {status === 'ready' && topTeams.length > 0 && (
                <section className="hd-panel">
                    <div className="hd-panel__head">
                        <span className="hd-panel__title"><TrophyIcon className="w-4 h-4" /> {t('nav.tournaments')}</span>
                        <button type="button" className="hd-panel__link" onClick={() => navigate('/tournaments')}>
                            {t('home.viewAll')}
                        </button>
                    </div>
                    <div className="hd-panel__body">
                        <div className="hd-trn">
                            {topTeams.map((tm, i) => (
                                <div key={tm.id || i} className="hd-trn-card" onClick={() => navigate('/tournaments')} role="button" tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/tournaments'); } }}>
                                    <div className="hd-trn-card__title">{tm.title || tm.player}</div>
                                    <div className="hd-trn-card__meta">
                                        {tm.format && <span className="hd-trn-card__badge">{tm.format}</span>}
                                        <span>{[tm.tournament, tm.placement].filter(Boolean).join(' · ')}</span>
                                    </div>
                                    <div className="hd-trn-card__roster">
                                        {(tm.pokemons || []).slice(0, 6).map((mon, j) => (
                                            <img key={`${mon.id}-${j}`} src={getPokemonFrontSpriteUrl(mon.id)} alt="" aria-hidden="true" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
