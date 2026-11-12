import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../../styles/team-builder-view.css';
import '../../styles/reference-views.css';
import { loadStaticData } from '../../services/staticData';
import { useReferenceList } from '../../hooks/useReferenceList';
import { useUrlParam } from '../../hooks/useUrlParam';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { EmptyState } from '../EmptyState';
import { ClearIcon } from '../icons';
import { Loader } from '../Loader';
import { HubSlot } from '../HubSwitch';

const prettify = (name = '') => name.replace(/-/g, ' ');

// The page's groups, in the order a team builder reaches for them
// (scripts/build-item-list.mjs decides which item lands in which).
const ITEM_GROUPS = ['held', 'berries', 'medicine', 'evolution', 'balls'];

/**
 * The whole list is one baked file (public/data/item-list.json, ~17 KB gz,
 * 2026-11-09): before, every visible row was its own PokéAPI request and the
 * index held 2,000 entries, two thirds of them sandwich ingredients, TM
 * materials and story items. Each row carries a search haystack so the query
 * matches the name, the category and the effect ("speed", "restaura").
 */
const loadIndex = () => loadStaticData('item-list.json').then((data) => (data?.items || []).map((it) => ({
    name: it.n,
    label: it.en || prettify(it.n),
    group: it.g,
    category: it.c,
    cost: it.$ || 0,
    effect: it.e || '',
    hasSprite: !it.ns,
    hay: `${it.n} ${(it.en || '').toLowerCase()} ${it.c} ${(it.e || '').toLowerCase()}`,
})));

const matchEntry = (entry, slugTerm, rawTerm) => entry.name.includes(slugTerm) || entry.hay.includes(rawTerm);

// Memoised row with its data on it: opening one re-renders only that row.
const ItemRow = React.memo(function ItemRow({ entry, isOpen, onToggle }) {
    return (
        <button
            type="button"
            onClick={() => onToggle(entry.name)}
            aria-expanded={isOpen}
            className={`ref-row ref-row--items ${isOpen ? 'is-open' : ''}`}
        >
            {entry.hasSprite
                ? <img src={itemSpriteUrl(entry.name)} alt="" aria-hidden="true" width={32} height={32} loading="lazy" decoding="async" className="ref-sprite" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                : <span className="ref-sprite" aria-hidden="true" />}

            <span className="ref-row__name">
                {entry.label}
                <span className="ref-row__sub">{prettify(entry.category)}</span>
            </span>

            <span className="ref-col-itemeffect">
                <span className="ref-row__effect">{entry.effect || '—'}</span>
            </span>

            <span className="ref-num ref-num--muted">{entry.cost || '—'}</span>

            {isOpen && (
                <span className="ref-effect">{entry.effect || '—'}</span>
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
    // Deep-link support: /items?q=<slug> pre-fills the search (the hook reads
    // ?q=) and opens that item, so suggestions elsewhere (e.g. team detail) can
    // link straight to its entry.
    const [searchParams] = useSearchParams();
    const [openName, setOpenName] = useState(() => searchParams.get('q'));

    // The group filter lives in the URL too (?g=held), like the search.
    const [group, setGroup] = useUrlParam('g');
    const activeGroup = ITEM_GROUPS.includes(group) ? group : '';
    const filterEntry = useCallback((entry) => entry.group === activeGroup, [activeGroup]);

    const { search, setSearch, isLoadingIndex, total, visible, hasMore, sentinelRef } = useReferenceList({
        loadIndex,
        matchEntry,
        filterEntry: activeGroup ? filterEntry : null,
        filterKey: activeGroup,
        listKey: 'items',
    });

    const toggle = useCallback((name) => {
        setOpenName((prev) => (prev === name ? null : name));
    }, []);

    return (
        <div className="ref-view">
            <HubSlot>
                <div className="ref-toolbar">
                    <div className="team-builder-search-wrap">
                        <span className="team-builder-search-icon" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            inputMode="search"
                            enterKeyHint="search"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder={t('db.searchItems')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="team-builder-field team-builder-field--compact team-builder-search-input"
                            aria-label={t('db.searchItems')}
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch('')} className="team-builder-search-clear" aria-label={t('common.clear')}>
                                <ClearIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="team-builder-select-wrap">
                        <select
                            value={activeGroup}
                            onChange={(e) => setGroup(e.target.value)}
                            className="team-builder-field team-builder-field--compact team-builder-select appearance-none"
                            aria-label={t('db.itemGroup')}
                        >
                            <option value="">{t('db.itemGroups.all')}</option>
                            {ITEM_GROUPS.map((key) => (
                                <option key={key} value={key}>{t(`db.itemGroups.${key}`)}</option>
                            ))}
                        </select>
                    </div>

                    <span className="ref-toolbar__count">{t('db.results', { count: total })}</span>
                </div>
            </HubSlot>

            {isLoadingIndex ? (
                <Loader size="lg" scene="pokedex" block />
            ) : total === 0 ? (
                <EmptyState
                    compact
                    mascot="search"
                    title={t('db.noMatchesTitle')}
                    message={t('db.noMatchesDesc')}
                    action={search || activeGroup
                        ? { label: t('common.clearSearch'), onClick: () => { setSearch(''); setGroup(''); } }
                        : undefined}
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
                            isOpen={openName === entry.name}
                            onToggle={toggle}
                        />
                    ))}

                    {hasMore && <div ref={sentinelRef} className="ref-sentinel" aria-hidden="true" />}
                </div>
            )}
        </div>
    );
}
