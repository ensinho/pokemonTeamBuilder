import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { Pager } from '../Pager';
import { usePaged } from '../../hooks/usePaged';

const prettify = (name = '') => name.replace(/-/g, ' ');

/**
 * The Pokémon behind a move, an ability or an item: equal tiles on a grid,
 * one page at a time. A move is learned by up to ~900 Pokémon; as a wrapped
 * cloud of chips that was a wall whose height changed with every name.
 *
 * `groups`: `[{ id, label, pokemons: [{ id, name }] }]`. Empty groups are
 * dropped; two or more become a segmented switch with their counts (an
 * ability's regular and hidden holders), one is just the grid.
 *
 * The last page is padded to a full page, so the pager under it stays where
 * the pointer already is while paging.
 */
export function EntityHolders({ groups, pageSize = 24, ariaLabel, onNavigate }) {
    const { linkState } = useEntityNavigate();
    const shown = groups.filter((group) => group.pokemons.length > 0);
    const [activeId, setActiveId] = useState(shown[0]?.id);
    const active = shown.find((group) => group.id === activeId) || shown[0];
    const { page, pageCount, pageItems, setPage } = usePaged(active?.pokemons || [], pageSize, active?.id);

    if (!active) return null;
    const fillers = pageCount > 1 ? pageSize - pageItems.length : 0;

    return (
        <div className="holders">
            {shown.length > 1 && (
                <div className="segmented segmented--sm holders__switch" role="group" aria-label={ariaLabel}>
                    {shown.map((group) => (
                        <button
                            key={group.id}
                            type="button"
                            className="segmented__item"
                            aria-pressed={group.id === active.id}
                            onClick={() => setActiveId(group.id)}
                        >
                            {group.label} <span className="count-badge">{group.pokemons.length}</span>
                        </button>
                    ))}
                </div>
            )}

            <ul className="holders__grid">
                {pageItems.map((p) => (
                    <li key={`${p.id}-${p.name}`}>
                        <Link to={`/pokemon/${p.id}`} state={linkState} className="holder" onClick={onNavigate}>
                            <img
                                src={getPokemonFrontSpriteUrl(p.id)}
                                alt=""
                                aria-hidden="true"
                                loading="lazy"
                                decoding="async"
                                width="40"
                                height="40"
                                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                            />
                            <span>{prettify(p.name)}</span>
                        </Link>
                    </li>
                ))}
                {Array.from({ length: fillers }, (_, i) => (
                    <li key={`filler-${i}`} className="holder holder--filler" aria-hidden="true" />
                ))}
            </ul>

            <Pager page={page} pageCount={pageCount} onChange={setPage} label={ariaLabel} className="holders__pager" />
        </div>
    );
}

export default EntityHolders;
