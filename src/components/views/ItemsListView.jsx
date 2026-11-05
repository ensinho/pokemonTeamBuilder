import React, { useCallback, useState } from 'react';
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
import { Loader } from '../Loader';

const prettify = (name = '') => name.replace(/-/g, ' ');
const loadDetail = (entry) => getItemDetails(entry);

// Memoised row: only the row whose detail just landed (or that was opened)
// re-renders, not every revealed row once per arrival (see MoveRow).
const ItemRow = React.memo(function ItemRow({ entry, d, isOpen, onToggle, t }) {
    return (
        <button
            type="button"
            onClick={() => onToggle(entry.name)}
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
});

export function ItemsListView() {
    const { t } = useTranslation();
    useDocumentMeta({
        title: 'Items List',
        description: 'Held items, berries, and battle items for competitive Pokémon teams, with full effect descriptions.',
        path: '/items',
    });
    const items = useReferenceStore((s) => s.items);
    // The index ships with the reference data fetched at boot. Until that
    // settles, `items` is [] for "not loaded" as much as for "none" — so the
    // list reports loading, never a false "no matches" (cold visit, 2026-11).
    const referenceStatus = useReferenceStore((s) => s.referenceStatus);
    const fetchReferenceData = useReferenceStore((s) => s.fetchReferenceData);
    const referenceSettled = referenceStatus === 'ready' || referenceStatus === 'error';
    // Deep-link support: /items?q=<slug> pre-fills the search (the hook reads
    // ?q=) and opens that item, so suggestions elsewhere (e.g. team detail) can
    // link straight to its entry.
    const [searchParams] = useSearchParams();
    const [openName, setOpenName] = useState(() => searchParams.get('q'));

    // Items index already ships with the reference data — no extra request.
    const loadIndex = useCallback(
        () => (items || []).map((it) => ({ name: it.name, url: it.url })),
        [items]
    );

    const { search, setSearch, isLoadingIndex, total, visible, details, hasMore, sentinelRef } =
        useReferenceList({ loadIndex, loadDetail, listKey: 'items', enabled: referenceSettled });

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
                <Loader size="lg" block />
            ) : total === 0 && referenceStatus === 'error' ? (
                <EmptyState
                    compact
                    title={t('db.itemsLoadError')}
                    action={{ label: t('toast.retry'), onClick: fetchReferenceData }}
                />
            ) : total === 0 ? (
                <EmptyState
                    compact
                    title={t('db.noMatchesTitle')}
                    message={t('db.noMatchesDesc')}
                    action={search ? { label: t('common.clearSearch'), onClick: () => setSearch('') } : undefined}
                />
            ) : (
                <div className="ref-list">
                    <div className="ref-head ref-head--items">
                        <span aria-hidden="true"></span>
                        <span>{t('db.colName')}</span>
                        <span className="ref-col-itemeffect">{t('db.colEffect')}</span>
                        <span className="ref-num">{t('db.colCost')}</span>
                    </div>

                    {visible.map((entry) => (
                        <ItemRow
                            key={entry.name}
                            entry={entry}
                            d={details[entry.name]}
                            isOpen={openName === entry.name}
                            onToggle={toggle}
                            t={t}
                        />
                    ))}

                    {hasMore && <div ref={sentinelRef} className="ref-sentinel" aria-hidden="true" />}
                </div>
            )}
        </div>
    );
}
