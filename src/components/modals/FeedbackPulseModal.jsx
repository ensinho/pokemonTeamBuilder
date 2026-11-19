import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Heart, Meh, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';

import '../../styles/feedback-pulse.css';
import { appId } from '../../constants/firebase';
import { db } from '../../services/firebase';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { useFeedbackPulseStore } from '../../store/useFeedbackPulseStore';
import { useMascotStore } from '../../store/useMascotStore';
import { toast } from '../../store/useToastStore';
import {
    FEEDBACK_COMMENT_MAX,
    FEEDBACK_PULSE_VERSION,
    FEEDBACK_REACTIONS,
    FEEDBACK_REACTION_BY_ID,
    writeFeedbackPulse,
} from '../../utils/feedbackPulse';
import { groundAt } from '../../utils/pixelScene';
import { Mascot } from '../Mascot';
import { PixelScene } from '../mascot/PixelScene';

const REACTION_ICONS = {
    love: Heart,
    like: ThumbsUp,
    neutral: Meh,
    dislike: ThumbsDown,
};

/**
 * Once-per-user interactive feedback check-in modal with the 3D Mascot.
 *
 * - 4 tactile sentiment reactions (Love / Like / Neutral / Dislike) that drive
 *   the mascot's live mood, pose, and scene lighting.
 * - Optional comment textarea (user can submit reaction-only or with a note).
 * - Quiet skip action ("Pular por agora") that records dismissal cleanly so
 *   the trainer is never nagged again for this campaign version.
 * - Writes to `artifacts/${appId}/suggestions` (`source: 'pulse'`) so every
 *   reaction and comment appears directly in the Admin Dashboard.
 */
export function FeedbackPulseModal({ currentPage = 'home' }) {
    const { t } = useTranslation();
    const close = useFeedbackPulseStore((s) => s.close);
    const reason = useFeedbackPulseStore((s) => s.reason);
    const userId = useAuthStore((s) => s.userId);
    const userEmail = useAuthStore((s) => s.userEmail);
    const displayName = useAuthStore((s) => s.displayName);

    const [reaction, setReaction] = useState(null);
    const [comment, setComment] = useState('');
    const [scene, setScene] = useState(null);
    const [animKey, setAnimKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSkip = useCallback(() => {
        if (reason !== 'manual') {
            writeFeedbackPulse({
                version: FEEDBACK_PULSE_VERSION,
                status: 'skipped',
                at: Date.now(),
            });
        }
        close();
    }, [close, reason]);

    const dialogRef = useModalA11y(handleSkip);

    const activeMeta = useMemo(
        () => (reaction ? FEEDBACK_REACTION_BY_ID[reaction] : null),
        [reaction]
    );

    const mascotMood = submitted
        ? 'radiante'
        : activeMeta?.mood || 'curioso';
    const mascotPose = submitted
        ? 'comemorando'
        : activeMeta?.pose || 'acenando';
    const mascotPlay = submitted
        ? 'celebrate'
        : activeMeta?.play;
    const sceneKind = submitted
        ? 'morning'
        : activeMeta?.scene || 'morning';

    const promptLine = reaction
        ? t(`feedbackPulse.prompts.${reaction}`)
        : t('feedbackPulse.prompts.idle');

    const handlePickReaction = (id) => {
        setReaction((prev) => (prev === id ? null : id));
        setAnimKey((k) => k + 1);
    };

    const canSubmit = Boolean((reaction || comment.trim()) && !isSubmitting);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!canSubmit) return;

        const cleanComment = comment.trim().slice(0, FEEDBACK_COMMENT_MAX);
        const normalizedDisplayName = displayName?.trim() || null;
        const normalizedEmail = userEmail?.trim().toLowerCase() || null;

        setIsSubmitting(true);
        try {
            if (db && userId) {
                await addDoc(collection(db, `artifacts/${appId}/suggestions`), {
                    userId,
                    userEmail: normalizedEmail,
                    contactEmail: normalizedEmail,
                    authEmail: normalizedEmail,
                    displayName: normalizedDisplayName,
                    source: 'pulse',
                    campaignVersion: FEEDBACK_PULSE_VERSION,
                    reaction: reaction || null,
                    page: currentPage,
                    pageTitle: currentPage,
                    author: {
                        userId,
                        email: normalizedEmail,
                        authEmail: normalizedEmail,
                        displayName: normalizedDisplayName,
                    },
                    text: cleanComment,
                    createdAt: serverTimestamp(),
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                });
            }

            writeFeedbackPulse({
                version: FEEDBACK_PULSE_VERSION,
                status: 'submitted',
                reaction: reaction || null,
                at: Date.now(),
            });

            setSubmitted(true);
            setAnimKey((k) => k + 1);
            useMascotStore.getState().react('celebrate');
            toast.success(t('feedbackPulse.thanksToast'));

            window.setTimeout(() => {
                close();
            }, 1350);
        } catch (err) {
            console.error('Failed to submit feedback pulse:', err);
            toast.error(t('feedbackPulse.errorToast'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const groundY = groundAt(scene, 0.5) * 100;

    return createPortal(
        <div
            className="feedback-pulse__backdrop"
            onClick={handleSkip}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="feedback-pulse-title"
                tabIndex={-1}
                className="feedback-pulse"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="feedback-pulse__close"
                    onClick={handleSkip}
                    aria-label={t('feedbackPulse.closeAria')}
                >
                    <X aria-hidden="true" />
                </button>

                <div className="feedback-pulse__stage">
                    <PixelScene
                        kind={sceneKind}
                        seed={42}
                        onGround={setScene}
                        className="feedback-pulse__scene"
                    />
                    <p className="feedback-pulse__eyebrow">
                        <span className="live-dot" aria-hidden="true" />
                        <span>{t('feedbackPulse.eyebrow')}</span>
                    </p>
                    <span
                        className="feedback-pulse__bot"
                        style={{ top: `${groundY}%` }}
                    >
                        <Mascot
                            size="xl"
                            framing="body"
                            mood={mascotMood}
                            pose={mascotPose}
                            play={mascotPlay}
                            playKey={animKey}
                            seasonal={false}
                        />
                    </span>
                </div>

                {submitted ? (
                    <div className="feedback-pulse__thanks" aria-live="polite">
                        <h2 id="feedback-pulse-title" className="feedback-pulse__thanks-title">
                            {t('feedbackPulse.thanksTitle')}
                        </h2>
                        <p className="feedback-pulse__thanks-sub">
                            {t('feedbackPulse.thanksSub')}
                        </p>
                    </div>
                ) : (
                    <>
                        <header className="feedback-pulse__head">
                            <h2 id="feedback-pulse-title" className="feedback-pulse__title">
                                {t('feedbackPulse.title')}
                            </h2>
                            <p className="feedback-pulse__sub" aria-live="polite">
                                {promptLine}
                            </p>
                        </header>

                        <form className="feedback-pulse__form" onSubmit={handleSubmit}>
                            <div
                                className="feedback-pulse__reactions"
                                role="radiogroup"
                                aria-label={t('feedbackPulse.reactionsAria')}
                            >
                                {FEEDBACK_REACTIONS.map((item) => {
                                    const Icon = REACTION_ICONS[item.id];
                                    const selected = reaction === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={selected}
                                            className={`feedback-pulse__reaction ${selected ? 'is-selected' : ''}`}
                                            style={{ '--rx-tone': item.tone }}
                                            onClick={() => handlePickReaction(item.id)}
                                        >
                                            <span className="feedback-pulse__reaction-icon" aria-hidden="true">
                                                <Icon />
                                            </span>
                                            <span className="feedback-pulse__reaction-label">
                                                {t(`feedbackPulse.reactions.${item.id}`)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <label className="feedback-pulse__field">
                                <span className="feedback-pulse__field-head">
                                    <span className="feedback-pulse__label">
                                        {t('feedbackPulse.commentLabel')}
                                    </span>
                                    <span className="feedback-pulse__counter">
                                        {comment.length}/{FEEDBACK_COMMENT_MAX}
                                    </span>
                                </span>
                                <textarea
                                    className="feedback-pulse__textarea"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value.slice(0, FEEDBACK_COMMENT_MAX))}
                                    placeholder={t('feedbackPulse.commentPlaceholder')}
                                    rows={3}
                                    maxLength={FEEDBACK_COMMENT_MAX}
                                />
                            </label>

                            <footer className="feedback-pulse__footer">
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={handleSkip}
                                >
                                    {t('feedbackPulse.skip')}
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm"
                                    disabled={!canSubmit}
                                >
                                    <Send aria-hidden="true" />
                                    {isSubmitting ? t('feedbackPulse.sending') : t('feedbackPulse.send')}
                                </button>
                            </footer>
                        </form>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}

export default FeedbackPulseModal;
