import React from 'react';
import { typeIcons } from '../constants/types';
import { SkeletonCard } from './SkeletonCard';
import { Sprite } from './Sprite';
import { StarIcon, PlusIcon } from './icons';
import '../styles/pokemon-card.css';

export const PokemonCard = React.memo(function PokemonCard({
    onCardClick,
    onAddToTeam,
    details,
    lastRef,
    isSuggested,
    isFavorite,
    onToggleFavorite,
}) {
    if (!details) return <SkeletonCard />;

    const handleCardClick = (e) => {
        e.stopPropagation();
        onCardClick?.(details);
    };

    const handleFavoriteClick = (e) => {
        e.stopPropagation();
        if (onToggleFavorite) onToggleFavorite(details.id);
    };

    const handleAddClick = (e) => {
        e.stopPropagation();
        onAddToTeam?.(details);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCardClick?.(details);
        }
    };

    return (
        <div
            ref={lastRef}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`View details for ${details.name}`}
            className={`pokemon-card group ${isSuggested ? 'pokemon-card--suggested' : ''}`}
        >
            <div className="pokemon-card__topbar">
                <div className="pokemon-card__types">
                    {details.types.map((type) => (
                        <img
                            key={type}
                            src={typeIcons[type]}
                            alt={type}
                            className="pokemon-card__type-icon"
                        />
                    ))}
                </div>

                <div className="pokemon-card__meta">
                    {isSuggested && (
                        <div className="pokemon-card__badge">
                            Suggested
                        </div>
                    )}

                    {onToggleFavorite && (
                        <button
                            onClick={handleFavoriteClick}
                            type="button"
                            className={`pokemon-card__favorite ${
                                isFavorite ? 'is-active' : ''
                            }`}
                            aria-label={isFavorite ? `Remove ${details.name} from favorites` : `Add ${details.name} to favorites`}
                            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            <StarIcon className="w-4 h-4" isFavorite={isFavorite} color="currentColor" />
                        </button>
                    )}
                </div>
            </div>

            <div className="pokemon-card__media">
                <Sprite src={details.sprite} alt={details.name} className="w-full h-full" />
            </div>
            <p className="pokemon-card__name">{details.name}</p>

            {onAddToTeam && (
                <button
                    onClick={handleAddClick}
                    type="button"
                    className="pokemon-card__action"
                    aria-label={`Add ${details.name} to team`}
                >
                    <PlusIcon className="w-3 h-3" />
                    Add
                </button>
            )}
        </div>
    );
});
