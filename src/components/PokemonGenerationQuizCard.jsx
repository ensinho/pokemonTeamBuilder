import React from 'react';
import { PokeballIcon, SparklesIcon } from './icons';

export function PokemonGenerationQuizCard({
    pokemon,
    isFound,
    isNew,
    isLoading,
    onInspect,
}) {
    if (!isFound) {
        return (
            <div className="generation-quiz-card generation-quiz-card--hidden" aria-label={`Hidden Pokémon #${pokemon.id}`}>
                <div className="generation-quiz-card__placeholder" aria-hidden="true">
                    <PokeballIcon />
                </div>
                <span className="generation-quiz-card__number">#{pokemon.id}</span>
                <span className="generation-quiz-card__hidden-name">Unknown</span>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => onInspect(pokemon)}
            disabled={isLoading}
            className={`generation-quiz-card generation-quiz-card--revealed ${isNew ? 'is-new' : ''}`}
            aria-label={`Open details for ${pokemon.displayName}`}
        >
            <div className="generation-quiz-card__header">
                <span className="generation-quiz-card__number">#{pokemon.id}</span>
                {isNew && (
                    <span className="generation-quiz-card__badge">
                        <SparklesIcon />
                        New
                    </span>
                )}
            </div>

            <div className="generation-quiz-card__sprite-wrap">
                <img
                    src={pokemon.spriteUrl}
                    alt=""
                    className="generation-quiz-card__sprite image-pixelated"
                    loading="lazy"
                />
            </div>

            <span className="generation-quiz-card__name">{pokemon.displayName}</span>
            <span className="generation-quiz-card__hint">{isLoading ? 'Loading details…' : 'Tap for details'}</span>
        </button>
    );
}