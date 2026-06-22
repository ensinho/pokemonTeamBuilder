import React, { useCallback, useMemo, useState } from 'react';
import '../../styles/team-builder-view.css';
import '../../styles/reference-views.css';
import { typeColors } from '../../constants/types';
import { getMovesList, getMoveDetails } from '../../services/pokemonDataCache';
import { useReferenceList } from '../../hooks/useReferenceList';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../EmptyState';
import { TypeBadge } from '../TypeBadge';
import { PokemonLinkChips } from '../PokemonLinkChips';
import { ClearIcon } from '../icons';

const loadDetail = (entry) => getMoveDetails(entry.url, entry.name);

const prettify = (name = '') => name.replace(/-/g, ' ');

const CATEGORY_CLASS = {
    physical: 'ref-cat--physical',
    special: 'ref-cat--special',
    status: 'ref-cat--status',
};

export function MovesListView() {
    const { t } = useTranslation();
    const [openName, setOpenName] = useState(null);
    const [typeFilter, setTypeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const { search, setSearch, isLoadingIndex, total, visible, details, hasMore, sentinelRef } =
        useReferenceList({ loadIndex: getMovesList, loadDetail });

    // Type/category filters operate on already-resolved detail rows; a row whose
    // detail hasn't loaded yet is kept until we know it doesn't match.
    const rows = useMemo(() => {
        if (typeFilter === 'all' && categoryFilter === 'all') return visible;
        return visible.filter((entry) => {
            const d = details[entry.name];
            if (!d) return true;
            if (typeFilter !== 'all' && d.type !== typeFilter) return false;
            if (categoryFilter !== 'all' && d.damage_class !== categoryFilter) return false;
            return true;
        });
    }, [visible, details, typeFilter, categoryFilter]);

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
                        placeholder={t('db.searchMoves')}
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

                <div className="team-builder-select-wrap">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="team-builder-field team-builder-field--compact team-builder-select appearance-none capitalize"
                        aria-label={t('db.colType')}
                    >
                        <option value="all">{t('db.allTypes')}</option>
                        {Object.keys(typeColors).map((type) => (
                            <option key={type} value={type}>{t(`types.${type}`)}</option>
                        ))}
                    </select>
                </div>

                <div className="team-builder-select-wrap">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="team-builder-field team-builder-field--compact team-builder-select appearance-none capitalize"
                        aria-label={t('db.colCategory')}
                    >
                        <option value="all">{t('db.allCategories')}</option>
                        <option value="physical">{t('db.physical')}</option>
                        <option value="special">{t('db.special')}</option>
                        <option value="status">{t('db.status')}</option>
                    </select>
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
                    <div className="ref-head ref-head--moves">
                        <span>{t('db.colName')}</span>
                        <span>{t('db.colType')}</span>
                        <span>{t('db.colCategory')}</span>
                        <span className="ref-num">{t('db.colPower')}</span>
                        <span className="ref-num ref-col-acc">{t('db.colAccuracy')}</span>
                        <span className="ref-num ref-col-pp">{t('db.colPP')}</span>
                    </div>

                    {rows.map((entry) => {
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
                                className={`ref-row ref-row--moves ${isOpen ? 'is-open' : ''}`}
                            >
                                <span className="ref-row__name">{prettify(entry.name)}</span>

                                <span className="ref-type-cell">
                                    {d?.type ? <TypeBadge type={d.type} /> : <span className="ref-skeleton" />}
                                </span>

                                <span>
                                    {d?.damage_class
                                        ? <span className={`ref-cat ${CATEGORY_CLASS[d.damage_class] || ''}`}>{t(`db.${d.damage_class}`)}</span>
                                        : <span className="ref-skeleton" />}
                                </span>

                                <span className="ref-num">{d ? (d.power ?? '—') : <span className="ref-skeleton" />}</span>
                                <span className="ref-num ref-num--muted ref-col-acc">{d ? (d.accuracy ?? '—') : ''}</span>
                                <span className="ref-num ref-num--muted ref-col-pp">{d ? (d.pp ?? '—') : ''}</span>

                                {isOpen && (
                                    <span className="ref-effect">
                                        {d
                                            ? <><strong className="capitalize">{prettify(entry.name)}</strong>{d.type ? ` · ${t(`types.${d.type}`)}` : ''}{typeof d.power === 'number' ? ` · ${t('db.colPower')} ${d.power}` : ''}{typeof d.accuracy === 'number' ? ` · ${d.accuracy}% ${t('db.colAccuracy')}` : ''}{typeof d.pp === 'number' ? ` · ${d.pp} PP` : ''}</>
                                            : t('db.loadingDetails')}
                                    </span>
                                )}
                                {isOpen && d?.learnedBy?.length > 0 && (
                                    <>
                                        <span className="ref-mons-label">{t('db.learnedBy')} · {d.learnedBy.length}</span>
                                        <PokemonLinkChips pokemons={d.learnedBy} />
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
