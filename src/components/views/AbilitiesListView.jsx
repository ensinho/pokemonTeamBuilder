import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/team-builder-view.css';
import '../../styles/reference-views.css';
import { getAbilitiesList, getAbilityDetails, resolvePokemonDetail } from '../../services/pokemonDataCache';
import { useReferenceList } from '../../hooks/useReferenceList';
import { useReferenceStore } from '../../store/useReferenceStore';
import { makePokemonRelatedNamesResolver } from '../../utils/referenceRelatedNames';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { EmptyState } from '../EmptyState';
import { ClearIcon } from '../icons';

const loadDetail = (entry) => getAbilityDetails(entry);
const prettify = (name = '') => name.replace(/-/g, ' ');

export function AbilitiesListView() {
    const { t } = useTranslation();
    useDocumentMeta({
        title: 'Abilities List',
        description: 'Every Pokémon ability explained, with its effect and which Pokémon can have it.',
        path: '/abilities',
    });
    const navigate = useNavigate();

    // Lets a search for a Pokémon name surface that Pokémon's abilities.
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);
    const getRelatedNames = useCallback(
        makePokemonRelatedNamesResolver(pokemonIndex, resolvePokemonDetail, 'abilities'),
        [pokemonIndex],
    );

    const { search, setSearch, isLoadingIndex, total, visible, details, hasMore, sentinelRef } =
        useReferenceList({ loadIndex: getAbilitiesList, loadDetail, getRelatedNames });

    // Each row is a link to that ability's own page; the origin is stashed so
    // the detail page's back button returns here.
    const openDetail = useCallback((name) => {
        navigate(`/abilities/${name}`, { state: { from: '/abilities' } });
    }, [navigate]);

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
                <div className="team-builder-spinner-wrap" style={{ minHeight: '40vh' }}>
                    <div className="team-builder-spinner" aria-hidden="true"></div>
                </div>
            ) : total === 0 ? (
                <EmptyState compact title={t('db.noMatchesTitle')} message={t('db.noMatchesDesc')} />
            ) : (
                <div className="ref-list custom-scrollbar">
                    <div className="ref-head ref-head--abilities">
                        <span>{t('db.colName')}</span>
                        <span>{t('db.colEffect')}</span>
                        <span className="ref-num ref-col-holders">{t('db.colHolders')}</span>
                    </div>

                    {visible.map((entry) => {
                        const d = details[entry.name];
                        return (
                            <div
                                key={entry.name}
                                role="link"
                                tabIndex={0}
                                onClick={() => openDetail(entry.name)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(entry.name); } }}
                                className="ref-row ref-row--abilities"
                            >
                                <span className="ref-row__name">{prettify(entry.name)}</span>

                                <span className="ref-row__effect">{d ? d.effect : <span className="ref-skeleton ref-skeleton--wide" />}</span>

                                <span className="ref-num ref-num--muted ref-col-holders">
                                    {d ? d.pokemonCount : ''}
                                </span>
                            </div>
                        );
                    })}

                    {hasMore && <div ref={sentinelRef} className="ref-sentinel" aria-hidden="true" />}
                </div>
            )}
        </div>
    );
}
