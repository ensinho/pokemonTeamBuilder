import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/team-builder-view.css';
import '../../styles/reference-views.css';
import { resolvePokemonDetail } from '../../services/pokemonDataCache';
import { loadStaticData } from '../../services/staticData';
import { useReferenceList } from '../../hooks/useReferenceList';
import { useReferenceStore } from '../../store/useReferenceStore';
import { makePokemonRelatedNamesResolver } from '../../utils/referenceRelatedNames';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { EmptyState } from '../EmptyState';
import { ClearIcon } from '../icons';
import { Loader } from '../Loader';

const prettify = (name = '') => name.replace(/-/g, ' ');

// The whole list is one baked file (public/data/ability-list.json, ~11 KB gz,
// 2026-11-09): name, short effect and holder count. Before, each visible row
// was its own PokéAPI request carrying every Pokémon with the ability, and
// the index listed non-main-series entries. The search matches the effect too.
const loadIndex = () => loadStaticData('ability-list.json').then((data) => (data?.abilities || []).map((a) => ({
    name: a.n,
    label: a.en || prettify(a.n),
    effect: a.e || '',
    pokemonCount: a.k || 0,
    hay: `${a.n} ${(a.en || '').toLowerCase()} ${(a.e || '').toLowerCase()}`,
})));

const matchEntry = (entry, slugTerm, rawTerm) => entry.name.includes(slugTerm) || entry.hay.includes(rawTerm);

// Memoised row: only the row whose detail just landed re-renders, not every
// revealed row once per arrival (see MoveRow in MovesListView).
// A real link (Cmd/middle-click open a tab). `linkState` carries this list's
// URL, search and filters included, so the detail page's back button returns
// to the same filtered list.
const AbilityRow = React.memo(function AbilityRow({ entry, linkState }) {
    return (
        <Link
            to={`/abilities/${entry.name}`}
            state={linkState}
            className="ref-row ref-row--abilities"
        >
            <span className="ref-row__name">{entry.label}</span>

            <span className="ref-row__effect">{entry.effect || '—'}</span>

            <span className="ref-num ref-num--muted ref-col-holders">
                {entry.pokemonCount}
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

    const { search, setSearch, isLoadingIndex, total, visible, hasMore, sentinelRef } =
        useReferenceList({ loadIndex, matchEntry, getRelatedNames, listKey: 'abilities' });

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
                <Loader size="lg" scene="pokedex" block />
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
                        <AbilityRow key={entry.name} entry={entry} linkState={linkState} />
                    ))}

                    {hasMore && <div ref={sentinelRef} className="ref-sentinel" aria-hidden="true" />}
                </div>
            )}
        </div>
    );
}
