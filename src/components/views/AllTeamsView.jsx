import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/team-builder-view.css';
import '../../styles/all-teams-view.css';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { useTranslation } from '../../hooks/useTranslation';
import { ShareIcon, ShowdownIcon, StarIcon, TrashIcon } from '../icons';
import { EmptyState } from '../EmptyState';
import { Eye, Pencil, Check } from 'lucide-react';

const timestampToDate = (value) => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
};

const formatTeamDate = (value, language) => {
    const date = timestampToDate(value);
    if (!date) return language === 'pt' ? 'Data desconhecida' : 'Unknown date';
    return new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
};

const TeamRowActions = ({ team, onEdit, onToggleFavorite, onExport, onShare, requestDelete }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const anchorRef = React.useRef(null);
    const popoverRef = React.useRef(null);
    const { t, language } = useTranslation();

    React.useEffect(() => {
        if (!isOpen) return undefined;

        const handlePointerDown = (event) => {
            if (anchorRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) {
                return;
            }
            setIsOpen(false);
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    return (
        <div className="all-teams-view__row-actions flex items-center gap-1.5 relative" ref={anchorRef}>
            <button
                type="button"
                onClick={() => onEdit(team)}
                className="btn btn-primary"
            >
                {t('common.edit')}
            </button>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`btn btn-outline !p-2 ${isOpen ? 'is-active' : ''}`}
                aria-label={language === 'pt' ? 'Mais ações' : 'More actions'}
                aria-expanded={isOpen}
                title={language === 'pt' ? 'Ações' : 'Actions'}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                </svg>
            </button>

            {isOpen && (
                <div
                    ref={popoverRef}
                    className="all-teams-view__actions-menu"
                >
                    <button
                        type="button"
                        onClick={() => {
                            onToggleFavorite(team);
                            setIsOpen(false);
                        }}
                        className="all-teams-view__menu-item"
                    >
                        <StarIcon className="h-4 w-4" isFavorite={team.isFavorite} color="currentColor" />
                        <span>{team.isFavorite ? (language === 'pt' ? 'Desafixar Time' : 'Unpin Team') : (language === 'pt' ? 'Fixar Time' : 'Pin Team')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onExport(team);
                            setIsOpen(false);
                        }}
                        className="all-teams-view__menu-item"
                    >
                        <ShowdownIcon className="h-4 w-4" />
                        <span>{language === 'pt' ? 'Exportar Showdown' : 'Export Showdown'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onShare(team);
                            setIsOpen(false);
                        }}
                        className="all-teams-view__menu-item"
                    >
                        <ShareIcon className="h-4 w-4" />
                        <span>{language === 'pt' ? 'Compartilhar Link' : 'Share Link'}</span>
                    </button>
                    <div className="all-teams-view__menu-divider" />
                    <button
                        type="button"
                        onClick={() => {
                            requestDelete(team.id, team.name);
                            setIsOpen(false);
                        }}
                        className="all-teams-view__menu-item all-teams-view__menu-item--danger"
                    >
                        <TrashIcon className="h-4 w-4" />
                        <span>{language === 'pt' ? 'Deletar Time' : 'Delete Team'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export function AllTeamsView({ teams, onEdit, onExport, onShare, requestDelete, onToggleFavorite, searchTerm, setSearchTerm, activeTeamId, setActiveTeamId }) {
    const [layoutMode, setLayoutMode] = React.useState('grid'); // 'grid' | 'list'
    const { t, language } = useTranslation();
    const navigate = useNavigate();
    const viewTeam = (team) => navigate(`/teams/${team.id}`);

    const filteredTeams = React.useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (!normalizedSearch) return teams;

        return teams.filter((team) => team.name?.toLowerCase().includes(normalizedSearch));
    }, [teams, searchTerm]);

    const favoriteCount = React.useMemo(() => {
        return teams.filter((team) => team.isFavorite).length;
    }, [teams]);

    const iconButtonClassName = 'team-builder-icon-button team-builder-icon-button--small';

    return (
        <main className="all-teams-view">
            <section className="team-builder-panel all-teams-view__panel p-5 md:p-6">
                <div className="all-teams-view__header">
                    <div>
                        <p className="team-builder-panel__eyebrow">{language === 'pt' ? 'Trabalho salvo' : 'Saved work'}</p>
                        <div className="all-teams-view__heading-row">
                            <h2 className="team-builder-panel__title all-teams-view__title">{t('savedTeams.title')}</h2>
                            <span className="team-builder-panel__meta">{filteredTeams.length}</span>
                        </div>
                        <p className="team-builder-panel__copy all-teams-view__copy">
                            {t('savedTeams.subtitle')}
                        </p>
                    </div>

                    <div className="all-teams-view__summary" aria-label={language === 'pt' ? 'Resumo de times salvos' : 'Saved team summary'}>
                        <span className="team-builder-picker-summary">{language === 'pt' ? `${teams.length} total` : `${teams.length} total`}</span>
                        <span className="team-builder-picker-summary">{language === 'pt' ? `${favoriteCount} favoritos` : `${favoriteCount} favorites`}</span>
                    </div>
                </div>

                <div className="all-teams-view__toolbar">
                    <label className="team-builder-control all-teams-view__search-control" htmlFor="saved-teams-search">
                        <span className="team-builder-control__label">{language === 'pt' ? 'Pesquisar times' : 'Search lineups'}</span>
                        <input
                            id="saved-teams-search"
                            type="text"
                            placeholder={t('savedTeams.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="team-builder-field"
                        />
                    </label>

                    <div className="all-teams-view__toolbar-actions">
                        {searchTerm ? (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="team-builder-button team-builder-button--inline team-builder-button--inline-compact"
                            >
                                {language === 'pt' ? 'Limpar busca' : 'Clear search'}
                            </button>
                        ) : null}

                        <div className="all-teams-view__layout-toggle flex items-center gap-1 bg-surface-raised p-1 rounded-md border border-border">
                            <button
                                type="button"
                                onClick={() => setLayoutMode('grid')}
                                className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                                    layoutMode === 'grid'
                                        ? 'bg-surface text-primary border border-border shadow-sm'
                                        : 'text-muted hover:text-fg'
                                }`}
                                aria-pressed={layoutMode === 'grid'}
                            >
                                {language === 'pt' ? 'Grade' : 'Grid'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setLayoutMode('list')}
                                className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                                    layoutMode === 'list'
                                        ? 'bg-surface text-primary border border-border shadow-sm'
                                        : 'text-muted hover:text-fg'
                                }`}
                                aria-pressed={layoutMode === 'list'}
                            >
                                {language === 'pt' ? 'Lista' : 'List'}
                            </button>
                        </div>

                        <span className="team-builder-picker-summary">{language === 'pt' ? `${filteredTeams.length} visíveis` : `${filteredTeams.length} visible`}</span>
                    </div>
                </div>

                {filteredTeams.length > 0 ? (
                    layoutMode === 'grid' ? (
                        <div className="all-teams-view__grid">
                            {filteredTeams.map((team) => (
                                <article key={team.id} className="team-builder-recent-card team-builder-recent-card--wide all-teams-view__card">
                                    <div className="all-teams-view__card-head">
                                        <div className="min-w-0 flex-1">
                                            <div className="all-teams-view__card-heading">
                                                <button type="button" onClick={() => viewTeam(team)} className="team-builder-recent-card__title all-teams-view__card-title text-left hover:text-primary transition-colors">{team.name}</button>
                                                {team.isFavorite ? <span className="all-teams-view__status">{language === 'pt' ? 'Fixado' : 'Pinned'}</span> : null}
                                            </div>

                                            <div className="all-teams-view__meta-list">
                                                <span className="all-teams-view__meta-pill">{t('savedTeams.lastUpdated', { date: formatTeamDate(team.updatedAt || team.createdAt, language) })}</span>
                                                <span className="all-teams-view__meta-pill">
                                                    {language === 'pt' ? `${team.pokemons.length} ${team.pokemons.length === 1 ? 'membro' : 'membros'}` : `${team.pokemons.length} ${team.pokemons.length === 1 ? 'member' : 'members'}`}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => onToggleFavorite(team)}
                                            title={team.isFavorite ? (language === 'pt' ? 'Desfavoritar time' : 'Unfavorite team') : (language === 'pt' ? 'Favoritar time' : 'Favorite team')}
                                            aria-label={team.isFavorite ? (language === 'pt' ? `Desfavoritar ${team.name}` : `Unfavorite ${team.name}`) : (language === 'pt' ? `Favoritar ${team.name}` : `Favorite ${team.name}`)}
                                            className={`${iconButtonClassName} ${team.isFavorite ? 'team-builder-icon-button--accent' : ''}`}
                                        >
                                            <StarIcon className="h-4 w-4" isFavorite={team.isFavorite} color="currentColor" />
                                        </button>
                                    </div>

                                    <div className="all-teams-view__preview">
                                        <div className="team-builder-sprite-stack all-teams-view__sprite-stack" aria-label={language === 'pt' ? `Pré-visualização do time ${team.name}` : `${team.name} team preview`}>
                                            {team.pokemons.length > 0 ? team.pokemons.map((pokemon) => (
                                                <img
                                                    key={pokemon.instanceId || `${team.id}-${pokemon.id}`}
                                                    src={getTeamPokemonDisplaySprite(pokemon)}
                                                    onError={(event) => { event.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                                    alt={pokemon.name}
                                                    className="team-builder-sprite-stack__item all-teams-view__sprite-item"
                                                />
                                            )) : (
                                                <span className="all-teams-view__empty-stack">{language === 'pt' ? 'Nenhum Pokémon salvo neste time ainda.' : 'No Pokémon saved in this lineup yet.'}</span>
                                            )}
                                        </div>
                                    </div>

                                     <div className="all-teams-view__actions">
                                         <div className="flex items-center gap-1.5">
                                             <button
                                                 type="button"
                                                 onClick={() => viewTeam(team)}
                                                 className="btn btn-outline !p-2"
                                                 title={language === 'pt' ? 'Visualizar time' : 'View team'}
                                             >
                                                 <Eye className="w-4 h-4" />
                                             </button>
                                             <button
                                                 type="button"
                                                 onClick={() => onEdit(team)}
                                                 className="btn btn-outline !p-2"
                                                 title={t('common.edit')}
                                             >
                                                 <Pencil className="w-4 h-4" />
                                             </button>
                                             {(() => {
                                                 const isActive = team.id === activeTeamId || (activeTeamId === null && teams[0]?.id === team.id);
                                                 return (
                                                     <button
                                                         type="button"
                                                         onClick={() => setActiveTeamId(isActive ? null : team.id)}
                                                         className={`btn !p-2 ${isActive ? 'btn-primary' : 'btn-outline'}`}
                                                         style={isActive ? { backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff' } : undefined}
                                                         title={isActive ? (language === 'pt' ? 'Ativo' : 'Active') : (language === 'pt' ? 'Ativar' : 'Set Active')}
                                                     >
                                                         <Check className="w-4 h-4" />
                                                     </button>
                                                 );
                                             })()}
                                         </div>
                                         <div className="flex items-center gap-1.5">
                                             <button
                                                 type="button"
                                                 onClick={() => onExport(team)}
                                                 aria-label={language === 'pt' ? `Exportar ${team.name} para o Pokémon Showdown` : `Export ${team.name} to Pokémon Showdown`}
                                                 title={language === 'pt' ? 'Exportar para o Showdown' : 'Export to Showdown'}
                                                 className="btn btn-outline !p-2"
                                             >
                                                 <ShowdownIcon className="w-4 h-4" />
                                             </button>
                                             <button
                                                 type="button"
                                                 onClick={() => onShare(team)}
                                                 aria-label={language === 'pt' ? `Compartilhar ${team.name}` : `Share ${team.name}`}
                                                 title={language === 'pt' ? 'Compartilhar time' : 'Share team'}
                                                 className="btn btn-outline !p-2"
                                             >
                                                 <ShareIcon className="w-4 h-4" />
                                             </button>
                                             <button
                                                 type="button"
                                                 onClick={() => requestDelete(team.id, team.name)}
                                                 aria-label={language === 'pt' ? `Deletar ${team.name}` : `Delete ${team.name}`}
                                                 title={language === 'pt' ? 'Deletar time' : 'Delete team'}
                                                 className="btn btn-outline !p-2 team-builder-icon-button--danger"
                                             >
                                                 <TrashIcon className="w-4 h-4" />
                                             </button>
                                         </div>
                                     </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="all-teams-view__list">
                            {filteredTeams.map((team, idx) => {
                                const pokemonCount = team.pokemons.length;
                                let statusText = pokemonCount === 6 ? 'Complete' : pokemonCount === 0 ? 'Empty' : 'Draft';
                                if (language === 'pt') {
                                    statusText = pokemonCount === 6 ? 'Completo' : pokemonCount === 0 ? 'Vazio' : 'Rascunho';
                                }
                                const statusType = pokemonCount === 6 ? 'success' : pokemonCount === 0 ? 'outline' : 'accent';
                                
                                return (
                                    <article key={team.id} className="all-teams-view__list-item">
                                        <div className="all-teams-view__list-item-connector">
                                            <span className="all-teams-view__list-item-index">
                                                {(idx + 1).toString().padStart(2, '0')}
                                            </span>
                                            <div className="all-teams-view__list-item-line" />
                                        </div>
                                        
                                        <div className="all-teams-view__list-item-main">
                                            <div className="all-teams-view__list-item-info">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <button type="button" onClick={() => viewTeam(team)} className="all-teams-view__list-item-title text-left hover:text-primary transition-colors">{team.name}</button>
                                                    <span className={`badge badge-${statusType}`}>{statusText}</span>
                                                    {team.isFavorite && <span className="badge badge-accent">{language === 'pt' ? 'Fixado' : 'Pinned'}</span>}
                                                </div>
                                                <div className="all-teams-view__list-item-meta mt-1">
                                                    <span>{t('savedTeams.lastUpdated', { date: formatTeamDate(team.updatedAt || team.createdAt, language) })}</span>
                                                    <span className="mx-1">•</span>
                                                    <span>{language === 'pt' ? `${pokemonCount} ${pokemonCount === 1 ? 'membro' : 'membros'}` : `${pokemonCount} ${pokemonCount === 1 ? 'member' : 'members'}`}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="all-teams-view__list-item-preview">
                                                <div className="all-teams-view__list-item-sprites">
                                                    {team.pokemons.map((pokemon) => (
                                                        <div key={pokemon.instanceId || `${team.id}-${pokemon.id}`} className="all-teams-view__list-item-sprite-wrap">
                                                            <img
                                                                src={getTeamPokemonDisplaySprite(pokemon)}
                                                                onError={(event) => { event.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                                                alt={pokemon.name}
                                                                className="all-teams-view__list-item-sprite sprite-fade"
                                                            />
                                                            <span className="all-teams-view__list-item-sprite-name">{pokemon.name}</span>
                                                        </div>
                                                    ))}
                                                    {pokemonCount === 0 && <span className="text-xs text-muted italic">{language === 'pt' ? 'Sem integrantes no time ainda.' : 'No team members yet.'}</span>}
                                                </div>
                                            </div>
                                        </div>

                                         <div className="all-teams-view__list-item-actions">
                                             <div className="flex items-center gap-1.5">
                                                 <button
                                                     type="button"
                                                     onClick={() => viewTeam(team)}
                                                     className="btn btn-outline !p-2"
                                                     title={language === 'pt' ? 'Visualizar time' : 'View team'}
                                                 >
                                                     <Eye className="w-4 h-4" />
                                                 </button>
                                                 <button
                                                     type="button"
                                                     onClick={() => onEdit(team)}
                                                     className="btn btn-outline !p-2"
                                                     title={t('common.edit')}
                                                 >
                                                     <Pencil className="w-4 h-4" />
                                                 </button>
                                                 {(() => {
                                                     const isActive = team.id === activeTeamId || (activeTeamId === null && teams[0]?.id === team.id);
                                                     return (
                                                         <button
                                                             type="button"
                                                             onClick={() => setActiveTeamId(isActive ? null : team.id)}
                                                             className={`btn !p-2 ${isActive ? 'btn-primary' : 'btn-outline'}`}
                                                             style={isActive ? { backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff' } : undefined}
                                                             title={isActive ? (language === 'pt' ? 'Ativo' : 'Active') : (language === 'pt' ? 'Ativar' : 'Set Active')}
                                                         >
                                                             <Check className="w-4 h-4" />
                                                         </button>
                                                     );
                                                 })()}
                                             </div>
                                             <div className="flex items-center gap-1.5">
                                                 <button
                                                     type="button"
                                                     onClick={() => onToggleFavorite(team)}
                                                     className={`btn btn-outline !p-2 ${team.isFavorite ? 'team-builder-icon-button--accent' : ''}`}
                                                     title={team.isFavorite ? (language === 'pt' ? 'Desfavoritar time' : 'Unfavorite team') : (language === 'pt' ? 'Favoritar time' : 'Favorite team')}
                                                 >
                                                     <StarIcon className="h-4 w-4" isFavorite={team.isFavorite} color="currentColor" />
                                                 </button>
                                                 <button
                                                     type="button"
                                                     onClick={() => onExport(team)}
                                                     className="btn btn-outline !p-2"
                                                     title={language === 'pt' ? 'Exportar para o Showdown' : 'Export to Showdown'}
                                                 >
                                                     <ShowdownIcon className="w-4 h-4" />
                                                 </button>
                                                 <button
                                                     type="button"
                                                     onClick={() => onShare(team)}
                                                     className="btn btn-outline !p-2"
                                                     title={language === 'pt' ? 'Compartilhar time' : 'Share team'}
                                                 >
                                                     <ShareIcon className="w-4 h-4" />
                                                 </button>
                                                 <button
                                                     type="button"
                                                     onClick={() => requestDelete(team.id, team.name)}
                                                     className="btn btn-outline !p-2 team-builder-icon-button--danger"
                                                     title={language === 'pt' ? 'Deletar time' : 'Delete team'}
                                                 >
                                                     <TrashIcon className="w-4 h-4" />
                                                 </button>
                                             </div>
                                         </div>
                                     </article>
                                );
                            })}
                        </div>
                    )
                ) : (
                    <EmptyState
                        compact={teams.length > 0}
                        title={teams.length === 0 ? t('savedTeams.emptyTitle', { defaultValue: 'No saved teams' }) : t('savedTeams.noMatchesTitle', { defaultValue: 'No teams found' })}
                        message={teams.length === 0 ? t('savedTeams.emptyDesc') : t('savedTeams.noMatchesDesc')}
                        action={teams.length > 0 && searchTerm ? {
                            label: language === 'pt' ? 'Limpar busca' : 'Clear search',
                            onClick: () => setSearchTerm(''),
                        } : undefined}
                    />
                )}
            </section>
        </main>
    );
}