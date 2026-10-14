import React from 'react';
import { Trophy, ShieldCheck, Sparkles, Info } from 'lucide-react';
import { typeIcons } from '../constants/types';
import { getPokemonDisplaySprite, getPokemonArtworkSpriteUrl } from '../utils/pokemonSprites';
import { SkeletonCard } from './SkeletonCard';
import { Sprite } from './Sprite';
import { StarIcon, PlusIcon } from './icons';
import { coreIconFor } from './coreIcons';
import { useShinyBurst } from '../hooks/useShinyBurst';
import { useTranslation } from '../hooks/useTranslation';
import '../styles/pokemon-card.css';

// Map reason kind → icon + default colour
const REASON_VISUALS = {
    ability: (r) => ({ Icon: coreIconFor(r.coreId), color: r.accent || 'var(--color-primary)' }),
    partner: () => ({ Icon: Trophy, color: 'var(--color-primary)' }),
    type:    () => ({ Icon: ShieldCheck, color: 'var(--color-info)' }),
    meta:    () => ({ Icon: Sparkles, color: 'var(--color-primary)' }),
};
function reasonVisual(reason) {
    const fn = REASON_VISUALS[reason?.kind];
    return fn ? fn(reason) : { Icon: Sparkles, color: 'var(--color-primary)' };
}

export const PokemonCard = React.memo(function PokemonCard({
    onCardClick,
    onAddToTeam,
    details,
    lastRef,
    isSuggested,
    synergyReason,
    isFavorite,
    onToggleFavorite,
    isSelected,
    // Builder picker: the whole card adds (the target is the card, not a 30px
    // bar under it) and details move to a small info button. The Pokédex keeps
    // the default — the card opens the entry.
    addOnClick = false,
}) {
    const shiny = useShinyBurst();
    const { t } = useTranslation();

    if (!details) return <SkeletonCard />;

    const primaryAction = addOnClick && onAddToTeam ? onAddToTeam : onCardClick;

    const handleCardClick = (e) => {
        e.stopPropagation();
        primaryAction?.(details);
    };

    const handleInfoClick = (e) => {
        e.stopPropagation();
        onCardClick?.(details);
    };

    const handleFavoriteClick = (e) => {
        e.stopPropagation();
        if (!onToggleFavorite) return;
        // Starring earns the sparkle; un-starring does not.
        if (!isFavorite) shiny.fire();
        onToggleFavorite(details.id);
    };

    const handleAddClick = (e) => {
        e.stopPropagation();
        onAddToTeam?.(details);
    };

    const handleKeyDown = (e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            primaryAction?.(details);
        }
    };

    const hasSynergy = !!synergyReason;
    const { Icon: ReasonIcon, color: reasonColor } = hasSynergy ? reasonVisual(synergyReason) : {};

    return (
        <div
            ref={lastRef}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={addOnClick ? t('builder.addToTeamAria', { name: details.name }) : `View details for ${details.name}`}
            className={`pokemon-card group ${addOnClick ? 'pokemon-card--picker' : ''} ${hasSynergy ? 'pokemon-card--synergy' : isSuggested ? 'pokemon-card--suggested' : ''}  ${isSelected ? 'pokemon-card--selected' : ''}`}
            style={hasSynergy ? { '--synergy-color': reasonColor } : undefined}
        >
            <div className="pokemon-card__topbar">
                <div className="pokemon-card__types">
                    <span className="pokemon-card__dex-number" title={`#${details.id}`}>
                        #{String(details.id).padStart(4, '0')}
                    </span>
                    {(details.types || []).map((type) => (
                        <img
                            key={type}
                            src={typeIcons[type]}
                            alt={type}
                            className="pokemon-card__type-icon"
                        />
                    ))}
                </div>

                <div className="pokemon-card__meta">
                    {!hasSynergy && isSuggested && (
                        <div className="pokemon-card__badge">
                            Suggested
                        </div>
                    )}

                    {addOnClick && onCardClick && (
                        <button
                            type="button"
                            onClick={handleInfoClick}
                            className="pokemon-card__info touch-target"
                            aria-label={t('builder.detailsAria', { name: details.name })}
                            title={t('builder.detailsAria', { name: details.name })}
                        >
                            <Info aria-hidden="true" />
                        </button>
                    )}

                    {onToggleFavorite && (
                        <button
                            onClick={handleFavoriteClick}
                            type="button"
                            className={`pokemon-card__favorite ${
                                isFavorite ? 'is-active' : ''
                            }  ${shiny.isBursting ? 'is-bursting' : ''}`}
                            aria-label={isFavorite ? `Remove ${details.name} from favorites` : `Add ${details.name} to favorites`}
                            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            <StarIcon className="w-4 h-4" isFavorite={isFavorite} color="currentColor" />
                            {shiny.burst}
                        </button>
                    )}
                </div>
            </div>

            <div className="pokemon-card__media" data-hero-source={details.id}>
                <Sprite src={getPokemonDisplaySprite(details)} artworkSrc={getPokemonArtworkSpriteUrl(details.id)} alt={details.name} className="w-full h-full" />
            </div>
            <p className="pokemon-card__name">{details.name}</p>
            {hasSynergy && synergyReason.label && (
                <span className="pokemon-card__reason-label" title={synergyReason.label}>
                    <ReasonIcon aria-hidden="true" />
                    <span className="pokemon-card__reason-text">{synergyReason.label}</span>
                </span>
            )}

            {/* In the picker the card itself is the add target, so this is the
                cue, not a second control (aria-hidden; clicks fall through). */}
            {onAddToTeam && addOnClick && (
                <span className="pokemon-card__action" aria-hidden="true">
                    <PlusIcon className="w-3 h-3" />
                    {t('builder.addShort')}
                </span>
            )}
            {onAddToTeam && !addOnClick && (
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
