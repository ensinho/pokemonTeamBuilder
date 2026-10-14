import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useModalA11y } from '../../hooks/useModalA11y';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { useTranslation } from '../../hooks/useTranslation';
import { RefreshIcon } from '../icons';

/**
 * The end of a quiz run (Generation Quiz, PokéQuiz). Mounted only right after
 * the user's own last correct guess, so the one reward — the shiny sparkle on
 * the Pokémon it celebrates with — fires once on open; tapping the sprite
 * flips it to its shiny form and sparkles again. No confetti canvas, no rings
 * spinning forever.
 *
 * Two ways on: play again at once (`onPlayAgain` — same generations, or a new
 * challenge, the caller decides and names it with `playAgainText`), or close
 * the dialog and look at the finished grid.
 */
export function QuizCelebrationModal({
    isOpen,
    onClose,
    onPlayAgain,
    onTryAnother,
    pokemon,
    accuracy,
    accuracyPercent,
    totalCount,
    categoryLabel,
    generationLabel,
    playAgainText,
    titleText,
    descText,
    mode = 'generation',
}) {
    const { t, language } = useTranslation();
    const dialogRef = useModalA11y(isOpen ? onClose : undefined);
    const shiny = useShinyBurst();
    const [isShiny, setIsShiny] = useState(false);
    const { fire } = shiny;

    useEffect(() => {
        if (isOpen) fire();
    }, [isOpen, fire]);

    if (!isOpen) return null;

    const finalAccuracy = accuracy ?? accuracyPercent ?? 100;
    const pokemonName = pokemon ? pokemon.displayName : 'Pokémon';
    const artworkUrl = pokemon ? getPokemonArtworkSpriteUrl(pokemon.id, { shiny: isShiny }) : '';

    const handlePlayAgain = () => {
        (onPlayAgain || onTryAnother)?.();
        onClose?.();
    };

    const description = (() => {
        if (descText) return descText;
        if (categoryLabel) {
            return language === 'pt'
                ? `Você adivinhou todos os Pokémon de "${categoryLabel}".`
                : `You guessed every Pokémon in "${categoryLabel}".`;
        }
        if (generationLabel) {
            return language === 'pt'
                ? `Você adivinhou todos os Pokémon de ${generationLabel}.`
                : `You guessed every Pokémon from ${generationLabel}.`;
        }
        if (mode === 'category') {
            return language === 'pt'
                ? 'Você adivinhou todos os Pokémon deste desafio.'
                : 'You guessed every Pokémon in this challenge.';
        }
        return t('quiz.celebrationDesc');
    })();

    return createPortal(
        <div className="modal-scrim" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="celebration-title"
                aria-describedby="celebration-desc"
                tabIndex={-1}
                className="modal-panel modal-panel--sm"
                onClick={(event) => event.stopPropagation()}
            >
                {/* .modal-body's own padding beats utilities on it (index.css
                    loads after them); the layout lives on an inner column. */}
                <div className="modal-body">
                    <div className="flex flex-col items-center gap-3 pt-6 text-center">
                    <span className="count-badge">{t('quiz.celebrationBadge')}</span>
                    <h2 id="celebration-title" className="modal-title">
                        {titleText || t('quiz.celebrationTitle')}
                    </h2>
                    <p id="celebration-desc" className="modal-subtitle m-0">{description}</p>

                    {artworkUrl && (
                        <button
                            type="button"
                            onClick={() => { setIsShiny((value) => !value); fire(); }}
                            className={`relative grid place-items-center w-32 h-32 rounded-2xl bg-surface-raised border-0 cursor-pointer ${shiny.isBursting ? 'is-bursting' : ''}`}
                            aria-label={pokemonName}
                            aria-pressed={isShiny}
                            title={pokemonName}
                        >
                            <img
                                src={artworkUrl}
                                alt=""
                                width="112"
                                height="112"
                                className="w-28 h-28 object-contain sprite-fade"
                            />
                            {shiny.burst}
                        </button>
                    )}

                    <p className="m-0 text-sm text-muted">{t('quiz.celebratedWith', { name: pokemonName })}</p>

                    <dl className="grid grid-cols-2 gap-2 w-full m-0">
                        <div className="rounded-xl bg-surface-raised p-3">
                            <dt className="text-xs text-muted">{t('quiz.totalGuessed')}</dt>
                            <dd className="m-0 text-lg font-semibold text-fg tabular-nums">{totalCount}</dd>
                        </div>
                        <div className="rounded-xl bg-surface-raised p-3">
                            <dt className="text-xs text-muted">{t('quiz.accuracy')}</dt>
                            <dd className="m-0 text-lg font-semibold text-fg tabular-nums">{finalAccuracy}%</dd>
                        </div>
                    </dl>
                    </div>
                </div>

                <div className="modal-footer">
                    <button type="button" onClick={onClose} className="btn btn-ghost">
                        {t('games.viewGrid')}
                    </button>
                    <button type="button" onClick={handlePlayAgain} className="btn btn-primary">
                        <RefreshIcon />
                        {playAgainText || t('games.playAgain')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
