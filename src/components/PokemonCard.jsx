import React from 'react';
import { typeIcons } from '../constants/types';
import { SkeletonCard } from './SkeletonCard';
import { Sprite } from './Sprite';
import { StarIcon, PlusIcon } from './icons';

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
            className={`rounded-lg p-3 text-center group relative cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSuggested ? 'ring-2 ring-success shadow-lg' : ''
            }`}
        >
            {isSuggested && (
                <div className="absolute -top-2 -right-2 text-xs bg-success text-white font-bold py-1 px-2 rounded-full z-10">
                    Suggested
                </div>
            )}

            {onToggleFavorite && (
                <button
                    onClick={handleFavoriteClick}
                    type="button"
                    className={`absolute top-1 left-1 z-10 p-1 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-warning ${
                        isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                    }`}
                    style={{
                        backgroundColor: isFavorite ? 'rgba(251, 191, 36, 0.2)' : 'rgba(0,0,0,0.3)',
                    }}
                    aria-label={isFavorite ? `Remove ${details.name} from favorites` : `Add ${details.name} to favorites`}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                    <StarIcon className="w-4 h-4" isFavorite={isFavorite} color="currentColor" />
                </button>
            )}

            <div className="mx-auto w-full max-w-[120px] aspect-square group-hover:scale-110 transition-transform duration-300">
                <Sprite src={details.sprite} alt={details.name} className="w-full h-full" />
            </div>
            <p className="mt-2 text-sm font-semibold capitalize text-fg">{details.name}</p>
            <div className="flex justify-center items-center mt-1 gap-1">
                {details.types.map((type) => (
                    <img
                        key={type}
                        src={typeIcons[type]}
                        alt={type}
                        className="w-5 h-5 transition-transform group-hover:scale-110"
                    />
                ))}
            </div>

            {onAddToTeam && (
                <button
                    onClick={handleAddClick}
                    type="button"
                    className="mt-2 w-full inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-semibold bg-primary text-white opacity-90 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-fg active:scale-[0.98]"
                    aria-label={`Add ${details.name} to team`}
                >
                    <PlusIcon className="w-3 h-3" />
                    Add
                </button>
            )}
        </div>
    );
});
