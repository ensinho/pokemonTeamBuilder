import React, { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, CornerDownLeft, Package, Search, Sparkles, Swords } from 'lucide-react';
import { PokeballIcon } from './icons';
import { useModalA11y } from '../hooks/useModalA11y';
import { useTranslation } from '../hooks/useTranslation';
import { useReferenceStore } from '../store/useReferenceStore';
import { getAbilitiesList, getMovesList } from '../services/pokemonDataCache';
import { getPokemonDisplaySprite } from '../utils/pokemonSprites';
import { itemSpriteUrl } from '../utils/itemSuggestions';
import { typeIcons } from '../constants/types';
import { prepareEntries, scoreDexNumber, searchGroups } from '../utils/globalSearch';
import '../styles/command-palette.css';

const LIMITS = { pokemon: 6, pages: 4, moves: 4, abilities: 3, items: 3 };
const QUICK_LINKS = 6;

// Move and ability lists come from the data service (cached for 30 days); kept
// here once loaded so reopening the palette never waits on them again.
const listCache = { moves: null, abilities: null };

function useCachedList(key, loader) {
    const [list, setList] = useState(() => listCache[key] || []);
    useEffect(() => {
        if (listCache[key]) return undefined;
        let alive = true;
        loader()
            .then((loaded) => {
                listCache[key] = loaded || [];
                if (alive) setList(listCache[key]);
            })
            .catch(() => { /* offline: the group simply stays empty */ });
        return () => { alive = false; };
    }, [key, loader]);
    return list;
}

const prettyName = (slug) => String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const padDex = (id) => `#${String(id).padStart(4, '0')}`;

/** A sprite that falls back to a glyph when the image is missing (some items and
 *  forms have none) — a broken-image box in a result row reads as a bug. */
function SpriteThumb({ src, fallback }) {
    const [failed, setFailed] = useState(false);
    if (failed || !src) return fallback;
    return <img src={src} alt="" loading="lazy" className="command-palette__sprite" onError={() => setFailed(true)} />;
}

/**
 * Search everything from anywhere (design system v2; Kokonut UI's action search
 * bar, rebuilt on the app's own dialog). Pokémon — by name or dex number —
 * moves, abilities, items and the app's pages, ranked by how well they answer
 * the query (utils/globalSearch.js), all from data already in memory.
 *
 * One component, two presentations: a palette near the top of the screen on
 * desktop (⌘K / Ctrl+K, or "/"), and a full-height sheet on a phone with the
 * field at the top, where the keyboard cannot cover it. It is a combobox —
 * arrows move, Enter opens, Escape closes (useModalA11y).
 */
export function CommandPalette({ onClose, destinations = [] }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dialogRef = useModalA11y(onClose);
    const listboxId = useId();
    const optionIdPrefix = useId();
    const optionRefs = useRef([]);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    // Typing stays at full speed on a phone; the results catch up a beat later.
    const deferredQuery = useDeferredValue(query);

    const pokemonIndex = useReferenceStore((state) => state.pokemonIndex);
    const items = useReferenceStore((state) => state.items);
    const moves = useCachedList('moves', getMovesList);
    const abilities = useCachedList('abilities', getAbilitiesList);

    useEffect(() => {
        useReferenceStore.getState().fetchPokemonIndex();
    }, []);

    const groups = useMemo(() => [
        {
            key: 'pokemon',
            entries: prepareEntries(pokemonIndex, (p) => p.name),
            limit: LIMITS.pokemon,
            boost: 8,
            extraScore: (p, q) => scoreDexNumber(p.id, q),
            tiebreak: (a, b) => a.id - b.id,
        },
        {
            key: 'pages',
            entries: prepareEntries(destinations, (d) => d.label, (d) => [d.path.replace(/\//g, ' ')]),
            limit: LIMITS.pages,
            boost: 6,
        },
        { key: 'moves', entries: prepareEntries(moves, (m) => m.name), limit: LIMITS.moves },
        { key: 'abilities', entries: prepareEntries(abilities, (a) => a.name), limit: LIMITS.abilities },
        { key: 'items', entries: prepareEntries(items, (i) => i.name), limit: LIMITS.items },
    ], [pokemonIndex, destinations, moves, abilities, items]);

    const results = useMemo(() => searchGroups(deferredQuery, groups), [deferredQuery, groups]);
    const isSearching = deferredQuery.trim().length > 0;

    // Everything on screen as one list of options, so the arrows walk across
    // groups exactly as the eye does.
    const sections = useMemo(() => {
        const toOption = (groupKey, item) => {
            switch (groupKey) {
                case 'pokemon':
                    return {
                        key: `pokemon-${item.id}`,
                        href: `/pokemon/${item.id}`,
                        title: prettyName(item.name),
                        meta: padDex(item.id),
                        types: item.types || [],
                        thumb: <SpriteThumb src={getPokemonDisplaySprite(item)} fallback={<PokeballIcon />} />,
                    };
                case 'pages':
                    return { key: `page-${item.key}`, href: item.path, title: item.label, meta: t('search.kindPage'), thumb: item.icon };
                case 'moves':
                    return { key: `move-${item.name}`, href: `/moves/${item.name}`, title: prettyName(item.name), meta: t('search.kindMove'), thumb: <Swords /> };
                case 'abilities':
                    return { key: `ability-${item.name}`, href: `/abilities/${item.name}`, title: prettyName(item.name), meta: t('search.kindAbility'), thumb: <Sparkles /> };
                default:
                    return {
                        key: `item-${item.name}`,
                        href: `/items/${item.name}`,
                        title: prettyName(item.name),
                        meta: t('search.kindItem'),
                        thumb: <SpriteThumb src={itemSpriteUrl(item.name)} fallback={<Package />} />,
                    };
            }
        };
        const built = isSearching
            ? results.map((group) => ({
                key: group.key,
                label: t(`search.group_${group.key}`),
                options: group.results.map((item) => toOption(group.key, item)),
            }))
            : [{
                key: 'quick',
                label: t('search.quickLinks'),
                options: destinations.slice(0, QUICK_LINKS).map((item) => toOption('pages', item)),
            }];
        // One running index across every section: the arrows and
        // aria-activedescendant address options by it.
        let index = 0;
        return built.map((section) => ({
            ...section,
            options: section.options.map((option) => ({ ...option, index: index++ })),
        }));
    }, [results, isSearching, destinations, t]);

    const options = useMemo(() => sections.flatMap((section) => section.options), [sections]);

    useEffect(() => { setActiveIndex(0); }, [deferredQuery]);

    const open = useCallback((option) => {
        if (!option) return;
        onClose();
        navigate(option.href);
    }, [navigate, onClose]);

    const moveActive = (delta) => {
        if (!options.length) return;
        setActiveIndex((index) => {
            const next = (index + delta + options.length) % options.length;
            optionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
            return next;
        });
    };

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveActive(1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveActive(-1);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            open(options[activeIndex]);
        }
    };

    return (
        <div className="modal-scrim command-palette-scrim" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={t('search.label')}
                tabIndex={-1}
                className="modal-panel command-palette"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="command-palette__field">
                    <Search aria-hidden="true" />
                    <input
                        type="search"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        aria-activedescendant={options[activeIndex] ? `${optionIdPrefix}-${activeIndex}` : undefined}
                        className="command-palette__input"
                        placeholder={t('search.placeholder')}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={handleKeyDown}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        enterKeyHint="go"
                        inputMode="search"
                    />
                    <kbd className="command-palette__kbd command-palette__kbd--esc">Esc</kbd>
                    <button type="button" className="btn btn-ghost btn-sm command-palette__cancel" onClick={onClose}>
                        {t('common.cancel')}
                    </button>
                </div>

                <div id={listboxId} role="listbox" aria-label={t('search.label')} className="command-palette__results">
                    {sections.map((section) => (
                        <div key={section.key} role="group" aria-label={section.label} className="command-palette__section">
                            <p className="command-palette__group" aria-hidden="true">{section.label}</p>
                            {section.options.map((option) => {
                                const { index } = option;
                                const isActive = index === activeIndex;
                                return (
                                    <div
                                        key={option.key}
                                        id={`${optionIdPrefix}-${index}`}
                                        ref={(node) => { optionRefs.current[index] = node; }}
                                        role="option"
                                        aria-selected={isActive}
                                        className={`command-palette__option ${isActive ? 'is-active' : ''}`}
                                        onMouseMove={() => { if (!isActive) setActiveIndex(index); }}
                                        onClick={() => open(option)}
                                    >
                                        <span className="command-palette__thumb" aria-hidden="true">{option.thumb}</span>
                                        <span className="command-palette__text">
                                            <span className="command-palette__title">{option.title}</span>
                                            <span className="command-palette__meta">
                                                {option.meta}
                                                {option.types?.map((type) => (
                                                    typeIcons[type] ? <img key={type} src={typeIcons[type]} alt="" className="command-palette__type" /> : null
                                                ))}
                                            </span>
                                        </span>
                                        <CornerDownLeft className="command-palette__enter" aria-hidden="true" />
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {isSearching && options.length === 0 && (
                        <p className="command-palette__empty">{t('search.noResults', { query: deferredQuery.trim() })}</p>
                    )}
                </div>

                <div className="command-palette__hints" aria-hidden="true">
                    <span><ArrowUp /><ArrowDown /> {t('search.hintNavigate')}</span>
                    <span><CornerDownLeft /> {t('search.hintOpen')}</span>
                    <span><kbd className="command-palette__kbd">Esc</kbd> {t('search.hintClose')}</span>
                </div>
            </div>
        </div>
    );
}
