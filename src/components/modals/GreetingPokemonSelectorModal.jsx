import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';

import { typeIcons } from '../../constants/types';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { useTranslation } from '../../hooks/useTranslation';
import { loadPokemonIndex } from '../../services/pokemonDataCache';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { EmptyState } from '../EmptyState';
import { CloseIcon } from '../icons';
import { Loader } from '../Loader';
import { Sprite } from '../Sprite';
import { Switch } from '../Switch';
import '../../styles/greeting-selector-modal.css';

// Tiles rendered per step; the sentinel at the end of the grid asks for the next.
const PAGE = 120;

const displayName = (name = '') =>
    name.split('-').filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

/**
 * The partner picker. A choice is staged, not applied: tapping a tile marks it,
 * Save (bottom-left, where the eye lands after scanning the grid) commits it.
 * A double-click is the shortcut for both.
 *
 * The list is the static Pokédex index — all 1025 at once, searched and
 * filtered on the client, like the Pokédex itself. It used to page through the
 * Firestore `pokemons` collection 200 at a time, which is the perf wound the
 * Pokédex already paid for (docs/wounds.md).
 */
export function GreetingPokemonSelectorModal({ onClose, onSelect, currentPokemonId, currentPokemonIsShiny }) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(onClose);
    const shiny = useShinyBurst();

    const [pokemons, setPokemons] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState(null);
    const [pendingId, setPendingId] = useState(currentPokemonId || null);
    const [pendingShiny, setPendingShiny] = useState(Boolean(currentPokemonIsShiny));
    const [visibleCount, setVisibleCount] = useState(PAGE);
    const sentinelRef = useRef(null);
    const bodyRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        loadPokemonIndex()
            .then((index) => { if (!cancelled) setPokemons(index.filter((p) => !p.isForm)); })
            .catch(() => { if (!cancelled) setPokemons([]); });
        return () => { cancelled = true; };
    }, []);

    const term = searchTerm.trim().toLowerCase().replace(/\s+/g, '-');
    const filtered = useMemo(() => {
        if (!pokemons) return [];
        return pokemons.filter((p) =>
            (!selectedType || p.types.includes(selectedType))
            && (!term || p.name.includes(term) || String(p.id) === term.replace(/^#/, '')));
    }, [pokemons, selectedType, term]);

    // A new query starts from the top of the list.
    useEffect(() => {
        setVisibleCount(PAGE);
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
    }, [selectedType, term]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || visibleCount >= filtered.length) return undefined;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) setVisibleCount((n) => n + PAGE);
        }, { root: bodyRef.current, rootMargin: '400px 0px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [filtered.length, visibleCount]);

    const byId = useMemo(() => new Map((pokemons || []).map((p) => [p.id, p])), [pokemons]);
    const pending = pendingId ? byId.get(pendingId) : null;
    const isDirty = (pendingId || null) !== (currentPokemonId || null)
        || (Boolean(pendingId) && pendingShiny !== Boolean(currentPokemonIsShiny));

    const commit = (id = pendingId) => {
        onSelect({ pokemonId: id, isShiny: Boolean(id) && pendingShiny });
        onClose();
    };

    const toggleShiny = (next) => {
        setPendingShiny(next);
        if (next) shiny.fire();
    };

    const sprite = (id) => getPokemonFrontSpriteUrl(id, { shiny: pendingShiny });
    const artwork = (id) => getPokemonArtworkSpriteUrl(id, { shiny: pendingShiny });
    const typeLabel = (type) => t(`types.${type}`, { defaultValue: type });

    return (
        <div className="modal-scrim" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="greeting-selector-title"
                tabIndex={-1}
                className="greeting-selector modal-panel modal-panel--3xl"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="modal-header">
                    <div className="min-w-0 flex-1">
                        <h2 id="greeting-selector-title" className="modal-title">{t('modals.greetingSelectorTitle')}</h2>
                        <p className="modal-subtitle">{t('modals.greetingSelectorSubtitle')}</p>
                    </div>
                    <button type="button" onClick={onClose} className="modal-close" aria-label={t('modals.greetingSelectorCloseAria')}>
                        <CloseIcon />
                    </button>
                </header>

                <div className="greeting-selector__toolbar">
                    <div className="greeting-selector__search">
                        <Search aria-hidden="true" className="greeting-selector__search-icon" />
                        <input
                            type="search"
                            className="input-clean"
                            placeholder={t('modals.greetingSelectorSearchPlaceholder')}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            aria-label={t('modals.greetingSelectorSearchPlaceholder')}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        {searchTerm && (
                            <button type="button" className="greeting-selector__search-clear" onClick={() => setSearchTerm('')}
                                aria-label={t('modals.greetingSelectorClearSearch')}>
                                <X aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    <div className="greeting-selector__types" role="group" aria-label={t('modals.greetingSelectorFilters')}>
                        <button
                            type="button"
                            onClick={() => setSelectedType(null)}
                            className="greeting-selector__type greeting-selector__type--all"
                            aria-pressed={!selectedType}
                            title={t('modals.greetingSelectorAllTypes')}
                        >
                            {t('common.all')}
                        </button>
                        {Object.keys(typeIcons).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setSelectedType(selectedType === type ? null : type)}
                                className="greeting-selector__type"
                                aria-pressed={selectedType === type}
                                title={typeLabel(type)}
                                aria-label={typeLabel(type)}
                            >
                                <img src={typeIcons[type]} alt="" aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                </div>

                <div ref={bodyRef} className="modal-body greeting-selector__body custom-scrollbar">
                    <p className="greeting-selector__count" aria-live="polite">
                        {pokemons
                            ? t('modals.greetingSelectorCount', { count: filtered.length })
                            : t('modals.greetingSelectorLoadingHint')}
                        {selectedType && <> · {typeLabel(selectedType)}</>}
                    </p>

                    {!pokemons ? (
                        <Loader size="md" block label={t('modals.greetingSelectorLoadingHint')} />
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            compact
                            title={t('modals.greetingSelectorNoMatches')}
                            message={term ? t('modals.greetingSelectorNothingFound', { term: searchTerm.trim() }) : t('modals.greetingSelectorClearFilterHint')}
                        />
                    ) : (
                        <div className="greeting-selector__grid">
                            {filtered.slice(0, visibleCount).map((pokemon) => {
                                const isPending = pendingId === pokemon.id;
                                return (
                                    <button
                                        key={pokemon.id}
                                        type="button"
                                        className={`greeting-selector__tile ${isPending ? 'is-selected' : ''}`}
                                        aria-pressed={isPending}
                                        onClick={() => setPendingId(pokemon.id)}
                                        onDoubleClick={() => commit(pokemon.id)}
                                    >
                                        <span className="greeting-selector__dex">#{String(pokemon.id).padStart(4, '0')}</span>
                                        {isPending && (
                                            <span className="greeting-selector__check" aria-hidden="true"><Check /></span>
                                        )}
                                        <Sprite src={sprite(pokemon.id)} artworkSrc={artwork(pokemon.id)} alt="" className="greeting-selector__sprite" />
                                        <span className="greeting-selector__name">{displayName(pokemon.name)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {pokemons && visibleCount < filtered.length && (
                        <div ref={sentinelRef} className="greeting-selector__sentinel"><Loader size="sm" /></div>
                    )}
                </div>

                <footer className="modal-footer modal-footer--ruled greeting-selector__footer">
                    <div className="greeting-selector__actions">
                        <button type="button" className="btn btn-primary" onClick={() => commit()} disabled={!isDirty}>
                            <Check aria-hidden="true" /> {t('modals.greetingSelectorSave')}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
                    </div>

                    <div className="greeting-selector__summary">
                        <span className={`greeting-selector__preview ${shiny.isBursting ? 'is-bursting' : ''}`}>
                            {pending ? (
                                <Sprite key={`${pending.id}-${pendingShiny}`} src={sprite(pending.id)} artworkSrc={artwork(pending.id)} alt="" className="greeting-selector__preview-sprite" />
                            ) : (
                                <span className="greeting-selector__preview-empty" aria-hidden="true">?</span>
                            )}
                            {shiny.burst}
                        </span>
                        <span className="greeting-selector__summary-text">
                            <span className="greeting-selector__summary-name">
                                {pending ? displayName(pending.name) : t('modals.greetingSelectorDefault')}
                            </span>
                            {pendingId ? (
                                <button type="button" className="greeting-selector__reset" onClick={() => setPendingId(null)}>
                                    {t('modals.greetingSelectorUseDefault')}
                                </button>
                            ) : null}
                        </span>
                        <Switch
                            size="sm"
                            checked={pendingShiny}
                            onChange={toggleShiny}
                            disabled={!pendingId}
                            label={t('modals.greetingSelectorShinyShort')}
                        />
                    </div>
                </footer>
            </div>
        </div>
    );
}
