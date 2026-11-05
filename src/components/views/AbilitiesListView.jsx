import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/team-builder-view.css';
import '../../styles/reference-views.css';
import { getAbilitiesList, getAbilityDetails, resolvePokemonDetail } from '../../services/pokemonDataCache';
import { useReferenceList } from '../../hooks/useReferenceList';
import { useReferenceStore } from '../../store/useReferenceStore';
import { makePokemonRelatedNamesResolver } from '../../utils/referenceRelatedNames';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { EmptyState } from '../EmptyState';
import { ClearIcon } from '../icons';
import { Loader } from '../Loader';

const loadDetail = (entry) => getAbilityDetails(entry);
const prettify = (name = '') => name.replace(/-/g, ' ');

// Memoised row: only the row whose detail just landed re-renders, not every
// revealed row once per arrival (see MoveRow in MovesListView).
// A real link (Cmd/middle-click open a tab). `linkState` carries this list's
// URL, search and filters included, so the detail page's back button returns
// to the same filtered list.
const AbilityRow = React.memo(function AbilityRow({ entry, linkState, d }) {
    return (
        <Link
            to={`/abilities/${entry.name}`}
            state={linkState}
            className="ref-row ref-row--abilities"
        >
            <span className="ref-row__name">{prettify(entry.name)}</span>

            <span className="ref-row__effect">{d ? d.effect : <span className="ref-skeleton ref-skeleton--wide" />}</span>

            <span className="ref-num ref-num--muted ref-col-holders">
                {d ? d.pokemonCount : ''}
            </span>
        </Link>
    );
});

export function AbilitiesListView() {
    const { t } = useTranslation();
    useDocumentMeta({
        title: 'Abilities List',
        description: 'Every Pokémon ability explained, with its effect and which Pokémon can have it.',
        path: '/abilities',
    });
    const { linkState } = useEntityNavigate();

    // Lets a search for a Pokémon name surface that Pokémon's abilities.
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);
    const getRelatedNames = useMemo(
        () => makePokemonRelatedNamesResolver(pokemonIndex, resolvePokemonDetail, 'abilities'),
        [pokemonIndex],
    );

    const { search, setSearch, isLoadingIndex, total, visible, details, hasMore, sentinelRef } =
        useReferenceList({ loadIndex: getAbilitiesList, loadDetail, getRelatedNames, listKey: 'abilities' });

    return (
        <div className="ref-view">
            <div className="ref-toolbar">
                <div className="team-builder-search-wrap">
                    <span className="team-builder-search-icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder={t('db.searchAbilities')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="team-builder-field team-builder-field--compact team-builder-search-input"
                    />
                    {search && (
                        <button type="button" onClick={() => setSearch('')} className="team-builder-search-clear" aria-label={t('common.clear')}>
                            <ClearIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <span className="ref-toolbar__count">{t('db.results', { count: total })}</span>
            </div>

            {isLoadingIndex ? (
                <Loader size="lg" block />
            ) : total === 0 ? (
                <EmptyState
                    compact
                    title={t('db.noMatchesTitle')}
                    message={t('db.noMatchesDesc')}
                    action={search ? { label: t('common.clearSearch'), onClick: () => setSearch('') } : undefined}
                />
            ) : (
                <div className="ref-list">
                    <div className="ref-head ref-head--abilities">
                        <span>{t('db.colName')}</span>
                        <span>{t('db.colEffect')}</span>
                        <span className="ref-num ref-col-holders">{t('db.colHolders')}</span>
                    </div>

                    {visible.map((entry) => (
                        <AbilityRow key={entry.name} entry={entry} linkState={linkState} d={details[entry.name]} />
                    ))}

                    {hasMore && <div ref={sentinelRef} className="ref-sentinel" aria-hidden="true" />}
                </div>
            )}
        </div>
    );
}
