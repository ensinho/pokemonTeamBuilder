import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AllTeamsView } from './AllTeamsView';
import { FavoritePokemonsView } from './FavoritePokemonsView';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { maxWidthBelow } from '../../constants/breakpoints';
import { SavedTeamsIcon, StarsIcon } from '../icons';

/**
 * Combined "Favorites" surface — one sidebar entry hosting two tabs (Teams and
 * Pokémon) so the navigation stays lean. The active tab is reflected in the URL
 * (?tab=teams|pokemon) so it's linkable and survives refresh.
 */
export function FavoritesView({ teamsProps, pokemonProps }) {
    const { t } = useTranslation();
    const isMobile = useMediaQuery(maxWidthBelow('lg'));
    const [params, setParams] = useSearchParams();
    // Teams are the default tab (most-used surface); Pokémon needs ?tab=pokemon.
    const tab = params.get('tab') === 'pokemon' ? 'pokemon' : 'teams';
    useDocumentMeta({ title: tab === 'pokemon' ? t('favorites.title') : t('nav.favorites') });

    const selectTab = (next) => {
        setParams(next === 'pokemon' ? { tab: 'pokemon' } : {}, { replace: true });
    };

    const teamCount = teamsProps?.teams?.length ?? 0;
    const pokemonCount = pokemonProps?.favoritePokemons?.size ?? 0;

    // One control at every width: the shared segmented, counts as badges. The
    // desktop used hand-rolled pills that spent the view's single accent as a
    // solid primary fill on what is only a filter (2026-10-06: unified).
    const tabs = [
        { id: 'teams', icon: <SavedTeamsIcon className="w-4 h-4 shrink-0" />, label: isMobile ? t('favorites.tabTeamsShort') : t('nav.savedTeams'), count: teamCount },
        { id: 'pokemon', icon: <StarsIcon className="w-4 h-4 shrink-0" />, label: isMobile ? t('favorites.tabPokemonShort') : t('favorites.tabFavorites'), count: pokemonCount },
    ];

    return (
        <div className="flex flex-col gap-3">
            <div
                className={`segmented ${isMobile ? 'segmented--lg segmented--block' : 'self-start'}`}
                role="tablist"
                aria-label={t('favorites.title')}
            >
                {tabs.map(({ id, icon, label, count }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={tab === id}
                        onClick={() => selectTab(id)}
                        className="segmented__item"
                    >
                        {!isMobile && <span aria-hidden="true">{icon}</span>}
                        {label}
                        <span className="count-badge">{count}</span>
                    </button>
                ))}
            </div>

            {tab === 'teams'
                ? <AllTeamsView {...teamsProps} />
                : <FavoritePokemonsView {...pokemonProps} />}
        </div>
    );
}
