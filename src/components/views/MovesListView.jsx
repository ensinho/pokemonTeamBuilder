import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/team-builder-view.css';
import '../../styles/reference-views.css';
import { typeColors } from '../../constants/types';
import { getMovesList, getMoveDetails, resolvePokemonDetail } from '../../services/pokemonDataCache';
import { useReferenceList } from '../../hooks/useReferenceList';
import { useReferenceStore } from '../../store/useReferenceStore';
import { makePokemonRelatedNamesResolver } from '../../utils/referenceRelatedNames';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { EmptyState } from '../EmptyState';
import { TypeChip } from '../TypeChip';
import { ClearIcon } from '../icons';
import { Loader } from '../Loader';
import { useBattleDex, getBattleDex } from '../../hooks/useBattleDex';

// Type, category, power, accuracy and PP for every move are already in
// public/data/battle-dex.json (keyed by Showdown id: "thunder-punch" →
// "thunderpunch"). Reading them from there answers the whole list at once —
// /moves used to fire ~41 live PokéAPI requests and show skeleton rows, and
// its filters could only see the rows that had loaded (2026-10-14).
const toID = (name = '') => name.toLowerCase().replace(/[^a-z0-9]/g, '');
// One object per move per dex, so a memoised MoveRow sees the same reference
// on every render.
const dexCache = new WeakMap();
const dexDetail = (dex, name) => {
    const row = dex?.moves?.[toID(name)];
    if (!row) return null;
    let byName = dexCache.get(dex);
    if (!byName) { byName = new Map(); dexCache.set(dex, byName); }
    if (byName.has(name)) return byName.get(name);
    const [, type, category, basePower, accuracy, pp] = row;
    const detail = {
        type,
        damage_class: String(category || '').toLowerCase(),
        power: basePower || null,
        accuracy: accuracy === true ? null : (accuracy || null),
        pp: pp || null,
    };
    byName.set(name, detail);
    return detail;
};
const loadDetail = (entry) => dexDetail(getBattleDex(), entry.name) || getMoveDetails(entry.url, entry.name);

const prettify = (name = '') => name.replace(/-/g, ' ');

const CATEGORY_CLASS = {
    physical: 'ref-cat--physical',
    special: 'ref-cat--special',
    status: 'ref-cat--status',
};

// One row, memoised. Details resolve one request at a time and each arrival
// replaces the `details` map, which re-rendered every revealed row — up to a few
// hundred — once per arrival while the list was being scrolled. A row's props
// are its entry, its own detail object (same reference until it changes), and
// stable callbacks, so now only the row whose detail landed renders again.
const MoveRow = React.memo(function MoveRow({ entry, d, onOpen, t }) {
    return (
        <div
            role="link"
            tabIndex={0}
            onClick={() => onOpen(entry.name)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(entry.name); } }}
            className="ref-row ref-row--moves"
        >
            <span className="ref-row__name">{prettify(entry.name)}</span>

            <span className="ref-type-cell">
                {d?.type ? <TypeChip type={d.type} size="sm" /> : <span className="ref-skeleton" />}
            </span>

            <span>
                {d?.damage_class
                    ? <span className={`ref-cat ${CATEGORY_CLASS[d.damage_class] || ''}`}>{t(`db.${d.damage_class}`)}</span>
                    : <span className="ref-skeleton" />}
            </span>

            <span className="ref-num">{d ? (d.power ?? '—') : <span className="ref-skeleton" />}</span>
            <span className="ref-num ref-num--muted ref-col-acc">{d ? (d.accuracy ?? '—') : ''}</span>
            <span className="ref-num ref-num--muted ref-col-pp">{d ? (d.pp ?? '—') : ''}</span>
        </div>
    );
});

export function MovesListView() {
    const { t } = useTranslation();
    useDocumentMeta({
        title: 'Move List',
        description: 'Every Pokémon move with type, category, power, accuracy, and PP.',
        path: '/moves',
    });
    const navigate = useNavigate();
    const [typeFilter, setTypeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Lets a search for a Pokémon name surface the moves it can learn.
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);
    const getRelatedNames = useMemo(
        () => makePokemonRelatedNamesResolver(pokemonIndex, resolvePokemonDetail, 'moves'),
        [pokemonIndex],
    );

    const dex = useBattleDex();
    // Filters run over the whole index (before paging), from the in-memory dex.
    // Until the dex lands (one small static file) nothing is filtered out.
    const filterEntry = useMemo(() => {
        if (typeFilter === 'all' && categoryFilter === 'all') return null;
        return (entry) => {
            const d = dexDetail(dex, entry.name);
            if (!d) return !dex;
            if (typeFilter !== 'all' && d.type !== typeFilter) return false;
            if (categoryFilter !== 'all' && d.damage_class !== categoryFilter) return false;
            return true;
        };
    }, [dex, typeFilter, categoryFilter]);

    const { search, setSearch, isLoadingIndex, total, visible, details, hasMore, sentinelRef } =
        useReferenceList({
            loadIndex: getMovesList, loadDetail, getRelatedNames,
            filterEntry, filterKey: `${typeFilter}|${categoryFilter}|${dex ? 1 : 0}`,
        });
    const rows = visible;

    // Each row is a link to that move's own page; the origin is stashed so the
    // detail page's back button returns here.
    const openDetail = useCallback((name) => {
        navigate(`/moves/${name}`, { state: { from: '/moves' } });
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
                <Loader size="lg" block />
            ) : total === 0 ? (
                <EmptyState compact title={t('db.noMatchesTitle')} message={t('db.noMatchesDesc')} />
            ) : (
                <div className="ref-list">
                    <div className="ref-head ref-head--moves">
                        <span>{t('db.colName')}</span>
                        <span>{t('db.colType')}</span>
                        <span>{t('db.colCategory')}</span>
                        <span className="ref-num">{t('db.colPower')}</span>
                        <span className="ref-num ref-col-acc">{t('db.colAccuracy')}</span>
                        <span className="ref-num ref-col-pp">{t('db.colPP')}</span>
                    </div>

                    {rows.map((entry) => (
                        <MoveRow key={entry.name} entry={entry} d={details[entry.name] || dexDetail(dex, entry.name)} onOpen={openDetail} t={t} />
                    ))}

                    {hasMore && <div ref={sentinelRef} className="ref-sentinel" aria-hidden="true" />}
                </div>
            )}
        </div>
    );
}
