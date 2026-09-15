import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

import { AnchoredPopover } from '../AnchoredPopover';
import { BottomSheet } from '../BottomSheet';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { maxWidthBelow } from '../../constants/breakpoints';
import { cutoffLabel, groupFormats, searchFormats } from '../../utils/metaFormats';
import { typeChart, typeColors, typeIcons } from '../../constants/types';

// The controls the Meta pages steer with. They live together because they share
// one job: letting ~40 ladders, five rating bands and eighteen types be chosen
// from a phone without any of it being on screen until it is asked for.
//
// Everything here follows the panel rule — the surface owns the single border,
// and the rows inside separate themselves with fill, never with more lines.

const ALL_TYPES = Object.keys(typeChart);

/** Rows of the picker list. Selection is a fill + a check, not a border. */
function FormatOption({ format, active, onPick }) {
    return (
        <button
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onPick(format.id)}
            className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active ? 'bg-surface-active text-primary' : 'text-fg hover:bg-surface-hover'
            }`}
        >
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{format.label}</span>
            {Number.isFinite(format.species) && (
                <span className="shrink-0 text-[0.625rem] tabular-nums text-muted">{format.species}</span>
            )}
            {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
        </button>
    );
}

/** The searchable, grouped body — identical in the sheet and the popover. */
function FormatList({ formats, value, onPick, pt, autoFocus }) {
    const [query, setQuery] = useState('');
    const groups = useMemo(() => groupFormats(searchFormats(formats, query)), [formats, query]);

    return (
        <div className="flex min-h-0 flex-col gap-2">
            {/* No border on the field: it sits inside a bordered surface, so it
                separates itself with fill. */}
            <div className="relative shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                    type="text"
                    value={query}
                    autoFocus={autoFocus}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={pt ? 'Buscar formato…' : 'Search format…'}
                    aria-label={pt ? 'Buscar formato' : 'Search format'}
                    className="w-full rounded-lg bg-surface-raised py-2 pl-9 pr-3 text-sm text-fg placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar" role="listbox" aria-label={pt ? 'Formatos' : 'Formats'}>
                {groups.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted">
                        {pt ? 'Nenhum formato encontrado.' : 'No format matches that.'}
                    </p>
                ) : groups.map((g) => (
                    <div key={g.name} className="mb-1 last:mb-0">
                        <p className="sticky top-0 z-10 bg-surface px-3 py-1.5 text-[0.6875rem] font-semibold text-muted">
                            {g.name}
                        </p>
                        {g.items.map((f) => (
                            <FormatOption key={f.id} format={f} active={f.id === value} onPick={onPick} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * The format chooser. A `<select>` carried three VGC regulations fine; it cannot
 * carry forty ladders, because a native option list has no search and no way to
 * show which group you are in. So: one compact trigger, and the list arrives as
 * a bottom sheet on a phone and an anchored popover on a laptop.
 */
export function FormatPicker({ formats = [], value, onChange, pt = false, className = '', compact = false }) {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef(null);
    const popoverRef = useRef(null);
    const isMobile = useMediaQuery(maxWidthBelow('lg'));

    const current = formats.find((f) => f.id === value) || formats[0] || null;

    // Desktop popover: it is not a modal, so dismissal is ours to wire.
    useEffect(() => {
        if (!open || isMobile) return undefined;
        const onPointerDown = (e) => {
            if (popoverRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, isMobile]);

    // A sheet left open while the viewport crosses into desktop would be
    // orphaned (different element, same state), so close on the switch.
    useEffect(() => { setOpen(false); }, [isMobile]);

    const pick = (id) => { onChange(id); setOpen(false); };

    if (!formats.length) return null;

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-left transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${compact ? 'py-1.5' : 'py-2'} ${className}`}
            >
                <span className="min-w-0 flex-1">
                    {current?.group && !compact && (
                        <span className="block truncate text-[0.625rem] leading-tight text-muted">{current.group}</span>
                    )}
                    <span className="block truncate text-sm font-semibold text-fg">
                        {current?.label || (pt ? 'Formato' : 'Format')}
                    </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            </button>

            {open && isMobile && (
                <BottomSheet onClose={() => setOpen(false)} title={pt ? 'Formato' : 'Format'}>
                    {/* The sheet body scrolls; the list gets a bounded height so
                        its search field stays put while the options move. */}
                    <div className="flex max-h-[60vh] flex-col">
                        <FormatList formats={formats} value={value} onPick={pick} pt={pt} autoFocus={false} />
                    </div>
                </BottomSheet>
            )}

            {!isMobile && (
                <AnchoredPopover
                    isOpen={open}
                    anchorRef={anchorRef}
                    popoverRef={popoverRef}
                    role="dialog"
                    ariaLabel={pt ? 'Escolher formato' : 'Choose format'}
                    className="w-[20rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-2 shadow-elevation-3"
                    zIndex={90}
                >
                    <div className="flex max-h-[26rem] flex-col">
                        <FormatList formats={formats} value={value} onPick={pick} pt={pt} autoFocus />
                    </div>
                </AnchoredPopover>
            )}
        </>
    );
}

/**
 * The ladder-rating band. Smogon publishes each format at several rating floors
 * — the unrated ladder, then 1500 / 1630 / 1695 / 1760 / 1825 — and they rank
 * quite differently, so this is a real question and not a detail. Rendered as a
 * segmented row (never a dropdown: with four options a dropdown hides the fact
 * that there is a choice at all), and not rendered at all for a single band.
 */
export function CutoffSelect({ cutoffs = [], value, onChange, pt = false, className = '' }) {
    if (cutoffs.length < 2) return null;
    return (
        <div
            className={`inline-flex overflow-hidden rounded-xl border border-border ${className}`}
            role="group"
            aria-label={pt ? 'Rating mínimo do ladder' : 'Ladder rating floor'}
        >
            {cutoffs.map((c) => (
                <button
                    key={c}
                    type="button"
                    onClick={() => onChange(c)}
                    aria-pressed={c === value}
                    title={pt
                        ? (c > 0 ? `Partidas entre jogadores com rating ${c} ou mais` : 'Todas as partidas do ladder')
                        : (c > 0 ? `Games between players rated ${c} and above` : 'Every game on the ladder')}
                    className={`min-h-11 px-2.5 text-[0.6875rem] font-bold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                        c === value ? 'bg-primary text-on-primary' : 'bg-surface text-muted hover:bg-surface-hover hover:text-fg'
                    }`}
                >
                    {cutoffLabel(c, pt)}
                </button>
            ))}
        </div>
    );
}

/**
 * Type filter. Collapsed to a single button by default — eighteen chips on a
 * phone is the definition of polluting the screen — and the button carries the
 * count so the filter can never be on without saying so.
 */
export function TypeFilter({ selected = [], onChange, pt = false }) {
    const [open, setOpen] = useState(false);
    const count = selected.length;

    const toggle = (type) => {
        onChange(selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type]);
    };

    return (
        <div className="contents">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className={`flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    count ? 'border-primary text-primary' : 'border-border bg-surface text-muted hover:text-fg'
                }`}
            >
                {pt ? 'Tipos' : 'Types'}
                {count > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] tabular-nums text-on-primary">
                        {count}
                    </span>
                )}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {open && (
                <div className="w-full rounded-xl border border-border bg-surface p-2">
                    <div className="flex flex-wrap gap-1.5">
                        {ALL_TYPES.map((type) => {
                            const active = selected.includes(type);
                            const color = typeColors[type];
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => toggle(type)}
                                    aria-pressed={active}
                                    // Canon type colour, mixed into the theme the way
                                    // .type-chip does — never used as raw ink.
                                    style={active ? {
                                        borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
                                        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                                        color: `color-mix(in srgb, ${color} 45%, var(--color-fg))`,
                                    } : undefined}
                                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[0.6875rem] font-semibold capitalize transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                        active ? '' : 'border-transparent bg-surface-raised text-muted hover:bg-surface-hover hover:text-fg'
                                    }`}
                                >
                                    {typeIcons[type] && <img src={typeIcons[type]} alt="" className="h-3 w-3 shrink-0" aria-hidden="true" />}
                                    {type}
                                </button>
                            );
                        })}
                    </div>
                    {count > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.6875rem] font-semibold text-muted transition-colors hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <X className="h-3 w-3" aria-hidden="true" />
                            {pt ? 'Limpar tipos' : 'Clear types'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
