import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Clickable Pokémon chips linking to the detail page — used to show which
 * Pokémon learn a move or can have an ability. Caps the list with a reveal.
 */
export function PokemonLinkChips({ pokemons = [], cap = 30 }) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    if (!pokemons.length) return null;
    const shown = expanded ? pokemons : pokemons.slice(0, cap);
    const remaining = pokemons.length - shown.length;

    return (
        <div className="ref-mons" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            {shown.map((p) => (
                <button
                    key={`${p.id}-${p.name}`}
                    type="button"
                    className={`ref-mon ${p.isHidden ? 'ref-mon--hidden' : ''}`}
                    onClick={() => navigate(`/pokemon/${p.id}`)}
                    title={p.isHidden ? `${p.name.replace(/-/g, ' ')} (hidden)` : p.name.replace(/-/g, ' ')}
                >
                    <img
                        src={getPokemonFrontSpriteUrl(p.id)}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <span>{p.name.replace(/-/g, ' ')}</span>
                </button>
            ))}
            {remaining > 0 && (
                <button type="button" className="ref-mon-more" onClick={() => setExpanded(true)}>
                    +{remaining} {t('db.more', { defaultValue: 'more' })}
                </button>
            )}
        </div>
    );
}
