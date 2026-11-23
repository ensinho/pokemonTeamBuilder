/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useReferenceStore } from '../../store/useReferenceStore';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { typeColors } from '../../constants/types';

const MAX_RESULTS = 5;

const POKEMON_TRIGGER_RE = /(^|[\s([{"'.,;!?])#([a-zA-Z0-9-]{1,20})$/;
const TRAINER_TRIGGER_RE = /(^|[\s([{"'.,;!?])@([a-zA-Z0-9_\u00C0-\u024F.-]{0,20})$/;

const formatPokemonDisplay = (name = '') =>
    name.split('-').filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

const formatPokemonTag = (name = '') =>
    name.split('-').filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('-');

/** Detects `#pokemon` or `@trainer` immediately before the caret. */
export function detectMentionTrigger(text = '', caret = text.length) {
    const pos = typeof caret === 'number' ? caret : text.length;
    const before = String(text).slice(0, pos);

    const pokeMatch = POKEMON_TRIGGER_RE.exec(before);
    if (pokeMatch) {
        const query = pokeMatch[2];
        return {
            kind: 'pokemon',
            query,
            start: pos - query.length - 1,
            end: pos,
        };
    }

    const trainerMatch = TRAINER_TRIGGER_RE.exec(before);
    if (trainerMatch) {
        const query = trainerMatch[2];
        return {
            kind: 'trainer',
            query,
            start: pos - query.length - 1,
            end: pos,
        };
    }

    return null;
}

/**
 * Reusable controller for inline `#Pokémon` and `@Treinador` autocompletion
 * inside any textarea/input. Lazily fetches the Pokédex index on first `#`.
 */
export function useForumMentionPicker({ value, onChange, fieldRef, trainers = [], enabled = true }) {
    const [trigger, setTrigger] = useState(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const isIndexLoading = useReferenceStore((s) => s.isIndexLoading);

    // Lazy-load Pokédex index only the first time a `#` trigger opens.
    useEffect(() => {
        if (enabled && trigger?.kind === 'pokemon' && pokemonIndex.length === 0) {
            useReferenceStore.getState().fetchPokemonIndex();
        }
    }, [enabled, trigger?.kind, pokemonIndex.length]);

    const items = useMemo(() => {
        if (!enabled || !trigger) return [];
        const q = trigger.query.toLowerCase();

        if (trigger.kind === 'pokemon') {
            if (!q) return [];
            const starts = [];
            const contains = [];
            for (const p of pokemonIndex) {
                const name = (p.name || '').toLowerCase();
                const idStr = String(p.id);
                const padded = idStr.padStart(4, '0');
                if (name.startsWith(q) || idStr === q || padded.startsWith(q)) {
                    starts.push(p);
                } else if (name.includes(q)) {
                    contains.push(p);
                }
                if (starts.length >= MAX_RESULTS && contains.length >= MAX_RESULTS) break;
            }
            return [...starts, ...contains].slice(0, MAX_RESULTS).map((p) => ({
                id: `pk-${p.id}`,
                kind: 'pokemon',
                pokemonId: p.id,
                name: formatPokemonDisplay(p.name),
                dex: `#${String(p.id).padStart(4, '0')}`,
                primaryType: p.types?.[0] || null,
                insertValue: `#${formatPokemonTag(p.name)}`,
            }));
        }

        // Trainer mentions
        const seen = new Set();
        const starts = [];
        const contains = [];
        for (const raw of trainers) {
            const clean = String(raw || '').trim();
            if (!clean || clean === 'Professor Oak') continue;
            const lower = clean.toLowerCase();
            if (seen.has(lower)) continue;
            seen.add(lower);
            if (!q || lower.startsWith(q)) starts.push(clean);
            else if (lower.includes(q)) contains.push(clean);
        }
        return [...starts, ...contains].slice(0, MAX_RESULTS).map((name) => ({
            id: `tr-${name.toLowerCase()}`,
            kind: 'trainer',
            name,
            initial: name.charAt(0).toUpperCase(),
            insertValue: `@${name}`,
        }));
    }, [enabled, trigger, pokemonIndex, trainers]);

    // Reset highlighted option whenever query or trigger kind changes.
    useEffect(() => {
        setActiveIndex(0);
    }, [trigger?.kind, trigger?.query]);

    // Clear if disabled or empty text.
    useEffect(() => {
        if (!enabled || !value) setTrigger(null);
    }, [enabled, value]);

    const syncFromTarget = useCallback((target) => {
        if (!enabled || !target) return;
        const caret = target.selectionStart ?? target.value.length;
        setTrigger(detectMentionTrigger(target.value, caret));
    }, [enabled]);

    const dismiss = useCallback(() => setTrigger(null), []);

    const selectItem = useCallback((item) => {
        if (!trigger || !item) return;
        const current = String(value || '');
        const insertion = `${item.insertValue} `;
        const nextText = `${current.slice(0, trigger.start)}${insertion}${current.slice(trigger.end)}`;
        const nextCaret = trigger.start + insertion.length;
        onChange(nextText);
        setTrigger(null);
        requestAnimationFrame(() => {
            const el = fieldRef?.current;
            if (!el) return;
            el.focus();
            el.setSelectionRange(nextCaret, nextCaret);
        });
    }, [trigger, value, onChange, fieldRef]);

    const hasMatches = items.length > 0;
    const isOpen = Boolean(
        enabled
        && trigger
        && (hasMatches || trigger.query.length > 0),
    );

    const handleKeyDown = useCallback((e) => {
        if (!isOpen) return false;
        if (e.key === 'ArrowDown' && hasMatches) {
            e.preventDefault();
            setActiveIndex((idx) => (idx + 1) % items.length);
            return true;
        }
        if (e.key === 'ArrowUp' && hasMatches) {
            e.preventDefault();
            setActiveIndex((idx) => (idx - 1 + items.length) % items.length);
            return true;
        }
        if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
            if (hasMatches) {
                e.preventDefault();
                selectItem(items[activeIndex] || items[0]);
                return true;
            }
            return false;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent?.stopImmediatePropagation?.();
            setTrigger(null);
            return true;
        }
        return false;
    }, [isOpen, hasMatches, items, activeIndex, selectItem]);

    return {
        isOpen,
        kind: trigger?.kind || null,
        query: trigger?.query || '',
        items,
        isLoading: trigger?.kind === 'pokemon' && isIndexLoading && pokemonIndex.length === 0,
        activeIndex,
        setActiveIndex,
        syncFromTarget,
        selectItem,
        dismiss,
        handleKeyDown,
    };
}

/**
 * Floating contextual popover for `#Pokémon` and `@Treinador` autocompletion.
 */
export function ForumMentionPicker({
    isOpen,
    kind,
    items = [],
    isLoading = false,
    activeIndex = 0,
    onSelect,
    onHoverIndex,
    placement = 'top',
    t,
}) {
    if (!isOpen) return null;

    const heading = kind === 'pokemon'
        ? t('markedUi.forum.mentionPokemon')
        : t('markedUi.forum.mentionTrainers');

    return (
        <div
            className={`forum-mention-picker forum-mention-picker--${placement}`}
            role="listbox"
            aria-label={heading}
        >
            <div className="forum-mention-picker__head">
                <span>{heading}</span>
                <span className="forum-mention-picker__keys" aria-hidden="true">↑↓ · ↵</span>
            </div>

            {items.length > 0 ? (
                <div className="forum-mention-picker__list">
                    {items.map((item, idx) => {
                        const selected = idx === activeIndex;
                        if (item.kind === 'pokemon') {
                            const tone = item.primaryType ? typeColors[item.primaryType] : null;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    className={`forum-mention-picker__item ${selected ? 'is-active' : ''}`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseEnter={() => onHoverIndex?.(idx)}
                                    onClick={() => onSelect(item)}
                                >
                                    <img
                                        src={getPokemonFrontSpriteUrl(item.pokemonId)}
                                        alt=""
                                        width={28}
                                        height={28}
                                        decoding="async"
                                        className="forum-mention-picker__sprite"
                                    />
                                    <span className="forum-mention-picker__name">{item.name}</span>
                                    <span className="forum-mention-picker__dex">{item.dex}</span>
                                    {item.primaryType && (
                                        <span
                                            className="forum-mention-picker__type"
                                            style={tone ? { '--mention-type': tone } : undefined}
                                        >
                                            {t(`types.${item.primaryType}`)}
                                        </span>
                                    )}
                                </button>
                            );
                        }

                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                className={`forum-mention-picker__item ${selected ? 'is-active' : ''}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseEnter={() => onHoverIndex?.(idx)}
                                onClick={() => onSelect(item)}
                            >
                                <span className="forum-mention-picker__initial" aria-hidden="true">
                                    {item.initial}
                                </span>
                                <span className="forum-mention-picker__name">@{item.name}</span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <p className="forum-mention-picker__empty">
                    {isLoading ? '…' : t('markedUi.forum.mentionEmpty')}
                </p>
            )}
        </div>
    );
}
