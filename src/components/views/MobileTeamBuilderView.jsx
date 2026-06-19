import React, { useEffect, useMemo, useRef, useState } from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeIcons } from '../../constants/types';
import { EmptyState } from '../EmptyState';
import { Sprite } from '../Sprite';
import { TypeBadge } from '../TypeBadge';
import { AnchoredPopover } from '../AnchoredPopover';
import { getPokemonDisplaySprite, getTeamPokemonDisplaySprite, getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { useTranslation } from '../../hooks/useTranslation';
import {
    ClearIcon,
    InfoIcon,
    SaveIcon,
    ShareIcon,
    ShowdownIcon,
    StarIcon,
    TrashIcon,
} from '../icons';
import { Save, SaveAll } from 'lucide-react';

const MobilePokemonPickerCard = ({
    pokemon,
    onAddToTeam,
    isSuggested,
    isFavorite,
    onToggleFavorite,
    lastRef,
}) => {
    const { t, language } = useTranslation();
    const handleCardClick = () => {
        onAddToTeam?.(pokemon);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onAddToTeam?.(pokemon);
        }
    };

    const handleFavoriteClick = (event) => {
        event.stopPropagation();
        onToggleFavorite?.(pokemon.id);
    };

    return (
        <article
            ref={lastRef}
            role="button"
            tabIndex={0}
            aria-label={`${language === 'pt' ? 'Adicionar' : 'Add'} ${pokemon.name} ${language === 'pt' ? 'ao time' : 'to team'}`}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            className={`team-builder-mobile-card ${isSuggested ? 'is-suggested' : ''
                }`}
        >
            <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                    {pokemon.types.map((type) => (
                        <img
                            key={type}
                            src={typeIcons[type]}
                            alt={type}
                            className="h-4 w-4 rounded-full"
                        />
                    ))}
                    {isSuggested && (
                        <div className="team-builder-mobile-card__badge ml-1">
                            {language === 'pt' ? 'Novo' : 'New'}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleFavoriteClick}
                    className={`team-builder-mobile-card__favorite ${isFavorite ? 'is-active' : ''}`}
                    aria-label={isFavorite ? `Remove ${pokemon.name} from favorites` : `Add ${pokemon.name} to favorites`}
                    title={isFavorite ? t('common.remove') : (language === 'pt' ? 'Adicionar aos favoritos' : 'Add to favorites')}
                >
                    <StarIcon className="w-3.5 h-3.5" isFavorite={isFavorite} color="currentColor" />
                </button>
            </div>

            <div className="team-builder-mobile-card__media">
                <div className="mx-auto aspect-square w-full max-w-[84px]">
                    <Sprite src={getPokemonDisplaySprite(pokemon)} artworkSrc={getPokemonArtworkSpriteUrl(pokemon.id)} alt={pokemon.name} className="h-full w-full" />
                </div>
            </div>

            <div className="mt-2">
                <p className="team-builder-mobile-card__name font-bold capitalize">
                    {pokemon.name}
                </p>
            </div>
        </article>
    );
};

// ---------------------------------------------------------------------------
// TeamAnalysisChip — condensed indicator that lives under the team slots.
// Tap toggles a small popover with the breakdown so users on mobile can
// glance at the team rating without scrolling to the full analysis section.
// ---------------------------------------------------------------------------
const TeamAnalysisChip = ({ teamAnalysis, teamSize, colors }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const { t, language } = useTranslation();

    const { rating, ratingColor, strengthCount, weaknessCount, topStrengths, topWeaknesses } = useMemo(() => {
        const sCount = teamAnalysis?.strengths?.size || 0;
        const wEntries = Object.entries(teamAnalysis?.weaknesses || {});
        const wCount = wEntries.length;
        // Score ranges roughly -12..+18; coarse bucketing keeps the chip
        // language honest without pretending to be a deep tier list.
        const score = sCount * 2 - wEntries.reduce((sum, [, v]) => sum + Math.max(0, v), 0);
        let label = language === 'pt' ? 'Montando' : 'Building';
        let color = colors.textMuted;
        if (teamSize >= 1) {
            if (score >= 8) { label = language === 'pt' ? 'Excelente' : 'Excellent'; color = colors.success; }
            else if (score >= 3) { label = language === 'pt' ? 'Forte' : 'Strong'; color = colors.success; }
            else if (score >= -2) { label = language === 'pt' ? 'Equilibrado' : 'Balanced'; color = colors.info || colors.primary; }
            else { label = language === 'pt' ? 'Arriscado' : 'Risky'; color = colors.danger; }
        }
        return {
            rating: label,
            ratingColor: color,
            strengthCount: sCount,
            weaknessCount: wCount,
            topStrengths: Array.from(teamAnalysis?.strengths || []).sort().slice(0, 6),
            topWeaknesses: wEntries.sort(([, a], [, b]) => b - a).slice(0, 6),
        };
    }, [teamAnalysis, teamSize, colors, language]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onDocClick = (event) => {
            if (triggerRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) {
                return;
            }
            if (triggerRef.current || popoverRef.current) {
                setIsOpen(false);
            }
        };
        const onKey = (event) => { if (event.key === 'Escape') setIsOpen(false); };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('touchstart', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('touchstart', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen]);

    if (teamSize === 0) return null;

    return (
        <div className="mt-2.5 flex justify-center">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-expanded={isOpen}
                aria-label={t('builder.analysisTitle')}
                className="inline-flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fg transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{
                    border: `1px solid ${ratingColor}55`,
                }}
            >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ratingColor }} aria-hidden="true" />
                <span style={{ color: ratingColor }}>{rating}</span>
                <span className="opacity-70">·</span>
                <span className="text-success">{strengthCount}↑</span>
                <span className="text-danger">{weaknessCount}↓</span>
                <InfoIcon />
            </button>

            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={triggerRef}
                popoverRef={popoverRef}
                role="dialog"
                ariaLabel={t('builder.analysisTitle')}
                className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-surface-raised bg-surface p-3 shadow-2xl"
                arrowStyle={{
                    backgroundColor: colors.card,
                    borderTop: `1px solid ${colors.cardLight}`,
                    borderLeft: `1px solid ${colors.cardLight}`,
                }}
            >
                <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                        {language === 'pt' ? 'Resumo do Time' : 'Team Snapshot'}
                    </p>
                    <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: `${ratingColor}22`, color: ratingColor }}
                    >
                        {rating}
                    </span>
                </div>

                <div className="mb-2">
                    <p className="mb-1 text-[10px] font-semibold text-success">
                        {language === 'pt' ? 'Cobertura Ofensiva' : 'Offensive Coverage'} ({strengthCount})
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {topStrengths.length > 0 ? topStrengths.map((type) => (
                            <TypeBadge key={type} type={type} colors={colors} />
                        )) : (
                            <span className="text-[11px] text-muted">{language === 'pt' ? 'Sem vantagens ainda.' : 'No advantages yet.'}</span>
                        )}
                    </div>
                </div>

                <div>
                    <p className="mb-1 text-[10px] font-semibold text-danger">
                        {language === 'pt' ? 'Fraquezas Defensivas' : 'Defensive Weaknesses'} ({weaknessCount})
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                        {topWeaknesses.length > 0 ? topWeaknesses.map(([type, score]) => (
                            <span key={type} className="inline-flex items-center gap-1">
                                <TypeBadge type={type} colors={colors} />
                                <span className="text-[10px] font-bold text-danger">×{score}</span>
                            </span>
                        )) : (
                            <span className="text-[11px] text-muted">{language === 'pt' ? 'Defesa sólida.' : 'Rock solid defence.'}</span>
                        )}
                    </div>
                </div>
            </AnchoredPopover>
        </div>
    );
};

const MobileTeamSlot = ({ pokemon, index, onEdit, onRemove }) => {
    const { t } = useTranslation();
    return (
        <div className="relative min-w-0">
            <button
                type="button"
                onClick={() => pokemon && onEdit?.(pokemon)}
                className={`team-builder-mobile-slot ${pokemon ? 'is-filled' : 'is-empty'}`}
                aria-label={pokemon ? `${t('common.edit')} ${pokemon.name}` : `Empty team slot ${index + 1}`}
                title={pokemon ? pokemon.name : `Empty slot ${index + 1}`}
            >
                {pokemon ? (
                    <Sprite src={getTeamPokemonDisplaySprite(pokemon, { animated: true })} artworkSrc={getPokemonArtworkSpriteUrl(pokemon.id)} alt={pokemon.name} className="h-9 w-9" />
                ) : (
                    <img
                        src={POKEBALL_PLACEHOLDER_URL}
                        alt=""
                        className="h-8 w-8 opacity-35"
                        aria-hidden="true"
                    />
                )}
            </button>

            {pokemon && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove?.(pokemon.instanceId);
                    }}
                    className="team-builder-mobile-slot__remove"
                    aria-label={`${t('common.remove')} ${pokemon.name}`}
                    title="Remove from team"
                >
                    <TrashIcon />
                </button>
            )}
        </div>
    );
};

export const MobileTeamBuilderView = ({
    currentTeam,
    teamName,
    setTeamName,
    handleRemoveFromTeam,
    handleSaveTeam,
    editingTeamId,
    activeTeamId,
    setActiveTeamId,
    handleClearTeam,
    recentTeams,
    onNavigateToTeams,
    handleToggleFavorite,
    handleEditTeam,
    requestDeleteTeam,
    handleShareTeam,
    handleExportToShowdown,
    teamAnalysis,
    searchInput,
    setSearchInput,
    selectedGeneration,
    setSelectedGeneration,
    generations,
    isInitialLoading,
    displayedPokemons,
    handleAddPokemonToTeam,
    lastPokemonElementRef,
    isFetchingMore,
    selectedTypes,
    handleTypeSelection,
    suggestedPokemonIds,
    colors,
    onEditTeamPokemon,
    favoritePokemons,
    onToggleFavoritePokemon,
    showOnlyFavorites,
    setShowOnlyFavorites,
}) => {
    const { t, language } = useTranslation();

    React.useEffect(() => {
        if (selectedTypes.size <= 1) return;
        const [, ...extraTypes] = Array.from(selectedTypes);
        extraTypes.forEach((type) => handleTypeSelection(type));
    }, [selectedTypes, handleTypeSelection]);

    const selectedTypeValue = selectedTypes.size > 0 ? Array.from(selectedTypes)[0] : 'all';

    const handleTypeSelectChange = (nextType) => {
        const activeTypes = Array.from(selectedTypes);

        activeTypes.forEach((type) => {
            if (nextType === 'all' || type !== nextType) {
                handleTypeSelection(type);
            }
        });

        if (nextType !== 'all' && !selectedTypes.has(nextType)) {
            handleTypeSelection(nextType);
        }
    };

    return (
        <div className="team-builder-mobile space-y-4">
            <div className="team-builder-mobile__sticky">
                <section className="team-builder-panel team-builder-mobile__composer p-4">
                    <div className="team-builder-panel__header flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div>
                                <p className="team-builder-panel__eyebrow">{language === 'pt' ? 'Escalação atual' : 'Current team'}</p>
                            </div>
                            {editingTeamId && (
                                editingTeamId === activeTeamId ? (
                                    <span className="home-active-badge flex items-center gap-1 text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary-soft border border-primary-border shrink-0 self-center">★ {t('common.active')}</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTeamId(editingTeamId)}
                                        className="team-builder-button team-builder-button--inline team-builder-button--inline-compact text-[10px] uppercase font-bold tracking-wider"
                                        style={{ padding: '0.15rem 0.5rem', minHeight: 'auto', borderRadius: '4px' }}
                                    >
                                        {language === 'pt' ? 'Ativar' : 'Set Active'}
                                    </button>
                                )
                            )}
                        </div>
                        <span className="team-builder-panel__meta">{currentTeam.length}/6</span>
                    </div>

                    <div className="team-builder-mobile__composer-row mt-4">
                        <input
                            type="text"
                            value={teamName}
                            onChange={(event) => setTeamName(event.target.value)}
                            placeholder={t('builder.teamNamePlaceholder')}
                            className="team-builder-field min-w-0 flex-1"
                            aria-label={t('builder.teamNamePlaceholder')}
                        />
                        <button
                            type="button"
                            onClick={handleSaveTeam}
                            className="team-builder-icon-button team-builder-icon-button--primary"
                            aria-label={editingTeamId ? t('builder.updateTeam') : t('builder.saveTeam')}
                            title={editingTeamId ? t('builder.updateTeam') : t('builder.saveTeam')}
                        >
                            <Save className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleShareTeam}
                            className="team-builder-icon-button"
                            aria-label={t('builder.shareTeam')}
                            title={t('builder.shareTeam')}
                        >
                            <ShareIcon />
                        </button>
                        <button
                            type="button"
                            onClick={handleExportToShowdown}
                            className="team-builder-icon-button"
                            aria-label={t('builder.exportShowdown')}
                            title={t('builder.exportShowdown')}
                        >
                            <ShowdownIcon />
                        </button>
                        <button
                            type="button"
                            onClick={handleClearTeam}
                            className="team-builder-icon-button team-builder-icon-button--danger"
                            aria-label={t('builder.clearTeam')}
                            title={t('builder.clearTeam')}
                        >
                            <ClearIcon />
                        </button>
                    </div>

                    <div className="team-builder-mobile__slots mt-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <MobileTeamSlot
                                key={currentTeam[index]?.instanceId ?? `mobile-slot-${index}`}
                                pokemon={currentTeam[index]}
                                index={index}
                                colors={colors}
                                onEdit={onEditTeamPokemon}
                                onRemove={handleRemoveFromTeam}
                            />
                        ))}
                    </div>

                    <TeamAnalysisChip
                        teamAnalysis={teamAnalysis}
                        teamSize={currentTeam.length}
                        colors={colors}
                    />
                </section>
            </div>

            <section className="team-builder-panel p-4">
                <div className="team-builder-mobile__filters">
                    <label className="team-builder-control team-builder-mobile__filter-control team-builder-mobile__filter-control--full">
                        <span className="team-builder-control__label">{t('common.search')}</span>
                        <input
                            type="text"
                            placeholder={t('pokedex.searchPlaceholder')}
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            className="team-builder-field"
                        />
                    </label>

                    <label className="team-builder-control team-builder-mobile__filter-control">
                        <span className="team-builder-control__label">{t('pokedex.genFilterLabel')}</span>
                        <select
                            value={selectedGeneration}
                            onChange={(event) => setSelectedGeneration(event.target.value)}
                            className="team-builder-field team-builder-select"
                        >
                            <option value="all">{t('pokedex.allGens')}</option>
                            {generations.map((generation) => (
                                <option key={generation} value={generation} className="capitalize">
                                    {generation.replace('-', ' ')}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="team-builder-control team-builder-mobile__filter-control">
                        <span className="team-builder-control__label">{t('pokedex.typesFilterLabel')}</span>
                        <div className="team-builder-mobile__filter-group">
                            <select
                                value={selectedTypeValue}
                                onChange={(event) => handleTypeSelectChange(event.target.value)}
                                className="team-builder-field team-builder-select"
                            >
                                <option value="all">{t('pokedex.allTypes')}</option>
                                {Object.keys(typeIcons).map((type) => (
                                    <option key={type} value={type} className="capitalize">
                                        {t(`types.${type}`)}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                className={`team-builder-toggle team-builder-mobile__toggle-favorite ${showOnlyFavorites ? 'is-active' : ''}`}
                                aria-pressed={showOnlyFavorites}
                                title={t('pokedex.favoritesOnly')}
                            >
                                <StarIcon className="w-5 h-5" isFavorite={showOnlyFavorites} color="currentColor" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="team-builder-panel p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="team-builder-panel__eyebrow">{language === 'pt' ? 'Feed da Pokédex' : 'Pokédex feed'}</p>
                        <h3 className="team-builder-panel__title team-builder-panel__title--small mt-2">{language === 'pt' ? 'Pokémon Disponíveis' : 'Available Pokémon'}</h3>
                    </div>
                    <span className="team-builder-panel__meta">
                        {displayedPokemons.length}
                    </span>
                </div>

                <div className="team-builder-mobile__available mt-2">
                    {isInitialLoading ? (
                        <div className="team-builder-spinner-wrap h-full">
                            <div className="team-builder-spinner" aria-hidden="true" />
                        </div>
                    ) : (
                        <>
                            <div className="p-2 custom-scrollbar">
                                <div className="team-builder-mobile__grid grid grid-cols-3 gap-2">
                                    {displayedPokemons.map((pokemon, index) => (
                                        <MobilePokemonPickerCard
                                            key={pokemon.id}
                                            pokemon={pokemon}
                                            onAddToTeam={handleAddPokemonToTeam}
                                            isSuggested={suggestedPokemonIds.has(pokemon.id)}
                                            isFavorite={favoritePokemons.has(pokemon.id)}
                                            onToggleFavorite={onToggleFavoritePokemon}
                                            colors={colors}
                                            lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null}
                                        />
                                    ))}
                                </div>

                                {isFetchingMore && (
                                    <div className="team-builder-spinner-wrap py-4">
                                        <div className="team-builder-spinner team-builder-spinner--small" aria-hidden="true" />
                                    </div>
                                )}

                                {displayedPokemons.length === 0 && (
                                    <div className="pt-6">
                                        <EmptyState
                                            compact
                                            title={showOnlyFavorites ? t('favorites.noMatchesTitle') : t('pokedex.noPokemonFound')}
                                            message={showOnlyFavorites ? t('favorites.noMatchesDesc') : t('favorites.noMatchesDesc')}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </section>

            {currentTeam.length > 0 && (
                <section className="team-builder-panel p-4 animate-fade-in" aria-label="Team analysis">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                            <p className="team-builder-panel__eyebrow">{language === 'pt' ? 'Análise' : 'Analysis'}</p>
                            <h3 className="team-builder-panel__title team-builder-panel__title--small mt-2">{t('builder.analysisTitle')}</h3>
                        </div>
                        <span className="text-[10px] text-muted">
                            {language === 'pt' ? 'toque no botão acima para detalhes' : 'tap chip above for details'}
                        </span>
                    </div>

                    <div className="team-builder-analysis-grid">
                        <div className="team-builder-analysis-card">
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-success">
                                {language === 'pt' ? 'Vantagens' : 'Strengths'} · {teamAnalysis.strengths.size}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {teamAnalysis.strengths.size > 0 ? Array.from(teamAnalysis.strengths).sort().slice(0, 8).map((type) => (
                                    <TypeBadge key={type} type={type} colors={colors} />
                                )) : (
                                    <span className="text-[11px] text-muted">{language === 'pt' ? 'Nenhuma ainda.' : 'None yet.'}</span>
                                )}
                            </div>
                        </div>

                        <div className="team-builder-analysis-card">
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-danger">
                                {language === 'pt' ? 'Fraquezas' : 'Weaknesses'} · {Object.keys(teamAnalysis.weaknesses).length}
                            </p>
                            <div className="flex flex-wrap items-center gap-1">
                                {Object.keys(teamAnalysis.weaknesses).length > 0 ? Object.entries(teamAnalysis.weaknesses)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 8)
                                    .map(([type, score]) => (
                                        <span key={type} className="inline-flex items-center gap-0.5">
                                            <TypeBadge type={type} colors={colors} />
                                            <span className="text-[10px] font-bold text-danger">×{score}</span>
                                        </span>
                                    )) : (
                                    <span className="text-[11px] text-muted">{language === 'pt' ? 'Sólido como rocha.' : 'Rock solid.'}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <section className="team-builder-panel p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="team-builder-panel__eyebrow">{language === 'pt' ? 'Trabalho salvo' : 'Saved work'}</p>
                        <h3 className="team-builder-panel__title team-builder-panel__title--small mt-2">
                            {language === 'pt' ? 'Retomar equipe salva' : 'Resume a saved lineup'}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onNavigateToTeams}
                        className="team-builder-button team-builder-button--inline team-builder-button--inline-compact"
                    >
                        {t('home.seeAll')}
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    {recentTeams.length > 0 ? recentTeams.map((team) => (
                        <div
                            key={team.id}
                            className="team-builder-mobile__recent-card"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-base font-bold text-fg">
                                        {team.name}
                                    </p>
                                    <div className="mt-2 flex">
                                        {team.pokemons.map((pokemon) => (
                                            <img
                                                key={pokemon.instanceId || `${team.id}-${pokemon.id}`}
                                                src={getTeamPokemonDisplaySprite(pokemon)}
                                                alt={pokemon.name}
                                                className="-ml-2 h-9 w-9 rounded-full border-2 border-bg bg-surface first:ml-0"
                                                onError={(event) => { event.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleToggleFavorite(team)}
                                    className={`team-builder-icon-button ${team.isFavorite ? 'team-builder-icon-button--accent' : ''}`}
                                    aria-label={team.isFavorite ? (language === 'pt' ? `Remover ${team.name} dos favoritos` : `Remove ${team.name} from favorites`) : (language === 'pt' ? `Favoritar ${team.name}` : `Favorite ${team.name}`)}
                                >
                                    <StarIcon isFavorite={team.isFavorite} color="currentColor" />
                                </button>
                            </div>

                            <div className="mt-4 flex gap-2">
                                {(() => {
                                    const isActive = team.id === activeTeamId || (activeTeamId === null && recentTeams[0]?.id === team.id);
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTeamId(isActive ? null : team.id)}
                                            className={`team-builder-button team-builder-button--grow ${isActive ? 'team-builder-button--primary' : 'team-builder-button--secondary'} text-xs`}
                                            style={isActive ? { backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff' } : undefined}
                                        >
                                            {isActive ? `★ ${t('common.active')}` : (language === 'pt' ? 'Ativar' : 'Set Active')}
                                        </button>
                                    );
                                })()}
                                <button
                                    type="button"
                                    onClick={() => handleEditTeam(team)}
                                    className="team-builder-button team-builder-button--secondary team-builder-button--grow"
                                >
                                    {t('common.edit')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => requestDeleteTeam(team.id, team.name)}
                                    className="team-builder-button team-builder-button--secondary !text-danger"
                                >
                                    {t('common.delete')}
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p className="team-builder-empty-note text-sm">
                            {language === 'pt' ? 'Nenhum time recente ainda.' : 'No recent teams yet.'}
                        </p>
                    )}
                </div>
            </section>

        </div>
    );
};