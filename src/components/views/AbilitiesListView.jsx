import React, { useCallback, useState } from 'react';
import '../../styles/team-builder-view.css';
import '../../styles/reference-views.css';
import { getAbilitiesList, getAbilityDetails } from '../../services/pokemonDataCache';
import { useReferenceList } from '../../hooks/useReferenceList';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../EmptyState';
import { PokemonLinkChips } from '../PokemonLinkChips';
import { ClearIcon } from '../icons';

const loadDetail = (entry) => getAbilityDetails(entry);
const prettify = (name = '') => name.replace(/-/g, ' ');

export function AbilitiesListView() {
    const { t } = useTranslation();
    const [openName, setOpenName] = useState(null);

    const { search, setSearch, isLoadingIndex, total, visible, details, hasMore, sentinelRef } =
        useReferenceList({ loadIndex: getAbilitiesList, loadDetail });

    const toggle = useCallback((name) => {
        setOpenName((prev) => (prev === name ? null : name));
    }, []);

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
                        const isOpen = openName === entry.name;
                        return (
                            <div
                                key={entry.name}
                                role="button"
                                tabIndex={0}
                                onClick={() => toggle(entry.name)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(entry.name); } }}
                                aria-expanded={isOpen}
                                className={`ref-row ref-row--abilities ${isOpen ? 'is-open' : ''}`}
                            >
                                <span className="ref-row__name">{prettify(entry.name)}</span>

                                {isOpen
                                    ? <span className="ref-row__effect" style={{ WebkitLineClamp: 'unset', display: 'block' }}>{d ? d.effect : t('db.loadingDetails')}</span>
                                    : <span className="ref-row__effect">{d ? d.effect : <span className="ref-skeleton ref-skeleton--wide" />}</span>}

                                <span className="ref-num ref-num--muted ref-col-holders">
                                    {d ? d.pokemonCount : ''}
                                </span>

                                {isOpen && d?.pokemon?.length > 0 && (
                                    <>
                                        <span className="ref-mons-label">{t('db.usedBy')} · {d.pokemon.length}</span>
                                        <PokemonLinkChips pokemons={d.pokemon} />
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {hasMore && <div ref={sentinelRef} className="ref-sentinel" aria-hidden="true" />}
                </div>
            )}
        </div>
    );
}
