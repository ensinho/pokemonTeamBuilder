import React, { useMemo, useRef, useState } from 'react';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Compact searchable Pokémon combobox over the lightweight index.
 * Calls onSelect with the chosen index entry (which carries baseStats + types).
 */
export function PokemonPicker({ pokemons = [], value, onSelect, placeholder }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const blurTimer = useRef(null);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const base = q
            ? pokemons.filter((p) => p.name.toLowerCase().includes(q))
            : pokemons;
        return base.slice(0, 50);
    }, [pokemons, query]);

    const handleSelect = (p) => {
        onSelect(p);
        setQuery('');
        setOpen(false);
    };

    return (
        <div className="tool-picker">
            <div className="tool-picker__input-wrap">
                {value && (
                    <img
                        src={getPokemonFrontSpriteUrl(value.id)}
                        alt=""
                        aria-hidden="true"
                        className="tool-picker__sprite"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                )}
                <input
                    className="tool-picker__input"
                    value={open ? query : (value?.name?.replace(/-/g, ' ') || '')}
                    placeholder={placeholder || t('tools.selectPokemon')}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => { setQuery(''); setOpen(true); }}
                    onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120); }}
                />
            </div>

            {open && results.length > 0 && (
                <div className="tool-picker__menu custom-scrollbar" onMouseDown={() => clearTimeout(blurTimer.current)}>
                    {results.map((p) => (
                        <button
                            key={`${p.id}-${p.name}`}
                            type="button"
                            className={`tool-picker__option ${value?.id === p.id ? 'is-active' : ''}`}
                            onClick={() => handleSelect(p)}
                        >
                            <img src={getPokemonFrontSpriteUrl(p.id)} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                            <span>{p.name.replace(/-/g, ' ')}</span>
                            <span className="tool-picker__option-sub">#{p.id}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
