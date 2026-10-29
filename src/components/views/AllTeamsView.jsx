import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/team-builder-view.css';
import '../../styles/all-teams-view.css';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { useTranslation } from '../../hooks/useTranslation';
import { ShareIcon, ShowdownIcon, StarIcon, TrashIcon } from '../icons';
import { EmptyState } from '../EmptyState';
import { Pencil, Check, Plus, Copy, MoreHorizontal, ArrowLeftRight } from 'lucide-react';
import { PcBox } from '../PcBox';
import { AnchoredPopover } from '../AnchoredPopover';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { openTeamCompare } from '../../store/useTeamCompareStore';

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

// Edit stays visible (it is what a saved team is opened for); everything else
// — activate, duplicate, export, share, delete — sits behind one labelled
// overflow button. The cards used to carry seven unlabelled icons each.
const TeamRowActions = ({ team, onEdit, onToggleFavorite, onExport, onShare, onDuplicate, requestDelete, isActive, onToggleActive, showPin = false }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const anchorRef = React.useRef(null);
    const menuButtonRef = React.useRef(null);
    const popoverRef = React.useRef(null);
    const { t } = useTranslation();

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
                className="btn btn-secondary btn-sm"
            >
                <Pencil aria-hidden="true" /> {t('common.edit')}
            </button>
            <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`btn btn-ghost btn-icon btn-sm touch-target ${isOpen ? 'is-active' : ''}`}
                aria-label={t('savedTeams.moreActions', { name: team.name })}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                title={t('savedTeams.moreActions', { name: team.name })}
            >
                <MoreHorizontal aria-hidden="true" />
            </button>

            {/* A portal: the list view clips its rows (overflow: hidden), and
                this menu had no styles of its own — it rendered inline, unstyled. */}
            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={menuButtonRef}
                popoverRef={popoverRef}
                role="menu"
                ariaLabel={t('savedTeams.moreActions', { name: team.name })}
                offset={6}
                className="menu-surface tb-more-menu"
            >
                <>
                    {[
                        { id: 'active', label: isActive ? `★ ${t('common.active')}` : t('savedTeams.setActive'), icon: <Check className="h-4 w-4" />, onClick: onToggleActive },
                        ...(showPin ? [{ id: 'pin', label: team.isFavorite ? t('savedTeams.unpin') : t('savedTeams.pin'), icon: <StarIcon className="h-4 w-4" isFavorite={team.isFavorite} color="currentColor" />, onClick: () => onToggleFavorite(team) }] : []),
                        { id: 'compare', label: t('teamCompare.openWith'), icon: <ArrowLeftRight className="h-4 w-4" />, onClick: () => openTeamCompare(team.id, 'saved_teams') },
                        { id: 'duplicate', label: t('savedTeams.duplicateBtn'), icon: <Copy className="h-4 w-4" />, onClick: () => onDuplicate?.(team) },
                        { id: 'export', label: t('savedTeams.exportShowdown'), icon: <ShowdownIcon className="h-4 w-4" />, onClick: () => onExport(team) },
                        { id: 'share', label: t('savedTeams.share'), icon: <ShareIcon className="h-4 w-4" />, onClick: () => onShare(team) },
                    ].map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            role="menuitem"
                            onClick={() => { item.onClick?.(); setIsOpen(false); }}
                            className="menu-item"
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                    <hr className="menu-separator" />
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            requestDelete(team.id, team.name);
                            setIsOpen(false);
                        }}
                        className="menu-item menu-item--danger"
                    >
                        <TrashIcon className="h-4 w-4" />
                        <span>{t('common.delete')}</span>
                    </button>
                </>
            </AnchoredPopover>
        </div>
    );
};

export function AllTeamsView({ teams, onEdit, onExport, onShare, onDuplicate, requestDelete, onToggleFavorite, searchTerm, setSearchTerm, activeTeamId, setActiveTeamId }) {
    const [layoutMode, setLayoutMode] = React.useState('grid'); // 'grid' | 'list'
    const { t, language } = useTranslation();
    const navigate = useNavigate();
    const viewTeam = (team) => navigate(`/teams/${team.id}`);

    const filteredTeams = React.useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (!normalizedSearch) return teams;

        return teams.filter((team) => team.name?.toLowerCase().includes(normalizedSearch));
    }, [teams, searchTerm]);

    const iconButtonClassName = 'team-builder-icon-button team-builder-icon-button--small';

    // "Novo time": a fresh builder. Clearing is undoable (the store's toast), so
    // an unsaved draft is one tap from coming back.
    const startNewTeam = () => {
        const { currentTeam, teamName, editingTeamId, handleClearTeam } = useActiveTeamStore.getState();
        if (currentTeam.length || teamName || editingTeamId) handleClearTeam();
        navigate('/builder');
    };
    const isTeamActive = (team) => team.id === activeTeamId || (activeTeamId === null && teams[0]?.id === team.id);

    // The header says the count once. It used to say it five times (a meta
    // pill, "N total", "N favoritos", "N visíveis" and the tab), over an
    // eyebrow and a subtitle that repeated the title.
    return (
        <main className="all-teams-view">
            <section className="team-builder-panel all-teams-view__panel p-5 md:p-6">
                <div className="all-teams-view__header">
                    <div className="all-teams-view__heading-row">
                        <h2 className="team-builder-panel__title all-teams-view__title">{t('savedTeams.title')}</h2>
                        {teams.length > 0 && <span className="count-badge">{searchTerm ? `${filteredTeams.length}/${teams.length}` : teams.length}</span>}
                    </div>
                    {teams.length > 0 && (
                        <button type="button" onClick={startNewTeam} className="btn btn-primary">
                            <Plus aria-hidden="true" /> {t('savedTeams.newTeam')}
                        </button>
                    )}
                </div>

                {teams.length > 1 && <div className="all-teams-view__toolbar">
                    <div className="team-builder-control all-teams-view__search-control">
                        <input
                            id="saved-teams-search"
                            type="search"
                            placeholder={t('savedTeams.searchPlaceholder')}
                            aria-label={t('savedTeams.searchAria')}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="team-builder-field"
                        />
                    </div>

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

                        <div className="all-teams-view__layout-toggle segmented" role="group" aria-label={language === 'pt' ? 'Visualização' : 'Layout'}>
                            <button
                                type="button"
                                onClick={() => setLayoutMode('grid')}
                                className="segmented__item touch-target touch-target--y"
                                aria-pressed={layoutMode === 'grid'}
                            >
                                {language === 'pt' ? 'Grade' : 'Grid'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setLayoutMode('list')}
                                className="segmented__item touch-target touch-target--y"
                                aria-pressed={layoutMode === 'list'}
                            >
                                {language === 'pt' ? 'Lista' : 'List'}
                            </button>
                        </div>
                    </div>
                </div>}

                {filteredTeams.length > 0 ? (
                    layoutMode === 'grid' ? (
                        <div className="all-teams-view__grid motion-stagger">
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
                                            className={`${iconButtonClassName}  ${team.isFavorite ? 'team-builder-icon-button--accent' : ''}`}
                                        >
                                            <StarIcon className="h-4 w-4" isFavorite={team.isFavorite} color="currentColor" />
                                        </button>
                                    </div>

                                    {/* A big pointer target for the same page the title
                                        opens; kept out of the tab order and the
                                        accessibility tree so the card has one "open". */}
                                    <button
                                        type="button"
                                        className="all-teams-view__preview pc-box-host"
                                        onClick={() => viewTeam(team)}
                                        tabIndex={-1}
                                        aria-hidden="true"
                                    >
                                        <PcBox members={team.pokemons} columns={3} size="lg" className="pc-box--wide" />
                                        {team.pokemons.length === 0 && (
                                            <span className="all-teams-view__empty-stack">{language === 'pt' ? 'Nenhum Pokémon salvo neste time ainda.' : 'No Pokémon saved in this lineup yet.'}</span>
                                        )}
                                    </button>

                                    <div className="all-teams-view__actions">
                                        {isTeamActive(team) ? <span className="badge badge--primary">★ {t('common.active')}</span> : <span />}
                                        <TeamRowActions
                                            team={team}
                                            onEdit={onEdit}
                                            onToggleFavorite={onToggleFavorite}
                                            onExport={onExport}
                                            onShare={onShare}
                                            onDuplicate={onDuplicate}
                                            requestDelete={requestDelete}
                                            isActive={isTeamActive(team)}
                                            onToggleActive={() => setActiveTeamId(isTeamActive(team) ? null : team.id)}
                                        />
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
                                                    {team.isFavorite && <span className="badge badge--accent">{language === 'pt' ? 'Fixado' : 'Pinned'}</span>}
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
                                            <TeamRowActions
                                                team={team}
                                                onEdit={onEdit}
                                                onToggleFavorite={onToggleFavorite}
                                                onExport={onExport}
                                                onShare={onShare}
                                                onDuplicate={onDuplicate}
                                                requestDelete={requestDelete}
                                                isActive={isTeamActive(team)}
                                                onToggleActive={() => setActiveTeamId(isTeamActive(team) ? null : team.id)}
                                                showPin
                                            />
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
                        action={teams.length === 0 ? {
                            label: t('savedTeams.newTeam'),
                            onClick: startNewTeam,
                            icon: <Plus className="w-4 h-4" />,
                        } : (searchTerm ? {
                            label: language === 'pt' ? 'Limpar busca' : 'Clear search',
                            onClick: () => setSearchTerm(''),
                        } : undefined)}
                    />
                )}
            </section>
        </main>
    );
}