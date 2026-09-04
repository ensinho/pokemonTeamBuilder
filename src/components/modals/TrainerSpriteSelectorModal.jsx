import React, { useMemo, useState } from 'react';

import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from '../../hooks/useTranslation';
import { useTrainerSprites, trainerSpriteUrl } from '../../hooks/useTrainerSprites';
import { EmptyState } from '../EmptyState';
import { CloseIcon } from '../icons';
import '../../styles/trainer-selector-modal.css';

/**
 * Picker for the trainer sprite shown as the user's public avatar.
 *
 * The roster is baked into public/data/trainer-sprites.json; the images
 * themselves are hotlinked from Showdown (80×80 pixel art, ~700 bytes each) and
 * lazy-loaded, so opening the picker costs only what scrolls into view.
 *
 * Retro variants (`acetrainer-gen4dp` next to `acetrainer`) are hidden by
 * default — they're near-duplicates that triple the grid for no gain.
 */
export function TrainerSpriteSelectorModal({ onClose, onSelect, currentSpriteId, colors }) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(onClose);
    const trainers = useTrainerSprites();

    const [searchTerm, setSearchTerm] = useState('');
    const [showRetro, setShowRetro] = useState(false);
    const [failedIds, setFailedIds] = useState(() => new Set());

    const retroCount = useMemo(() => trainers.filter((trainer) => trainer.gen).length, [trainers]);

    const visibleTrainers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return trainers.filter((trainer) => {
            if (failedIds.has(trainer.id)) return false;
            // The currently-selected sprite always stays visible, even when it's a
            // retro variant and the toggle is off.
            const isCurrent = trainer.id === currentSpriteId;
            if (!showRetro && trainer.gen && !isCurrent) return false;
            if (!term) return true;
            return trainer.label.toLowerCase().includes(term) || trainer.id.includes(term);
        });
    }, [trainers, searchTerm, showRetro, failedIds, currentSpriteId]);

    const markFailed = (id) => setFailedIds((previous) => {
        const next = new Set(previous);
        next.add(id);
        return next;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="trainer-selector-title"
                tabIndex={-1}
                className="trainer-selector relative w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-lg custom-scrollbar animate-scale-in focus:outline-none"
                style={{ '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    type="button"
                    aria-label={t('modals.trainerSelectorCloseAria')}
                    className="absolute top-4 right-4 text-muted hover:text-fg transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
                >
                    <CloseIcon />
                </button>

                <div className="mb-4 pr-8">
                    <h2 id="trainer-selector-title" className="text-lg font-bold text-fg">
                        {t('modals.trainerSelectorTitle')}
                    </h2>
                    <p className="mt-1 text-xs text-muted">{t('modals.trainerSelectorSubtitle')}</p>
                </div>

                <div className="mb-4 space-y-3">
                    <input
                        type="text"
                        className="input-clean"
                        placeholder={t('modals.trainerSelectorSearchPlaceholder')}
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-muted">
                            {t('modals.trainerSelectorCount', { count: visibleTrainers.length })}
                        </p>
                        {retroCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowRetro((previous) => !previous)}
                                aria-pressed={showRetro}
                                className={`trainer-selector__toggle ${showRetro ? 'is-active' : ''}`}
                            >
                                {t('modals.trainerSelectorShowRetro', { count: retroCount })}
                            </button>
                        )}
                    </div>
                </div>

                {currentSpriteId && (
                    <div className="mb-3 flex justify-center">
                        <button
                            type="button"
                            onClick={() => onSelect(null)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-fg"
                        >
                            {t('modals.trainerSelectorRemove')}
                        </button>
                    </div>
                )}

                {visibleTrainers.length === 0 ? (
                    <EmptyState
                        compact
                        title={t('modals.trainerSelectorNoMatches')}
                        message={trainers.length === 0
                            ? t('modals.trainerSelectorLoading')
                            : t('modals.trainerSelectorNoMatchesHint')}
                    />
                ) : (
                    <div className="trainer-selector__grid">
                        {visibleTrainers.map((trainer) => (
                            <button
                                key={trainer.id}
                                type="button"
                                onClick={() => onSelect(trainer.id)}
                                aria-pressed={trainer.id === currentSpriteId}
                                className={`trainer-selector__tile ${trainer.id === currentSpriteId ? 'is-selected' : ''}`}
                            >
                                <img
                                    src={trainerSpriteUrl(trainer.id)}
                                    alt={trainer.label}
                                    loading="lazy"
                                    decoding="async"
                                    width={80}
                                    height={80}
                                    className="trainer-selector__sprite"
                                    onError={() => markFailed(trainer.id)}
                                />
                                <span className="trainer-selector__label">
                                    {trainer.label}
                                    {trainer.female && <span aria-hidden="true"> ♀</span>}
                                    {trainer.gen && <span className="trainer-selector__gen">{`G${trainer.gen}`}</span>}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
