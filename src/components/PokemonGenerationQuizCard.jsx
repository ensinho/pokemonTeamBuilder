import React, { memo } from 'react';
import { SparklesIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

/**
 * One answer in the Generation Quiz / PokéQuiz grid. A Pokémon not found yet
 * is a compact filled tile carrying only its number — it used to be a full
 * card with "#N", the word "Unknown" and a big Poké Ball, so a Gen I grid was
 * 151 copies of the same placeholder at full size. Memoised: a catch re-renders
 * the card that changed, not the whole grid.
 */
export const PokemonGenerationQuizCard = memo(function PokemonGenerationQuizCard({
    pokemon,
    isFound,
    isNew,
    isLoading,
    isInteractable,
    onInspect,
}) {
    const { t } = useTranslation();

    if (!isFound) {
        return (
            <div
                className="generation-quiz-card generation-quiz-card--hidden"
                role="img"
                aria-label={t('games.hiddenPokemon', { id: pokemon.id })}
            >
                <span className="generation-quiz-card__number" aria-hidden="true">{pokemon.id}</span>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => {
                if (isInteractable && !isLoading) {
                    onInspect(pokemon);
                }
            }}
            disabled={!isInteractable || isLoading}
            className={`generation-quiz-card generation-quiz-card--revealed ${isNew ? 'is-new' : ''}  ${!isInteractable ? 'is-locked' : ''}`}
            aria-label={isInteractable
                ? t('games.openDetails', { name: pokemon.displayName })
                : t('games.detailsLocked', { name: pokemon.displayName })}
        >
            <div className="generation-quiz-card__header">
                <span className="generation-quiz-card__number">#{pokemon.id}</span>
                {isNew && (
                    <span className="generation-quiz-card__badge">
                        <SparklesIcon />
                        {t('games.newFind')}
                    </span>
                )}
            </div>

            <div className="generation-quiz-card__sprite-wrap">
                <img
                    src={pokemon.spriteUrl}
                    alt=""
                    width="64"
                    height="64"
                    className="generation-quiz-card__sprite image-pixelated"
                    loading="lazy"
                    decoding="async"
                />
            </div>

            <span className="generation-quiz-card__name">{pokemon.displayName}</span>
            {(isLoading || isInteractable) && (
                <span className="generation-quiz-card__hint">
                    {isLoading ? t('common.loading') : t('games.tapForInfo')}
                </span>
            )}
        </button>
    );
});
