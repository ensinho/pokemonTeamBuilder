import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../../styles/team-builder-view.css';
import '../../styles/reference-views.css';
import { getItemDetails } from '../../services/pokemonDataCache';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useReferenceList } from '../../hooks/useReferenceList';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { EmptyState } from '../EmptyState';
import { ClearIcon } from '../icons';

const prettify = (name = '') => name.replace(/-/g, ' ');
const loadDetail = (entry) => getItemDetails(entry);

export function ItemsListView() {
    const { t } = useTranslation();
    useDocumentMeta({
        title: 'Items List',
        description: 'Held items, berries, and battle items for competitive Pokémon teams, with full effect descriptions.',
        path: '/items',
    });
    const items = useReferenceStore((s) => s.items);
    const [openName, setOpenName] = useState(null);

    // Items index already ships with the reference data — no extra request.
    const loadIndex = useCallback(
        () => (items || []).map((it) => ({ name: it.name, url: it.url })),
        [items]
    );

    const { search, setSearch, isLoadingIndex, total, visible, details, hasMore, sentinelRef } =
        useReferenceList({ loadIndex, loadDetail });

    // Deep-link support: /items?q=<slug> pre-fills the search and opens that item,
    // so suggestions elsewhere (e.g. team detail) can link straight to its entry.
    const [searchParams] = useSearchParams();
    const queryItem = searchParams.get('q');
    useEffect(() => {
        if (!queryItem) return;
        setSearch(queryItem);
        setOpenName(queryItem);
    }, [queryItem, setSearch]);

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
                        placeholder={t('db.searchItems')}
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
                    <div className="ref-head ref-head--items">
                        <span aria-hidden="true"></span>
                        <span>{t('db.colName')}</span>
                        <span className="ref-col-itemeffect">{t('db.colEffect')}</span>
                        <span className="ref-num">{t('db.colCost')}</span>
                    </div>

                    {visible.map((entry) => {
                        const d = details[entry.name];
                        const isOpen = openName === entry.name;
                        return (
                            <button
                                key={entry.name}
                                type="button"
                                onClick={() => toggle(entry.name)}
                                aria-expanded={isOpen}
                                className={`ref-row ref-row--items ${isOpen ? 'is-open' : ''}`}
                            >
                                {d?.sprite
                                    ? <img src={d.sprite} alt="" aria-hidden="true" className="ref-sprite" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                    : <span className="ref-sprite" aria-hidden="true" />}

                                <span className="ref-row__name">
                                    {prettify(entry.name)}
                                    {d?.category && <span className="ref-row__sub">{prettify(d.category)}</span>}
                                </span>

                                <span className="ref-col-itemeffect">
                                    <span className="ref-row__effect">{d ? d.effect : <span className="ref-skeleton ref-skeleton--wide" />}</span>
                                </span>

                                <span className="ref-num ref-num--muted">{d ? (d.cost || '—') : ''}</span>

                                {isOpen && (
                                    <span className="ref-effect">{d ? d.effect : t('db.loadingDetails')}</span>
                                )}
                            </button>
                        );
                    })}

                    {hasMore && <div ref={sentinelRef} className="ref-sentinel" aria-hidden="true" />}
                </div>
            )}
        </div>
    );
}
