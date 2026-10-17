import React from 'react';
import { PokeballIcon, DownloadIcon } from '../icons';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';

/**
 * A team attached to a post or a comment: name, Import, and the six slots
 * (hover one for its set). One component for both places — they had drifted
 * into two copies of the same markup.
 */
export function ForumTeamCard({ team, ownerId, onImport, onHoverSlot, t }) {
    if (!team) return null;
    return (
        <div className="forum-team-share-card">
            <div className="forum-team-share-header">
                <h5 className="forum-team-share-title">
                    <PokeballIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{team.name}</span>
                </h5>
                <button type="button" onClick={() => onImport(team)} className="btn btn-secondary btn-sm forum-team-share-import">
                    <DownloadIcon className="w-3.5 h-3.5" />
                    {t('forum.importTeam')}
                </button>
            </div>
            <div className="forum-team-share-slots">
                {Array.from({ length: 6 }).map((_, slotIdx) => {
                    const pk = team.pokemons?.[slotIdx];
                    return (
                        <div
                            key={slotIdx}
                            className="forum-team-share-slot"
                            onMouseEnter={(e) => pk && onHoverSlot?.({
                                messageId: ownerId,
                                slotIndex: slotIdx,
                                pokemon: pk,
                                ref: e.currentTarget,
                            })}
                            onMouseLeave={() => onHoverSlot?.(null)}
                        >
                            {pk ? (
                                <img
                                    src={getTeamPokemonDisplaySprite(pk)}
                                    alt={pk.name || ''}
                                    width="48"
                                    height="48"
                                    loading="lazy"
                                    decoding="async"
                                    className="forum-team-share-sprite"
                                    onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                />
                            ) : (
                                <span className="forum-team-share-empty">
                                    <PokeballIcon className="w-3.5 h-3.5" />
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
