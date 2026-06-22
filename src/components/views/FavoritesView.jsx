import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AllTeamsView } from './AllTeamsView';
import { FavoritePokemonsView } from './FavoritePokemonsView';
import { useTranslation } from '../../hooks/useTranslation';
import { SavedTeamsIcon, StarsIcon } from '../icons';

/**
 * Combined "Favorites" surface — one sidebar entry hosting two tabs (Teams and
 * Pokémon) so the navigation stays lean. The active tab is reflected in the URL
 * (?tab=teams|pokemon) so it's linkable and survives refresh.
 */
export function FavoritesView({ teamsProps, pokemonProps }) {
    const { t } = useTranslation();
    const [params, setParams] = useSearchParams();
    // Teams are the default tab (most-used surface); Pokémon needs ?tab=pokemon.
    const tab = params.get('tab') === 'pokemon' ? 'pokemon' : 'teams';

    const selectTab = (next) => {
        setParams(next === 'pokemon' ? { tab: 'pokemon' } : {}, { replace: true });
    };

    const teamCount = teamsProps?.teams?.length ?? 0;
    const pokemonCount = pokemonProps?.favoritePokemons?.size ?? 0;

    const TabButton = ({ id, icon, label, count }) => (
        <button
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => selectTab(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                tab === id
                    ? 'bg-primary text-white border border-primary'
                    : 'bg-surface border border-border text-muted hover:text-fg'
            }`}
        >
            <span aria-hidden="true">{icon}</span>
            {label}
            <span className={`text-xs font-mono ${tab === id ? 'text-white/80' : 'text-muted'}`}>{count}</span>
        </button>
    );

    return (
        <div className="flex flex-col gap-3">
            <div className="flex gap-2" role="tablist" aria-label={t('favorites.title')}>
                <TabButton
                    id="teams"
                    icon={<SavedTeamsIcon className="w-4 h-4 shrink-0" />}
                    label={t('nav.savedTeams')}
                    count={teamCount}
                />
                <TabButton
                    id="pokemon"
                    icon={<StarsIcon className="w-4 h-4 shrink-0" />}
                    label={t('nav.favorites')}
                    count={pokemonCount}
                />
            </div>

            {tab === 'teams'
                ? <AllTeamsView {...teamsProps} />
                : <FavoritePokemonsView {...pokemonProps} />}
        </div>
    );
}
