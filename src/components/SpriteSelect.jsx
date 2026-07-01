import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * A compact searchable dropdown that shows an icon (e.g. an item sprite) beside
 * each option — something a native <select> can't do. Used for the team editor's
 * item picker so users can eyeball items by their sprite. Options: [{slug,name}].
 */
export function SpriteSelect({
    value,
    onChange,
    options,
    getSprite,
    placeholder = 'Select…',
    noneLabel = 'None',
    searchPlaceholder = 'Search…',
    buttonClassName = '',
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef(null);
    const inputRef = useRef(null);

    const selected = useMemo(() => options.find((o) => o.slug === value) || null, [options, value]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = q ? options.filter((o) => o.name.toLowerCase().includes(q) || o.slug.includes(q)) : options;
        return list.slice(0, 80);
    }, [options, query]);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        // focus the search on open
        const id = setTimeout(() => inputRef.current?.focus(), 0);
        return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); clearTimeout(id); };
    }, [open]);

    const pick = (slug) => { onChange(slug); setOpen(false); setQuery(''); };

    return (
        <div className="relative" ref={rootRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`flex w-full items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-left text-sm text-fg transition-colors focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary ${buttonClassName}`}
            >
                {selected ? (
                    <>
                        {getSprite && <img src={getSprite(selected.slug)} alt="" className="h-5 w-5 shrink-0 image-pixelated" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />}
                        <span className="min-w-0 flex-1 truncate capitalize">{selected.name}</span>
                    </>
                ) : (
                    <span className="min-w-0 flex-1 truncate text-muted">{placeholder}</span>
                )}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
            </button>

            {open && (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
                    <div className="relative border-b border-border p-1.5">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full rounded-md bg-surface-raised py-1.5 pl-8 pr-2 text-sm text-fg focus:outline-none"
                        />
                    </div>
                    <ul role="listbox" className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                        <li>
                            <button type="button" onClick={() => pick('')} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-raised ${!value ? 'text-primary' : 'text-muted'}`}>
                                <X className="h-4 w-4 shrink-0" /> {noneLabel}
                            </button>
                        </li>
                        {filtered.map((o) => (
                            <li key={o.slug}>
                                <button
                                    type="button"
                                    onClick={() => pick(o.slug)}
                                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm capitalize transition-colors hover:bg-surface-raised ${o.slug === value ? 'bg-primary-soft text-primary' : 'text-fg'}`}
                                >
                                    {getSprite && <img src={getSprite(o.slug)} alt="" className="h-5 w-5 shrink-0 image-pixelated" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />}
                                    <span className="min-w-0 flex-1 truncate">{o.name}</span>
                                </button>
                            </li>
                        ))}
                        {filtered.length === 0 && <li className="px-3 py-3 text-center text-xs text-muted">No items found</li>}
                    </ul>
                </div>
            )}
        </div>
    );
}
