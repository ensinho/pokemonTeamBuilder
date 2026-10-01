import React from 'react';
import { SwordsIcon, PokeballIcon, SavedTeamsIcon, ShieldCheckIcon, FlameIcon } from '../icons';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { fallbackImage } from '../../utils/imageFallback';

export function ForumSidebar({
    featuredTeam,
    onImportTeam,
    totalTopics = 0,
    language = 'pt',
    navigate,
}) {
    return (
        <aside className="forum-sidebar-right">
            {/* Featured Team Showcase */}
            {featuredTeam ? (
                <div className="forum-sidebar-card">
                    <div className="forum-sidebar-card__header">
                        <SwordsIcon className="w-4 h-4 text-primary shrink-0" />
                        <h4 className="forum-sidebar-card__title">
                            {language === 'pt' ? 'Time em Destaque' : 'Featured Team'}
                        </h4>
                    </div>
                    <p className="text-xs font-semibold text-fg mb-3 truncate">
                        {featuredTeam.name}
                    </p>
                    <div className="forum-sidebar-team-slots mb-3">
                        {Array.from({ length: 6 }).map((_, idx) => {
                            const pk = featuredTeam.pokemons?.[idx];
                            const spriteUrl = pk ? getTeamPokemonDisplaySprite(pk) : null;
                            return (
                                <div key={idx} className="forum-sidebar-team-slot" title={pk?.name}>
                                    {spriteUrl ? (
                                        <img
                                            src={spriteUrl}
                                            alt={pk ? pk.name : ''}
                                            className="w-full h-full object-contain"
                                            onError={fallbackImage(POKEBALL_PLACEHOLDER_URL)}
                                        />
                                    ) : (
                                        <PokeballIcon className="w-3.5 h-3.5 text-muted opacity-30" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        onClick={() => onImportTeam(featuredTeam)}
                        className="btn btn-secondary w-full h-8 text-xs font-semibold"
                    >
                        {language === 'pt' ? 'Abrir no Construtor' : 'Load in Builder'}
                    </button>
                </div>
            ) : (
                <div className="forum-sidebar-card">
                    <div className="forum-sidebar-card__header">
                        <SavedTeamsIcon className="w-4 h-4 text-muted shrink-0" />
                        <h4 className="forum-sidebar-card__title">
                            {language === 'pt' ? 'Seu Arsenal' : 'Your Arsenal'}
                        </h4>
                    </div>
                    <p className="text-xs text-muted mb-3">
                        {language === 'pt'
                            ? 'Você ainda não possui times salvos. Crie seu primeiro time para compartilhar!'
                            : 'No saved teams yet. Create your first team to share it with the community!'}
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/builder')}
                        className="btn btn-primary w-full h-8 text-xs font-semibold"
                    >
                        {language === 'pt' ? 'Criar Time no Construtor' : 'Create Team in Builder'}
                    </button>
                </div>
            )}

            {/* Community Rules / Guidelines (Reddit style) */}
            <div className="forum-sidebar-card">
                <div className="forum-sidebar-card__header">
                    <ShieldCheckIcon className="w-4 h-4 text-muted shrink-0" />
                    <h4 className="forum-sidebar-card__title">
                        {language === 'pt' ? 'Diretrizes da Comunidade' : 'Community Rules'}
                    </h4>
                </div>
                <ul className="forum-rules-list">
                    <li>
                        <span className="forum-rule-number">1</span>
                        <span>{language === 'pt' ? 'Respeite outros treinadores e mantenha as discussões construtivas.' : 'Respect other trainers and keep discussions constructive.'}</span>
                    </li>
                    <li>
                        <span className="forum-rule-number">2</span>
                        <span>{language === 'pt' ? 'Evite spam ou links suspeitos fora do ecossistema Pokémon.' : 'No spam or external malicious links.'}</span>
                    </li>
                    <li>
                        <span className="forum-rule-number">3</span>
                        <span>{language === 'pt' ? 'Ao compartilhar times, explique as sinergias e papéis de cada Pokémon.' : 'When sharing teams, explain synergies and Pokémon roles.'}</span>
                    </li>
                </ul>
            </div>

            {/* Quick Forum Stats */}
            <div className="forum-sidebar-card">
                <div className="forum-sidebar-card__header">
                    <FlameIcon className="w-4 h-4 text-muted shrink-0" />
                    <h4 className="forum-sidebar-card__title">
                        {language === 'pt' ? 'Atividade do Fórum' : 'Forum Activity'}
                    </h4>
                </div>
                <div className="flex items-center justify-between text-xs py-1 text-muted">
                    <span>{language === 'pt' ? 'Tópicos criados:' : 'Total Topics:'}</span>
                    <span className="font-bold text-fg">{totalTopics}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 text-muted border-t border-border mt-1">
                    <span>{language === 'pt' ? 'Status do servidor:' : 'Server status:'}</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {language === 'pt' ? 'Online' : 'Online'}
                    </span>
                </div>
            </div>
        </aside>
    );
}
